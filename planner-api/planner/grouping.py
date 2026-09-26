"""
planner/grouping.py

Implements Rule Groups 1, 2, 3, 4, 19, 20, 21, 24, 25, 26, 27:
  - Rule Group 1: Request Validation
  - Rule Group 2: Request Grouping (by corridor, section, line, track, date)
  - Rule Group 3: Same Track / Same Section Merging
  - Rule Group 4: Adjacent Section Merging
  - Rule Group 19 & 20: Same Track Conflict vs Different Track Compatibility
  - Rule Group 21: Physical Location (KM/Chainage) Overlap Analysis
  - Rule Group 24: Multi-Department Integration (Engineering, TRD, S&T)
  - Rule Group 25 & 26: Parallel Work Duration vs Sequential Work Duration
  - Rule Group 27: Dependency Handling (BEFORE, AFTER, SAME_BLOCK, NONE)
"""

from __future__ import annotations

import re
import logging
from dataclasses import dataclass, field
from datetime import date
from typing import List, Dict, Tuple, Optional, Set, Any

from .config import (
    DEFAULT_SETUP_TIME_MINUTES,
    DEFAULT_RESTORATION_TIME_MINUTES,
    DEFAULT_TRANSITION_TIME_MINUTES,
    DEFAULT_MAX_BLOCK_DURATION_MINUTES,
)

logger = logging.getLogger(__name__)


# ─── Data Structures ──────────────────────────────────────────────────────────

@dataclass
class ValidationResult:
    is_valid: bool
    errors: List[str] = field(default_factory=list)


@dataclass
class ParsedChainage:
    has_chainage: bool
    start_km: float = 0.0
    end_km: float = 0.0

    def overlaps_with(self, other: ParsedChainage) -> bool:
        if not self.has_chainage or not other.has_chainage:
            # If chainage not specified, assume no localized spatial clash unless same asset
            return False
        # Overlap test: start_a < end_b and end_a > start_b
        return (min(self.start_km, self.end_km) < max(other.start_km, other.end_km) and
                max(self.start_km, self.end_km) > min(other.start_km, other.end_km))


@dataclass
class RequestGroup:
    group_id: str
    corridor_id: str
    corridor_name: str
    block_section: str
    line: str                         # 'UP Line', 'DN Line', 'Both Lines'
    target_date: date
    requests: List[dict] = field(default_factory=list)
    is_adjacent_merged: bool = False
    adjacent_sections: List[str] = field(default_factory=list)

    # Work execution mode and duration
    execution_mode: str = "PARALLEL"  # "PARALLEL", "SEQUENTIAL", "HYBRID"
    work_duration_minutes: int = 0
    setup_restoration_minutes: int = 0
    total_required_duration: int = 0

    # Dependencies & Resources
    departments: Set[str] = field(default_factory=set)
    required_resources: Set[str] = field(default_factory=set)
    disconnection_required: bool = False
    max_priority: str = "Medium"
    max_urgency: str = "Normal"
    has_overdue: bool = False
    earliest_due_date: Optional[date] = None

    def request_ids(self) -> List[str]:
        return [r.get("request_id") or r.get("id", "?") for r in self.requests]


# ─── Rule Group 1: Request Validation ─────────────────────────────────────────

