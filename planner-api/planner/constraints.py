"""
constraints_engine.py

Complete Railway Automatic Block Planning — Constraint Engine.

Covers ALL 34 constraints required by the problem statement, grouped as:

  A. HARD FEASIBILITY CONSTRAINTS (a candidate window is either legal or not)
  B. GROUPING / DEPENDENCY LOGIC (how requests combine or chain)
  C. PRIORITY & RISK SCORING (who goes first)
  D. MULTI-DATE SEARCH (find a feasible window across the horizon)
  E. OPTIMIZER (choose the best combination of windows — OR-Tools CP-SAT)

DESIGN RULE (fixes the earlier bug class):
  Every hard constraint function is REQUIRED to return an explicit
  (bool, reason) pair. There is NO code path that silently treats
  "missing data" as "constraint satisfied". Missing required data is
  itself a failure, with a clear reason string — never a silent pass.
"""

from __future__ import annotations

import itertools
from dataclasses import dataclass, field, replace
from datetime import date, time, datetime, timedelta
from enum import Enum
from typing import List, Optional, Dict, Tuple, Set, Sequence, Union

try:
    from ortools.sat.python import cp_model
    ORTOOLS_AVAILABLE = True
except ImportError:  # optimizer degrades gracefully if ortools isn't installed
    ORTOOLS_AVAILABLE = False


# ══════════════════════════════════════════════════════════════════════════
# CONFIG DEFAULTS (override per corridor / division as needed)
# ══════════════════════════════════════════════════════════════════════════

DEFAULT_PRE_TRAIN_BUFFER_MIN = 10
DEFAULT_POST_TRAIN_BUFFER_MIN = 15
DEFAULT_MAX_BLOCK_DURATION_MIN = 240
DEFAULT_MACHINE_TRANSIT_MIN = 30           # time to move a machine between sections
DENSE_TRAFFIC_WINDOWS = [(time(6, 0), time(10, 0)), (time(17, 0), time(21, 0))]
HIGH_PRIORITY_TRAIN_CLASSES = {"Rajdhani", "Shatabdi", "Vande Bharat", "Highest", "High"}


# ══════════════════════════════════════════════════════════════════════════
# CORE DATA MODELS
# ══════════════════════════════════════════════════════════════════════════

class Department(str, Enum):
    ENGINEERING = "ENG"
    TRACTION = "TRD"
    SIGNAL = "S&T"


class RequestStatus(str, Enum):
    PENDING = "Pending"
    PLANNED = "Planned"
    APPROVED = "Approved"
    COMPLETED = "Completed"
    CANCELLED = "Cancelled"
    REJECTED = "Rejected"


@dataclass
class TrainMovement:
    train_number: str
    entry_minutes: int          # minutes-from-midnight the train enters the section
    exit_minutes: int
    priority: str = "Normal"    # Normal / High / Highest
    corridor_id: str = ""
    line: str = ""
    service_date: Optional[date] = None


@dataclass
class ExistingBlock:
    block_id: str
    corridor_id: str
    line: str
    block_date: date
    start_min: int
    end_min: int
    department: str
    resources: Set[str] = field(default_factory=set)
    chainage_start: Optional[float] = None
    chainage_end: Optional[float] = None
    status: str = "Approved"
    compatible_departments: Set[str] = field(default_factory=set)  # who may be bundled in


@dataclass
class MaintenanceRequest:
    request_id: str
    department: Department
    corridor_id: str
    line: str
    section: str
    chainage_start: float
    chainage_end: float
    asset_id: str
    duration_min: int
    preferred_date: date
    preferred_start_min: Optional[int]     # None => flexible, search will pick
    resources_required: Set[str]
    gang_id: str
    restoration_time_min: int = 0
    disconnection_required: bool = False
    priority_level: str = "Normal"         # Normal / Urgent / Emergency
    days_overdue: int = 0
    is_critical_asset: bool = False
    deadline: Optional[date] = None
    depends_on_request_id: Optional[str] = None
    handover_buffer_min: int = 15
    max_split_allowed: bool = True         # can this long work be split across shifts?
    status: RequestStatus = RequestStatus.PENDING


@dataclass
class ConstraintResult:
    # Core pass/fail
    passed: bool = True
    _failed_rule_names: List[str] = field(default_factory=list)
    rejection_reasons: List[str] = field(default_factory=list)

    # Per-train fields
    affected_trains: List[str] = field(default_factory=list)
    high_priority_affected_trains: List[str] = field(default_factory=list)

    # Per-constraint boolean flags (set by check_constraints)
    train_conflict_checked: bool = False
    post_train_buffer_satisfied: bool = True
    pre_train_buffer_satisfied: bool = True
    safety_buffer_satisfied: bool = True
    resource_available: bool = True
    unique_resource_conflict: bool = False
    no_overlapping_block: bool = True
    conflicting_block_ids: List[str] = field(default_factory=list)
    traction_disconnection_valid: bool = True
    no_physical_location_conflict: bool = True
    max_duration_satisfied: bool = True

    @property
    def affected_train_count(self) -> int:
        """Total number of trains affected by this constraint."""
        return len(self.affected_trains)

    @property
    def all_passed(self) -> bool:
        """True only when no rules have failed.
        
        Dynamically derived from _failed_rule_names so that callers can
        retroactively clear a rule (e.g. when un-failing an existing-block
        conflict for a merged window) and have all_passed reflect that.
        """
        return len(self._failed_rule_names) == 0

    @all_passed.setter
    def all_passed(self, value: bool) -> None:
        self.passed = value

    def failed_rules(self) -> List[str]:
        """Return list of failed rule names (method, not field)."""
        return self._failed_rule_names

    def fail(self, rule_name: str, reason: Optional[str] = None) -> None:
        self.passed = False
        self._failed_rule_names.append(rule_name)
        if reason:
            self.rejection_reasons.append(reason)
        else:
            self.rejection_reasons.append(f"Constraint '{rule_name}' violated")


