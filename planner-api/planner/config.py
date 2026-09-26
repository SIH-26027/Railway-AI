"""
planner/config.py

Centralized configuration for the Railway Automatic Block Planning Engine.
Defines configurable safety buffers, durations, horizons, and multi-objective weights.

All values are documented and configurable.
"""

from __future__ import annotations
from typing import Dict

# ─── Safety Buffers (Rule Groups 8 & 9, Specification Section 2) ───────────────

# Configurable buffer required before next train enters a section after maintenance block ends
PRE_TRAIN_BUFFER: int = 10

# Configurable buffer required after a train exits a section before maintenance block can start
POST_TRAIN_BUFFER: int = 15

# Backward compatibility aliases
DEFAULT_PRE_TRAIN_BUFFER_MINUTES: int = PRE_TRAIN_BUFFER
DEFAULT_POST_TRAIN_BUFFER_MINUTES: int = POST_TRAIN_BUFFER

# ─── Planning Horizon & Granularity (Rule Groups 39 & 7) ──────────────────────

# How many days ahead to search for feasible maintenance opportunities
DEFAULT_PLANNING_HORIZON_DAYS: int = 7

# Sliding step interval (in minutes) for candidate window generation inside large gaps
STEP_MINUTES: int = 15

# Maximum number of candidate windows to generate per request group
MAX_CANDIDATES_PER_GROUP: int = 30

# Maximum block duration in minutes (Rule Group 37). None = no fixed cap unless configured.
DEFAULT_MAX_BLOCK_DURATION_MINUTES: int = 360  # 6 hours default maximum operational block

# Setup, restoration, inspection, and clearance overhead (Rule Group 11, 35)
# Preserves architecture for future detailed breakdown.
DEFAULT_SETUP_TIME_MINUTES: int = 0
DEFAULT_RESTORATION_TIME_MINUTES: int = 0
DEFAULT_TRANSITION_TIME_MINUTES: int = 5

# Preferred time tolerance (minutes): window start within this window is "near preferred"
PREFERRED_TIME_TOLERANCE_MINUTES: int = 60

# ─── Soft Zone Preferences (Rule Groups 40 & 41) ──────────────────────────────
# Soft railway preferences. Actual train-free gaps dominate; these are soft scoring bonuses.
SOFT_ZONE_PREFERENCES = [
    ("01:00", "05:30", "Night Slack", 1.2),
    ("02:00", "05:00", "Pre-Dawn Freight Window", 1.15),
    ("12:30", "14:30", "Afternoon Slack", 1.05),
    ("05:00", "07:00", "Early Morning Window", 1.0),
    ("22:00", "23:59", "Late Night Window", 1.1),
]

# ─── Multi-Objective Optimization Weights (Rule Group 56) ──────────────────────
# Integer-scaled weights for CP-SAT solver and score comparison.
#
# OBJECTIVE FORMULA:
# MAXIMIZE:
#     WEIGHT_REQUESTS_COMBINED   × (number_of_requests_in_block - 1)
#   + WEIGHT_DEPT_INTEGRATION    × multi_dept_count
#   + WEIGHT_RESOURCE_UTIL       × resource_utilization_score
#   + WEIGHT_URGENCY             × urgency_score
#   + WEIGHT_CRITICALITY         × criticality_score
#   + WEIGHT_OVERDUE             × overdue_score
#   + WEIGHT_DEADLINE_COMPLIANCE × deadline_compliance_score
#   + WEIGHT_PREFERRED_TIME      × near_preferred_start_bonus
#   + WEIGHT_PREFERRED_DATE      × preferred_date_bonus
#   + WEIGHT_GAP_EFFICIENCY      × gap_efficiency_score
#
# MINIMIZE (subtracted):
#   - WEIGHT_BLOCK_DURATION      × total_block_duration_minutes
#   - WEIGHT_TRAIN_IMPACT        × train_impact_score
#   - WEIGHT_AFFECTED_TRAINS     × affected_train_count
#   - WEIGHT_DISRUPTION          × operational_disruption_score
#   - WEIGHT_UNUSED_GAP          × unused_gap_minutes
#   - WEIGHT_DENSE_PERIOD        × train_density_penalty
#   - WEIGHT_DATE_DEVIATION      × days_from_requested_date

WEIGHT_REQUESTS_COMBINED: int   = 500   # Major bonus for combining compatible requests
WEIGHT_DEPT_INTEGRATION: int    = 400   # Bonus for multi-department coordination
WEIGHT_RESOURCE_UTIL: int       = 150   # Bonus for chaining continuous resources
WEIGHT_URGENCY: int             = 250   # Higher urgency gets higher priority
WEIGHT_CRITICALITY: int         = 200   # Critical asset maintenance
WEIGHT_OVERDUE: int             = 300   # Overdue requests prioritized
WEIGHT_DEADLINE_COMPLIANCE: int = 350   # Completing before due date
WEIGHT_PREFERRED_TIME: int      = 150   # Soft bonus for matching preferred time
WEIGHT_PREFERRED_DATE: int      = 200   # Soft bonus for matching preferred date
WEIGHT_GAP_EFFICIENCY: int      = 100   # Efficiency of gap utilization

WEIGHT_BLOCK_DURATION: int      = 3     # Penalty per minute of blocked railway track
WEIGHT_TRAIN_IMPACT: int        = 40    # Penalty per unit of train impact score
WEIGHT_AFFECTED_TRAINS: int     = 800   # Heavy penalty per affected train movement
WEIGHT_DISRUPTION: int          = 30    # Penalty for general operational disruption
WEIGHT_UNUSED_GAP: int          = 1     # Mild penalty per minute of wasted gap
WEIGHT_DENSE_PERIOD: int        = 120   # Penalty for placing block in high-frequency period
WEIGHT_DATE_DEVIATION: int      = 100   # Penalty per day away from requested date

# ─── Train Priority Multipliers (Rule Group 14, Specification Section 7) ──────
TRAIN_PRIORITY_MULTIPLIERS: Dict[str, float] = {
    "Highest": 4.0,   # Vande Bharat, Rajdhani, Shatabdi
    "High":    3.0,   # Express, Mail, Superfast
    "Medium":  1.5,   # Passenger, Regular Freight
    "Low":     0.5,   # Departmental, Empty Rake, Local Goods
}

# ─── Planner Output Final Statuses (Specification Section 19) ─────────────────
STATUS_PLANNED: str = "PLANNED"
STATUS_COMBINED_BLOCK: str = "COMBINED_BLOCK"
STATUS_SPLIT_PLAN: str = "SPLIT_PLAN"
STATUS_EXISTING_BLOCK_ABSORBED: str = "EXISTING_BLOCK_ABSORBED"
STATUS_COA_APPROVAL_REQUIRED: str = "COA_APPROVAL_REQUIRED"
STATUS_NO_FEASIBLE_PLAN: str = "NO_FEASIBLE_PLAN"

# ─── Eligible Request Statuses ────────────────────────────────────────────────
ELIGIBLE_STATUSES = {"Pending Planning", "Under Planning"}
