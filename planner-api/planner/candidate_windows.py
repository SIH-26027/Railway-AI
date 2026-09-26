"""
planner/candidate_windows.py

Generates candidate maintenance block windows directly from actual train-free gaps.
Replaces simplistic fixed-zone generation with train-gap-driven scheduling.

Implements Rule Groups 7, 10, 12, 16, 38, 39, 40, 41, 44, 48, 50:
  - Dynamically calculates candidate windows from train-free gaps
  - Multi-day planning horizon search (Rule Group 39)
  - Preferred date and time soft alignment (Rule Groups 38, 40, 50)
  - Train gap efficiency & unused gap calculation (Rule Groups 16 & 48)
  - Block duration minimization (Rule Groups 12 & 44)
  - Soft zone preferences (Rule Group 41)
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import date, time, timedelta
from typing import List, Optional, Tuple, Dict, Any

from .config import (
    PRE_TRAIN_BUFFER,
    POST_TRAIN_BUFFER,
    DEFAULT_PLANNING_HORIZON_DAYS,
    STEP_MINUTES,
    MAX_CANDIDATES_PER_GROUP,
    PREFERRED_TIME_TOLERANCE_MINUTES,
    SOFT_ZONE_PREFERENCES,
    DEFAULT_POST_TRAIN_BUFFER_MINUTES,
    DEFAULT_PRE_TRAIN_BUFFER_MINUTES,
)
from .train_gap_analyzer import (
    TrainFreeGap,
    calculate_train_free_gaps,
    minutes_to_time,
    parse_time_to_minutes,
)

logger = logging.getLogger(__name__)


# ─── Data Structure ───────────────────────────────────────────────────────────

@dataclass
class CandidateWindow:
    """
    Candidate block window generated from an actual train-free gap.
    Fully compatible with legacy CandidateWindow attributes.
    """
    window_date: date
    start_time: time
    end_time: time
    duration_minutes: int
    slot_label: str
    preference_rank: int            # 1 = most preferred (lower is better)
    start_minutes: int              # minutes since midnight
    end_minutes: int                # minutes since midnight

    # Railway Gap Metrics (Rule Groups 10, 16, 48, 49)
    gap_start_minutes: int = 0
    gap_end_minutes: int = 0
    gap_usable_duration: int = 0
    unused_gap_minutes: int = 0     # gap_usable_duration - duration_minutes
    gap_efficiency_score: float = 1.0  # duration_minutes / gap_usable_duration
    surrounding_density: int = 0
    is_preferred_date: bool = True
    is_near_preferred_time: bool = False
    coordination_possible: bool = False
    gap_reference: Optional[TrainFreeGap] = None


# ─── Soft Zone Labeling ───────────────────────────────────────────────────────

def _get_slot_label(start_min: int, end_min: int) -> str:
    """Identify matching soft railway slack window name if applicable."""
    for zone_start_str, zone_end_str, label, _ in SOFT_ZONE_PREFERENCES:
        z_start = parse_time_to_minutes(zone_start_str)
        z_end = parse_time_to_minutes(zone_end_str)
        # If window is mostly within this soft zone
        if start_min >= z_start and end_min <= z_end:
            return label
    # Default label based on hour
    hour = start_min // 60
    if 0 <= hour < 5:
        return "Night Slack"
    elif 5 <= hour < 9:
        return "Morning Corridor"
    elif 9 <= hour < 16:
        return "Midday Window"
    elif 16 <= hour < 20:
        return "Evening Window"
    else:
        return "Late Night Window"


# ─── Candidate Window Generator ───────────────────────────────────────────────

def generate_candidate_windows_for_group(
    corridor_id: str,
    line: str,
    target_date: date,
    required_duration: int,
    preferred_start_time: Optional[str] = None,
    train_movements: Optional[List[dict]] = None,
    horizon_days: int = DEFAULT_PLANNING_HORIZON_DAYS,
    max_candidates: int = MAX_CANDIDATES_PER_GROUP,
    post_buffer: int = DEFAULT_POST_TRAIN_BUFFER_MINUTES,
    pre_buffer: int = DEFAULT_PRE_TRAIN_BUFFER_MINUTES,
) -> List[CandidateWindow]:
    """
    Generate candidate maintenance block windows for a request group across the planning horizon.

    Algorithm:
      1. For each day in horizon (starting with target_date):
         a. Compute actual train-free gaps with post/pre buffers
         b. For each gap >= required_duration:
            - Place window at gap start
            - If preferred_start_time falls in gap, place aligned window
            - Slide in STEP_MINUTES steps if gap is large
         c. Calculate unused gap and gap efficiency
      2. Rank candidates by gap quality, date proximity, and efficiency
      3. Return up to max_candidates
    """
    if required_duration <= 0:
        return []

    trains = train_movements or []
    pref_min = parse_time_to_minutes(preferred_start_time) if preferred_start_time else None

    raw_candidates: List[CandidateWindow] = []

    for day_offset in range(horizon_days):
        current_date = target_date + timedelta(days=day_offset)
        is_pref_date = (day_offset == 0)

        # 1. Calculate actual train-free gaps for current_date
        gaps = calculate_train_free_gaps(
            train_movements=trains,
            corridor_id=corridor_id,
            target_date=current_date,
            line=line,
            post_buffer=post_buffer,
            pre_buffer=pre_buffer,
            min_required_duration=required_duration,
        )

        for gap in gaps:
            usable_dur = gap.usable_duration_minutes
            if usable_dur < required_duration:
                continue

            # Candidate start positions to try
            start_positions: List[int] = []

            # 1. At start of usable gap (earliest possible in gap)
            start_positions.append(gap.usable_start_minutes)

            # 2. At preferred start time (if inside gap and fits)
            if pref_min is not None:
                if gap.usable_start_minutes <= pref_min <= (gap.usable_end_minutes - required_duration):
                    if pref_min not in start_positions:
                        start_positions.append(pref_min)

            # 3. Slide through gap in STEP_MINUTES to find alternatives
            step_pos = gap.usable_start_minutes + STEP_MINUTES
            while step_pos + required_duration <= gap.usable_end_minutes:
                if step_pos not in start_positions:
                    start_positions.append(step_pos)
                step_pos += STEP_MINUTES

            # Build windows for each start position
            for pos in sorted(start_positions):
                win_end = pos + required_duration
                label = _get_slot_label(pos, win_end)
                unused = usable_dur - required_duration
                eff_score = round(required_duration / max(1, usable_dur), 3)
                near_pref = (abs(pos - pref_min) <= PREFERRED_TIME_TOLERANCE_MINUTES) if pref_min is not None else False

                cw = CandidateWindow(
                    window_date=current_date,
                    start_time=minutes_to_time(pos),
                    end_time=minutes_to_time(win_end),
                    duration_minutes=required_duration,
                    slot_label=label,
                    preference_rank=1,  # updated below
                    start_minutes=pos,
                    end_minutes=win_end,
                    gap_start_minutes=gap.usable_start_minutes,
                    gap_end_minutes=gap.usable_end_minutes,
                    gap_usable_duration=usable_dur,
                    unused_gap_minutes=unused,
                    gap_efficiency_score=eff_score,
                    surrounding_density=gap.surrounding_train_density,
                    is_preferred_date=is_pref_date,
                    is_near_preferred_time=near_pref,
                    gap_reference=gap,
                )
                raw_candidates.append(cw)

                if len(raw_candidates) >= max_candidates * 3:
                    break

        if len(raw_candidates) >= max_candidates * 2:
            break

    # Strict Train-Timing Principle (Specification Section 2, 20, 21):
    # Do NOT fabricate arbitrary time windows from predefined soft zones.
    # Candidate windows must be driven exclusively by actual safe train-free gaps.
    # If no natural gap is available, the planner evaluates request merging, existing block
    # absorption, alternative dates, split work, or operational regulation scenarios in planner.py.

    # Rank candidates by heuristic score (Rule Groups 16, 40, 48, 50)
    # Higher rank value = lower priority.
    def candidate_sort_key(c: CandidateWindow):
        date_penalty = 0 if c.is_preferred_date else 100
        pref_time_bonus = -50 if c.is_near_preferred_time else 0
        density_penalty = c.surrounding_density * 20
        unused_penalty = c.unused_gap_minutes // 15
        return (date_penalty + pref_time_bonus + density_penalty + unused_penalty)

    raw_candidates.sort(key=candidate_sort_key)

    # Assign 1-based preference_rank
    final_candidates: List[CandidateWindow] = []
    for rank, cand in enumerate(raw_candidates[:max_candidates], start=1):
        cand.preference_rank = rank
        final_candidates.append(cand)

    return final_candidates


# Backward compatibility alias
def generate_candidate_windows(
    requested_date: date,
    duration_minutes: int,
    preferred_start_time: Optional[str] = None,
    max_windows: int = 20,
    corridor_id: str = "",
    line: str = "UP Line",
    train_movements: Optional[List[dict]] = None,
) -> List[CandidateWindow]:
    """Wrapper providing backward compatibility with existing test scripts and functions."""
    return generate_candidate_windows_for_group(
        corridor_id=corridor_id,
        line=line,
        target_date=requested_date,
        required_duration=duration_minutes,
        preferred_start_time=preferred_start_time,
        train_movements=train_movements,
        max_candidates=max_windows,
    )
