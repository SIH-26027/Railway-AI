"""
planner/planner.py

Main Orchestrator — AI Automatic Railway Block Planning Engine.
Implements the full 22-step pipeline and Rule Groups 1 through 60.

Pipeline:
  1. Load and validate pending block requests (Rule Group 1)
  2. Group requests by corridor, section, line, track, and date window (Rule Group 2)
  3. Identify compatible requests for same-track & section merging (Rule Group 3)
  4. Evaluate adjacent section operational continuity (Rule Group 4)
  5. Check existing blocks for absorption or extension (Rule Groups 5, 33, 34)
  6. Calculate actual train-free gaps with pre- and post-train safety buffers (Rule Groups 6–10)
  7. Compute required duration (parallel = MAX, sequential = SUM) (Rule Groups 25, 26)
  8. Dynamically generate candidate windows from train-free gaps (Rule Group 7, 10, 12, 16)
  9. Evaluate all 20 hard constraints and record rejection reasons (Rule Groups 52, 58)
 10. Run CP-SAT multi-objective optimization over feasible candidates (Rule Groups 53–56)
 11. Handle NO_FEASIBLE_PLAN condition with next possible date (Rule Group 59)
 12. Build transparent, explainable planning reasons (Rule Group 57)
 13. Output schema-compatible block plans for the block_plans database (Rule Group 60)
"""

from __future__ import annotations

import logging
from datetime import date, datetime, timedelta
from typing import List, Dict, Optional, Tuple, Any

from .config import (
    PRE_TRAIN_BUFFER,
    POST_TRAIN_BUFFER,
    DEFAULT_POST_TRAIN_BUFFER_MINUTES,
    DEFAULT_PRE_TRAIN_BUFFER_MINUTES,
    DEFAULT_PLANNING_HORIZON_DAYS,
    DEFAULT_MAX_BLOCK_DURATION_MINUTES,
    MAX_CANDIDATES_PER_GROUP,
    ELIGIBLE_STATUSES,
    STATUS_PLANNED,
    STATUS_COMBINED_BLOCK,
    STATUS_SPLIT_PLAN,
    STATUS_EXISTING_BLOCK_ABSORBED,
    STATUS_COA_APPROVAL_REQUIRED,
    STATUS_NO_FEASIBLE_PLAN,
)
from .grouping import (
    validate_all_requests,
    group_requests,
    RequestGroup,
    parse_chainage,
)
from .train_gap_analyzer import (
    calculate_train_free_gaps,
    extract_train_occupancies,
    minutes_to_time,
    parse_time_to_minutes,
    find_operational_regulation_scenarios,
    evaluate_window_train_impact_detailed,
    OperationalRegulationScenario,
)
from .candidate_windows import (
    generate_candidate_windows_for_group,
    CandidateWindow,
)
from .existing_block_merger import evaluate_existing_block_merge
from .constraints import check_constraints, ConstraintResult
from .objectives import (
    compute_priority_score,
    compute_train_impact_score,
    compute_resource_score,
    determine_conflict_status,
    detect_coordination_opportunity,
    PriorityBreakdown,
)
from .optimizer import (
    calculate_candidate_score,
    select_best_window_cpsat,
)

logger = logging.getLogger(__name__)


# ─── Plan Helpers ─────────────────────────────────────────────────────────────

def _make_plan_id(prefix: str, year: int, index: int) -> str:
    """Generate a clean human-readable plan ID, e.g. PLAN-2026-001."""
    return f"PLAN-{year}-{str(index).zfill(3)}"


def _time_str(t: Any) -> str:
    if t is None:
        return "00:00"
    if hasattr(t, "strftime"):
        return t.strftime("%H:%M")
    return str(t)[:5]


# ─── Transparent Planning Reason Builder (Rule Group 57) ──────────────────────