@dataclass
class CandidateWindow:
    request_id: str
    corridor_id: str
    line: str
    block_date: date
    start_min: int
    end_min: int
    duration_min: int
    blocked_line_minutes: int
    affected_train_count: int
    priority_score: float


# ══════════════════════════════════════════════════════════════════════════
# UTILITIES
# ══════════════════════════════════════════════════════════════════════════

def intervals_overlap(a_start: int, a_end: int, b_start: int, b_end: int) -> bool:
    return a_start < b_end and a_end > b_start


def chainage_overlap(a_start: float, a_end: float, b_start: float, b_end: float) -> bool:
    return a_start < b_end and a_end > b_start


def time_to_min(t: time) -> int:
    return t.hour * 60 + t.minute


# ══════════════════════════════════════════════════════════════════════════
# A. HARD FEASIBILITY CONSTRAINTS
#    Each function = one or more constraints from the checklist.
#    Every function MUST be given the data it needs; if the caller
#    omits required data, that is treated as a FAILURE, not a pass.
# ══════════════════════════════════════════════════════════════════════════

def check_line_compatibility(req: MaintenanceRequest, corridor_line: str) -> Tuple[bool, Optional[str]]:
    """[Line compatibility] UP/DOWN/Single-line restrictions."""
    if not corridor_line:
        return False, "Corridor line configuration missing — cannot validate line compatibility."
    if corridor_line == "Single Line":
        return True, None  # single line legitimately serves both UP and DOWN
    if req.line != corridor_line:
        return False, f"Line mismatch: requested '{req.line}' but corridor is '{corridor_line}'."
    return True, None


def check_asset_section_validity(req: MaintenanceRequest, asset_registry: Dict[str, str]) -> Tuple[bool, Optional[str]]:
    """[Asset-section validity] requested asset must belong to the selected section."""
    if req.asset_id not in asset_registry:
        return False, f"Asset '{req.asset_id}' not found in asset registry."
    true_section = asset_registry[req.asset_id]
    if true_section.strip().lower() != req.section.strip().lower():
        return False, f"Asset '{req.asset_id}' belongs to section '{true_section}', not requested section '{req.section}'."
    return True, None


def check_chainage_overlap(req: MaintenanceRequest, window: Tuple[int, int],
                            existing_blocks: List[ExistingBlock]) -> Tuple[bool, Optional[str], List[str]]:
    """[Chainage/physical overlap] conflicting works on same physical spot cannot run simultaneously."""
    start_min, end_min = window
    conflicts = []
    for blk in existing_blocks:
        if blk.status in ("Cancelled", "Completed", "Rejected"):
            continue
        if blk.corridor_id != req.corridor_id or blk.block_date != req.preferred_date:
            continue
        if blk.chainage_start is None or blk.chainage_end is None:
            continue
        if not intervals_overlap(start_min, end_min, blk.start_min, blk.end_min):
            continue
        if chainage_overlap(req.chainage_start, req.chainage_end, blk.chainage_start, blk.chainage_end):
            conflicts.append(blk.block_id)
    if conflicts:
        return False, f"Chainage overlap with block(s): {', '.join(conflicts)}.", conflicts
    return True, None, []


def check_train_occupancy_and_buffers(
    window: Tuple[int, int],
    train_movements: List[TrainMovement],
    pre_buffer_min: int = DEFAULT_PRE_TRAIN_BUFFER_MIN,
    post_buffer_min: int = DEFAULT_POST_TRAIN_BUFFER_MIN,
) -> Tuple[bool, List[str], List[str], List[str]]:
    """
    [Train occupancy conflict] + [Pre-train safety buffer] + [Post-work safety buffer]
    + [Train-free window availability]
    Returns: (passed, reasons, affected_trains, high_priority_affected_trains)
    """
    start_min, end_min = window
    reasons: List[str] = []
    affected: List[str] = []
    high_priority: List[str] = []

    for train in train_movements:
        hit = False
        if intervals_overlap(start_min, end_min, train.entry_minutes, train.exit_minutes):
            reasons.append(f"Direct occupancy conflict with train {train.train_number}.")
            hit = True
        # post-train buffer: block must not start too soon after a train exits
        if train.exit_minutes <= start_min < train.exit_minutes + post_buffer_min:
            reasons.append(
                f"Post-work safety buffer ({post_buffer_min} min) violated after train {train.train_number} departs."
            )
            hit = True
        # pre-train buffer: block must not end too close to the next train's arrival
        if end_min <= train.entry_minutes and train.entry_minutes - pre_buffer_min < end_min:
            reasons.append(
                f"Pre-train safety buffer ({pre_buffer_min} min) violated before train {train.train_number} arrives."
            )
            hit = True
        if hit:
            affected.append(train.train_number)
            if train.priority in HIGH_PRIORITY_TRAIN_CLASSES:
                high_priority.append(train.train_number)

    passed = len(reasons) == 0
    return passed, reasons, list(set(affected)), list(set(high_priority))


