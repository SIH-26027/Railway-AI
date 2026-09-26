"""
planner/existing_block_merger.py

Implements Rule Groups 5, 33, and 34:
  - Rule Group 5: Existing Block Utilization (Planned, Approved, Active blocks)
  - Rule Group 33: Existing Block Overlap & Incompatibility Checking
  - Rule Group 34: Block Merging & Absorption of Compatible Requests
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import date, time
from typing import List, Dict, Optional, Tuple, Any

from .config import (
    DEFAULT_MAX_BLOCK_DURATION_MINUTES,
    DEFAULT_TRANSITION_TIME_MINUTES,
)
from .train_gap_analyzer import parse_time_to_minutes, minutes_to_time

logger = logging.getLogger(__name__)


# ─── Data Structure ───────────────────────────────────────────────────────────

@dataclass
class ExistingBlockMergeResult:
    can_merge: bool
    merged_block_id: Optional[str] = None
    original_start_time: Optional[time] = None
    original_end_time: Optional[time] = None
    merged_start_time: Optional[time] = None
    merged_end_time: Optional[time] = None
    merged_duration_minutes: int = 0
    reason: str = ""
    is_absorbed_inside: bool = False   # Request executed completely inside existing time window


# ─── Merging Evaluation ───────────────────────────────────────────────────────

def evaluate_existing_block_merge(
    corridor_id: str,
    line: str,
    target_date: date,
    required_duration_minutes: int,
    preferred_start_time: Optional[str],
    existing_blocks: List[dict],
    department_name: str = "",
    resources_required: Optional[str] = None,
    disconnection_required: bool = False,
    max_block_duration: int = DEFAULT_MAX_BLOCK_DURATION_MINUTES,
) -> ExistingBlockMergeResult:
    """
    Check if a new maintenance request can be merged into an existing planned, approved, or active block.

    Rule Group 5 & 34:
      - Same corridor
      - Same line / compatible track
      - Same date
      - Not Cancelled / Completed
      - Does not exceed max_block_duration
      - Absorbing or extending the block window safely
    """
    date_str = target_date.strftime("%Y-%m-%d")
    pref_start_min = parse_time_to_minutes(preferred_start_time) if preferred_start_time else None

    for blk in existing_blocks:
        b_corridor = str(blk.get("corridor_id") or "")
        if b_corridor != corridor_id:
            continue

        b_date = str(blk.get("block_date") or blk.get("date") or "")[:10]
        if b_date != date_str:
            continue

        b_status = blk.get("status", "")
        if b_status in ("Cancelled", "Completed", "Rejected"):
            continue

        b_line = blk.get("line") or ""
        if b_line and line and b_line != line:
            if b_line != "Both Lines" and line != "Both Lines":
                continue

        b_start_min = parse_time_to_minutes(blk.get("start_time", "00:00"))
        b_end_min = parse_time_to_minutes(blk.get("end_time", "00:00"))
        b_dur = b_end_min - b_start_min
        blk_id = blk.get("block_id") or blk.get("id") or "BLK"

        # Case A: Request completely fits INSIDE the existing block window (Rule Group 5)
        # e.g. Existing block: 02:00-03:00 (60 min), New request: 30 min
        if required_duration_minutes <= b_dur:
            if pref_start_min is not None:
                # If preferred start fits inside existing block
                if b_start_min <= pref_start_min and (pref_start_min + required_duration_minutes) <= b_end_min:
                    return ExistingBlockMergeResult(
                        can_merge=True,
                        merged_block_id=str(blk_id),
                        original_start_time=minutes_to_time(b_start_min),
                        original_end_time=minutes_to_time(b_end_min),
                        merged_start_time=minutes_to_time(b_start_min),
                        merged_end_time=minutes_to_time(b_end_min),
                        merged_duration_minutes=b_dur,
                        reason=f"Request absorbed completely inside existing block {blk_id} ({minutes_to_time(b_start_min).strftime('%H:%M')}–{minutes_to_time(b_end_min).strftime('%H:%M')})",
                        is_absorbed_inside=True,
                    )
            else:
                # Can execute within the existing block window
                return ExistingBlockMergeResult(
                    can_merge=True,
                    merged_block_id=str(blk_id),
                    original_start_time=minutes_to_time(b_start_min),
                    original_end_time=minutes_to_time(b_end_min),
                    merged_start_time=minutes_to_time(b_start_min),
                    merged_end_time=minutes_to_time(b_end_min),
                    merged_duration_minutes=b_dur,
                    reason=f"Request absorbed completely inside existing block {blk_id} ({minutes_to_time(b_start_min).strftime('%H:%M')}–{minutes_to_time(b_end_min).strftime('%H:%M')})",
                    is_absorbed_inside=True,
                )

        # Case B: Request can extend existing block window sequentially (Rule Group 34)
        # e.g. Existing: 02:00-03:00, New: 02:30-03:30 -> Merged: 02:00-03:30
        potential_start = min(b_start_min, pref_start_min if pref_start_min is not None else b_start_min)
        potential_end = max(b_end_min, (pref_start_min + required_duration_minutes) if pref_start_min is not None else (b_start_min + required_duration_minutes))
        merged_dur = potential_end - potential_start

        if merged_dur <= max_block_duration:
            return ExistingBlockMergeResult(
                can_merge=True,
                merged_block_id=str(blk_id),
                original_start_time=minutes_to_time(b_start_min),
                original_end_time=minutes_to_time(b_end_min),
                merged_start_time=minutes_to_time(potential_start),
                merged_end_time=minutes_to_time(potential_end),
                merged_duration_minutes=merged_dur,
                reason=f"Request merged with existing block {blk_id} extending operational window to {minutes_to_time(potential_start).strftime('%H:%M')}–{minutes_to_time(potential_end).strftime('%H:%M')} ({merged_dur} min)",
                is_absorbed_inside=False,
            )

    return ExistingBlockMergeResult(
        can_merge=False,
        reason="No compatible existing block found for absorption or merging",
    )
