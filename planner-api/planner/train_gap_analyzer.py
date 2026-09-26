"""
planner/train_gap_analyzer.py

Implements Rule Groups 6, 7, 8, 9, 10, 13, 14, 15, 16, 17, 18, 48, 49:
  - Rule Group 6: Train Movement Analysis (entry, exit, arrival, departure, priority)
  - Rule Group 7: Train-Free Gap Calculation
  - Rule Group 8: Pre-Train Safety Buffer (default 10m)
  - Rule Group 9: Post-Train Safety Buffer (default 15m)
  - Rule Group 10: Actual Available Maintenance Window
  - Rule Group 13 & 14: Train Impact & Priority Multipliers
  - Rule Group 15 & 49: Train-Dense Period Avoidance & Density Scoring
  - Rule Group 16 & 48: Train Gap Quality & Unused Gap Calculation
  - Rule Group 17: Line & Direction Checking
  - Rule Group 18: Section Occupancy Analysis
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import date, time, datetime, timedelta
from typing import List, Dict, Optional, Tuple, Any

from .config import (
    PRE_TRAIN_BUFFER,
    POST_TRAIN_BUFFER,
    DEFAULT_PRE_TRAIN_BUFFER_MINUTES,
    DEFAULT_POST_TRAIN_BUFFER_MINUTES,
    TRAIN_PRIORITY_MULTIPLIERS,
    DEFAULT_PLANNING_HORIZON_DAYS,
)

logger = logging.getLogger(__name__)


# ─── Data Structures ──────────────────────────────────────────────────────────

@dataclass
class TrainOccupancy:
    """
    Represents a train movement occupying a specific section (Specification Section 2).
    Captures complete timetable attributes for train-timing-based analysis.
    """
    train_number: str
    corridor_id: str
    movement_date: date
    entry_minutes: int         # minutes since midnight (00:00 = 0, 23:59 = 1439)
    exit_minutes: int          # minutes since midnight
    priority: str = "Medium"   # Highest, High, Medium, Low
    train_type: str = "Express"
    line: str = "UP Line"
    direction: str = "UP"      # UP or DN
    train_id: str = ""
    train_name: str = ""
    section: str = ""
    scheduled_time: str = ""
    operational_status: str = "Running"

    @property
    def dwell_minutes(self) -> int:
        return max(1, self.exit_minutes - self.entry_minutes)


@dataclass
class OperationalRegulationScenario:
    """
    Option B — Operational Regulation Scenario (Specification Section 6 & 7).
    Identifies a proposed maintenance block where complete continuous gap is not naturally
    available, but could theoretically be realized by regulating lower-priority trains.
    IMPORTANT: The planner NEVER automatically cancels or delays trains. It flags COA approval.
    """
    target_date: date
    start_time: time
    end_time: time
    duration_minutes: int
    start_minutes: int
    end_minutes: int
    affected_trains: List[str]               # All affected train numbers
    affected_train_count: int
    high_priority_affected_trains: List[str] # Subset of trains with Highest or High priority
    affected_train_details: List[Dict[str, Any]]
    train_impact_score: float
    corridor_id: str
    line: str
    operational_regulation_required: bool = True
    approval_required: bool = True
    approval_authority: str = "COA"
    regulation_reason: str = ""


@dataclass
class TrainFreeGap:
    """
    Represents an actual train-free gap between two train movements (or boundary of day),
    with safety buffers applied to determine the usable maintenance opportunity.
    """
    gap_date: date
    corridor_id: str
    line: str

    # Raw gap bounds (train exit to next train entry)
    raw_start_minutes: int
    raw_end_minutes: int

    # Usable maintenance opportunity (after post-train and pre-train buffers)
    usable_start_minutes: int
    usable_end_minutes: int

    # Applied buffers
    post_buffer_minutes: int
    pre_buffer_minutes: int

    # Trains flanking this gap
    prev_train: Optional[TrainOccupancy] = None
    next_train: Optional[TrainOccupancy] = None

    # Density & Quality Metrics
    surrounding_train_density: int = 0  # number of trains within ±60m
    quality_score: float = 100.0

    @property
    def raw_duration_minutes(self) -> int:
        return max(0, self.raw_end_minutes - self.raw_start_minutes)

    @property
    def usable_duration_minutes(self) -> int:
        return max(0, self.usable_end_minutes - self.usable_start_minutes)

    @property
    def usable_start_time(self) -> time:
        m = max(0, min(1439, self.usable_start_minutes))
        return time(m // 60, m % 60)

    @property
    def usable_end_time(self) -> time:
        m = max(0, min(1439, self.usable_end_minutes))
        return time(m // 60, m % 60)


# ─── Time Helpers ─────────────────────────────────────────────────────────────

def parse_time_to_minutes(t_val: Any) -> int:
    """Parse time object or 'HH:MM' / 'HH:MM:SS' string to minutes since midnight."""
    if t_val is None:
        return 0
    if isinstance(t_val, time):
        return t_val.hour * 60 + t_val.minute
    s = str(t_val).strip()
    parts = s.split(":")
    try:
        return int(parts[0]) * 60 + int(parts[1])
    except (ValueError, IndexError):
        return 0


def minutes_to_time(minutes: int) -> time:
    """Convert integer minutes since midnight to time object (clamped to 00:00–23:59)."""
    m = max(0, min(1439, minutes))
    return time(m // 60, m % 60)


# ─── Section Occupancy & Train Filtering ──────────────────────────────────────

def extract_train_occupancies(
    train_movements: List[dict],
    corridor_id: str,
    target_date: date,
    line: Optional[str] = None,
) -> List[TrainOccupancy]:
    """
    Extract and calculate section occupancy for trains traversing the corridor on target_date (Rule Groups 6, 17, 18).

    Direction / Line rule (Rule Group 17):
      - If corridor line is 'UP Line', only UP Line movements create conflicts.
      - If 'DN Line', only DN Line movements create conflicts.
      - If 'Both Lines', both UP and DN trains create conflicts.
    """
    occupancies: List[TrainOccupancy] = []
    target_date_str = target_date.strftime("%Y-%m-%d")

    for mv in train_movements:
        mv_corridor = str(mv.get("corridor_id") or "")
        if mv_corridor != corridor_id:
            continue

        mv_date = str(mv.get("movement_date") or mv.get("date") or "")[:10]
        if mv_date != target_date_str:
            continue

        # Line check (Rule Group 17)
        mv_line = mv.get("line") or ""
        if line and mv_line and line not in ("Both Lines",) and mv_line not in ("Both Lines",):
            # If line is specified and differs, skip (e.g. UP line work not affected by DN train)
            if ("up" in line.lower() and "dn" in mv_line.lower()) or ("dn" in line.lower() and "up" in mv_line.lower()):
                continue

        arr = mv.get("arrival_time")
        dep = mv.get("departure_time")
        if not arr and not dep:
            continue

        arr_min = parse_time_to_minutes(arr) if arr else parse_time_to_minutes(dep)
        dep_min = parse_time_to_minutes(dep) if dep else parse_time_to_minutes(arr)

        entry_min = min(arr_min, dep_min)
        exit_min = max(arr_min, dep_min)

        # Minimum section dwell is at least 3 minutes
        if exit_min <= entry_min:
            exit_min = entry_min + 3

        train_info = mv.get("trains") or {}
        train_num = (
            mv.get("train_number") or
            train_info.get("train_number") or
            mv.get("train_id") or
            mv.get("id") or "TRAIN"
        )
        prio = mv.get("priority") or train_info.get("priority") or "Medium"
        t_type = mv.get("train_type") or train_info.get("train_type") or "Express"
        t_name = mv.get("train_name") or train_info.get("train_name") or ""
        t_dir = mv.get("direction") or "UP"
        t_sec = mv.get("block_section") or mv.get("section") or ""
        t_status = mv.get("status") or "Running"
        t_sched = f"{arr or ''} - {dep or ''}".strip(" -")

        occ = TrainOccupancy(
            train_number=str(train_num),
            corridor_id=mv_corridor,
            movement_date=target_date,
            entry_minutes=entry_min,
            exit_minutes=exit_min,
            priority=prio,
            train_type=t_type,
            line=mv_line or (line or "UP Line"),
            direction=t_dir,
            train_id=str(mv.get("train_id") or train_info.get("id") or train_num),
            train_name=t_name,
            section=t_sec,
            scheduled_time=t_sched,
            operational_status=t_status,
        )
        occupancies.append(occ)

    # Sort chronologically by section entry time
    occupancies.sort(key=lambda t: t.entry_minutes)
    return occupancies


# ─── Train-Free Gap Calculation (Rule Groups 7, 8, 9, 10) ─────────────────────

def calculate_train_free_gaps(
    train_movements: List[dict],
    corridor_id: str,
    target_date: date,
    line: Optional[str] = None,
    post_buffer: int = DEFAULT_POST_TRAIN_BUFFER_MINUTES,
    pre_buffer: int = DEFAULT_PRE_TRAIN_BUFFER_MINUTES,
    min_required_duration: int = 30,
) -> List[TrainFreeGap]:
    """
    Calculate all feasible train-free gaps on a section for a given date.

    Timeline:
      00:00 (Midnight)
         ↓  [Gap 0]
      Train 1 (entry → exit)
         ↓  [Gap 1: exit_1 + post_buffer → entry_2 - pre_buffer]
      Train 2 (entry → exit)
         ↓  ...
      Train N (entry → exit)
         ↓  [Gap N: exit_N + post_buffer → 23:59]
      23:59 (End of day)

    Only gaps where usable_duration >= min_required_duration are returned.
    """
    trains = extract_train_occupancies(train_movements, corridor_id, target_date, line)
    gaps: List[TrainFreeGap] = []

    DAY_START_MIN = 0
    DAY_END_MIN = 1439

    if not trains:
        # Whole day is completely free!
        usable_start = DAY_START_MIN
        usable_end = DAY_END_MIN
        gaps.append(TrainFreeGap(
            gap_date=target_date,
            corridor_id=corridor_id,
            line=line or "UP Line",
            raw_start_minutes=DAY_START_MIN,
            raw_end_minutes=DAY_END_MIN,
            usable_start_minutes=usable_start,
            usable_end_minutes=usable_end,
            post_buffer_minutes=0,
            pre_buffer_minutes=0,
            prev_train=None,
            next_train=None,
            surrounding_train_density=0,
            quality_score=100.0,
        ))
        return gaps

    # Gap 1: From day start to first train
    first_train = trains[0]
    raw_gap_0 = first_train.entry_minutes - DAY_START_MIN
    usable_end_0 = first_train.entry_minutes - pre_buffer
    if usable_end_0 - DAY_START_MIN >= min_required_duration:
        gaps.append(TrainFreeGap(
            gap_date=target_date,
            corridor_id=corridor_id,
            line=line or "UP Line",
            raw_start_minutes=DAY_START_MIN,
            raw_end_minutes=first_train.entry_minutes,
            usable_start_minutes=DAY_START_MIN,
            usable_end_minutes=max(DAY_START_MIN, usable_end_0),
            post_buffer_minutes=0,
            pre_buffer_minutes=pre_buffer,
            prev_train=None,
            next_train=first_train,
        ))

    # Intermediate Gaps: Between Train[i] and Train[i+1]
    for i in range(len(trains) - 1):
        curr_train = trains[i]
        next_train = trains[i + 1]

        raw_start = curr_train.exit_minutes
        raw_end = next_train.entry_minutes

        if raw_end > raw_start:
            usable_start = raw_start + post_buffer
            usable_end = raw_end - pre_buffer

            if (usable_end - usable_start) >= min_required_duration:
                gap = TrainFreeGap(
                    gap_date=target_date,
                    corridor_id=corridor_id,
                    line=line or "UP Line",
                    raw_start_minutes=raw_start,
                    raw_end_minutes=raw_end,
                    usable_start_minutes=usable_start,
                    usable_end_minutes=usable_end,
                    post_buffer_minutes=post_buffer,
                    pre_buffer_minutes=pre_buffer,
                    prev_train=curr_train,
                    next_train=next_train,
                )
                gaps.append(gap)

    # Final Gap: From last train exit to day end
    last_train = trains[-1]
    usable_start_last = last_train.exit_minutes + post_buffer
    if (DAY_END_MIN - usable_start_last) >= min_required_duration:
        gaps.append(TrainFreeGap(
            gap_date=target_date,
            corridor_id=corridor_id,
            line=line or "UP Line",
            raw_start_minutes=last_train.exit_minutes,
            raw_end_minutes=DAY_END_MIN,
            usable_start_minutes=usable_start_last,
            usable_end_minutes=DAY_END_MIN,
            post_buffer_minutes=post_buffer,
            pre_buffer_minutes=0,
            prev_train=last_train,
            next_train=None,
        ))

    # Calculate surrounding train density for each gap (Rule Group 15 & 49)
    for gap in gaps:
        center_min = (gap.usable_start_minutes + gap.usable_end_minutes) // 2
        # Count trains within 90 minutes of the gap window
        window_start = max(0, gap.usable_start_minutes - 90)
        window_end = min(1439, gap.usable_end_minutes + 90)
        density = sum(1 for t in trains if (t.entry_minutes < window_end and t.exit_minutes > window_start))
        gap.surrounding_train_density = density

    return gaps


# ─── Train Impact Evaluation (Rule Groups 13, 14, 15) ─────────────────────────

def evaluate_window_train_impact(
    start_min: int,
    end_min: int,
    trains: List[TrainOccupancy],
    post_buffer: int = DEFAULT_POST_TRAIN_BUFFER_MINUTES,
    pre_buffer: int = DEFAULT_PRE_TRAIN_BUFFER_MINUTES,
) -> Tuple[float, List[str], int]:
    """
    Evaluate train conflict and impact for a proposed block [start_min, end_min].

    A train is affected if the block interval (expanded by buffers) overlaps
    the train's section occupancy:
        [start_min - post_buffer, end_min + pre_buffer] overlaps [train.entry, train.exit]

    Returns:
      (train_impact_score [0..100], affected_train_numbers, affected_count)
    """
    buffered_start = start_min - post_buffer
    buffered_end = end_min + pre_buffer

    affected_trains: List[str] = []
    total_penalty = 0.0

    for t in trains:
        # Standard interval overlap test
        if buffered_start < t.exit_minutes and buffered_end > t.entry_minutes:
            affected_trains.append(t.train_number)
            multiplier = TRAIN_PRIORITY_MULTIPLIERS.get(t.priority, 1.0)
            # High priority trains contribute more impact
            total_penalty += 25.0 * multiplier

    impact_score = min(100.0, total_penalty)
    return impact_score, affected_trains, len(affected_trains)


def evaluate_window_train_impact_detailed(
    start_min: int,
    end_min: int,
    trains: List[TrainOccupancy],
    post_buffer: int = POST_TRAIN_BUFFER,
    pre_buffer: int = PRE_TRAIN_BUFFER,
) -> Tuple[float, List[str], int, List[str], List[Dict[str, Any]]]:
    """
    Detailed train impact evaluation (Specification Section 6, 7 & 15).
    Computes priority-weighted penalty, identifies high-priority trains (Highest/High),
    and records detailed breakdown per conflicting train movement.

    Returns:
      (train_impact_score, affected_trains, affected_count, high_priority_affected_trains, train_details)
    """
    buffered_start = start_min - post_buffer
    buffered_end = end_min + pre_buffer

    affected_trains: List[str] = []
    high_priority_trains: List[str] = []
    details: List[Dict[str, Any]] = []
    total_penalty = 0.0

    for t in trains:
        if buffered_start < t.exit_minutes and buffered_end > t.entry_minutes:
            affected_trains.append(t.train_number)
            multiplier = TRAIN_PRIORITY_MULTIPLIERS.get(t.priority, 1.0)
            if t.priority in ("Highest", "High"):
                high_priority_trains.append(t.train_number)

            overlap_duration = max(1, min(buffered_end, t.exit_minutes) - max(buffered_start, t.entry_minutes))
            # train_impact = priority_weight * operational_impact * duration_impact
            train_pen = 25.0 * multiplier * min(2.0, max(0.5, overlap_duration / 30.0))
            total_penalty += train_pen

            details.append({
                "train_number": t.train_number,
                "train_name": t.train_name,
                "train_type": t.train_type,
                "priority": t.priority,
                "direction": t.direction,
                "entry_time": minutes_to_time(t.entry_minutes).strftime("%H:%M"),
                "exit_time": minutes_to_time(t.exit_minutes).strftime("%H:%M"),
                "overlap_minutes": overlap_duration,
                "penalty": round(train_pen, 1),
            })

    impact_score = min(100.0, total_penalty)
    return impact_score, affected_trains, len(affected_trains), high_priority_trains, details


def find_operational_regulation_scenarios(
    train_movements: List[dict],
    corridor_id: str,
    target_date: date,
    required_duration: int,
    line: Optional[str] = None,
    preferred_start_time: Optional[str] = None,
    post_buffer: int = POST_TRAIN_BUFFER,
    pre_buffer: int = PRE_TRAIN_BUFFER,
    horizon_days: int = DEFAULT_PLANNING_HORIZON_DAYS,
    step_minutes: int = 30,
) -> List[OperationalRegulationScenario]:
    """
    Search for operational regulation scenarios (Specification Section 6 & 7).
    Identifies candidate windows where conflicting trains are of lower priority (e.g. Goods, Passenger),
    calculates exact impact, and proposes a regulation candidate flagged for COA approval.

    CRITICAL RAILWAY RULE (Specification Section 6 & 7):
    DO NOT automatically cancel, delay, or modify the train timetable!
    The scenario simply produces a proposal for COA controller decision.
    """
    scenarios: List[OperationalRegulationScenario] = []
    pref_min = parse_time_to_minutes(preferred_start_time) if preferred_start_time else None

    for day_offset in range(horizon_days):
        curr_date = target_date + timedelta(days=day_offset)
        trains = extract_train_occupancies(train_movements, corridor_id, curr_date, line)
        if not trains:
            continue

        sample_starts = list(range(0, 1440 - required_duration + 1, step_minutes))
        if pref_min is not None and (pref_min + required_duration <= 1440):
            if pref_min not in sample_starts:
                sample_starts.append(pref_min)
                sample_starts.sort()

        for s_min in sample_starts:
            e_min = s_min + required_duration
            impact, affected, count, high_prio, details = evaluate_window_train_impact_detailed(
                start_min=s_min,
                end_min=e_min,
                trains=trains,
                post_buffer=post_buffer,
                pre_buffer=pre_buffer,
            )
            if count == 0:
                continue

            dur_hr = round(required_duration / 60.0, 1)
            high_note = f" (including {len(high_prio)} high-priority: {', '.join(high_prio)})" if high_prio else " (0 high-priority trains affected)"
            reason = (
                f"Required {dur_hr}h continuous block is unavailable under the current timetable. "
                f"A lower-impact train regulation scenario proposing regulation of lower-priority train(s) "
                f"[{', '.join(affected)}]{high_note} may create a feasible block and requires COA approval."
            )

            sc = OperationalRegulationScenario(
                target_date=curr_date,
                start_time=minutes_to_time(s_min),
                end_time=minutes_to_time(e_min),
                duration_minutes=required_duration,
                start_minutes=s_min,
                end_minutes=e_min,
                affected_trains=affected,
                affected_train_count=count,
                high_priority_affected_trains=high_prio,
                affected_train_details=details,
                train_impact_score=impact,
                corridor_id=corridor_id,
                line=line or "UP Line",
                operational_regulation_required=True,
                approval_required=True,
                approval_authority="COA",
                regulation_reason=reason,
            )
            scenarios.append(sc)

    # Rank scenarios:
    # 1. Zero/minimal high priority affected trains (Highest, High)
    # 2. Minimum total train impact score
    # 3. Minimum affected train count
    # 4. Proximity to preferred start time
    def sort_key(s: OperationalRegulationScenario):
        high_penalty = len(s.high_priority_affected_trains) * 1000
        impact_penalty = s.train_impact_score * 10
        count_penalty = s.affected_train_count * 20
        pref_penalty = abs(s.start_minutes - pref_min) if pref_min is not None else 0
        day_penalty = (s.target_date - target_date).days * 50
        return (high_penalty + impact_penalty + count_penalty + pref_penalty + day_penalty)

    scenarios.sort(key=sort_key)
    return scenarios