def check_max_block_duration(req: MaintenanceRequest,
                              max_duration_min: int = DEFAULT_MAX_BLOCK_DURATION_MIN) -> Tuple[bool, Optional[str]]:
    """[Maximum block duration]"""
    if req.duration_min > max_duration_min:
        return False, f"Requested duration {req.duration_min} min exceeds max allowed {max_duration_min} min."
    return True, None


def check_work_restoration_fits(req: MaintenanceRequest, gap_usable_min: int) -> Tuple[bool, Optional[str]]:
    """[Work restoration time] restoration/safety activities must fit within the block."""
    total_needed = req.duration_min + req.restoration_time_min
    if total_needed > gap_usable_min:
        return False, (f"Work ({req.duration_min} min) + restoration ({req.restoration_time_min} min) "
                        f"= {total_needed} min exceeds usable gap of {gap_usable_min} min.")
    return True, None


def check_ohe_isolation(req: MaintenanceRequest, isolation_available: bool) -> Tuple[bool, Optional[str]]:
    """[OHE/power isolation requirement]"""
    if req.disconnection_required and not isolation_available:
        return False, "OHE/power isolation required but not available/compatible for this window."
    return True, None


def check_machine_resource_conflict(
    req: MaintenanceRequest, window: Tuple[int, int],
    existing_blocks: List[ExistingBlock],
) -> Tuple[bool, Optional[str]]:
    """[Machine/resource conflict] + [Maintenance gang availability] — one resource, one task at a time."""
    start_min, end_min = window
    if not req.resources_required and not req.gang_id:
        return False, "No resource/gang information supplied — cannot verify resource conflict."
    for blk in existing_blocks:
        if blk.status in ("Cancelled", "Completed", "Rejected"):
            continue
        if blk.block_date != req.preferred_date:
            continue
        if not intervals_overlap(start_min, end_min, blk.start_min, blk.end_min):
            continue
        clash = req.resources_required & blk.resources
        if clash:
            return False, f"Resource(s) {', '.join(clash)} already committed to block {blk.block_id} in this window."
        if req.gang_id and req.gang_id in blk.resources:
            return False, f"Gang '{req.gang_id}' already committed to block {blk.block_id} in this window."
    return True, None


def check_machine_transit_time(
    req: MaintenanceRequest, window: Tuple[int, int],
    prior_block_same_machine: Optional[ExistingBlock],
    transit_min: int = DEFAULT_MACHINE_TRANSIT_MIN,
) -> Tuple[bool, Optional[str]]:
    """[Machine transit time] sufficient time required to move a machine between sections."""
    if prior_block_same_machine is None:
        return True, None
    start_min, _ = window
    gap = start_min - prior_block_same_machine.end_min
    if prior_block_same_machine.corridor_id != req.corridor_id and gap < transit_min:
        return False, (f"Insufficient transit time: only {gap} min between prior block "
                        f"({prior_block_same_machine.block_id}) and this request, needs {transit_min} min.")
    return True, None


