"""
planner/tests/test_planning_engine.py

Comprehensive Automated Test Suite for Railway Maintenance Block Planning Engine.
Implements all 30 Required Operational Test Cases covering Rule Groups 1 through 60.

Each test prints a complete diagnostic trace:
  INPUT
  → CANDIDATE WINDOWS
  → HARD RULE RESULTS
  → COMBINATION DECISION
  → OPTIMIZATION SCORES
  → SELECTED PLAN
  → REJECTION REASONS FOR OTHER CANDIDATES
"""

import sys
import unittest
from datetime import date, time, timedelta
from typing import List, Dict, Any, Optional

import os
import sys

# Ensure planner-api is in sys.path when running script directly
_PKG_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if _PKG_ROOT not in sys.path:
    sys.path.insert(0, _PKG_ROOT)

for _stream in (sys.stdout, sys.stderr):
    _reconfig = getattr(_stream, "reconfigure", None)
    if callable(_reconfig):
        try:
            _reconfig(encoding="utf-8", errors="replace")
        except Exception:
            pass

from planner.config import (
    DEFAULT_POST_TRAIN_BUFFER_MINUTES,
    DEFAULT_PRE_TRAIN_BUFFER_MINUTES,
    DEFAULT_MAX_BLOCK_DURATION_MINUTES,
    DEFAULT_PLANNING_HORIZON_DAYS,
    WEIGHT_BLOCK_DURATION,
    WEIGHT_AFFECTED_TRAINS,
    WEIGHT_DENSE_PERIOD,
    WEIGHT_UNUSED_GAP,
)
from planner.train_gap_analyzer import (
    TrainOccupancy,
    TrainFreeGap,
    extract_train_occupancies,
    calculate_train_free_gaps,
    evaluate_window_train_impact,
    parse_time_to_minutes,
    minutes_to_time,
)
from planner.candidate_windows import (
    CandidateWindow,
    generate_candidate_windows_for_group,
)
from planner.constraints import (
    check_constraints,
    ConstraintResult,
)
from planner.existing_block_merger import (
    evaluate_existing_block_merge,
    ExistingBlockMergeResult,
)
from planner.grouping import (
    validate_request,
    validate_all_requests,
    group_requests,
    determine_execution_mode_and_duration,
    evaluate_adjacent_section_merging,
    parse_chainage,
    RequestGroup,
)
from planner.objectives import (
    compute_priority_score,
    compute_train_impact_score,
    compute_resource_score,
    PriorityBreakdown,
)
from planner.optimizer import (
    calculate_candidate_score,
    select_best_window_cpsat,
)
from planner.planner import (
    run_planning_engine,
    plan_single_request,
    plan_request_group,
)



def print_diagnostic_trace(
    test_id: int,
    name: str,
    inputs: Dict[str, Any],
    candidate_windows: List[Any],
    hard_rules: Any,
    combination_decision: str,
    optimization_scores: Dict[str, Any],
    selected_plan: Any,
    rejections: List[str],
):
    print(f"\n{'=' * 80}")
    print(f"TEST {test_id}: {name}")
    print(f"{'=' * 80}")
    print("INPUT:")
    for k, v in inputs.items():
        print(f"  {k}: {v}")
    print("-> CANDIDATE WINDOWS:")
    if not candidate_windows:
        print("  (None generated)")
    for idx, cw in enumerate(candidate_windows[:5], start=1):
        if hasattr(cw, "start_time"):
            print(f"  [{idx}] {cw.window_date} {cw.start_time.strftime('%H:%M')}-{cw.end_time.strftime('%H:%M')} ({cw.duration_minutes}m, gap={getattr(cw, 'gap_usable_duration', 0)}m, slot={getattr(cw, 'slot_label', '')})")
        else:
            print(f"  [{idx}] {cw}")
    print("-> HARD RULE RESULTS:")
    if isinstance(hard_rules, list):
        for hr in hard_rules[:3]:
            print(f"  {hr}")
    elif isinstance(hard_rules, ConstraintResult):
        status = "PASSED" if hard_rules.all_passed else f"FAILED (Rules: {hard_rules.failed_rules()})"
        print(f"  Status: {status}")
    else:
        print(f"  {hard_rules}")
    print("-> COMBINATION DECISION:")
    print(f"  {combination_decision}")
    print("-> OPTIMIZATION SCORES:")
    for k, v in optimization_scores.items():
        print(f"  {k}: {v}")
    print("-> SELECTED PLAN:")
    if selected_plan:
        if isinstance(selected_plan, dict):
            print(f"  Plan ID: {selected_plan.get('plan_id')}")
            print(f"  Window: {selected_plan.get('recommended_date')} {selected_plan.get('recommended_start_time')}-{selected_plan.get('recommended_end_time')} ({selected_plan.get('duration_minutes')} min)")
            print(f"  Priority: {selected_plan.get('priority_score')}, Train Impact: {selected_plan.get('train_impact_score')}")
        else:
            print(f"  {selected_plan}")
    else:
        print("  NO_FEASIBLE_PLAN")
    print("-> REJECTION REASONS FOR OTHER CANDIDATES:")
    if not rejections:
        print("  (None)")
    else:
        for rj in rejections[:5]:
            print(f"  - {rj}")
    print(f"{'=' * 80}\n")


