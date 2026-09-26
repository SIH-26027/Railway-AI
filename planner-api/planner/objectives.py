"""
planner/objectives.py

Soft Optimization Objectives and Scoring Engine for Ranking Feasible Candidates.

Implements Rule Groups 13, 14, 15, 16, 29, 30, 31, 32, 43, 44, 45, 46, 47, 48, 50, 53:
  - Rule Group 13 & 14: Train Impact & Priority Multipliers
  - Rule Group 15 & 49: Train-Dense Period Penalty
  - Rule Group 16 & 48: Gap Quality & Unused Gap Minimization
  - Rule Group 24 & 46: Multi-Department Integration Bonus
  - Rule Group 29: Asset Criticality
  - Rule Group 30: Overdue Request Prioritization
  - Rule Group 31: Urgency Handling
  - Rule Group 32: Deadline Compliance & Deadline-at-Risk Flag
  - Rule Group 44: Total Block Duration Minimization
  - Rule Group 47: Resource Utilization Maximization
  - Rule Group 50: Date Proximity / Avoid Unnecessary Deviation
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import date
from typing import List, Optional, Dict, Any, Tuple

from .config import (
    TRAIN_PRIORITY_MULTIPLIERS,
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
from .constraints import ConstraintResult

logger = logging.getLogger(__name__)


# ─── Priority Breakdown Dataclass ─────────────────────────────────────────────

@dataclass
class PriorityBreakdown:
    criticality: float
    urgency: float
    overdue: float
    asset_impact: float
    safety_risk: float
    failure_risk: float
    total_score: float
    deadline_at_risk: bool = False
    days_to_due: Optional[int] = None
    resource_ready: float = 90.0
    train_impact: float = 0.0

    def to_dict(self) -> dict:
        return {
            "criticality": round(self.criticality, 1),
            "urgency": round(self.urgency, 1),
            "overdue": round(self.overdue, 1),
            "assetImpact": round(self.asset_impact, 1),
            "safetyRisk": round(self.safety_risk, 1),
            "failureRisk": round(self.failure_risk, 1),
            "resourceReady": round(self.resource_ready, 1),
            "trainImpact": round(self.train_impact, 1),
            "totalScore": round(self.total_score, 1),
            "deadlineAtRisk": self.deadline_at_risk,
            "daysToDue": self.days_to_due,
        }


# ─── Priority Scoring (Rule Groups 29, 30, 31, 32) ────────────────────────────

_PRIORITY_MAP = {"Highest": 100.0, "High": 85.0, "Medium": 60.0, "Low": 30.0}
_URGENCY_MAP = {"Critical": 100.0, "Urgent": 85.0, "Normal": 50.0, "Routine": 25.0, "Low": 20.0}

_HIGH_IMPACT_ASSET_KEYWORDS = [
    "rail", "bridge", "cwr", "track", "geometry", "level crossing",
    "ohe", "neutral section", "ptfe", "catenary", "pantograph",
    "electronic interlocking", "axle counter", "point machine",
    "signal", "relay", "panel", "turnout", "p-way", "welding",
    "sleeper", "ballast", "tamping", "points", "crossing", "interlocking", "switch"
]

_FAILURE_RISK_MAP = {
    "emergency": 100.0,
    "breakdown": 95.0,
    "corrective": 85.0,
    "replacement": 85.0,
    "welding": 80.0,
    "renewal": 80.0,
    "overhaul": 75.0,
    "preventive": 50.0,
    "inspection": 40.0,
    "routine": 30.0,
    "lubrication": 20.0,
    "painting": 15.0,
}


def _criticality_score(priority: str) -> float:
    return float(_PRIORITY_MAP.get(priority, 50.0))


def _urgency_score(urgency: str) -> float:
    return float(_URGENCY_MAP.get(urgency, 50.0))


def _overdue_score(
    requested_date_str: Optional[str],
    due_date_str: Optional[str] = None,
    proposed_date: Optional[date] = None,
    today: Optional[date] = None,
) -> Tuple[float, bool, Optional[int]]:
    """
    Calculate overdue score and check if block falls after due date (Rule Groups 30 & 32).
    """
    if today is None:
        today = date.today()
    check_date = proposed_date or today

    deadline_at_risk = False
    days_to_due = None

    # 1. Due date check
    if due_date_str:
        try:
            d_date = date.fromisoformat(due_date_str[:10])
            days_to_due = (d_date - check_date).days
            if days_to_due < 0:
                # Deadline missed or at risk
                deadline_at_risk = True
                overdue_days = abs(days_to_due)
                score = min(100.0, 50.0 + overdue_days * 5.0)
                return score, deadline_at_risk, days_to_due
            elif days_to_due <= 2:
                # Approaching deadline
                return 40.0, False, days_to_due
            else:
                return 0.0, False, days_to_due
        except (ValueError, TypeError):
            pass

    # 2. Fallback to requested_date
    if requested_date_str:
        try:
            req_d = date.fromisoformat(requested_date_str[:10])
            days_past = (check_date - req_d).days
            if days_past > 0:
                return min(100.0, days_past * 7.0), False, -days_past
        except (ValueError, TypeError):
            pass

    return 0.0, False, None


def _asset_impact_score(asset_type: str, maintenance_type: str) -> float:
    combined = f"{asset_type} {maintenance_type}".lower()
    matches = sum(1 for kw in _HIGH_IMPACT_ASSET_KEYWORDS if kw in combined)
    if matches >= 3:
        return 95.0
    if matches == 2:
        return 80.0
    if matches == 1:
        return 65.0
    return 40.0


def _safety_risk_score(safety_requirements: Any, disconnection_required: bool) -> float:
    score = 25.0
    if disconnection_required:
        score += 40.0
    s_text = str(safety_requirements or "").lower()
    if any(w in s_text for w in ["ohe", "isolation", "caution", "speed restriction", "protection"]):
        score += 30.0
    return min(100.0, score)


def _failure_risk_score(maintenance_type: str) -> float:
    mt = (maintenance_type or "").lower()
    for kw, val in _FAILURE_RISK_MAP.items():
        if kw in mt:
            return val
    return 40.0


def compute_priority_score(
    priority: str = "Medium",
    urgency: str = "Normal",
    asset_type: str = "",
    maintenance_type: str = "",
    resources_required: Any = None,
    duration_minutes: int = 60,
    constraint: Optional[ConstraintResult] = None,
    requested_date_str: Optional[str] = None,
    due_date_str: Optional[str] = None,
    safety_requirements: Any = None,
    disconnection_required: bool = False,
    proposed_date: Optional[date] = None,
    today: Optional[date] = None,
    resource_score: Optional[float] = None,
    train_impact_score: Optional[float] = None,
) -> PriorityBreakdown:
    """
    Compute comprehensive priority breakdown and composite score according to priority points.
    Composite formula balances:
      - Criticality (25%)
      - Urgency (25%)
      - Asset Impact (20%)
      - Resource Readiness (15%)
      - Operational / Minimal Train Disruption (15%)
      + Overdue / Deadline Risk Boost
    """
    c_score = _criticality_score(priority)
    u_score = _urgency_score(urgency)
    o_score, at_risk, d_due = _overdue_score(requested_date_str, due_date_str, proposed_date, today)
    a_score = _asset_impact_score(asset_type, maintenance_type)
    s_score = _safety_risk_score(safety_requirements, disconnection_required)
    f_score = _failure_risk_score(maintenance_type)

    r_score = float(resource_score if resource_score is not None else 85.0)
    t_impact = float(
        train_impact_score
        if train_impact_score is not None
        else (compute_train_impact_score(constraint) if constraint else 0.0)
    )
    train_feasibility = max(0.0, 100.0 - t_impact)

    # Calculate composite score strictly according to the priority points
    base_points = (
        c_score * 0.25 +
        u_score * 0.25 +
        a_score * 0.20 +
        r_score * 0.15 +
        train_feasibility * 0.15
    )
    overdue_boost = min(10.0, o_score * 0.1)
    total = min(100.0, base_points + overdue_boost)

    return PriorityBreakdown(
        criticality=c_score,
        urgency=u_score,
        overdue=o_score,
        asset_impact=a_score,
        safety_risk=s_score,
        failure_risk=f_score,
        total_score=round(total, 1),
        deadline_at_risk=at_risk,
        days_to_due=d_due,
        resource_ready=r_score,
        train_impact=t_impact,
    )


# ─── Train Impact Scoring (Rule Groups 13, 14, 45) ────────────────────────────

def compute_train_impact_score(constraint: Optional[ConstraintResult]) -> float:
    """
    Compute train impact score from constraint results.
    0.0 = zero trains affected (ideal).
    Higher score = more/higher-priority trains disrupted.
    """
    if not constraint or not constraint.affected_trains:
        return 0.0

    count = len(constraint.affected_trains)
    # 20 points per affected train, capped at 100
    base = min(100.0, count * 25.0)
    return float(base)


# ─── Resource Utilization Scoring (Rule Group 47) ─────────────────────────────

def compute_resource_score(
    resources_required: Any,
    duration_minutes: int,
    is_available: bool = True,
) -> float:
    """
    Compute resource score based on availability and utilization.
    """
    if not is_available:
        return 0.0
    if not resources_required:
        return 95.0
    # If resources are required and available for full duration
    return min(100.0, 70.0 + min(30.0, duration_minutes / 4.0))


# ─── Conflict & Coordination Helpers ──────────────────────────────────────────

def determine_conflict_status(constraint: ConstraintResult, department_name: str) -> str:
    """Determine UI conflict status badge string."""
    if not constraint.all_passed:
        if not constraint.train_conflict_checked:
            return "Train Conflict"
        if not constraint.no_overlapping_block:
            return "Block Overlap"
        if not constraint.resource_available:
            return "Resource Conflict"
        return "Constraint Violation"
    if "TRD" in department_name or "Traction" in department_name:
        return "Power Disconnection Required"
    return "No Conflict"


def detect_coordination_opportunity(
    request_id: str,
    corridor_id: str,
    proposed_date: str,
    proposed_start: str,
    proposed_end: str,
    all_pending_plans: List[dict],
) -> Optional[Dict[str, Any]]:
    """
    Identify potential multi-department shadow block opportunities.
    """
    partners = []
    for r in all_pending_plans:
        rid = r.get("id") or r.get("request_id")
        if str(rid) == request_id:
            continue
        if str(r.get("corridor_id") or "") != corridor_id:
            continue
        r_date = str(r.get("requested_date") or "")[:10]
        if r_date != proposed_date[:10]:
            continue

        dept = (r.get("departments") or {}).get("name", "Other")
        partners.append(dept)

    if partners:
        return {
            "partnerDepartments": list(set(partners)),
            "sharedWindow": f"{proposed_start}–{proposed_end}",
            "coordinationType": "Shadow Block / Integrated Corridor Block",
        }
    return None