def build_transparent_reason(
    group: RequestGroup,
    selected_window: CandidateWindow,
    constraint: ConstraintResult,
    score: PriorityBreakdown,
    train_impact: float,
    resource_score: float,
    total_candidates: int,
    feasible_candidates: int,
    is_existing_merged: bool = False,
    merged_block_id: Optional[str] = None,
) -> str:
    """
    Construct a factual, rule-based planning reason explaining WHY this block
    was selected over other opportunities. No generative AI or fake explanations.
    """
    lines: List[str] = []

    req_ids = group.request_ids()
    sec_name = group.block_section
    win_date = selected_window.window_date.strftime("%Y-%m-%d")
    s_time = _time_str(selected_window.start_time)
    e_time = _time_str(selected_window.end_time)
    dur = selected_window.duration_minutes

    # 1. Window Selection & Train Gap summary
    if is_existing_merged and merged_block_id:
        lines.append(
            f"Merged into existing block {merged_block_id} on {win_date} ({s_time}–{e_time}, {dur} min) "
            f"to maximize railway corridor utilization and avoid creating fragmented blocks."
        )
    else:
        gap_dur = selected_window.gap_usable_duration
        lines.append(
            f"Selected {s_time}–{e_time} on {win_date} because the {group.corridor_name} ({sec_name}) section "
            f"has a {gap_dur}-minute train-free interval after applying the required safety buffers "
            f"({DEFAULT_POST_TRAIN_BUFFER_MINUTES} min post-train, {DEFAULT_PRE_TRAIN_BUFFER_MINUTES} min pre-train)."
        )

    # 2. Multi-request integration details (Rule Groups 3, 24, 25, 26)
    if len(req_ids) > 1:
        dept_str = ", ".join(sorted(group.departments))
        lines.append(
            f"Integrated {len(req_ids)} compatible maintenance requests ({', '.join(req_ids)}) from "
            f"[{dept_str}] into one single block. Work execution mode: {group.execution_mode} "
            f"(effective required work duration: {group.work_duration_minutes} min)."
        )
    else:
        lines.append(
            f"Allocated for request {req_ids[0]} with required duration {dur} min."
        )

    # 3. Train impact & Hard constraint checks
    train_count = constraint.affected_train_count
    if train_count == 0:
        lines.append("Zero scheduled train movements or corridor conflicts affected.")
    else:
        lines.append(f"Affects {train_count} scheduled train movement(s): {', '.join(constraint.affected_trains)}.")

    # 4. Optimizer comparison context
    unused = selected_window.unused_gap_minutes
    lines.append(
        f"Evaluated {total_candidates} candidate opportunities ({feasible_candidates} feasible). "
        f"Selected by CP-SAT multi-objective optimization with gap efficiency {selected_window.gap_efficiency_score * 100:.0f}% "
        f"(unused buffer: {unused} min)."
    )

    # 5. Overdue / Deadline notes (Rule Groups 30 & 32)
    if score.deadline_at_risk:
        lines.append("WARNING: Completed after requested due date (deadline at risk).")
    elif score.overdue > 0:
        lines.append(f"Request prioritized due to overdue status ({score.overdue:.0f} overdue score pts).")

    return " ".join(lines)


# ─── Group-Oriented Planner Engine ────────────────────────────────────────────