class RailwayBlockPlanningEngineTest(unittest.TestCase):

    def setUp(self):
        self.target_date = date(2026, 9, 25)
        self.corridor_id = "CORR-01"
        self.corridor_data = {
            "id": self.corridor_id,
            "corridor_name": "Delhi-Palwal Suburban Corridor",
            "block_section": "TKD–FDB",
            "line": "UP Line",
            "availability_status": "Available",
        }
        self.corridors_map = {self.corridor_id: self.corridor_data}

    # ──────────────────────────────────────────────────────────────────────────
    # Test 1: No train overlap
    # ──────────────────────────────────────────────────────────────────────────
    def test_01_no_train_overlap(self):
        trains = [{
            "corridor_id": self.corridor_id,
            "train_number": "12001",
            "movement_date": "2026-09-25",
            "arrival_time": "08:00",
            "departure_time": "08:30",
            "priority": "High",
            "line": "UP Line",
        }]
        cr = check_constraints(
            corridor_id=self.corridor_id,
            line="UP Line",
            proposed_date=self.target_date,
            proposed_start=time(10, 0),
            proposed_end=time(11, 0),
            duration_minutes=60,
            department_name="Engineering",
            request_status="Pending Planning",
            existing_blocks=[],
            train_movements=trains,
            corridor_data=self.corridor_data,
        )
        print_diagnostic_trace(
            1, "No Train Overlap",
            inputs={"train": "12001 at 08:00-08:30", "proposed": "10:00-11:00 (60m)"},
            candidate_windows=["10:00-11:00"],
            hard_rules=cr,
            combination_decision="Single request, no merging needed",
            optimization_scores={"train_impact": 0.0, "all_passed": cr.all_passed},
            selected_plan="10:00-11:00 (Valid, 0 train conflicts)",
            rejections=[],
        )
        self.assertTrue(cr.train_conflict_checked)
        self.assertTrue(cr.all_passed)
        self.assertEqual(len(cr.affected_trains), 0)

    # ──────────────────────────────────────────────────────────────────────────
    # Test 2: Train buffer violation (pre/post buffer rejection)
    # ──────────────────────────────────────────────────────────────────────────
    def test_02_train_buffer_violation(self):
        trains = [{
            "corridor_id": self.corridor_id,
            "train_number": "12002",
            "movement_date": "2026-09-25",
            "arrival_time": "09:40",
            "departure_time": "10:00",
            "priority": "High",
            "line": "UP Line",
        }]
        # Starts at 10:05 -> only 5 min after train departure (15m buffer violated)
        cr_post = check_constraints(
            corridor_id=self.corridor_id,
            line="UP Line",
            proposed_date=self.target_date,
            proposed_start=time(10, 5),
            proposed_end=time(11, 5),
            duration_minutes=60,
            department_name="Engineering",
            request_status="Pending Planning",
            existing_blocks=[],
            train_movements=trains,
            corridor_data=self.corridor_data,
            post_buffer_minutes=15,
        )
        # Train arrives at 11:15, block ends at 11:10 -> only 5 min before train (10m pre-buffer violated)
        trains_pre = [{
            "corridor_id": self.corridor_id,
            "train_number": "12003",
            "movement_date": "2026-09-25",
            "arrival_time": "11:15",
            "departure_time": "11:30",
            "priority": "High",
            "line": "UP Line",
        }]
        cr_pre = check_constraints(
            corridor_id=self.corridor_id,
            line="UP Line",
            proposed_date=self.target_date,
            proposed_start=time(10, 10),
            proposed_end=time(11, 10),
            duration_minutes=60,
            department_name="Engineering",
            request_status="Pending Planning",
            existing_blocks=[],
            train_movements=trains_pre,
            corridor_data=self.corridor_data,
            pre_buffer_minutes=10,
        )
        print_diagnostic_trace(
            2, "Train Buffer Violation (Pre/Post Buffer Rejection)",
            inputs={"post_case": "Train exit 10:00, Block start 10:05", "pre_case": "Block end 11:10, Train arrival 11:15"},
            candidate_windows=["10:05-11:05", "10:10-11:10"],
            hard_rules=[f"Post-buffer check: {cr_post.post_train_buffer_satisfied}", f"Pre-buffer check: {cr_pre.pre_train_buffer_satisfied}"],
            combination_decision="Rejected due to safety buffer violation",
            optimization_scores={"post_passed": cr_post.all_passed, "pre_passed": cr_pre.all_passed},
            selected_plan=None,
            rejections=cr_post.rejection_reasons + cr_pre.rejection_reasons,
        )
        self.assertFalse(cr_post.post_train_buffer_satisfied)
        self.assertFalse(cr_post.safety_buffer_satisfied)
        self.assertFalse(cr_pre.pre_train_buffer_satisfied)
        self.assertFalse(cr_pre.safety_buffer_satisfied)

    # ──────────────────────────────────────────────────────────────────────────
    # Test 3: Same-track request merging
    # ──────────────────────────────────────────────────────────────────────────
    def test_03_same_track_request_merging(self):
        req1 = {
            "id": "req-01", "request_id": "BR-2026-001",
            "corridor_id": self.corridor_id, "duration_minutes": 60,
            "requested_date": "2026-09-25", "priority": "High", "status": "Pending Planning",
            "departments": {"name": "Engineering"},
        }
        req2 = {
            "id": "req-02", "request_id": "BR-2026-002",
            "corridor_id": self.corridor_id, "duration_minutes": 60,
            "requested_date": "2026-09-25", "priority": "Medium", "status": "Pending Planning",
            "departments": {"name": "Engineering"},
        }
        groups = group_requests([req1, req2], self.corridors_map)
        print_diagnostic_trace(
            3, "Same-Track Request Merging",
            inputs={"req1": "BR-2026-001 (60m)", "req2": "BR-2026-002 (60m)", "line": "UP Line"},
            candidate_windows=["Combined Group"],
            hard_rules="Compatible track and line",
            combination_decision=f"Merged {len(groups[0].requests)} requests into 1 group with mode {groups[0].execution_mode}",
            optimization_scores={"combined_duration": groups[0].total_required_duration},
            selected_plan="Unified block on UP Line (duration 60m)",
            rejections=[],
        )
        self.assertEqual(len(groups), 1)
        self.assertEqual(len(groups[0].requests), 2)
        self.assertEqual(groups[0].execution_mode, "PARALLEL")
        self.assertEqual(groups[0].total_required_duration, 60)

    # ──────────────────────────────────────────────────────────────────────────
    # Test 4: Same-section request merging
    # ──────────────────────────────────────────────────────────────────────────
    def test_04_same_section_request_merging(self):
        req1 = {
            "id": "req-01", "request_id": "BR-2026-003",
            "corridor_id": self.corridor_id, "duration_minutes": 90,
            "requested_date": "2026-09-25", "status": "Pending Planning",
            "departments": {"name": "Engineering"},
        }
        req2 = {
            "id": "req-02", "request_id": "BR-2026-004",
            "corridor_id": self.corridor_id, "duration_minutes": 60,
            "requested_date": "2026-09-25", "status": "Pending Planning",
            "departments": {"name": "TRD"},
        }
        groups = group_requests([req1, req2], self.corridors_map)
        print_diagnostic_trace(
            4, "Same-Section Request Merging",
            inputs={"section": "TKD–FDB", "departments": "Engineering + TRD"},
            candidate_windows=["Merged Section Window"],
            hard_rules="Both belong to section TKD–FDB",
            combination_decision=f"Combined depts: {groups[0].departments}",
            optimization_scores={"required_duration": groups[0].total_required_duration},
            selected_plan="Unified multi-dept block (90m duration)",
            rejections=[],
        )
        self.assertEqual(len(groups), 1)
        self.assertIn("Engineering", groups[0].departments)
        self.assertIn("TRD", groups[0].departments)
        self.assertEqual(groups[0].total_required_duration, 90)

    # ──────────────────────────────────────────────────────────────────────────
    # Test 5: Different-track parallel work (UP vs DN line)
    # ──────────────────────────────────────────────────────────────────────────
    def test_05_different_track_parallel_work(self):
        trains_dn = [{
            "corridor_id": self.corridor_id,
            "train_number": "12004",
            "movement_date": "2026-09-25",
            "arrival_time": "10:00",
            "departure_time": "10:30",
            "priority": "High",
            "line": "DN Line",
        }]
        # Proposed block is on UP Line
        cr = check_constraints(
            corridor_id=self.corridor_id,
            line="UP Line",
            proposed_date=self.target_date,
            proposed_start=time(10, 0),
            proposed_end=time(11, 0),
            duration_minutes=60,
            department_name="Engineering",
            request_status="Pending Planning",
            existing_blocks=[],
            train_movements=trains_dn,
            corridor_data=self.corridor_data,
        )
        print_diagnostic_trace(
            5, "Different-Track Parallel Work (UP vs DN Line)",
            inputs={"train_line": "DN Line (10:00–10:30)", "block_line": "UP Line (10:00–11:00)"},
            candidate_windows=["10:00-11:00 on UP Line"],
            hard_rules=f"Train conflict checked: {cr.train_conflict_checked}",
            combination_decision="Different line tracks do not conflict",
            optimization_scores={"affected_trains": len(cr.affected_trains)},
            selected_plan="UP Line block permitted concurrently with DN Line train",
            rejections=[],
        )
        self.assertTrue(cr.train_conflict_checked)
        self.assertEqual(len(cr.affected_trains), 0)

    # ──────────────────────────────────────────────────────────────────────────
    # Test 6: Multi-department integrated block (Engineering + S&T + TRD)
    # ──────────────────────────────────────────────────────────────────────────
    def test_06_multi_department_integrated_block(self):
        reqs = [
            {"id": "r1", "request_id": "BR-E01", "corridor_id": self.corridor_id, "duration_minutes": 60, "requested_date": "2026-09-25", "status": "Pending Planning", "departments": {"name": "Engineering"}},
            {"id": "r2", "request_id": "BR-S01", "corridor_id": self.corridor_id, "duration_minutes": 60, "requested_date": "2026-09-25", "status": "Pending Planning", "departments": {"name": "S&T"}},
            {"id": "r3", "request_id": "BR-T01", "corridor_id": self.corridor_id, "duration_minutes": 60, "requested_date": "2026-09-25", "status": "Pending Planning", "departments": {"name": "TRD"}},
        ]
        groups = group_requests(reqs, self.corridors_map)
        print_diagnostic_trace(
            6, "Multi-Department Integrated Block (Engineering + S&T + TRD)",
            inputs={"departments": ["Engineering", "S&T", "TRD"]},
            candidate_windows=["Single Integrated Block Window"],
            hard_rules="All 3 departments compatible for shadow block",
            combination_decision=f"Combined 3 departments into {len(groups)} block group",
            optimization_scores={"multi_dept_count": len(groups[0].departments), "duration": groups[0].total_required_duration},
            selected_plan="Unified 3-Department Block (duration 60m)",
            rejections=[],
        )
        self.assertEqual(len(groups), 1)
        self.assertEqual(len(groups[0].departments), 3)

    # ──────────────────────────────────────────────────────────────────────────
    # Test 7: Sequential dependency (BEFORE / AFTER ordering)
    # ──────────────────────────────────────────────────────────────────────────
    def test_07_sequential_dependency(self):
        req1 = {"id": "r1", "request_id": "BR-01", "duration_minutes": 60, "dependency": "BEFORE"}
        req2 = {"id": "r2", "request_id": "BR-02", "duration_minutes": 60, "dependency": "AFTER"}
        mode, work_dur, total_dur = determine_execution_mode_and_duration([req1, req2])
        print_diagnostic_trace(
            7, "Sequential Dependency (BEFORE / AFTER Ordering)",
            inputs={"req1": "Track Lifting (60m, BEFORE)", "req2": "Tamping (60m, AFTER)"},
            candidate_windows=["Sequential execution block"],
            hard_rules="Dependency requirement satisfied via sequential ordering",
            combination_decision=f"Execution mode: {mode}",
            optimization_scores={"work_duration": work_dur, "total_duration": total_dur},
            selected_plan=f"Sequential Block: {total_dur} min (60 + 60 + transition)",
            rejections=[],
        )
        self.assertEqual(mode, "SEQUENTIAL")
        self.assertEqual(total_dur, 125)  # 60 + 60 + 5 min transition

    # ──────────────────────────────────────────────────────────────────────────
    # Test 8: Resource conflict (concurrent machine usage rejected)
    # ──────────────────────────────────────────────────────────────────────────
    def test_08_resource_conflict(self):
        existing = [{
            "block_id": "BLK-99", "corridor_id": self.corridor_id,
            "block_date": "2026-09-25", "start_time": "02:00", "end_time": "04:00",
            "status": "Scheduled", "resources_required": "BCM-01;Tamping Machine",
        }]
        cr = check_constraints(
            corridor_id=self.corridor_id,
            line="UP Line",
            proposed_date=self.target_date,
            proposed_start=time(2, 30),
            proposed_end=time(3, 30),
            duration_minutes=60,
            department_name="Engineering",
            request_status="Pending Planning",
            existing_blocks=existing,
            train_movements=[],
            resources_required="BCM-01",
            corridor_data=self.corridor_data,
        )
        print_diagnostic_trace(
            8, "Resource Conflict (Concurrent Machine Usage Rejected)",
            inputs={"shared_resource": "BCM-01", "existing_block": "02:00–04:00", "proposed": "02:30–03:30"},
            candidate_windows=["02:30-03:30"],
            hard_rules=f"Resource available: {cr.resource_available}, Unique conflict: {cr.unique_resource_conflict}",
            combination_decision="Rejected: Resource BCM-01 already allocated concurrently",
            optimization_scores={"all_passed": cr.all_passed},
            selected_plan=None,
            rejections=cr.rejection_reasons,
        )
        self.assertFalse(cr.resource_available)
        self.assertTrue(cr.unique_resource_conflict)
        self.assertFalse(cr.all_passed)

    # ──────────────────────────────────────────────────────────────────────────
    # Test 9: Resource chaining (sequential machine utilization within same window)
    # ──────────────────────────────────────────────────────────────────────────
    def test_09_resource_chaining(self):
        req1 = {"id": "r1", "duration_minutes": 60, "resources_required": "BCM-01"}
        req2 = {"id": "r2", "duration_minutes": 60, "resources_required": "BCM-01"}
        mode, work_dur, total_dur = determine_execution_mode_and_duration([req1, req2])
        print_diagnostic_trace(
            9, "Resource Chaining (Sequential Machine Utilization)",
            inputs={"req1_resource": "BCM-01 (60m)", "req2_resource": "BCM-01 (60m)"},
            candidate_windows=["Chained single window"],
            hard_rules="Chained sequentially to prevent concurrent clash",
            combination_decision=f"Mode: {mode}, Duration: {total_dur} min",
            optimization_scores={"resource_continuous": True, "overhead_min": 5},
            selected_plan="Chained sequential block (125m)",
            rejections=[],
        )
        self.assertEqual(mode, "SEQUENTIAL")
        self.assertEqual(total_dur, 125)

    # ──────────────────────────────────────────────────────────────────────────
    # Test 10: Existing block merging (new work absorbed into existing block)
    # ──────────────────────────────────────────────────────────────────────────
    def test_10_existing_block_merging(self):
        existing = [{
            "block_id": "BLK-EXISTING-01", "corridor_id": self.corridor_id,
            "block_date": "2026-09-25", "start_time": "02:00", "end_time": "05:00",
            "status": "Scheduled", "line": "UP Line",
        }]
        res = evaluate_existing_block_merge(
            corridor_id=self.corridor_id,
            line="UP Line",
            target_date=self.target_date,
            required_duration_minutes=60,
            preferred_start_time="02:30",
            existing_blocks=existing,
        )
        print_diagnostic_trace(
            10, "Existing Block Merging (New Work Absorbed)",
            inputs={"existing_block": "02:00–05:00 (180m)", "new_request": "60m at 02:30"},
            candidate_windows=[f"Absorbed into {res.merged_block_id}"],
            hard_rules=f"can_merge={res.can_merge}",
            combination_decision=res.reason,
            optimization_scores={"is_absorbed": res.is_absorbed_inside},
            selected_plan=f"Absorbed inside existing block {res.merged_block_id}",
            rejections=[],
        )
        self.assertTrue(res.can_merge)
        self.assertTrue(res.is_absorbed_inside)

    # ──────────────────────────────────────────────────────────────────────────
    # Test 11: Existing block overlap (incompatible block rejected)
    # ──────────────────────────────────────────────────────────────────────────
    def test_11_existing_block_overlap(self):
        existing = [{
            "block_id": "BLK-INCOMPATIBLE", "corridor_id": self.corridor_id,
            "block_date": "2026-09-25", "start_time": "01:00", "end_time": "04:00",
            "status": "Active", "line": "UP Line",
        }]
        cr = check_constraints(
            corridor_id=self.corridor_id,
            line="UP Line",
            proposed_date=self.target_date,
            proposed_start=time(2, 0),
            proposed_end=time(3, 0),
            duration_minutes=60,
            department_name="Engineering",
            request_status="Pending Planning",
            existing_blocks=existing,
            train_movements=[],
            corridor_data=self.corridor_data,
        )
        print_diagnostic_trace(
            11, "Existing Block Overlap (Incompatible Block Rejected)",
            inputs={"existing": "BLK-INCOMPATIBLE (01:00–04:00)", "proposed": "02:00–03:00"},
            candidate_windows=["02:00-03:00"],
            hard_rules=f"no_overlapping_block={cr.no_overlapping_block}",
            combination_decision="Rejected due to overlap with active block",
            optimization_scores={"conflicting_blocks": cr.conflicting_block_ids},
            selected_plan=None,
            rejections=cr.rejection_reasons,
        )
        self.assertFalse(cr.no_overlapping_block)
        self.assertIn("BLK-INCOMPATIBLE", cr.conflicting_block_ids)

    # ──────────────────────────────────────────────────────────────────────────
    # Test 12: Minimum-duration selection (shortest feasible window preferred)
    # ──────────────────────────────────────────────────────────────────────────
    def test_12_minimum_duration_selection(self):
        # 60m candidate vs 120m candidate with all other parameters identical
        score_60 = calculate_candidate_score(
            duration_minutes=60, priority_score=80.0, train_impact_score=0.0,
            affected_train_count=0, preference_rank=1, unused_gap_minutes=30, surrounding_density=0
        )
        score_120 = calculate_candidate_score(
            duration_minutes=120, priority_score=80.0, train_impact_score=0.0,
            affected_train_count=0, preference_rank=1, unused_gap_minutes=30, surrounding_density=0
        )
        print_diagnostic_trace(
            12, "Minimum-Duration Selection (Shortest Feasible Window Preferred)",
            inputs={"cand_60m": 60, "cand_120m": 120},
            candidate_windows=["60 min block", "120 min block"],
            hard_rules="Both windows feasible",
            combination_decision="Optimizer favors lower track occupancy",
            optimization_scores={"score_60m": score_60, "score_120m": score_120, "diff": score_60 - score_120},
            selected_plan="60 min block chosen",
            rejections=["120 min block received higher track duration penalty"],
        )
        self.assertGreater(score_60, score_120)

    # ──────────────────────────────────────────────────────────────────────────
    # Test 13: Train-gap selection (best gap chosen over fragmented ones)
    # ──────────────────────────────────────────────────────────────────────────
    def test_13_train_gap_selection(self):
        # Gap with tight fit (30 min unused) vs Gap with huge waste (240 min unused)
        score_tight = calculate_candidate_score(
            duration_minutes=60, priority_score=80.0, train_impact_score=0.0,
            affected_train_count=0, preference_rank=1, unused_gap_minutes=30, surrounding_density=0
        )
        score_wasteful = calculate_candidate_score(
            duration_minutes=60, priority_score=80.0, train_impact_score=0.0,
            affected_train_count=0, preference_rank=1, unused_gap_minutes=240, surrounding_density=0
        )
        print_diagnostic_trace(
            13, "Train-Gap Selection (Best Gap Chosen Over Fragmented Ones)",
            inputs={"gap_tight": "90m gap (30m unused)", "gap_wasteful": "300m gap (240m unused)"},
            candidate_windows=["Tight Gap", "Wasteful Gap"],
            hard_rules="Both satisfy required duration (60m)",
            combination_decision="Optimizer selects gap with higher efficiency",
            optimization_scores={"score_tight": score_tight, "score_wasteful": score_wasteful},
            selected_plan="Tight Gap (higher gap utilization efficiency)",
            rejections=["Wasteful Gap penalized for unused train-free capacity"],
        )
        self.assertGreater(score_tight, score_wasteful)

    # ──────────────────────────────────────────────────────────────────────────
    # Test 14: Train-dense period avoidance (cleaner gap chosen)
    # ──────────────────────────────────────────────────────────────────────────
    def test_14_train_dense_period_avoidance(self):
        # Dense period (density=6) vs clean slack (density=0)
        score_dense = calculate_candidate_score(
            duration_minutes=60, priority_score=80.0, train_impact_score=0.0,
            affected_train_count=0, preference_rank=1, unused_gap_minutes=30, surrounding_density=6
        )
        score_clean = calculate_candidate_score(
            duration_minutes=60, priority_score=80.0, train_impact_score=0.0,
            affected_train_count=0, preference_rank=1, unused_gap_minutes=30, surrounding_density=0
        )
        print_diagnostic_trace(
            14, "Train-Dense Period Avoidance",
            inputs={"dense_density": 6, "clean_density": 0},
            candidate_windows=["Dense Gap (surrounded by 6 trains)", "Clean Night Slack Gap"],
            hard_rules="Both gaps are collision-free",
            combination_decision="Avoid placing maintenance blocks in high-frequency traffic clusters",
            optimization_scores={"score_clean": score_clean, "score_dense": score_dense, "penalty": score_clean - score_dense},
            selected_plan="Clean Night Slack Gap",
            rejections=["Dense Gap penalized for surrounding train frequency"],
        )
        self.assertGreater(score_clean, score_dense)

    # ──────────────────────────────────────────────────────────────────────────
    # Test 15: Passenger / high-priority train impact penalty
    # ──────────────────────────────────────────────────────────────────────────
    def test_15_passenger_high_priority_train_impact_penalty(self):
        trains_highest = [TrainOccupancy(
            train_number="Vande Bharat 22436", corridor_id=self.corridor_id,
            movement_date=self.target_date, entry_minutes=600, exit_minutes=630, priority="Highest"
        )]
        trains_low = [TrainOccupancy(
            train_number="Goods 50012", corridor_id=self.corridor_id,
            movement_date=self.target_date, entry_minutes=600, exit_minutes=630, priority="Low"
        )]
        impact_highest, _, _ = evaluate_window_train_impact(600, 660, trains_highest)
        impact_low, _, _ = evaluate_window_train_impact(600, 660, trains_low)
        print_diagnostic_trace(
            15, "Passenger / High-Priority Train Impact Penalty",
            inputs={"high_priority": "Vande Bharat (multiplier 3.0)", "low_priority": "Freight (multiplier 0.5)"},
            candidate_windows=["Proposed window overlapping train"],
            hard_rules="Train impact evaluated with priority weighting",
            combination_decision="Penalty reflects Indian Railways train hierarchy",
            optimization_scores={"impact_highest": impact_highest, "impact_low": impact_low},
            selected_plan="Low priority train penalized far less than premium train",
            rejections=[],
        )
        self.assertGreater(impact_highest, impact_low)

    # ──────────────────────────────────────────────────────────────────────────
    # Test 16: Overdue request prioritization
    # ──────────────────────────────────────────────────────────────────────────
    def test_16_overdue_request_prioritization(self):
        # Requested date 6 days in the past vs today
        pb_overdue = compute_priority_score(
            priority="Medium", urgency="Normal",
            requested_date_str=(self.target_date - timedelta(days=6)).strftime("%Y-%m-%d"),
            proposed_date=self.target_date,
        )
        pb_normal = compute_priority_score(
            priority="Medium", urgency="Normal",
            requested_date_str=self.target_date.strftime("%Y-%m-%d"),
            proposed_date=self.target_date,
        )
        print_diagnostic_trace(
            16, "Overdue Request Prioritization",
            inputs={"overdue_request": "6 days overdue", "routine_request": "Requested for today"},
            candidate_windows=["Evaluation candidate"],
            hard_rules="Rule Group 30: Overdue requests receive priority boost",
            combination_decision="Elevate scheduling priority for backlog maintenance",
            optimization_scores={"overdue_score": pb_overdue.total_score, "normal_score": pb_normal.total_score, "overdue_pts": pb_overdue.overdue},
            selected_plan="Overdue request prioritized with score boost",
            rejections=[],
        )
        self.assertGreater(pb_overdue.total_score, pb_normal.total_score)
        self.assertGreater(pb_overdue.overdue, 0.0)

    # ──────────────────────────────────────────────────────────────────────────
    # Test 17: Critical asset prioritization
    # ──────────────────────────────────────────────────────────────────────────
    def test_17_critical_asset_prioritization(self):
        pb_critical = compute_priority_score(
            priority="Highest", urgency="Critical",
            asset_type="Bridge", maintenance_type="Corrective Track Alignment",
        )
        pb_routine = compute_priority_score(
            priority="Low", urgency="Routine",
            asset_type="Station Building", maintenance_type="Routine Painting",
        )
        print_diagnostic_trace(
            17, "Critical Asset Prioritization",
            inputs={"critical_asset": "Bridge / Track (Highest/Critical)", "routine_asset": "Painting (Low/Routine)"},
            candidate_windows=["Priority scoring"],
            hard_rules="Rule Group 29: Critical railway infrastructure prioritized",
            combination_decision="Crucial running line assets scheduled ahead of routine work",
            optimization_scores={"critical_score": pb_critical.total_score, "routine_score": pb_routine.total_score},
            selected_plan="Bridge corrective work given top priority",
            rejections=[],
        )
        self.assertGreater(pb_critical.total_score, pb_routine.total_score)
        self.assertEqual(pb_critical.criticality, 100.0)

    # ──────────────────────────────────────────────────────────────────────────
    # Test 18: Deadline handling & deadline_at_risk flagging
    # ──────────────────────────────────────────────────────────────────────────
    def test_18_deadline_handling_and_at_risk_flagging(self):
        # Window planned AFTER due date
        due_yesterday = (self.target_date - timedelta(days=2)).strftime("%Y-%m-%d")
        pb_at_risk = compute_priority_score(
            priority="High", urgency="Urgent",
            due_date_str=due_yesterday,
            proposed_date=self.target_date,
        )
        print_diagnostic_trace(
            18, "Deadline Handling & Deadline-At-Risk Flagging",
            inputs={"due_date": due_yesterday, "planned_date": str(self.target_date)},
            candidate_windows=["Post-deadline candidate"],
            hard_rules="Rule Group 32: Deadline compliance monitoring",
            combination_decision="Flag deadline at risk to COA controllers",
            optimization_scores={"deadline_at_risk": pb_at_risk.deadline_at_risk, "days_to_due": pb_at_risk.days_to_due},
            selected_plan="Plan flagged with deadline_at_risk = True",
            rejections=[],
        )
        self.assertTrue(pb_at_risk.deadline_at_risk)
        self.assertIsNotNone(pb_at_risk.days_to_due)
        assert pb_at_risk.days_to_due is not None
        self.assertLess(pb_at_risk.days_to_due, 0)

    # ──────────────────────────────────────────────────────────────────────────
    # Test 19: OHE isolation requirement check
    # ──────────────────────────────────────────────────────────────────────────
    def test_19_ohe_isolation_requirement_check(self):
        cr_forbidden = check_constraints(
            corridor_id=self.corridor_id,
            line="UP Line",
            proposed_date=self.target_date,
            proposed_start=time(2, 0),
            proposed_end=time(3, 0),
            duration_minutes=60,
            department_name="TRD",
            request_status="Pending Planning",
            existing_blocks=[],
            train_movements=[],
            disconnection_required=True,
            ohe_isolation_available=False,
            corridor_data=self.corridor_data,
        )
        print_diagnostic_trace(
            19, "OHE Isolation Requirement Check",
            inputs={"disconnection_required": True, "ohe_isolation_available": False},
            candidate_windows=["02:00-03:00 Power Block"],
            hard_rules=f"traction_disconnection_valid={cr_forbidden.traction_disconnection_valid}",
            combination_decision="Rejected: 25 kV OHE power isolation cannot be granted",
            optimization_scores={"all_passed": cr_forbidden.all_passed},
            selected_plan=None,
            rejections=cr_forbidden.rejection_reasons,
        )
        self.assertFalse(cr_forbidden.traction_disconnection_valid)
        self.assertFalse(cr_forbidden.all_passed)

    # ──────────────────────────────────────────────────────────────────────────
    # Test 20: Adjacent section evaluation (continuity check)
    # ──────────────────────────────────────────────────────────────────────────
    def test_20_adjacent_section_evaluation(self):
        g1 = RequestGroup(
            group_id="G1", corridor_id="C1", corridor_name="Main Corridor",
            block_section="TKD–FDB", line="UP Line", target_date=self.target_date,
            total_required_duration=120,
        )
        g2 = RequestGroup(
            group_id="G2", corridor_id="C1", corridor_name="Main Corridor",
            block_section="FDB–PWL", line="UP Line", target_date=self.target_date,
            total_required_duration=120,
        )
        can_merge, reason = evaluate_adjacent_section_merging(g1, g2, [])
        print_diagnostic_trace(
            20, "Adjacent Section Evaluation (Continuity Check)",
            inputs={"section_a": "TKD–FDB", "section_b": "FDB–PWL", "common_station": "FDB"},
            candidate_windows=["Combined adjacent sections"],
            hard_rules="Rule Group 4: Section geometric continuity verified",
            combination_decision=reason,
            optimization_scores={"can_merge": can_merge, "combined_duration": 240},
            selected_plan="Adjacent sections merged into continuous corridor block",
            rejections=[],
        )
        self.assertTrue(can_merge)
        self.assertIn("continuous", reason.lower())

    # ──────────────────────────────────────────────────────────────────────────
    # Test 21: Physical location overlap (chainage check)
    # ──────────────────────────────────────────────────────────────────────────
    def test_21_physical_location_overlap(self):
        existing = [{
            "block_id": "BLK-CH01", "corridor_id": self.corridor_id,
            "block_date": "2026-09-25", "start_time": "02:00", "end_time": "04:00",
            "chainage_from": 105.0, "chainage_to": 110.0,
            "status": "Scheduled", "line": "UP Line",
        }]
        cr_overlap = check_constraints(
            corridor_id=self.corridor_id,
            line="UP Line",
            proposed_date=self.target_date,
            proposed_start=time(2, 30),
            proposed_end=time(3, 30),
            duration_minutes=60,
            department_name="Engineering",
            request_status="Pending Planning",
            existing_blocks=existing,
            train_movements=[],
            chainage_start=107.0,
            chainage_end=109.0,
            corridor_data=self.corridor_data,
        )
        print_diagnostic_trace(
            21, "Physical Location Overlap (Chainage Check)",
            inputs={"existing_chainage": "KM 105.0–110.0", "proposed_chainage": "KM 107.0–109.0"},
            candidate_windows=["02:30-03:30"],
            hard_rules=f"no_physical_location_conflict={cr_overlap.no_physical_location_conflict}",
            combination_decision="Rejected: Physical location conflict on same section track",
            optimization_scores={"all_passed": cr_overlap.all_passed},
            selected_plan=None,
            rejections=cr_overlap.rejection_reasons,
        )
        self.assertFalse(cr_overlap.no_physical_location_conflict)
        self.assertFalse(cr_overlap.all_passed)

    # ──────────────────────────────────────────────────────────────────────────
    # Test 22: Multiple possible dates (best date chosen across 7-day horizon)
    # ──────────────────────────────────────────────────────────────────────────
    def test_22_multiple_possible_dates(self):
        # Day 0 is full of trains (0 gaps >= 60m), Day 1 has a clean 180m gap
        trains_day0 = [
            {"corridor_id": self.corridor_id, "movement_date": "2026-09-25", "arrival_time": "00:00", "departure_time": "23:59", "line": "UP Line"}
        ]
        trains_day1 = [
            {"corridor_id": self.corridor_id, "movement_date": "2026-09-26", "arrival_time": "00:00", "departure_time": "02:00", "line": "UP Line"},
            {"corridor_id": self.corridor_id, "movement_date": "2026-09-26", "arrival_time": "06:00", "departure_time": "08:00", "line": "UP Line"},
        ]
        candidates = generate_candidate_windows_for_group(
            corridor_id=self.corridor_id,
            line="UP Line",
            target_date=self.target_date,
            required_duration=60,
            train_movements=trains_day0 + trains_day1,
            horizon_days=2,
        )
        print_diagnostic_trace(
            22, "Multiple Possible Dates Across 7-Day Horizon",
            inputs={"day0": "2026-09-25 (congested)", "day1": "2026-09-26 (clean 02:00–06:00 gap)"},
            candidate_windows=candidates,
            hard_rules="Evaluates multi-day opportunities",
            combination_decision=f"Generated {len(candidates)} candidates across horizon",
            optimization_scores={"selected_date": candidates[0].window_date if candidates else None},
            selected_plan=f"Window scheduled on {candidates[0].window_date}" if candidates else None,
            rejections=["Day 0 skipped due to continuous train occupancy"],
        )
        self.assertGreater(len(candidates), 0)
        self.assertEqual(candidates[0].window_date, date(2026, 9, 26))

    # ──────────────────────────────────────────────────────────────────────────
    # Test 23: No feasible plan condition
    # ──────────────────────────────────────────────────────────────────────────
    def test_23_no_feasible_plan_condition(self):
        # 24/7 continuous trains on all days
        heavy_trains = []
        for d in range(7):
            cur = (self.target_date + timedelta(days=d)).strftime("%Y-%m-%d")
            heavy_trains.append({"corridor_id": self.corridor_id, "movement_date": cur, "arrival_time": "00:00", "departure_time": "23:59", "line": "UP Line"})

        req = {
            "id": "r-unfeasible", "request_id": "BR-IMPOSSIBLE",
            "corridor_id": self.corridor_id, "duration_minutes": 120,
            "requested_date": "2026-09-25", "status": "Pending Planning",
        }
        plans = run_planning_engine(
            requests=[req], existing_blocks=[], train_movements=heavy_trains,
            corridors=[self.corridor_data]
        )
        print_diagnostic_trace(
            23, "No Feasible Plan Condition (NO_FEASIBLE_PLAN)",
            inputs={"traffic": "24/7 continuous train occupancy across all 7 days", "required": "120 min"},
            candidate_windows=[],
            hard_rules="No candidate windows satisfy 120m duration in train-free gaps",
            combination_decision="Return NO_FEASIBLE_PLAN cleanly with clear reason",
            optimization_scores={"feasible_plans": len(plans)},
            selected_plan=None,
            rejections=["No train-free gaps >= 120m found across entire 7-day horizon"],
        )
        self.assertEqual(len(plans), 0)

    # ──────────────────────────────────────────────────────────────────────────
    # Test 24: Maximum block duration limit enforcement
    # ──────────────────────────────────────────────────────────────────────────
    def test_24_maximum_block_duration_limit_enforcement(self):
        cr_excessive = check_constraints(
            corridor_id=self.corridor_id,
            line="UP Line",
            proposed_date=self.target_date,
            proposed_start=time(0, 0),
            proposed_end=time(8, 0),
            duration_minutes=480,  # 8 hours exceeds 360m limit
            department_name="Engineering",
            request_status="Pending Planning",
            existing_blocks=[],
            train_movements=[],
            max_duration_minutes=DEFAULT_MAX_BLOCK_DURATION_MINUTES,
            corridor_data=self.corridor_data,
        )
        print_diagnostic_trace(
            24, "Maximum Block Duration Limit Enforcement",
            inputs={"requested_duration": "480 min (8h)", "configured_max": "360 min (6h)"},
            candidate_windows=["00:00-08:00"],
            hard_rules=f"max_duration_satisfied={cr_excessive.max_duration_satisfied}",
            combination_decision="Rejected: Exceeds maximum permissible single railway block duration",
            optimization_scores={"all_passed": cr_excessive.all_passed},
            selected_plan=None,
            rejections=cr_excessive.rejection_reasons,
        )
        self.assertFalse(cr_excessive.max_duration_satisfied)
        self.assertFalse(cr_excessive.all_passed)

    # ──────────────────────────────────────────────────────────────────────────
    # Test 25: Multiple requests competing for the same block window
    # ──────────────────────────────────────────────────────────────────────────
    def test_25_multiple_requests_competing_for_same_block_window(self):
        req1 = {"id": "r1", "request_id": "BR-COMP-01", "corridor_id": self.corridor_id, "duration_minutes": 60, "requested_date": "2026-09-25", "priority": "Highest", "status": "Pending Planning"}
        req2 = {"id": "r2", "request_id": "BR-COMP-02", "corridor_id": self.corridor_id, "duration_minutes": 60, "requested_date": "2026-09-25", "priority": "Medium", "status": "Pending Planning"}
        groups = group_requests([req1, req2], self.corridors_map)
        print_diagnostic_trace(
            25, "Multiple Requests Competing For The Same Block Window",
            inputs={"req1": "Highest Priority (60m)", "req2": "Medium Priority (60m)"},
            candidate_windows=["Shared corridor window"],
            hard_rules="Compatible requests merged into single integrated slot",
            combination_decision=f"Merged {len(groups[0].requests)} requests avoiding competition conflict",
            optimization_scores={"max_priority": groups[0].max_priority},
            selected_plan="Both executed cooperatively in unified window",
            rejections=[],
        )
        self.assertEqual(len(groups), 1)
        self.assertEqual(groups[0].max_priority, "Highest")

    # ──────────────────────────────────────────────────────────────────────────
    # Test 26: Minimum number of blocks (merging preferred over fragmenting)
    # ──────────────────────────────────────────────────────────────────────────
    def test_26_minimum_number_of_blocks(self):
        reqs = [
            {"id": f"r{i}", "request_id": f"BR-M0{i}", "corridor_id": self.corridor_id, "duration_minutes": 60, "requested_date": "2026-09-25", "status": "Pending Planning"}
            for i in range(1, 4)
        ]
        groups = group_requests(reqs, self.corridors_map)
        print_diagnostic_trace(
            26, "Minimum Number of Blocks (Merging Preferred Over Fragmenting)",
            inputs={"requests_count": 3, "target_date": "2026-09-25"},
            candidate_windows=["Integrated Block"],
            hard_rules="Rule Group 46: Maximize requests combined per block",
            combination_decision=f"Formed {len(groups)} unified block instead of 3 fragmented track blocks",
            optimization_scores={"requests_in_group": len(groups[0].requests)},
            selected_plan="1 Combined Block replaces 3 separate track disruptions",
            rejections=[],
        )
        self.assertEqual(len(groups), 1)
        self.assertEqual(len(groups[0].requests), 3)

    # ──────────────────────────────────────────────────────────────────────────
    # Test 27: Minimum total blocked hours
    # ──────────────────────────────────────────────────────────────────────────
    def test_27_minimum_total_blocked_hours(self):
        req1 = {"id": "r1", "duration_minutes": 90}
        req2 = {"id": "r2", "duration_minutes": 90}
        mode, work_dur, total_dur = determine_execution_mode_and_duration([req1, req2])
        # Parallel duration (90 min) vs Sequential duration (185 min)
        print_diagnostic_trace(
            27, "Minimum Total Blocked Hours",
            inputs={"individual_sum": "180 min (3.0h)", "parallel_combined": f"{total_dur} min ({total_dur/60:.1f}h)"},
            candidate_windows=["Parallel allocation"],
            hard_rules="Parallel execution minimizes track blockage time",
            combination_decision=f"Mode: {mode}, Duration: {total_dur}m",
            optimization_scores={"hours_saved": (180 - total_dur) / 60.0},
            selected_plan=f"Total track blocked: {total_dur} min (saves 90 min of line closure)",
            rejections=[],
        )
        self.assertEqual(total_dur, 90)

    # ──────────────────────────────────────────────────────────────────────────
    # Test 28: Minimum affected trains
    # ──────────────────────────────────────────────────────────────────────────
    def test_28_minimum_affected_trains(self):
        score_0_trains = calculate_candidate_score(
            duration_minutes=60, priority_score=80.0, train_impact_score=0.0,
            affected_train_count=0, preference_rank=1, unused_gap_minutes=30, surrounding_density=0
        )
        score_2_trains = calculate_candidate_score(
            duration_minutes=60, priority_score=80.0, train_impact_score=50.0,
            affected_train_count=2, preference_rank=1, unused_gap_minutes=30, surrounding_density=0
        )
        print_diagnostic_trace(
            28, "Minimum Affected Trains",
            inputs={"cand_a_affected": 0, "cand_b_affected": 2},
            candidate_windows=["Cand A (0 trains)", "Cand B (2 trains)"],
            hard_rules="Rule Group 45: Heavy penalty per affected train movement",
            combination_decision="Zero-impact window selected by CP-SAT",
            optimization_scores={"score_0_trains": score_0_trains, "score_2_trains": score_2_trains, "diff": score_0_trains - score_2_trains},
            selected_plan="Cand A (Zero train disruptions)",
            rejections=["Cand B heavily penalized for disrupting 2 scheduled train movements"],
        )
        self.assertGreater(score_0_trains, score_2_trains)

    # ──────────────────────────────────────────────────────────────────────────
    # Test 29: Parallel vs sequential work duration calculation (max vs sum)
    # ──────────────────────────────────────────────────────────────────────────
    def test_29_parallel_vs_sequential_work_duration(self):
        r_par1 = {"id": "p1", "duration_minutes": 45}
        r_par2 = {"id": "p2", "duration_minutes": 90}
        mode_par, _, dur_par = determine_execution_mode_and_duration([r_par1, r_par2])

        r_seq1 = {"id": "s1", "duration_minutes": 45, "dependency": "BEFORE"}
        r_seq2 = {"id": "s2", "duration_minutes": 90, "dependency": "AFTER"}
        mode_seq, _, dur_seq = determine_execution_mode_and_duration([r_seq1, r_seq2])

        print_diagnostic_trace(
            29, "Parallel vs Sequential Work Duration Calculation (MAX vs SUM)",
            inputs={"parallel_inputs": "45m, 90m (independent)", "sequential_inputs": "45m, 90m (BEFORE/AFTER)"},
            candidate_windows=["Mode evaluation"],
            hard_rules="Rule Groups 25 & 26 duration formulas",
            combination_decision=f"Parallel: MAX(45,90)={dur_par}m | Sequential: SUM(45,90)+5={dur_seq}m",
            optimization_scores={"dur_parallel": dur_par, "dur_sequential": dur_seq},
            selected_plan=f"Parallel: {dur_par}m, Sequential: {dur_seq}m",
            rejections=[],
        )
        self.assertEqual(mode_par, "PARALLEL")
        self.assertEqual(dur_par, 90)
        self.assertEqual(mode_seq, "SEQUENTIAL")
        self.assertEqual(dur_seq, 140)

    # ──────────────────────────────────────────────────────────────────────────
    # Test 30: Existing approved block utilization
    # ──────────────────────────────────────────────────────────────────────────
    def test_30_existing_approved_block_utilization(self):
        existing_approved = [{
            "block_id": "BLK-COA-APPROVED", "corridor_id": self.corridor_id,
            "block_date": "2026-09-25", "start_time": "01:00", "end_time": "04:00",
            "status": "Approved", "line": "UP Line",
        }]
        merge_res = evaluate_existing_block_merge(
            corridor_id=self.corridor_id,
            line="UP Line",
            target_date=self.target_date,
            required_duration_minutes=60,
            preferred_start_time="02:00",
            existing_blocks=existing_approved,
        )
        print_diagnostic_trace(
            30, "Existing Approved Block Utilization",
            inputs={"existing_approved_block": "BLK-COA-APPROVED (01:00–04:00, Approved)", "new_request": "60m at 02:00"},
            candidate_windows=[f"Absorbed into {merge_res.merged_block_id}"],
            hard_rules="Rule Group 5: Existing approved block absorbed without creating new disruption",
            combination_decision=merge_res.reason,
            optimization_scores={"can_merge": merge_res.can_merge, "is_absorbed": merge_res.is_absorbed_inside},
            selected_plan="Absorbed into Existing Approved Block BLK-COA-APPROVED",
            rejections=[],
        )
        self.assertTrue(merge_res.can_merge)
        self.assertTrue(merge_res.is_absorbed_inside)
        self.assertEqual(merge_res.merged_block_id, "BLK-COA-APPROVED")

    # ──────────────────────────────────────────────────────────────────────────
    # Test 31: Natural Continuous 5-Hour Safe Train-Free Gap (Option A)
    # ──────────────────────────────────────────────────────────────────────────
    def test_31_natural_continuous_train_free_gap(self):
        trains = [
            {"corridor_id": self.corridor_id, "movement_date": "2026-09-25", "arrival_time": "00:15", "departure_time": "00:45", "line": "UP Line", "train_number": "12001", "priority": "High"},
            {"corridor_id": self.corridor_id, "movement_date": "2026-09-25", "arrival_time": "07:15", "departure_time": "07:45", "line": "UP Line", "train_number": "12002", "priority": "High"},
        ]
        req = {
            "id": "r-5hr-natural", "request_id": "BR-5HR-001",
            "corridor_id": self.corridor_id, "duration_minutes": 300,
            "requested_date": "2026-09-25", "status": "Pending Planning",
            "priority": "High", "urgency": "Normal",
            "departments": {"name": "Engineering"}, "department_id": "DEPT-ENG",
        }
        plans = run_planning_engine(requests=[req], existing_blocks=[], train_movements=trains, corridors=[self.corridor_data])
        self.assertEqual(len(plans), 1)
        plan = plans[0]
        self.assertEqual(plan["final_status"], "PLANNED")
        self.assertEqual(plan["duration"], 300)
        self.assertEqual(plan["affected_train_count"], 0)
        self.assertFalse(plan["operational_regulation_required"])

    # ──────────────────────────────────────────────────────────────────────────
    # Test 32: Alternative Date with Natural Safe Gap (Option D)
    # ──────────────────────────────────────────────────────────────────────────
    def test_32_alternative_date_natural_gap(self):
        trains = []
        for h in range(0, 24, 2):
            arr = f"{str(h).zfill(2)}:00"
            dep = f"{str(h).zfill(2)}:30"
            trains.append({"corridor_id": self.corridor_id, "movement_date": "2026-09-25", "arrival_time": arr, "departure_time": dep, "line": "UP Line", "train_number": f"T-D0-{h}"})
        for h in range(0, 24, 2):
            arr = f"{str(h).zfill(2)}:00"
            dep = f"{str(h).zfill(2)}:30"
            trains.append({"corridor_id": self.corridor_id, "movement_date": "2026-09-26", "arrival_time": arr, "departure_time": dep, "line": "UP Line", "train_number": f"T-D1-{h}"})
        trains.append({"corridor_id": self.corridor_id, "movement_date": "2026-09-27", "arrival_time": "07:30", "departure_time": "08:00", "line": "UP Line", "train_number": "T-D2-MORN"})

        req = {
            "id": "r-alt-date", "request_id": "BR-5HR-ALT",
            "corridor_id": self.corridor_id, "duration_minutes": 300,
            "requested_date": "2026-09-25", "status": "Pending Planning",
            "departments": {"name": "Engineering"}, "department_id": "DEPT-ENG",
        }
        plans = run_planning_engine(requests=[req], existing_blocks=[], train_movements=trains, corridors=[self.corridor_data])
        self.assertEqual(len(plans), 1)
        plan = plans[0]
        self.assertEqual(plan["planned_date"], "2026-09-27")
        self.assertEqual(plan["final_status"], "PLANNED")
        self.assertEqual(plan["affected_train_count"], 0)

    # ──────────────────────────────────────────────────────────────────────────
    # Test 33: Operational Regulation Scenario Requiring COA Approval (Option B)
    # ──────────────────────────────────────────────────────────────────────────
    def test_33_operational_regulation_scenario_coa_approval(self):
        trains = []
        for d in range(7):
            cur = (self.target_date + timedelta(days=d)).strftime("%Y-%m-%d")
            trains.append({
                "corridor_id": self.corridor_id, "movement_date": cur,
                "arrival_time": "03:00", "departure_time": "03:30",
                "line": "UP Line", "train_number": f"BOXN-{d}", "priority": "Low", "train_type": "Goods"
            })
            for h in range(7, 24, 3):
                arr = f"{str(h).zfill(2)}:00"
                dep = f"{str(h).zfill(2)}:30"
                trains.append({
                    "corridor_id": self.corridor_id, "movement_date": cur,
                    "arrival_time": arr, "departure_time": dep,
                    "line": "UP Line", "train_number": f"VB-{h}", "priority": "Highest", "train_type": "Vande Bharat"
                })

        req = {
            "id": "r-reg-proposal", "request_id": "BR-REG-001",
            "corridor_id": self.corridor_id, "duration_minutes": 300,
            "requested_date": "2026-09-25", "status": "Pending Planning",
            "can_split": False,
            "departments": {"name": "Engineering"}, "department_id": "DEPT-ENG",
        }
        plans = run_planning_engine(requests=[req], existing_blocks=[], train_movements=trains, corridors=[self.corridor_data])
        self.assertEqual(len(plans), 1)
        plan = plans[0]
        self.assertEqual(plan["final_status"], "COA_APPROVAL_REQUIRED")
        self.assertTrue(plan["operational_regulation_required"])
        self.assertEqual(plan["approval_authority"], "COA")
        self.assertTrue(plan["approval_required"])
        self.assertEqual(len(plan["high_priority_affected_trains"]), 0)
        self.assertTrue(any("BOXN" in t for t in plan["affected_trains"]))

    # ──────────────────────────────────────────────────────────────────────────
    # Test 34: Continuous Work Requirement vs Split Maintenance (Option C)
    # ──────────────────────────────────────────────────────────────────────────
    def test_34_continuous_work_vs_split_maintenance(self):
        trains = []
        for d in range(7):
            cur = (self.target_date + timedelta(days=d)).strftime("%Y-%m-%d")
            trains.extend([
                {"corridor_id": self.corridor_id, "movement_date": cur, "arrival_time": "00:00", "departure_time": "02:00", "line": "UP Line", "train_number": "T1", "priority": "Highest"},
                {"corridor_id": self.corridor_id, "movement_date": cur, "arrival_time": "05:10", "departure_time": "06:00", "line": "UP Line", "train_number": "T2", "priority": "Highest"},
                {"corridor_id": self.corridor_id, "movement_date": cur, "arrival_time": "09:10", "departure_time": "23:59", "line": "UP Line", "train_number": "T3", "priority": "Highest"},
            ])

        req_continuous = {
            "id": "r-cont", "request_id": "BR-CONT-5H",
            "corridor_id": self.corridor_id, "duration_minutes": 300,
            "requested_date": "2026-09-25", "status": "Pending Planning",
            "can_split": False,
            "departments": {"name": "Engineering"}, "department_id": "DEPT-ENG",
        }
        plans_cont = run_planning_engine(requests=[req_continuous], existing_blocks=[], train_movements=trains, corridors=[self.corridor_data])
        self.assertEqual(len(plans_cont), 0)

        req_split = {
            "id": "r-split", "request_id": "BR-SPLIT-5H",
            "corridor_id": self.corridor_id, "duration_minutes": 300,
            "requested_date": "2026-09-25", "status": "Pending Planning",
            "can_split": True,
            "departments": {"name": "Engineering"}, "department_id": "DEPT-ENG",
        }
        plans_split = run_planning_engine(requests=[req_split], existing_blocks=[], train_movements=trains, corridors=[self.corridor_data])
        self.assertTrue(len(plans_split) >= 2)
        for p in plans_split:
            self.assertEqual(p["final_status"], "SPLIT_PLAN")
            self.assertTrue(p["split_execution"])

    # ──────────────────────────────────────────────────────────────────────────
    # Test 35: Verification of All 27 Required Output Fields (Specification Section 19)
    # ──────────────────────────────────────────────────────────────────────────
    def test_35_all_27_required_output_fields(self):
        req = {
            "id": "r-schema", "request_id": "BR-SCHEMA-TEST",
            "corridor_id": self.corridor_id, "duration_minutes": 60,
            "requested_date": "2026-09-25", "status": "Pending Planning",
            "departments": {"name": "Engineering"}, "department_id": "DEPT-ENG",
        }
        plans = run_planning_engine(requests=[req], existing_blocks=[], train_movements=[], corridors=[self.corridor_data])
        self.assertEqual(len(plans), 1)
        plan = plans[0]

        required_27_fields = [
            "request_id", "planned_date", "start_time", "end_time", "duration",
            "corridor", "section", "track", "included_requests", "included_departments",
            "affected_trains", "affected_train_count", "high_priority_affected_trains",
            "train_impact_score", "gap_duration", "gap_utilization", "resources",
            "ohe_requirement", "existing_block_used", "split_execution",
            "operational_regulation_required", "approval_required", "approval_authority",
            "deadline_at_risk", "priority_score", "planning_reason", "rejected_alternatives",
            "final_status"
        ]
        for f in required_27_fields:
            self.assertIn(f, plan, f"Missing required specification field: '{f}'")

        self.assertIn(plan["final_status"], [
            "PLANNED", "COMBINED_BLOCK", "SPLIT_PLAN", "EXISTING_BLOCK_ABSORBED",
            "COA_APPROVAL_REQUIRED", "NO_FEASIBLE_PLAN"
        ])


if __name__ == "__main__":
    unittest.main()