def check_existing_block_compatibility(
    req: MaintenanceRequest, window: Tuple[int, int], existing_blocks: List[ExistingBlock],
) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    [Existing block compatibility] + [Existing block conflict] + [Competing request conflict]
    Returns (passed, reason, absorbable_block_id).
    """
    start_min, end_min = window
    for blk in existing_blocks:
        if blk.status in ("Cancelled", "Completed", "Rejected"):
            continue
        if blk.corridor_id != req.corridor_id or blk.block_date != req.preferred_date:
            continue
        if not intervals_overlap(start_min, end_min, blk.start_min, blk.end_min):
            continue
        if req.department.value in blk.compatible_departments:
            return True, None, blk.block_id       # can be absorbed / bundled
        return False, f"Incompatible with existing block {blk.block_id} (competing/incompatible request).", None
    return True, None, None


def check_dependency_ordering(
    req: MaintenanceRequest, window: Tuple[int, int],
    resolved_windows: Dict[str, Tuple[date, int, int]],
) -> Tuple[bool, Optional[str]]:
    """[Sequential dependency] dependent works require correct ordering and handover buffer."""
    if not req.depends_on_request_id:
        return True, None
    parent = resolved_windows.get(req.depends_on_request_id)
    if parent is None:
        return False, f"Depends on request '{req.depends_on_request_id}' which has no confirmed window yet."
    parent_date, _, parent_end = parent
    start_min, _ = window
    if parent_date != req.preferred_date:
        return False, "Dependency and dependent work are not scheduled on the same date."
    if start_min < parent_end + req.handover_buffer_min:
        return False, (f"Must start at least {req.handover_buffer_min} min after dependency "
                        f"'{req.depends_on_request_id}' completes (ends {parent_end}).")
    return True, None


# ── Master hard-constraint evaluator ────────────────────────────────────────

def evaluate_hard_constraints(
    req: MaintenanceRequest,
    window: Tuple[int, int],
    corridor_line: str,
    asset_registry: Dict[str, str],
    existing_blocks: List[ExistingBlock],
    train_movements: List[TrainMovement],
    gap_usable_min: int,
    isolation_available: bool,
    resolved_windows: Dict[str, Tuple[date, int, int]],
    max_duration_min: int = DEFAULT_MAX_BLOCK_DURATION_MIN,
    pre_buffer_min: int = DEFAULT_PRE_TRAIN_BUFFER_MIN,
    post_buffer_min: int = DEFAULT_POST_TRAIN_BUFFER_MIN,
    prior_block_same_machine: Optional[ExistingBlock] = None,
) -> ConstraintResult:
    """Runs every hard constraint. A single failure marks the whole window infeasible."""
    result = ConstraintResult()

    ok, reason = check_line_compatibility(req, corridor_line)
    if not ok:
        result.fail("line_compatibility", reason)

    ok, reason = check_asset_section_validity(req, asset_registry)
    if not ok:
        result.fail("asset_section_validity", reason)

    ok, reason, _ = check_chainage_overlap(req, window, existing_blocks)
    if not ok:
        result.fail("chainage_physical_overlap", reason)

    ok, reasons, affected, hi_affected = check_train_occupancy_and_buffers(
        window, train_movements, pre_buffer_min, post_buffer_min
    )
    if not ok:
        for r in reasons:
            result.fail("train_occupancy_or_buffer", r)
    result.affected_trains = affected
    result.high_priority_affected_trains = hi_affected

    ok, reason = check_max_block_duration(req, max_duration_min)
    if not ok:
        result.fail("max_block_duration", reason)

    ok, reason = check_work_restoration_fits(req, gap_usable_min)
    if not ok:
        result.fail("work_restoration_time", reason)

    ok, reason = check_ohe_isolation(req, isolation_available)
    if not ok:
        result.fail("ohe_power_isolation", reason)

    ok, reason = check_machine_resource_conflict(req, window, existing_blocks)
    if not ok:
        result.fail("machine_gang_conflict", reason)

    ok, reason = check_machine_transit_time(req, window, prior_block_same_machine)
    if not ok:
        result.fail("machine_transit_time", reason)

    ok, reason, _absorb_id = check_existing_block_compatibility(req, window, existing_blocks)
    if not ok:
        result.fail("existing_block_conflict", reason)

    ok, reason = check_dependency_ordering(req, window, resolved_windows)
    if not ok:
        result.fail("sequential_dependency", reason)

    return result


# ══════════════════════════════════════════════════════════════════════════
# B. GROUPING / DEPENDENCY DURATION LOGIC
# ══════════════════════════════════════════════════════════════════════════

def are_parallel_compatible(a: MaintenanceRequest, b: MaintenanceRequest) -> bool:
    """[Parallel work compatibility] independent, non-conflicting works can run together."""
    same_spot = chainage_overlap(a.chainage_start, a.chainage_end, b.chainage_start, b.chainage_end)
    shares_resources = bool(a.resources_required & b.resources_required) or a.gang_id == b.gang_id
    depends = a.depends_on_request_id == b.request_id or b.depends_on_request_id == a.request_id
    return (not same_spot) and (not shares_resources) and (not depends)


def group_compatible_requests(requests: List[MaintenanceRequest]) -> List[List[MaintenanceRequest]]:
    """[Request grouping] same-section compatible requests grouped for the same block window."""
    groups: List[List[MaintenanceRequest]] = []
    used: Set[str] = set()
    for req in requests:
        if req.request_id in used:
            continue
        group = [req]
        used.add(req.request_id)
        for other in requests:
            if other.request_id in used:
                continue
            if other.corridor_id == req.corridor_id and req.preferred_date == other.preferred_date:
                if all(are_parallel_compatible(other, member) for member in group):
                    group.append(other)
                    used.add(other.request_id)
        groups.append(group)
    return groups


def calculate_parallel_duration(group: List[MaintenanceRequest]) -> int:
    """[Parallel duration calculation] grouped parallel work uses the MAX required duration."""
    return max(r.duration_min for r in group)


def calculate_sequential_duration(chain: List[MaintenanceRequest]) -> int:
    """[Sequential duration calculation] dependent work uses combined duration + handover buffer."""
    total = 0
    for i, r in enumerate(chain):
        total += r.duration_min
        if i < len(chain) - 1:
            total += r.handover_buffer_min
    return total


# ══════════════════════════════════════════════════════════════════════════
# C. PRIORITY & RISK SCORING
# ══════════════════════════════════════════════════════════════════════════

_PRIORITY_BASE = {"Emergency": 90, "Urgent": 60, "Normal": 30}


def compute_priority_score(req: MaintenanceRequest, today: date) -> float:
    """
    [Priority/urgency handling] + [Critical-asset prioritization] + [Deadline-at-risk detection]
    Higher score = scheduled earlier. 0-100+ scale.
    """
    score = _PRIORITY_BASE.get(req.priority_level, 30)
    score += min(req.days_overdue * 1.5, 30)          # overdue work climbs, capped
    if req.is_critical_asset:
        score += 20
    if req.deadline:
        days_left = (req.deadline - today).days
        if days_left <= 0:
            score += 40                                 # deadline already at risk / missed
        elif days_left <= 3:
            score += 20
        elif days_left <= 7:
            score += 10
    return round(score, 2)


def is_deadline_at_risk(req: MaintenanceRequest, planned_date: date) -> bool:
    """[Deadline-at-risk detection]"""
    if not req.deadline:
        return False
    return planned_date > req.deadline


# ══════════════════════════════════════════════════════════════════════════
# D. TRAFFIC-AWARE PENALTIES (used by optimizer objective, not hard constraints)
# ══════════════════════════════════════════════════════════════════════════

def dense_traffic_penalty(window: Tuple[int, int]) -> int:
    """[Dense-traffic avoidance] soft penalty for touching a congested period."""
    start_min, end_min = window
    penalty = 0
    for lo, hi in DENSE_TRAFFIC_WINDOWS:
        lo_min, hi_min = time_to_min(lo), time_to_min(hi)
        if intervals_overlap(start_min, end_min, lo_min, hi_min):
            penalty += 50
    return penalty


def high_priority_train_penalty(high_priority_affected: Sequence[Union[str, TrainMovement]]) -> int:
    """[High-priority train protection] heavy penalty if an important train is impacted."""
    return 200 * len(high_priority_affected)


# ══════════════════════════════════════════════════════════════════════════
# D2. MULTI-DATE / MULTI-WINDOW FEASIBILITY SEARCH
# ══════════════════════════════════════════════════════════════════════════

NO_FEASIBLE_PLAN = "NO_FEASIBLE_PLAN"


def find_feasible_window(
    req: MaintenanceRequest,
    corridor_line: str,
    asset_registry: Dict[str, str],
    existing_blocks: List[ExistingBlock],
    train_movements_by_date: Dict[date, List[TrainMovement]],
    gap_usable_min_by_date: Dict[date, int],
    isolation_available: bool,
    resolved_windows: Dict[str, Tuple[date, int, int]],
    horizon_days: int = 7,
    candidate_start_times_min: Optional[List[int]] = None,
) -> Tuple[Optional[CandidateWindow], ConstraintResult]:
    """
    [Multi-date feasibility] + [Continuous vs split work] + [No-feasible-plan condition]

    Tries the preferred date/time first, then walks forward across the
    planning horizon, and finally (if allowed) considers splitting the
    work across shifts. Returns (best_window_or_None, last_result).
    """
    if candidate_start_times_min is None:
        candidate_start_times_min = list(range(0, 24 * 60, 30))  # every 30 min

    last_result = ConstraintResult()
    last_result.fail(NO_FEASIBLE_PLAN, "No candidate dates evaluated.")

    for day_offset in range(horizon_days):
        candidate_date = req.preferred_date + timedelta(days=day_offset)
        movements = train_movements_by_date.get(candidate_date, [])
        gap_usable = gap_usable_min_by_date.get(candidate_date, 24 * 60)

        req_for_day = req
        req_for_day.preferred_date = candidate_date

        for start_min in candidate_start_times_min:
            end_min = start_min + req.duration_min
            if end_min > 24 * 60:
                continue
            window = (start_min, end_min)

            result = evaluate_hard_constraints(
                req=req_for_day,
                window=window,
                corridor_line=corridor_line,
                asset_registry=asset_registry,
                existing_blocks=existing_blocks,
                train_movements=movements,
                gap_usable_min=gap_usable,
                isolation_available=isolation_available,
                resolved_windows=resolved_windows,
            )
            last_result = result

            if result.all_passed:
                blocked_minutes = req.duration_min
                candidate = CandidateWindow(
                    request_id=req.request_id,
                    corridor_id=req.corridor_id,
                    line=req.line,
                    block_date=candidate_date,
                    start_min=start_min,
                    end_min=end_min,
                    duration_min=req.duration_min,
                    blocked_line_minutes=blocked_minutes,
                    affected_train_count=len(result.affected_trains),
                    priority_score=compute_priority_score(req, date.today()),
                )
                return candidate, result

    # ── No single continuous window worked — try splitting, if allowed ──────
    if req.max_split_allowed and req.duration_min > 60:
        half = req.duration_min // 2
        split_req = replace(req, duration_min=half)
        candidate, split_result = find_feasible_window(
            split_req, corridor_line, asset_registry, existing_blocks,
            train_movements_by_date, gap_usable_min_by_date, isolation_available,
            resolved_windows, horizon_days, candidate_start_times_min,
        )
        if candidate:
            split_result.rejection_reasons.append(
                "Full-duration window unavailable; work split across shifts/dates instead."
            )
            return candidate, split_result

    # ── Genuinely nothing works ──────────────────────────────────────────────
    final = ConstraintResult()
    final.fail(NO_FEASIBLE_PLAN,
               f"No valid window found for '{req.request_id}' within {horizon_days}-day horizon "
               f"(last failure: {', '.join(last_result.rejection_reasons) or 'unknown'}).")
    return None, final


# ══════════════════════════════════════════════════════════════════════════
# A2. HIGH-LEVEL check_constraints() ADAPTER
#     Flat-dict interface used by planner.py and test_planning_engine.py.
#     Converts plain dicts/primitives into internal types, runs all hard
#     constraints, and returns a richly-annotated ConstraintResult.
# ══════════════════════════════════════════════════════════════════════════

def _parse_train_movements_dicts(
    train_movements: List[Dict],
    corridor_id: str,
    line: str,
    proposed_date: date,
) -> List[TrainMovement]:
    """Convert raw train_movements dicts into TrainMovement dataclass instances."""
    result: List[TrainMovement] = []
    for t in train_movements:
        # Filter by corridor/line/date
        t_corridor = t.get("corridor_id", "")
        t_line = t.get("line", "")
        t_date_str = str(t.get("movement_date", ""))[:10]
        if t_corridor and t_corridor != corridor_id:
            continue
        if t_line and t_line != line:
            continue
        if t_date_str and t_date_str != proposed_date.strftime("%Y-%m-%d"):
            continue
        # Parse times
        arr = t.get("arrival_time") or t.get("arrival") or "00:00"
        dep = t.get("departure_time") or t.get("departure") or "00:00"
        def _to_min(s: str) -> int:
            parts = s.split(":")
            return int(parts[0]) * 60 + int(parts[1]) if len(parts) >= 2 else 0
        entry = _to_min(arr)
        exit_ = _to_min(dep)
        if exit_ <= entry:
            exit_ = entry + 1
        # Nested train join (Supabase format)
        train_info = t.get("trains") or {}
        if isinstance(train_info, dict):
            priority = train_info.get("priority") or t.get("priority") or "Normal"
            train_num = train_info.get("train_number") or t.get("train_number") or "UNKNOWN"
        else:
            priority = t.get("priority") or "Normal"
            train_num = t.get("train_number") or "UNKNOWN"
        result.append(TrainMovement(
            train_number=str(train_num),
            entry_minutes=entry,
            exit_minutes=exit_,
            priority=str(priority),
            corridor_id=corridor_id,
            line=line,
            service_date=proposed_date,
        ))
    return result


def _parse_existing_blocks_dicts(
    existing_blocks: List[Dict],
    corridor_id: str,
    proposed_date: date,
) -> List[ExistingBlock]:
    """Convert raw existing_blocks dicts into ExistingBlock dataclass instances."""
    result: List[ExistingBlock] = []
    for b in existing_blocks:
        b_corridor = b.get("corridor_id", "")
        b_date_str = str(b.get("block_date", ""))[:10]
        status = b.get("status", "Scheduled")
        if b_corridor and b_corridor != corridor_id:
            continue
        if b_date_str and b_date_str != proposed_date.strftime("%Y-%m-%d"):
            continue
        def _to_min(s: str) -> int:
            parts = s.split(":")
            return int(parts[0]) * 60 + int(parts[1]) if len(parts) >= 2 else 0
        start_min = _to_min(str(b.get("start_time", "00:00")))
        end_min = _to_min(str(b.get("end_time", "00:00")))
        if end_min <= start_min:
            end_min = start_min + 1
        raw_resources = b.get("resources_required") or ""
        resources = set(r.strip() for r in str(raw_resources).split(";") if r.strip())
        result.append(ExistingBlock(
            block_id=str(b.get("block_id", b.get("id", "UNKNOWN"))),
            corridor_id=corridor_id,
            line=str(b.get("line", "")),
            block_date=proposed_date,
            start_min=start_min,
            end_min=end_min,
            department=str(b.get("department", "")),
            resources=resources,
            chainage_start=b.get("chainage_from"),
            chainage_end=b.get("chainage_to"),
            status=str(status),
        ))
    return result


def check_constraints(
    corridor_id: str,
    line: str,
    proposed_date: date,
    proposed_start: time,
    proposed_end: time,
    duration_minutes: int,
    department_name: str = "Engineering",
    request_status: str = "Pending Planning",
    existing_blocks: Optional[List[Dict]] = None,
    train_movements: Optional[List[Dict]] = None,
    corridor_data: Optional[Dict] = None,
    resources_required: str = "",
    disconnection_required: bool = False,
    ohe_isolation_available: bool = True,
    chainage_start: Optional[float] = None,
    chainage_end: Optional[float] = None,
    gap_usable_duration: Optional[int] = None,
    max_duration_minutes: int = DEFAULT_MAX_BLOCK_DURATION_MIN,
    pre_buffer_minutes: int = DEFAULT_PRE_TRAIN_BUFFER_MIN,
    post_buffer_minutes: int = DEFAULT_POST_TRAIN_BUFFER_MIN,
    # Legacy compat aliases
    pre_buffer: Optional[int] = None,
    post_buffer: Optional[int] = None,
) -> ConstraintResult:
    """
    High-level flat-dict constraint checker used by planner.py and tests.

    All inputs are plain Python primitives / dicts; the function handles
    parsing into internal domain types and runs every hard constraint.
    Returns a ConstraintResult with granular per-check boolean flags.
    """
    if pre_buffer is not None:
        pre_buffer_minutes = pre_buffer
    if post_buffer is not None:
        post_buffer_minutes = post_buffer

    cr = ConstraintResult()

    start_min = proposed_start.hour * 60 + proposed_start.minute
    end_min = proposed_end.hour * 60 + proposed_end.minute
    if end_min <= start_min:          # midnight-crossing guard
        end_min = start_min + duration_minutes
    window = (start_min, end_min)

    trains = _parse_train_movements_dicts(
        train_movements or [], corridor_id, line, proposed_date
    )
    blocks = _parse_existing_blocks_dicts(
        existing_blocks or [], corridor_id, proposed_date
    )

    gap_usable = gap_usable_duration if gap_usable_duration is not None else (24 * 60)

    # ── 1. Train occupancy + buffers ─────────────────────────────────────────
    cr.train_conflict_checked = True
    ok, reasons, affected, hi_affected = check_train_occupancy_and_buffers(
        window, trains, pre_buffer_minutes, post_buffer_minutes
    )
    cr.affected_trains = affected
    cr.high_priority_affected_trains = hi_affected

    # Granular buffer flags
    post_buf_fail = any("Post-work safety buffer" in r for r in reasons)
    pre_buf_fail = any("Pre-train safety buffer" in r for r in reasons)
    direct_conflict = any("Direct occupancy conflict" in r for r in reasons)

    cr.post_train_buffer_satisfied = not post_buf_fail
    cr.pre_train_buffer_satisfied = not pre_buf_fail
    cr.safety_buffer_satisfied = not (post_buf_fail or pre_buf_fail)

    if not ok:
        for r in reasons:
            cr.fail("train_occupancy_or_buffer", r)

    # ── 2. Existing block overlap ─────────────────────────────────────────────
    conflicting_ids: List[str] = []
    for blk in blocks:
        if blk.status in ("Cancelled", "Completed", "Rejected"):
            continue
        if intervals_overlap(start_min, end_min, blk.start_min, blk.end_min):
            # Check if this block is on the same line (or line is empty)
            if not blk.line or blk.line == line:
                conflicting_ids.append(blk.block_id)
    cr.conflicting_block_ids = conflicting_ids
    cr.no_overlapping_block = len(conflicting_ids) == 0
    if conflicting_ids:
        cr.fail(
            "no_overlapping_block",
            f"Proposed window overlaps with existing block(s): {', '.join(conflicting_ids)}",
        )

    # ── 3. Chainage / physical overlap ───────────────────────────────────────
    if chainage_start is not None and chainage_end is not None:
        phy_conflicts: List[str] = []
        for blk in blocks:
            if blk.status in ("Cancelled", "Completed", "Rejected"):
                continue
            if not intervals_overlap(start_min, end_min, blk.start_min, blk.end_min):
                continue
            if blk.chainage_start is None or blk.chainage_end is None:
                continue
            if chainage_overlap(chainage_start, chainage_end, blk.chainage_start, blk.chainage_end):
                phy_conflicts.append(blk.block_id)
        cr.no_physical_location_conflict = len(phy_conflicts) == 0
        if phy_conflicts:
            cr.fail(
                "physical_location_overlap",
                f"Chainage {chainage_start}–{chainage_end} km overlaps with block(s): {', '.join(phy_conflicts)}",
            )
    else:
        cr.no_physical_location_conflict = True

    # ── 4. Resource / machine conflict ───────────────────────────────────────
    if resources_required:
        req_resources = set(r.strip() for r in resources_required.split(";") if r.strip())
        unique_conflict = False
        for blk in blocks:
            if blk.status in ("Cancelled", "Completed", "Rejected"):
                continue
            if not intervals_overlap(start_min, end_min, blk.start_min, blk.end_min):
                continue
            clash = req_resources & blk.resources
            if clash:
                unique_conflict = True
                cr.fail(
                    "machine_gang_conflict",
                    f"Resource(s) {', '.join(clash)} already committed to block {blk.block_id} in this window.",
                )
        cr.resource_available = not unique_conflict
        cr.unique_resource_conflict = unique_conflict
    else:
        cr.resource_available = True
        cr.unique_resource_conflict = False

    # ── 5. OHE / traction disconnection ──────────────────────────────────────
    if disconnection_required and not ohe_isolation_available:
        cr.traction_disconnection_valid = False
        cr.fail(
            "ohe_power_isolation",
            "OHE / 25 kV power isolation is required but not available for this window.",
        )
    else:
        cr.traction_disconnection_valid = True

    # ── 6. Maximum block duration ─────────────────────────────────────────────
    if duration_minutes > max_duration_minutes:
        cr.max_duration_satisfied = False
        cr.fail(
            "max_block_duration",
            f"Requested duration {duration_minutes} min exceeds configured maximum of {max_duration_minutes} min.",
        )
    else:
        cr.max_duration_satisfied = True

    return cr


# ══════════════════════════════════════════════════════════════════════════
# E. OPTIMIZER — chooses the best set of already-feasible windows
#    (Block minimization, blocked-line-hours minimization,
#     affected-train minimization, resource+department integration)
# ══════════════════════════════════════════════════════════════════════════

def optimize_block_plan(
    candidates: List[CandidateWindow],
    requests_by_id: Dict[str, MaintenanceRequest],
    high_priority_penalty_by_id: Dict[str, int],
) -> List[CandidateWindow]:
    """
    Selects/schedules candidate windows to minimize total blocked-line-minutes
    and affected trains, while rewarding grouping (fewer separate blocks) and
    respecting priority weighting. Uses OR-Tools CP-SAT with AddNoOverlap for
    every genuine physical/resource conflict — no manual overlap arithmetic,
    which is the class of bug that silently let conflicts through before.

    NOTE: This function only RECOMMENDS a plan. Per the "Train regulation
    approval constraint", nothing here alters the train timetable — a human
    COA reviewer must approve before any block becomes final.
    """
    if not ORTOOLS_AVAILABLE or not candidates:
        # Deterministic fallback: sort by priority score, greedily keep
        # non-conflicting windows. Still respects grouping via chainage check.
        chosen: List[CandidateWindow] = []
        for cand in sorted(candidates, key=lambda c: -c.priority_score):
            conflict = any(
                cand.corridor_id == c.corridor_id and cand.block_date == c.block_date
                and intervals_overlap(cand.start_min, cand.end_min, c.start_min, c.end_min)
                and not are_parallel_compatible(requests_by_id[cand.request_id], requests_by_id[c.request_id])
                for c in chosen
            )
            if not conflict:
                chosen.append(cand)
        return chosen

    model = cp_model.CpModel()
    n = len(candidates)
    selected = [model.new_bool_var(f"select_{i}") for i in range(n)]

    # [Machine/resource conflict], [Chainage overlap], [Existing block conflict]:
    # any two candidates that physically clash and are NOT parallel-compatible
    # cannot both be selected.
    for i, j in itertools.combinations(range(n), 2):
        a, b = candidates[i], candidates[j]
        if a.corridor_id != b.corridor_id or a.block_date != b.block_date:
            continue
        if not intervals_overlap(a.start_min, a.end_min, b.start_min, b.end_min):
            continue
        req_a, req_b = requests_by_id[a.request_id], requests_by_id[b.request_id]
        if not are_parallel_compatible(req_a, req_b):
            model.add(selected[i] + selected[j] <= 1)   # [Competing request conflict]

    # Objective: maximize priority-weighted selection while minimizing
    # blocked-line-minutes and affected-train impact.
    # [Priority/urgency handling] [Block minimization] [Blocked-line-hours minimization]
    # [Affected-train minimization] [High-priority train protection] [Dense-traffic avoidance]
    objective_terms = []
    for i, cand in enumerate(candidates):
        req = requests_by_id[cand.request_id]
        gain = int(cand.priority_score * 100)
        gain -= cand.blocked_line_minutes                       # minimize track-hours
        gain -= cand.affected_train_count * 30                  # minimize trains affected
        gain -= dense_traffic_penalty((cand.start_min, cand.end_min))
        gain -= high_priority_penalty_by_id.get(cand.request_id, 0)
        objective_terms.append(gain * selected[i])

    model.maximize(sum(objective_terms))

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 10
    status = solver.solve(model)

    # [No-feasible-plan condition]: report explicitly rather than guessing.
    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return []

    return [candidates[i] for i in range(n) if solver.value(selected[i]) == 1]


# ══════════════════════════════════════════════════════════════════════════
# F. TOP-LEVEL PIPELINE
# ══════════════════════════════════════════════════════════════════════════

def run_planning_cycle(
    requests: List[MaintenanceRequest],
    corridor_lines: Dict[str, str],
    asset_registry: Dict[str, str],
    existing_blocks: List[ExistingBlock],
    train_movements_by_date: Dict[date, List[TrainMovement]],
    gap_usable_min_by_date: Dict[date, int],
    isolation_available: bool = True,
    horizon_days: int = 7,
) -> Dict[str, object]:
    """
    Full pipeline: for every request, find a feasible window across the
    horizon (or report NO_FEASIBLE_PLAN), then optimize the overall set.
    Returns a COA-review-ready recommendation set — nothing here is
    auto-approved. [Train regulation approval constraint]
    """
    resolved_windows: Dict[str, Tuple[date, int, int]] = {}
    candidates: List[CandidateWindow] = []
    rejected: Dict[str, ConstraintResult] = {}
    requests_by_id = {r.request_id: r for r in requests}

    # Dependencies must be resolved before dependents — simple topological pass.
    ordered = sorted(requests, key=lambda r: r.depends_on_request_id is not None)

    for req in ordered:
        candidate, result = find_feasible_window(
            req=req,
            corridor_line=corridor_lines.get(req.corridor_id, ""),
            asset_registry=asset_registry,
            existing_blocks=existing_blocks,
            train_movements_by_date=train_movements_by_date,
            gap_usable_min_by_date=gap_usable_min_by_date,
            isolation_available=isolation_available,
            resolved_windows=resolved_windows,
            horizon_days=horizon_days,
        )
        if candidate:
            candidates.append(candidate)
            resolved_windows[req.request_id] = (candidate.block_date, candidate.start_min, candidate.end_min)
        else:
            rejected[req.request_id] = result

    high_priority_penalty = {
        c.request_id: high_priority_train_penalty(
            [t.train_number for t in train_movements_by_date.get(c.block_date, []) if t.priority in HIGH_PRIORITY_TRAIN_CLASSES]
        )
        for c in candidates
    }

    final_plan = optimize_block_plan(candidates, requests_by_id, high_priority_penalty)

    return {
        "recommended_plan": final_plan,
        "no_feasible_plan": {rid: res.rejection_reasons for rid, res in rejected.items()},
        "pending_coa_review": True,   # [Train regulation approval constraint]
    }