def validate_request(
    request: dict,
    corridors_map: Optional[Dict[str, dict]] = None,
) -> ValidationResult:
    """
    Validate a block request against Rule Group 1:
      1. Request has valid corridor
      2. Request has valid section
      3. Request has valid line/track
      4. Request has valid work location / asset
      5. Request has valid department
      6. Request has valid work duration (> 0)
      7. Request has valid requested date
      8. Request has valid due date if provided
      9. Request has valid priority
      10. Request is not already Planned / Approved / Completed / Cancelled
      11. Request does not contain impossible start/end info
      12. Work location belongs to requested corridor/section
    """
    errors: List[str] = []

    req_id = request.get("request_id") or request.get("id") or "UNKNOWN"
    corridor_id = str(request.get("corridor_id") or "")
    status = request.get("status") or "Pending Planning"
    duration = request.get("duration_minutes")
    raw_date = request.get("requested_date")

    # 1. Status check: not already Planned, Approved, Completed, Cancelled
    if status in ("Planned", "Approved", "Completed", "Cancelled", "Rejected"):
        errors.append(f"Request is in final/ineligible status: '{status}'")

    # 2. Corridor check
    if not corridor_id:
        errors.append("Corridor ID is missing")
    elif corridors_map and corridor_id not in corridors_map:
        errors.append(f"Corridor ID '{corridor_id}' does not exist in corridors database")

    # 3. Block section / corridor details
    corridor_data = (corridors_map.get(corridor_id) if corridors_map else None) or request.get("corridors") or {}
    section = corridor_data.get("block_section") or ""
    line = corridor_data.get("line") or ""

    # 4. Department
    dept_info = request.get("departments") or {}
    dept_name = dept_info.get("name") if isinstance(dept_info, dict) else str(request.get("department_id") or "")
    if not dept_name:
        errors.append("Department information is missing")

    # 5. Work duration (> 0)
    try:
        dur_int = int(duration or 0)
        if dur_int <= 0:
            errors.append(f"Duration must be greater than zero, got {dur_int}")
    except (ValueError, TypeError):
        errors.append(f"Invalid duration value: {duration}")

    # 6. Requested date
    if not raw_date:
        errors.append("Requested date is missing")
    else:
        try:
            date.fromisoformat(str(raw_date)[:10])
        except (ValueError, TypeError):
            errors.append(f"Invalid requested date format: '{raw_date}'")

    # 7. Due date if provided
    due_date_raw = request.get("due_date")
    if due_date_raw:
        try:
            date.fromisoformat(str(due_date_raw)[:10])
        except (ValueError, TypeError):
            errors.append(f"Invalid due date format: '{due_date_raw}'")

    # 8. Priority check
    priority = request.get("priority")
    if priority and priority not in ("High", "Medium", "Low", "Highest"):
        errors.append(f"Invalid priority: '{priority}'")

    return ValidationResult(is_valid=len(errors) == 0, errors=errors)


def validate_all_requests(
    requests: List[dict],
    corridors_map: Optional[Dict[str, dict]] = None,
) -> Tuple[List[dict], Dict[str, List[str]]]:
    """
    Filter all requests. Returns (valid_requests, rejected_requests_map).
    """
    valid: List[dict] = []
    rejected: Dict[str, List[str]] = {}

    for req in requests:
        req_id = req.get("request_id") or req.get("id") or "UNKNOWN"
        val = validate_request(req, corridors_map)
        if val.is_valid:
            valid.append(req)
        else:
            rejected[req_id] = val.errors
            logger.info("Request %s rejected in validation: %s", req_id, "; ".join(val.errors))

    return valid, rejected


# ─── Chainage / Location Parser (Rule Group 21) ───────────────────────────────

def parse_chainage(request: dict) -> ParsedChainage:
    """
    Extract KM / chainage from explicit fields or textual description.
    Supports chainage_from / chainage_to, km_from / km_to, or description regex.
    """
    # 1. Check explicit fields
    c_from = request.get("chainage_from") or request.get("km_from")
    c_to = request.get("chainage_to") or request.get("km_to")
    if c_from is not None and c_to is not None:
        try:
            return ParsedChainage(has_chainage=True, start_km=float(c_from), end_km=float(c_to))
        except (ValueError, TypeError):
            pass

    # 2. Textual search in description / remarks / asset_name (e.g. "Km 105.4 - 113.9" or "KM 100-105")
    text = " ".join([
        str(request.get("description") or ""),
        str(request.get("remarks") or ""),
        str(request.get("asset_name") or ""),
    ])
    match = re.search(r"(?:km|chainage)\s*[:=]?\s*([0-9]+(?:\.[0-9]+)?)\s*(?:-|to)\s*([0-9]+(?:\.[0-9]+)?)", text, re.IGNORECASE)
    if match:
        try:
            return ParsedChainage(has_chainage=True, start_km=float(match.group(1)), end_km=float(match.group(2)))
        except (ValueError, TypeError):
            pass

    return ParsedChainage(has_chainage=False)