def plan_request_group(
    group: RequestGroup,
    existing_blocks: List[dict],
    train_movements: List[dict],
    corridors_map: Optional[Dict[str, dict]] = None,
    plan_index_start: int = 1,
) -> Tuple[List[dict], List[str], Dict[str, Any]]:
    """
    Plan a unified block for an entire RequestGroup (Rule Groups 1 to 60).

    Returns:
      (list_of_block_plans_for_group, rejection_reasons_if_unfeasible, group_metrics)
    """
    corridor_data = corridors_map.get(group.corridor_id) if corridors_map else None

    # Step 5: Check existing blocks for absorption or merge (Rule Group 5, 33, 34)
    pref_start = group.requests[0].get("preferred_start_time") if group.requests else None
    first_dept = list(group.departments)[0] if group.departments else "Engineering"

    merge_eval = evaluate_existing_block_merge(
        corridor_id=group.corridor_id,
        line=group.line,
        target_date=group.target_date,
        required_duration_minutes=group.total_required_duration,
        preferred_start_time=pref_start,
        existing_blocks=existing_blocks,
        department_name=first_dept,
        resources_required=";".join(group.required_resources),
        disconnection_required=group.disconnection_required,
    )

    # Step 6 & 8: Generate candidate windows from actual train-free gaps
    candidates = generate_candidate_windows_for_group(
        corridor_id=group.corridor_id,
        line=group.line,
        target_date=group.target_date,
        required_duration=group.total_required_duration,
        preferred_start_time=pref_start,
        train_movements=train_movements,
        horizon_days=DEFAULT_PLANNING_HORIZON_DAYS,
        max_candidates=MAX_CANDIDATES_PER_GROUP,
    )

    # If merge_eval succeeded, prepend a candidate representing the merged block
    if merge_eval.can_merge and merge_eval.merged_start_time and merge_eval.merged_end_time:
        m_start_min = parse_time_to_minutes(merge_eval.merged_start_time)
        m_end_min = parse_time_to_minutes(merge_eval.merged_end_time)
        merged_cand = CandidateWindow(
            window_date=group.target_date,
            start_time=merge_eval.merged_start_time,
            end_time=merge_eval.merged_end_time,
            duration_minutes=merge_eval.merged_duration_minutes,
            slot_label=f"Merged with {merge_eval.merged_block_id}",
            preference_rank=1,
            start_minutes=m_start_min,
            end_minutes=m_end_min,
            gap_usable_duration=merge_eval.merged_duration_minutes,
            unused_gap_minutes=0,
            gap_efficiency_score=1.0,
            surrounding_density=0,
            is_preferred_date=True,
            is_near_preferred_time=True,
        )
        candidates.insert(0, merged_cand)

    # Step 9: Run Hard Constraint Checks for each candidate (Rule Group 52)
    feasible_cands: List[CandidateWindow] = []
    feasible_constraints: List[ConstraintResult] = []
    all_rejections: List[str] = []

    if not candidates:
        dur_hr = round(group.total_required_duration / 60.0, 1)
        all_rejections.append(
            f"No natural continuous train-free gaps >= {dur_hr}h ({group.total_required_duration}m) "
            f"found on corridor {group.corridor_name} ({group.block_section}) across 7-day horizon."
        )

    lead_req = group.requests[0] if group.requests else {}
    lead_req_id = lead_req.get("request_id") or lead_req.get("id") or "REQ"
    lead_uuid = lead_req.get("id") or ""
    all_req_ids = group.request_ids()
    all_uuids = [r.get("id") for r in group.requests if r.get("id")]
    effective_max_dur = max(DEFAULT_MAX_BLOCK_DURATION_MINUTES, group.total_required_duration)

    for cand in candidates:
        cr = check_constraints(
            corridor_id=group.corridor_id,
            line=group.line,
            proposed_date=cand.window_date,
            proposed_start=cand.start_time,
            proposed_end=cand.end_time,
            duration_minutes=cand.duration_minutes,
            department_name=first_dept,
            request_status="Pending Planning",
            existing_blocks=existing_blocks,
            train_movements=train_movements,
            corridor_data=corridor_data,
            resources_required=";".join(group.required_resources),
            disconnection_required=group.disconnection_required,
            gap_usable_duration=cand.gap_usable_duration,
            max_duration_minutes=effective_max_dur,
        )

        # If this candidate is the merged block, ignore existing block conflict with itself
        if merge_eval.can_merge and cand.slot_label.startswith("Merged with"):
            if not cr.no_overlapping_block and cr.conflicting_block_ids == [str(merge_eval.merged_block_id)]:
                cr.no_overlapping_block = True
                if "no_overlapping_block" in cr.failed_rules():
                    cr.rejection_reasons = [r for r in cr.rejection_reasons if "overlaps with existing block" not in r.lower()]

        if cr.all_passed:
            feasible_cands.append(cand)
            feasible_constraints.append(cr)
        else:
            cand_label = f"[{cand.window_date} {_time_str(cand.start_time)}–{_time_str(cand.end_time)}]"
            for rj in cr.rejection_reasons:
                all_rejections.append(f"{cand_label} {rj}")

    # ─── 7-Level Decision Hierarchy (Specification Section 10) ───────────────────

    # ── Option A / B / D: If feasible candidate exists in natural gaps ─────────
    if feasible_cands:
        # Step 10: Multi-Objective CP-SAT Optimization (Rule Groups 53–56)
        utilities: List[int] = []
        breakdowns: List[PriorityBreakdown] = []
        impact_scores: List[float] = []
        res_scores: List[float] = []

        req_assets = " ".join(set(str(r.get("asset_type") or "") for r in group.requests))
        req_maints = " ".join(set(str(r.get("maintenance_type") or "") for r in group.requests))
        req_safeties = " ".join(set(str(r.get("safety_requirements") or "") for r in group.requests))
        due_date_s = group.earliest_due_date.strftime("%Y-%m-%d") if group.earliest_due_date else None

        for i, cand in enumerate(feasible_cands):
            cr = feasible_constraints[i]
            days_dev = abs((cand.window_date - group.target_date).days)
            ti = compute_train_impact_score(cr)
            rs = compute_resource_score(";".join(group.required_resources), cand.duration_minutes, cr.resource_available)

            pb = compute_priority_score(
                priority=group.max_priority,
                urgency=group.max_urgency,
                asset_type=req_assets,
                maintenance_type=req_maints,
                resources_required=";".join(group.required_resources),
                duration_minutes=cand.duration_minutes,
                constraint=cr,
                requested_date_str=group.target_date.strftime("%Y-%m-%d"),
                due_date_str=due_date_s,
                safety_requirements=req_safeties,
                disconnection_required=group.disconnection_required,
                proposed_date=cand.window_date,
                resource_score=rs,
                train_impact_score=ti,
            )

            util = calculate_candidate_score(
                duration_minutes=cand.duration_minutes,
                priority_score=pb.total_score,
                train_impact_score=ti,
                affected_train_count=cr.affected_train_count,
                preference_rank=cand.preference_rank,
                unused_gap_minutes=cand.unused_gap_minutes,
                surrounding_density=cand.surrounding_density,
                requests_combined_count=len(group.requests),
                multi_dept_count=len(group.departments),
                resource_score=rs,
                is_preferred_date=cand.is_preferred_date,
                is_near_preferred=cand.is_near_preferred_time,
                days_deviation=days_dev,
                deadline_at_risk=pb.deadline_at_risk,
            )

            utilities.append(util)
            breakdowns.append(pb)
            impact_scores.append(ti)
            res_scores.append(rs)

        # Solve with CP-SAT
        best_idx = select_best_window_cpsat(utilities)
        if best_idx is None:
            best_idx = 0

        selected_cand = feasible_cands[best_idx]
        selected_cr = feasible_constraints[best_idx]
        selected_pb = breakdowns[best_idx]
        selected_ti = impact_scores[best_idx]
        selected_rs = res_scores[best_idx]
        is_merged = selected_cand.slot_label.startswith("Merged with")

        final_status = (
            STATUS_EXISTING_BLOCK_ABSORBED if is_merged else
            (STATUS_COMBINED_BLOCK if len(group.requests) > 1 else STATUS_PLANNED)
        )

        # Step 12: Build Transparent Reason (Rule Group 57)
        reason = build_transparent_reason(
            group=group,
            selected_window=selected_cand,
            constraint=selected_cr,
            score=selected_pb,
            train_impact=selected_ti,
            resource_score=selected_rs,
            total_candidates=len(candidates),
            feasible_candidates=len(feasible_cands),
            is_existing_merged=is_merged,
            merged_block_id=merge_eval.merged_block_id if is_merged else None,
        )

        conflict_status = determine_conflict_status(selected_cr, first_dept)
        opt_status = None
        if len(group.requests) > 1:
            req_list = ", ".join(group.request_ids())
            dept_list = ", ".join(sorted(group.departments))
            opt_status = f"Integrated Multi-Request Block ({len(group.requests)} requests: {req_list}) across [{dept_list}]."
        elif is_merged:
            opt_status = f"Absorbed into Existing Block {merge_eval.merged_block_id}."

        plan_id = _make_plan_id("PLAN", selected_cand.window_date.year, plan_index_start)

        coa_remarks = None
        if len(group.requests) > 1:
            dept_str = "/".join(sorted(list(group.departments)))
            coa_remarks = f"Coordinated Multi-Department Block ({dept_str}) uniting {', '.join(all_req_ids)}."
        elif is_merged:
            coa_remarks = f"Absorbed into Existing Block {merge_eval.merged_block_id}."

        # Step 13: Assemble Block Plan Records with all 27 fields (Specification Section 19)
        plan = {
            # Specification Section 19 Core Output Fields
            "request_id": lead_req_id,
            "planned_date": selected_cand.window_date.strftime("%Y-%m-%d"),
            "start_time": _time_str(selected_cand.start_time),
            "end_time": _time_str(selected_cand.end_time),
            "duration": selected_cand.duration_minutes,
            "corridor": group.corridor_name,
            "section": group.block_section,
            "track": group.line,
            "included_requests": all_req_ids,
            "included_departments": sorted(list(group.departments)),
            "affected_trains": selected_cr.affected_trains,
            "affected_train_count": selected_cr.affected_train_count,
            "high_priority_affected_trains": selected_cr.high_priority_affected_trains,
            "train_impact_score": round(selected_ti, 2),
            "gap_duration": selected_cand.gap_usable_duration,
            "gap_utilization": round(selected_cand.gap_efficiency_score * 100, 1),
            "resources": "; ".join(group.required_resources) if group.required_resources else "None",
            "ohe_requirement": "Power Disconnection Required" if group.disconnection_required else "None",
            "existing_block_used": merge_eval.merged_block_id if is_merged else None,
            "split_execution": False,
            "operational_regulation_required": False,
            "approval_required": True if (is_merged or len(group.requests) > 1) else False,
            "approval_authority": "COA",
            "deadline_at_risk": selected_pb.deadline_at_risk,
            "priority_score": round(selected_pb.total_score, 2),
            "planning_reason": reason,
            "rejected_alternatives": all_rejections[:5],
            "final_status": final_status,

            # Backward compatibility fields for DB and UI
            "plan_id": plan_id,
            "corridor_id": group.corridor_id,
            "recommended_date": selected_cand.window_date.strftime("%Y-%m-%d"),
            "recommended_start_time": _time_str(selected_cand.start_time),
            "recommended_end_time": _time_str(selected_cand.end_time),
            "duration_minutes": selected_cand.duration_minutes,
            "asset_impact_score": round(selected_pb.asset_impact, 2),
            "resource_availability_score": round(selected_rs, 2),
            "conflict_status": conflict_status,
            "rule_validation_status": "All rules passed" if selected_cr.all_passed else f"Violations: {', '.join(selected_cr.failed_rules())}",
            "optimization_status": opt_status,
            "status": "AI Recommended",
            "coa_remarks": coa_remarks,
            "approved_at": None,
            "all_request_uuids": all_uuids,
            "request_ids": all_req_ids,
            "departments": sorted(list(group.departments)),
        }
        return [plan], [], {
            "candidates": len(candidates),
            "valid": len(feasible_cands),
            "conflicts_removed": len(candidates) - len(feasible_cands),
            "conflicts_detected": len(all_rejections),
        }

    # ── Level 5: Option C — Split Maintenance Check (Specification Section 8) ───
    can_split = any(
        bool(r.get("can_split") or r.get("split_execution_permitted") or r.get("allow_split"))
        for r in group.requests
    )

    if can_split and group.total_required_duration > 60:
        split_segments = []
        rem_dur = group.total_required_duration
        for day_offset in range(DEFAULT_PLANNING_HORIZON_DAYS):
            s_date = group.target_date + timedelta(days=day_offset)
            day_gaps = calculate_train_free_gaps(
                train_movements=train_movements,
                corridor_id=group.corridor_id,
                target_date=s_date,
                line=group.line,
                post_buffer=POST_TRAIN_BUFFER,
                pre_buffer=PRE_TRAIN_BUFFER,
                min_required_duration=60,
            )
            for g in day_gaps:
                chunk = min(rem_dur, g.usable_duration_minutes)
                if chunk >= 60:
                    s_time = g.usable_start_time
                    e_min = g.usable_start_minutes + chunk
                    e_time = minutes_to_time(e_min)
                    cr_chunk = check_constraints(
                        corridor_id=group.corridor_id,
                        line=group.line,
                        proposed_date=s_date,
                        proposed_start=s_time,
                        proposed_end=e_time,
                        duration_minutes=chunk,
                        department_name=first_dept,
                        request_status="Pending Planning",
                        existing_blocks=existing_blocks,
                        train_movements=train_movements,
                        corridor_data=corridor_data,
                        resources_required=";".join(group.required_resources),
                        disconnection_required=group.disconnection_required,
                        gap_usable_duration=g.usable_duration_minutes,
                    )
                    if cr_chunk.all_passed:
                        split_segments.append({
                            "date": s_date,
                            "start_time": s_time,
                            "end_time": e_time,
                            "duration": chunk,
                            "gap_usable": g.usable_duration_minutes,
                            "cr": cr_chunk,
                        })
                        rem_dur -= chunk
                        if rem_dur <= 0:
                            break
            if rem_dur <= 0:
                break

        if rem_dur <= 0 and split_segments:
            split_plans: List[dict] = []
            for s_idx, sc in enumerate(split_segments, start=1):
                s_pid = f"{_make_plan_id('PLAN', sc['date'].year, plan_index_start)}-{s_idx}"
                s_plan = {
                    "request_id": lead_req_id,
                    "planned_date": sc["date"].strftime("%Y-%m-%d"),
                    "start_time": _time_str(sc["start_time"]),
                    "end_time": _time_str(sc["end_time"]),
                    "duration": sc["duration"],
                    "corridor": group.corridor_name,
                    "section": group.block_section,
                    "track": group.line,
                    "included_requests": all_req_ids,
                    "included_departments": sorted(list(group.departments)),
                    "affected_trains": sc["cr"].affected_trains,
                    "affected_train_count": sc["cr"].affected_train_count,
                    "high_priority_affected_trains": sc["cr"].high_priority_affected_trains,
                    "train_impact_score": 0.0,
                    "gap_duration": sc["gap_usable"],
                    "gap_utilization": round(sc["duration"] / max(1, sc["gap_usable"]) * 100, 1),
                    "resources": "; ".join(group.required_resources) if group.required_resources else "None",
                    "ohe_requirement": "Power Disconnection Required" if group.disconnection_required else "None",
                    "existing_block_used": None,
                    "split_execution": True,
                    "operational_regulation_required": False,
                    "approval_required": True,
                    "approval_authority": "COA",
                    "deadline_at_risk": False,
                    "priority_score": 75.0,
                    "planning_reason": (
                        f"Split maintenance execution: Segment {s_idx} of {len(split_segments)} "
                        f"({sc['duration']}m out of {group.total_required_duration}m total) "
                        f"scheduled into clean train-free gap on {sc['date'].strftime('%Y-%m-%d')}."
                    ),
                    "rejected_alternatives": all_rejections[:5],
                    "final_status": STATUS_SPLIT_PLAN,
                    # DB compatibility
                    "plan_id": s_pid,
                    "corridor_id": group.corridor_id,
                    "recommended_date": sc["date"].strftime("%Y-%m-%d"),
                    "recommended_start_time": _time_str(sc["start_time"]),
                    "recommended_end_time": _time_str(sc["end_time"]),
                    "duration_minutes": sc["duration"],
                    "status": "AI Recommended",
                    "conflict_status": "No Conflict",
                    "rule_validation_status": "All rules passed",
                    "optimization_status": f"Split Maintenance Block ({s_idx}/{len(split_segments)})",
                    "coa_remarks": f"Split execution block: segment {s_idx}/{len(split_segments)}.",
                    "approved_at": None,
                    "all_request_uuids": all_uuids,
                    "request_ids": all_req_ids,
                    "departments": sorted(list(group.departments)),
                }
                split_plans.append(s_plan)
            return split_plans, [], {"candidates": len(candidates), "valid": len(split_plans), "conflicts_removed": 0, "conflicts_detected": len(all_rejections)}
        else:
            all_rejections.append("Split maintenance permitted but insufficient combined safe sub-gaps found.")
    else:
        all_rejections.append("Split maintenance not permitted: task requires continuous work execution.")

    # ── Level 6: Option B — Operational Regulation Scenario (Specification Section 6 & 7) ─
    # If continuous natural gap not found and splitting not permitted, evaluate whether an operational
    # regulation scenario could create the required window and propose it for COA approval.
    corridor_ok = corridor_data.get("availability_status", "Available") == "Available" if corridor_data else True
    duration_ok = group.total_required_duration <= effective_max_dur

    if corridor_ok and duration_ok and train_movements:
        reg_scenarios = find_operational_regulation_scenarios(
            train_movements=train_movements,
            corridor_id=group.corridor_id,
            target_date=group.target_date,
            required_duration=group.total_required_duration,
            line=group.line,
            preferred_start_time=pref_start,
            post_buffer=POST_TRAIN_BUFFER,
            pre_buffer=PRE_TRAIN_BUFFER,
            horizon_days=DEFAULT_PLANNING_HORIZON_DAYS,
        )
        # Select viable candidate scenario (e.g. <= 4 affected trains, 0 high-priority trains, not a total blocker)
        viable_scenarios = [
            s for s in reg_scenarios
            if s.affected_train_count <= 4 and s.train_impact_score < 100.0 and len(s.high_priority_affected_trains) == 0
        ]

        if viable_scenarios:
            best_sc = viable_scenarios[0]
            plan_id = _make_plan_id("PLAN", best_sc.target_date.year, plan_index_start)
            reg_plan = {
                "request_id": lead_req_id,
                "planned_date": best_sc.target_date.strftime("%Y-%m-%d"),
                "start_time": _time_str(best_sc.start_time),
                "end_time": _time_str(best_sc.end_time),
                "duration": best_sc.duration_minutes,
                "corridor": group.corridor_name,
                "section": group.block_section,
                "track": group.line,
                "included_requests": all_req_ids,
                "included_departments": sorted(list(group.departments)),
                "affected_trains": best_sc.affected_trains,
                "affected_train_count": best_sc.affected_train_count,
                "high_priority_affected_trains": best_sc.high_priority_affected_trains,
                "train_impact_score": round(best_sc.train_impact_score, 2),
                "gap_duration": best_sc.duration_minutes,
                "gap_utilization": 100.0,
                "resources": "; ".join(group.required_resources) if group.required_resources else "None",
                "ohe_requirement": "Power Disconnection Required" if group.disconnection_required else "None",
                "existing_block_used": None,
                "split_execution": False,
                "operational_regulation_required": True,
                "approval_required": True,
                "approval_authority": "COA",
                "deadline_at_risk": False,
                "priority_score": 70.0,
                "planning_reason": best_sc.regulation_reason,
                "rejected_alternatives": all_rejections[:5],
                "final_status": STATUS_COA_APPROVAL_REQUIRED,

                # DB & UI compatibility
                "plan_id": plan_id,
                "corridor_id": group.corridor_id,
                "recommended_date": best_sc.target_date.strftime("%Y-%m-%d"),
                "recommended_start_time": _time_str(best_sc.start_time),
                "recommended_end_time": _time_str(best_sc.end_time),
                "duration_minutes": best_sc.duration_minutes,
                "asset_impact_score": 50.0,
                "resource_availability_score": 85.0,
                "conflict_status": "Train Regulation Required",
                "rule_validation_status": "COA Approval Required for Proposed Train Regulation",
                "optimization_status": f"Operational regulation scenario: proposed regulation of {', '.join(best_sc.affected_trains)}",
                "status": "COA Approval Required",
                "coa_remarks": (
                    f"COA APPROVAL REQUIRED: Proposed operational regulation of lower-priority train(s): "
                    f"{', '.join(best_sc.affected_trains)} to create {round(best_sc.duration_minutes/60, 1)}h continuous block."
                ),
                "approved_at": None,
                "all_request_uuids": all_uuids,
                "request_ids": all_req_ids,
                "departments": sorted(list(group.departments)),
            }
            g_metrics = {
                "candidates": len(candidates),
                "valid": 1,
                "conflicts_removed": 0,
                "conflicts_detected": len(all_rejections),
            }
            return [reg_plan], [], g_metrics

    # ── Level 7: NO_FEASIBLE_PLAN (Specification Section 18) ──────────────────────
    all_horizon_gaps = []
    for d in range(DEFAULT_PLANNING_HORIZON_DAYS):
        g_date = group.target_date + timedelta(days=d)
        all_horizon_gaps.extend(calculate_train_free_gaps(
            train_movements=train_movements,
            corridor_id=group.corridor_id,
            target_date=g_date,
            line=group.line,
            post_buffer=POST_TRAIN_BUFFER,
            pre_buffer=PRE_TRAIN_BUFFER,
            min_required_duration=15,
        ))
    largest_gap = max((g.usable_duration_minutes for g in all_horizon_gaps), default=0)
    dur_hr = round(group.total_required_duration / 60.0, 1)
    gap_hr = round(largest_gap / 60.0, 1)
    summary_rejection = (
        f"NO_FEASIBLE_PLAN for request(s) {', '.join(all_req_ids)} on {group.corridor_name} ({group.block_section}): "
        f"Required continuous duration = {dur_hr}h ({group.total_required_duration}m). "
        f"Largest natural safe gap across {DEFAULT_PLANNING_HORIZON_DAYS}-day horizon = {gap_hr}h ({largest_gap}m). "
        f"Alternative dates evaluated = {DEFAULT_PLANNING_HORIZON_DAYS}. "
        f"Split execution = {'Not permitted by task specification' if not can_split else 'Insufficient safe sub-gaps'}. "
        f"Operational regulation scenario = requires COA decision or unviable. "
        f"Hard constraint rejections: {'; '.join(all_rejections[:3]) if all_rejections else 'No windows satisfy railway safety buffers'}."
    )
    return [], [summary_rejection], {
        "candidates": len(candidates),
        "valid": 0,
        "conflicts_removed": len(candidates),
        "conflicts_detected": len(all_rejections),
    }


