"""
planner/optimizer.py

Google OR-Tools CP-SAT Optimization Engine for Railway Maintenance Block Planning.

Implements Rule Groups 53, 54, 55, 56:
  - Rule Group 53: 16 Soft Optimization Objectives
  - Rule Group 54: Systematic Plan Comparison across Candidates
  - Rule Group 55: CP-SAT Decision Formulation
  - Rule Group 56: Configurable Multi-Objective Function

ARCHITECTURE:
  Feasible Candidates (hard constraints already passed in constraints.py)
            ↓
  CP-SAT Decision Variables (x[i] ∈ {0, 1})
            ↓
  Hard Constraint: exactly one window selected (or fallback to top scored)
  Soft Objective: Maximize composite railway operational score
            ↓
  Optimal Selected Window Index

The optimizer NEVER overrides a hard constraint. It only evaluates candidates
that have passed all hard checks.
"""

from __future__ import annotations

import logging
from typing import List, Optional, Dict, Any

from .config import (
    WEIGHT_REQUESTS_COMBINED,
    WEIGHT_DEPT_INTEGRATION,
    WEIGHT_RESOURCE_UTIL,
    WEIGHT_URGENCY,
    WEIGHT_CRITICALITY,
    WEIGHT_OVERDUE,
    WEIGHT_DEADLINE_COMPLIANCE,
    WEIGHT_PREFERRED_TIME,
    WEIGHT_PREFERRED_DATE,
    WEIGHT_GAP_EFFICIENCY,
    WEIGHT_BLOCK_DURATION,
    WEIGHT_TRAIN_IMPACT,
    WEIGHT_AFFECTED_TRAINS,
    WEIGHT_DISRUPTION,
    WEIGHT_UNUSED_GAP,
    WEIGHT_DENSE_PERIOD,
    WEIGHT_DATE_DEVIATION,
)

logger = logging.getLogger(__name__)


# ─── Candidate Evaluation Metrics ─────────────────────────────────────────────

def calculate_candidate_score(
    duration_minutes: int,
    priority_score: float,
    train_impact_score: float,
    affected_train_count: int,
    preference_rank: int,
    unused_gap_minutes: int,
    surrounding_density: int,
    requests_combined_count: int = 1,
    multi_dept_count: int = 1,
    resource_score: float = 80.0,
    is_preferred_date: bool = True,
    is_near_preferred: bool = False,
    days_deviation: int = 0,
    deadline_at_risk: bool = False,
) -> int:
    """
    Calculate the integer-scaled composite utility score for a feasible candidate block (Rule Group 56).

    Maximizes railway throughput, multi-department coordination, and safety;
    minimizes operational disruption, track block duration, and train interference.
    """
    score = 0

    # ── Positive Terms (Maximize) ─────────────────────────────────────────────
    # Combining multiple requests into one block
    if requests_combined_count > 1:
        score += (requests_combined_count - 1) * WEIGHT_REQUESTS_COMBINED

    # Multi-department coordination (Engineering + S&T + TRD)
    if multi_dept_count > 1:
        score += (multi_dept_count - 1) * WEIGHT_DEPT_INTEGRATION

    # Asset criticality and urgency (0–100 scale)
    score += int(priority_score * 10)

    # Resource utilization
    score += int((resource_score / 100.0) * WEIGHT_RESOURCE_UTIL)

    # Preferred date and time alignment
    if is_preferred_date:
        score += WEIGHT_PREFERRED_DATE
    if is_near_preferred:
        score += WEIGHT_PREFERRED_TIME

    # Gap efficiency: tighter fit receives higher efficiency
    # If unused gap is small (e.g. 10m vs 90m), award bonus
    if unused_gap_minutes <= 30:
        score += WEIGHT_GAP_EFFICIENCY

    # ── Negative Terms (Minimize) ─────────────────────────────────────────────
    # Duration penalty: prefer shortest feasible block
    score -= duration_minutes * WEIGHT_BLOCK_DURATION

    # Train impact penalty: train priority and delays
    score -= int(train_impact_score * WEIGHT_TRAIN_IMPACT)

    # Number of affected trains penalty
    score -= affected_train_count * WEIGHT_AFFECTED_TRAINS

    # Unused train gap waste
    score -= unused_gap_minutes * WEIGHT_UNUSED_GAP

    # Train-dense period penalty
    score -= surrounding_density * WEIGHT_DENSE_PERIOD

    # Date deviation penalty
    score -= days_deviation * WEIGHT_DATE_DEVIATION

    # Deadline risk penalty
    if deadline_at_risk:
        score -= 400

    # Slight tie-breaker for earlier preference rank
    score -= preference_rank * 2

    return score