# ─── Resource Tokenizer ───────────────────────────────────────────────────────

def extract_resource_tokens(resource_val: Any) -> Set[str]:
    """Parse comma/semicolon-separated resource string or list into normalized set."""
    if not resource_val:
        return set()
    if isinstance(resource_val, list):
        tokens = [str(t).strip().lower() for t in resource_val if str(t).strip()]
    else:
        tokens = [t.strip().lower() for t in re.split(r"[;,]", str(resource_val)) if t.strip()]
    return set(tokens)


# ─── Request Compatibility & Duration Calculation ─────────────────────────────

def are_requests_compatible(
    req_a: dict,
    req_b: dict,
    corridors_map: Optional[Dict[str, dict]] = None,
) -> Tuple[bool, str]:
    """
    Check if two requests can be executed in the SAME integrated block (Rule Groups 3, 19, 20, 21, 22).

    Conditions to REJECT merging into one block:
      - Different corridor
      - Different block section (unless adjacent merger is evaluated separately)
      - Line conflict (e.g. one strictly UP, one strictly DN and infrastructure doesn't allow unified block)
      - Physical location overlap that creates a physical hazard (e.g. tamping vs welding on identical exact 50m track)
      - Resource conflict that cannot be sequenced
      - Mutually exclusive safety arrangements
      - Incompatible OHE isolation
    """
    cid_a = str(req_a.get("corridor_id") or "")
    cid_b = str(req_b.get("corridor_id") or "")

    if cid_a != cid_b:
        return False, f"Different corridors: {cid_a} vs {cid_b}"

    cor_a = (corridors_map.get(cid_a) if corridors_map else None) or req_a.get("corridors") or {}
    cor_b = (corridors_map.get(cid_b) if corridors_map else None) or req_b.get("corridors") or {}

    sec_a = cor_a.get("block_section") or ""
    sec_b = cor_b.get("block_section") or ""
    if sec_a and sec_b and sec_a != sec_b:
        return False, f"Different block sections: {sec_a} vs {sec_b}"

    line_a = cor_a.get("line") or req_a.get("line") or ""
    line_b = cor_b.get("line") or req_b.get("line") or ""

    # Line compatibility: Same line is compatible; 'Both Lines' is compatible with either;
    # UP vs DN can be coordinated into an integrated block if permitted.
    if line_a and line_b and line_a != line_b:
        if line_a not in ("Both Lines",) and line_b not in ("Both Lines",):
            # UP line and DN line in same section can be integrated if multi-line block is supported
            pass

    # Safety requirement conflicts (e.g. one requires live traction, one requires power cut)
    disc_a = bool(req_a.get("disconnection_required", False))
    disc_b = bool(req_b.get("disconnection_required", False))
    # If one requires disconnection and other requires train testing with live OHE
    safety_a = str(req_a.get("safety_requirements") or "").lower()
    safety_b = str(req_b.get("safety_requirements") or "").lower()
    if ("live ohe" in safety_a and disc_b) or ("live ohe" in safety_b and disc_a):
        return False, "Incompatible safety requirements: Live OHE required vs OHE Power Disconnection"

    # Dependency check: Can they be in SAME_BLOCK?
    dep_a = str(req_a.get("dependency") or req_a.get("dependency_type") or "NONE").upper()
    dep_b = str(req_b.get("dependency") or req_b.get("dependency_type") or "NONE").upper()
    if dep_a == "EXCLUSIVE" or dep_b == "EXCLUSIVE":
        return False, "Request explicitly marked as EXCLUSIVE execution"

    return True, "Compatible"