# ─── Full Engine Entrypoint ───────────────────────────────────────────────────

def run_planning_engine(
    requests: List[dict],
    existing_blocks: List[dict],
    train_movements: List[dict],
    corridors: Optional[List[dict]] = None,
    return_metrics: bool = False,
) -> Any:
    """
    Run the full Railway Automatic Block Planning Engine.
    Processes all eligible requests, groups compatible work, analyses train gaps,
    filters by 20 hard constraints, optimizes with CP-SAT, and returns final plans.
    """
    # 1. Build corridors map
    corridors_map: Dict[str, dict] = {}
    if corridors:
        for c in corridors:
            cid = str(c.get("id") or "")
            if cid:
                corridors_map[cid] = c

    # 2. Filter eligible requests
    eligible = [r for r in requests if r.get("status") in ELIGIBLE_STATUSES]
    logger.info("Railway Planning Engine started: %d total, %d eligible", len(requests), len(eligible))
    if not eligible:
        empty_metrics = {
            "requests_processed": len(requests),
            "plans_generated": 0,
            "candidate_windows": 0,
            "valid_windows": 0,
            "conflicts_removed": 0,
            "conflicts_detected": 0,
            "baseline_hours": 0.0,
            "optimized_hours": 0.0,
            "coordination_opportunities": 0,
        }
        return ([], empty_metrics) if return_metrics else []

    # 3. Request Validation (Rule Group 1)
    valid_requests, rejected_map = validate_all_requests(eligible, corridors_map)
    logger.info("Validation complete: %d valid, %d rejected", len(valid_requests), len(rejected_map))

    # 4. Request Grouping (Rule Groups 2, 3, 24)
    groups = group_requests(valid_requests, corridors_map)
    logger.info("Formed %d unified request group(s)", len(groups))

    # 5. Plan each group
    all_plans: List[dict] = []
    plan_counter = 1
    total_candidates = 0
    total_valid = 0
    total_conflicts_removed = 0
    total_conflicts_detected = 0

    for group in groups:
        res = plan_request_group(
            group=group,
            existing_blocks=existing_blocks,
            train_movements=train_movements,
            corridors_map=corridors_map,
            plan_index_start=plan_counter,
        )
        if len(res) == 3:
            plans, rejections, g_metrics = res
            total_candidates += g_metrics.get("candidates", 0)
            total_valid += g_metrics.get("valid", 0)
            total_conflicts_removed += g_metrics.get("conflicts_removed", 0)
            total_conflicts_detected += g_metrics.get("conflicts_detected", 0)
        else:
            plans, rejections = res[0], res[1]

        if plans:
            all_plans.extend(plans)
            plan_counter += len(plans)
            logger.info("  ✓ Group %s → %d plan(s) generated (%s %s–%s)",
                        group.group_id, len(plans), plans[0]["recommended_date"],
                        plans[0]["recommended_start_time"], plans[0]["recommended_end_time"])
        else:
            logger.warning("  ✗ Group %s → No feasible plan: %s", group.group_id, rejections)
            # If combining multiple requests into one sequential block exceeded train gaps,
            # fall back to planning each request individually across the horizon
            if len(group.requests) > 1:
                logger.info("  ↺ Group %s: Falling back to planning %d requests individually across horizon...",
                            group.group_id, len(group.requests))
                for s_req in group.requests:
                    sub_groups = group_requests([s_req], corridors_map)
                    for sg in sub_groups:
                        simulated_existing = list(existing_blocks) + [
                            {
                                "corridor_id": p.get("corridor_id"),
                                "block_date": p.get("recommended_date"),
                                "start_time": p.get("recommended_start_time"),
                                "end_time": p.get("recommended_end_time"),
                                "duration_minutes": p.get("duration_minutes", 60),
                                "line": p.get("track", "UP Line"),
                            }
                            for p in all_plans
                        ]
                        s_res = plan_request_group(
                            group=sg,
                            existing_blocks=simulated_existing,
                            train_movements=train_movements,
                            corridors_map=corridors_map,
                            plan_index_start=plan_counter,
                        )
                        s_plans = s_res[0] if isinstance(s_res, (list, tuple)) else []
                        if s_plans:
                            all_plans.extend(s_plans)
                            plan_counter += len(s_plans)
                            logger.info("    ✓ Fallback single plan generated for %s: %s %s–%s",
                                        s_req.get("request_id"), s_plans[0]["recommended_date"],
                                        s_plans[0]["recommended_start_time"], s_plans[0]["recommended_end_time"])

    baseline_hours = round(sum(int(r.get("duration_minutes") or 60) for r in eligible) / 60.0, 1)
    # Deduplicate planned duration by unique plan window (corridor + date + start + end) to reflect real track blockage
    unique_windows = set()
    optimized_minutes = 0
    for p in all_plans:
        win_key = (p.get("corridor_id"), p.get("recommended_date"), p.get("recommended_start_time"), p.get("recommended_end_time"))
        if win_key not in unique_windows:
            unique_windows.add(win_key)
            optimized_minutes += int(p.get("duration_minutes") or 60)
    optimized_hours = round(optimized_minutes / 60.0, 1)

    coord_opps = sum(1 for g in groups if len(g.requests) > 1 or len(g.departments) > 1)

    metrics = {
        "requests_processed": len(requests),
        "plans_generated": len(all_plans),
        "candidate_windows": total_candidates,
        "valid_windows": total_valid,
        "conflicts_removed": total_conflicts_removed,
        "conflicts_detected": total_conflicts_detected,
        "baseline_hours": baseline_hours,
        "optimized_hours": optimized_hours,
        "coordination_opportunities": coord_opps,
    }

    logger.info("Planning Engine complete: %d plan(s) generated for %d eligible request(s)", len(all_plans), len(eligible))
    if return_metrics:
        return all_plans, metrics
    return all_plans


def run_planning_engine_with_metrics(
    requests: List[dict],
    existing_blocks: List[dict],
    train_movements: List[dict],
    corridors: Optional[List[dict]] = None,
) -> Tuple[List[dict], Dict[str, Any]]:
    """Convenience helper to run planning engine and return (plans, metrics)."""
    return run_planning_engine(
        requests=requests,
        existing_blocks=existing_blocks,
        train_movements=train_movements,
        corridors=corridors,
        return_metrics=True,
    )


# Backward compatibility single-request wrapper
def plan_single_request(
    request: dict,
    existing_blocks: list,
    train_movements: list,
    all_pending_requests: list,
    plan_index: int,
    corridors_map: dict | None = None,
) -> Optional[dict]:
    """Single request planner adapter for backward compatibility."""
    plans = run_planning_engine(
        requests=[request],
        existing_blocks=existing_blocks,
        train_movements=train_movements,
        corridors=list(corridors_map.values()) if corridors_map else None,
    )
    return plans[0] if plans else None