# ─── CP-SAT Optimization Solver ───────────────────────────────────────────────

def select_best_window_cpsat(
    candidate_utilities: List[int],
    time_limit_seconds: int = 15,
) -> Optional[int]:
    """
    Use OR-Tools CP-SAT to select the candidate with maximum composite utility.
    """
    try:
        from ortools.sat.python import cp_model
    except ImportError:
        logger.warning("ortools not installed — falling back to deterministic max")
        if candidate_utilities:
            return candidate_utilities.index(max(candidate_utilities))
        return None

    n = len(candidate_utilities)
    if n == 0:
        return None
    if n == 1:
        return 0

    model = cp_model.CpModel()

    # Decision variables: x[i] = 1 if candidate i is selected
    x = [model.new_bool_var(f"cand_{i}") for i in range(n)]

    # Hard Constraint: Exactly one candidate must be chosen
    model.add_exactly_one(x)

    # Objective: Maximize sum(x[i] * utility[i])
    model.maximize(sum(x[i] * candidate_utilities[i] for i in range(n)))

    # Solve
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = time_limit_seconds
    solver.parameters.log_search_progress = False

    status = solver.solve(model)
    if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        for i in range(n):
            if solver.value(x[i]) == 1:
                return i

    # Fallback to greedy maximum
    return candidate_utilities.index(max(candidate_utilities))


# ─── Backward Compatibility Wrapper ───────────────────────────────────────────

def select_best_window(
    feasible_window_indices: List[int],
    priority_scores: List[float],
    train_impact_scores: List[float],
    preference_ranks: List[int],
    near_preferred: List[bool],
    coordination_possible: List[bool],
    durations: Optional[List[int]] = None,
    unused_gaps: Optional[List[int]] = None,
    densities: Optional[List[int]] = None,
    affected_counts: Optional[List[int]] = None,
    time_limit_seconds: int = 30,
) -> Optional[int]:
    """
    Backward-compatible entry point for CP-SAT window selection.
    Accepts parallel arrays of scores and returns the index into feasible_window_indices.
    """
    n = len(feasible_window_indices)
    if n == 0:
        return None
    if n == 1:
        return 0

    utilities: List[int] = []
    for i in range(n):
        dur = durations[i] if durations and i < len(durations) else 60
        unused = unused_gaps[i] if unused_gaps and i < len(unused_gaps) else 30
        density = densities[i] if densities and i < len(densities) else 0
        aff_cnt = affected_counts[i] if affected_counts and i < len(affected_counts) else (1 if train_impact_scores[i] > 0 else 0)

        util = calculate_candidate_score(
            duration_minutes=dur,
            priority_score=priority_scores[i],
            train_impact_score=train_impact_scores[i],
            affected_train_count=aff_cnt,
            preference_rank=preference_ranks[i],
            unused_gap_minutes=unused,
            surrounding_density=density,
            multi_dept_count=2 if coordination_possible[i] else 1,
            is_near_preferred=near_preferred[i],
        )
        utilities.append(util)

    best_idx = select_best_window_cpsat(utilities, time_limit_seconds)
    return best_idx