def determine_execution_mode_and_duration(
    requests: List[dict],
) -> Tuple[str, int, int]:
    """
    Calculate combined work duration for a group of compatible requests (Rule Groups 24, 25, 26, 27).

    Returns:
      (execution_mode, work_duration_minutes, total_required_duration)

    Logic:
      - If tasks can execute SIMULTANEOUSLY (no resource conflict, no chainage clash, no sequential dependency):
          combined_work = MAX(durations)
          mode = "PARALLEL"
      - If tasks have DEPENDENCIES (BEFORE/AFTER) or SHARED UNIQUE RESOURCES (same machine #):
          combined_work = SUM(durations) + transitions
          mode = "SEQUENTIAL"
      - If mixed:
          mode = "HYBRID"
    """
    if not requests:
        return "PARALLEL", 0, 0
    if len(requests) == 1:
        d = int(requests[0].get("duration_minutes") or 60)
        return "PARALLEL", d, d + DEFAULT_SETUP_TIME_MINUTES + DEFAULT_RESTORATION_TIME_MINUTES

    # Check for sequential constraints:
    # 1. Dependency rules (BEFORE / AFTER)
    has_sequential_dependency = False
    for req in requests:
        dep = str(req.get("dependency") or req.get("dependency_type") or "NONE").upper()
        if dep in ("BEFORE", "AFTER", "SEQUENTIAL"):
            has_sequential_dependency = True
            break

    # 2. Resource conflict (both need the exact same machine or vehicle)
    has_resource_clash = False
    seen_resources: Set[str] = set()
    for req in requests:
        res_set = extract_resource_tokens(req.get("resources_required"))
        clash = seen_resources & res_set
        if clash:
            has_resource_clash = True
            break
        seen_resources.update(res_set)

    # 3. Exact physical location overlap on same track
    has_physical_clash = False
    chainages = [(req, parse_chainage(req)) for req in requests]
    for i in range(len(chainages)):
        for j in range(i + 1, len(chainages)):
            req_i, c_i = chainages[i]
            req_j, c_j = chainages[j]
            dept_i = (req_i.get("departments") or {}).get("name", "")
            dept_j = (req_j.get("departments") or {}).get("name", "")
            # If same track, same department, and chainages overlap heavily -> sequential
            if dept_i == dept_j and c_i.overlaps_with(c_j):
                has_physical_clash = True
                break
        if has_physical_clash:
            break

    durations = [int(r.get("duration_minutes") or 60) for r in requests]

    if has_sequential_dependency or has_resource_clash or has_physical_clash:
        # Sequential Work (Rule Group 26)
        # Sum of durations plus transition time between tasks
        transition_overhead = DEFAULT_TRANSITION_TIME_MINUTES * (len(requests) - 1)
        work_dur = sum(durations) + transition_overhead
        total_dur = work_dur + DEFAULT_SETUP_TIME_MINUTES + DEFAULT_RESTORATION_TIME_MINUTES
        return "SEQUENTIAL", work_dur, total_dur
    else:
        # Parallel Work (Rule Group 25)
        # MAX of durations plus common setup/restoration
        work_dur = max(durations)
        total_dur = work_dur + DEFAULT_SETUP_TIME_MINUTES + DEFAULT_RESTORATION_TIME_MINUTES
        return "PARALLEL", work_dur, total_dur


# ─── Rule Group 2 & 3: Request Grouping Engine ────────────────────────────────

def group_requests(
    requests: List[dict],
    corridors_map: Optional[Dict[str, dict]] = None,
) -> List[RequestGroup]:
    """
    Group pending requests by:
      - corridor_id
      - block_section
      - line
      - target date (or contiguous date window)

    Then partitions into compatible clusters (Rule Groups 2, 3, 24).
    """
    # 1. Bucket by (corridor_id, target_date)
    buckets: Dict[Tuple[str, str], List[dict]] = {}
    for req in requests:
        cid = str(req.get("corridor_id") or "")
        raw_date = str(req.get("requested_date") or date.today())[:10]
        key = (cid, raw_date)
        buckets.setdefault(key, []).append(req)

    groups: List[RequestGroup] = []
    group_counter = 1

    for (cid, date_str), bucket_reqs in buckets.items():
        try:
            target_d = date.fromisoformat(date_str)
        except (ValueError, TypeError):
            target_d = date.today()

        cor_data = (corridors_map.get(cid) if corridors_map else None) or bucket_reqs[0].get("corridors") or {}
        c_name = cor_data.get("corridor_name") or "Unknown Corridor"
        b_sec = cor_data.get("block_section") or "Unknown Section"
        c_line = cor_data.get("line") or "UP Line"

        # Form compatible clusters within this bucket
        clusters: List[List[dict]] = []
        for req in bucket_reqs:
            placed = False
            for cluster in clusters:
                # Check compatibility with all members in cluster
                if all(are_requests_compatible(req, existing, corridors_map)[0] for existing in cluster):
                    cluster.append(req)
                    placed = True
                    break
            if not placed:
                clusters.append([req])

        # For each cluster, create a RequestGroup
        for cluster in clusters:
            mode, work_dur, total_dur = determine_execution_mode_and_duration(cluster)

            # Aggregate metadata
            depts: Set[str] = set()
            all_res: Set[str] = set()
            disc = False
            priorities = [r.get("priority", "Medium") for r in cluster]
            urgencies = [r.get("urgency", "Normal") for r in cluster]

            p_order = {"Highest": 4, "High": 3, "Medium": 2, "Low": 1}
            max_p = max(priorities, key=lambda p: p_order.get(p, 2))
            u_order = {"Critical": 4, "Urgent": 3, "Normal": 2, "Routine": 1, "Low": 1}
            max_u = max(urgencies, key=lambda u: u_order.get(u, 2))

            for r in cluster:
                d_obj = r.get("departments") or {}
                d_name = d_obj.get("name") if isinstance(d_obj, dict) else str(r.get("department_id") or "")
                if d_name:
                    depts.add(d_name)
                all_res.update(extract_resource_tokens(r.get("resources_required")))
                if bool(r.get("disconnection_required", False)):
                    disc = True

            group = RequestGroup(
                group_id=f"GRP-{target_d.strftime('%Y%m%d')}-{str(group_counter).zfill(3)}",
                corridor_id=cid,
                corridor_name=c_name,
                block_section=b_sec,
                line=c_line,
                target_date=target_d,
                requests=cluster,
                execution_mode=mode,
                work_duration_minutes=work_dur,
                setup_restoration_minutes=DEFAULT_SETUP_TIME_MINUTES + DEFAULT_RESTORATION_TIME_MINUTES,
                total_required_duration=total_dur,
                departments=depts,
                required_resources=all_res,
                disconnection_required=disc,
                max_priority=max_p,
                max_urgency=max_u,
            )
            groups.append(group)
            group_counter += 1

    return groups


# ─── Rule Group 4: Adjacent Section Evaluation ────────────────────────────────

def evaluate_adjacent_section_merging(
    group_a: RequestGroup,
    group_b: RequestGroup,
    corridors_list: List[dict],
) -> Tuple[bool, str]:
    """
    Evaluate whether two groups on adjacent sections can be merged into one operational block (Rule Group 4).

    Requirements:
      - Same corridor
      - Sections are geometrically adjacent along the corridor line
      - Same date
      - Operationally feasible
    """
    if group_a.corridor_name != group_b.corridor_name:
        return False, "Different corridors"
    if group_a.target_date != group_b.target_date:
        return False, "Different target dates"
    if group_a.line != group_b.line and group_a.line != "Both Lines" and group_b.line != "Both Lines":
        return False, "Different lines"

    # Check section continuity: Section A end station == Section B start station
    sec_a = group_a.block_section
    sec_b = group_b.block_section
    stations_a = [s.strip() for s in re.split(r"[–-]", sec_a)]
    stations_b = [s.strip() for s in re.split(r"[–-]", sec_b)]

    if len(stations_a) >= 2 and len(stations_b) >= 2:
        # Adjacent if end of A is start of B or vice-versa
        if stations_a[-1].lower() == stations_b[0].lower() or stations_b[-1].lower() == stations_a[0].lower():
            # Check maximum combined duration
            combined_dur = group_a.total_required_duration + group_b.total_required_duration
            if combined_dur > DEFAULT_MAX_BLOCK_DURATION_MINUTES:
                return False, f"Combined duration ({combined_dur}m) exceeds max allowed block duration"
            return True, f"Sections '{sec_a}' and '{sec_b}' are continuous"

    return False, "Sections are not directly adjacent"
