"""
routes/planning.py

Railway AI Block Planning API Router.

All endpoints are mounted under /api/planning via main.py.

Read endpoints (GET):
  /api/planning/health          — health check + DB ping
  /api/planning/requests        — fetch eligible block_requests
  /api/planning/plans           — fetch existing block_plans
  /api/planning/blocks          — fetch existing_blocks
  /api/planning/corridors       — fetch corridors
  /api/planning/trains          — fetch train_movements

Planning endpoints (POST):
  /api/planning/generate        — plan single request by request_id
  /api/planning/generate-all   — plan all eligible pending requests
  /api/planning/run             — alias for generate-all (frontend compat)

Plan action endpoints (POST):
  /api/planning/plans/{plan_id}/approve  — approve a plan (COA action)
  /api/planning/plans/{plan_id}/reject   — reject a plan (COA action)
"""

from __future__ import annotations

import logging
import re
import time as time_module
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from database.supabase_client import supabase
from planner.planner import (
    run_planning_engine,
    run_planning_engine_with_metrics,
    plan_single_request,
    ELIGIBLE_STATUSES,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/planning", tags=["planning"])


# ─── Pydantic models ──────────────────────────────────────────────────────────

class GenerateRequest(BaseModel):
    request_id: str   # human-readable e.g. "BR-2026-001"


class ApproveRejectBody(BaseModel):
    remarks: Optional[str] = None


class PlanResponse(BaseModel):
    plan_id:                     str
    request_id:                  Optional[str]
    corridor_id:                 Optional[str]
    recommended_date:            Optional[str]
    recommended_start_time:      Optional[str]
    recommended_end_time:        Optional[str]
    duration_minutes:            Optional[int]
    priority_score:              Optional[float]
    train_impact_score:          Optional[float]
    asset_impact_score:          Optional[float]
    resource_availability_score: Optional[float]
    conflict_status:             Optional[str]
    rule_validation_status:      Optional[str]
    optimization_status:         Optional[str]
    planning_reason:             Optional[str]
    status:                      Optional[str]


# ─── Data fetching helpers ────────────────────────────────────────────────────

def _fetch_requests(status_filter: List[str] | None = None) -> list:
    """Fetch block_requests with joined department and corridor info."""
    q = (
        supabase
        .table("block_requests")
        .select("""
            id,
            request_id,
            corridor_id,
            department_id,
            asset_type,
            asset_name,
            maintenance_type,
            defect_reason,
            description,
            priority,
            urgency,
            requested_date,
            preferred_start_time,
            duration_minutes,
            block_required,
            disconnection_required,
            safety_requirements,
            resources_required,
            requested_by,
            status,
            remarks,
            created_at,
            departments!block_requests_department_id_fkey (
                id, name, system_name
            ),
            corridors!block_requests_corridor_id_fkey (
                id, corridor_name, block_section, line, availability_status
            )
        """)
        .order("created_at", desc=False)
    )
    if status_filter:
        # Supabase Python SDK: use in_ for multiple values
        q = q.in_("status", status_filter)

    resp = q.execute()
    return resp.data or []


def _fetch_existing_blocks() -> list:
    """Fetch existing_blocks with corridor info."""
    resp = (
        supabase
        .table("existing_blocks")
        .select("""
            id,
            block_id,
            corridor_id,
            department_id,
            purpose,
            block_date,
            start_time,
            end_time,
            duration_minutes,
            line,
            status,
            source,
            remarks
        """)
        .not_.in_("status", ["Cancelled", "Completed"])
        .execute()
    )
    return resp.data or []


def _fetch_train_movements(date_str: str | None = None) -> list:
    """Fetch train_movements (optionally filtered by date)."""
    q = (
        supabase
        .table("train_movements")
        .select("""
            id,
            train_id,
            corridor_id,
            movement_date,
            arrival_time,
            departure_time,
            direction,
            status,
            trains (
                train_number,
                train_name,
                priority
            )
        """)
    )
    if date_str:
        q = q.eq("movement_date", date_str)
    resp = q.execute()
    rows = resp.data or []
    out = []
    for r in rows:
        t = r.get("trains") or {}
        direction = r.get("direction") or "UP"
        line_str = "UP Line" if direction.upper() == "UP" else "DN Line"
        out.append({
            "id": r.get("id"),
            "train_id": r.get("train_id"),
            "corridor_id": r.get("corridor_id"),
            "train_number": t.get("train_number", ""),
            "train_name": t.get("train_name", ""),
            "priority": t.get("priority", "Medium"),
            "movement_date": r.get("movement_date"),
            "arrival_time": r.get("arrival_time"),
            "departure_time": r.get("departure_time"),
            "direction": direction,
            "line": line_str,
            "status": r.get("status"),
        })
    return out


def _fetch_corridors() -> list:
    """Fetch all corridors."""
    resp = (
        supabase
        .table("corridors")
        .select("""
            id,
            corridor_name,
            block_section,
            line,
            availability_status,
            distance_km
        """)
        .execute()
    )
    return resp.data or []


def _fetch_plans() -> list:
    """Fetch all block_plans with related info."""
    resp = (
        supabase
        .table("block_plans")
        .select("""
            id,
            plan_id,
            request_id,
            corridor_id,
            recommended_date,
            recommended_start_time,
            recommended_end_time,
            duration_minutes,
            priority_score,
            train_impact_score,
            asset_impact_score,
            resource_availability_score,
            conflict_status,
            rule_validation_status,
            optimization_status,
            planning_reason,
            status,
            coa_remarks,
            approved_at,
            created_at,
            block_requests!block_plans_request_id_fkey (
                request_id,
                asset_name,
                maintenance_type,
                departments!block_requests_department_id_fkey (
                    name, system_name
                )
            ),
            corridors!block_plans_corridor_id_fkey (
                corridor_name, block_section, line
            )
        """)
        .order("priority_score", desc=True)
        .execute()
    )
    return resp.data or []


ALLOWED_PLAN_COLUMNS = {
    "plan_id",
    "request_id",
    "corridor_id",
    "recommended_date",
    "recommended_start_time",
    "recommended_end_time",
    "duration_minutes",
    "priority_score",
    "train_impact_score",
    "asset_impact_score",
    "resource_availability_score",
    "conflict_status",
    "rule_validation_status",
    "optimization_status",
    "planning_reason",
    "status",
    "coa_remarks",
    "approved_at",
}


def _save_plans(plans: List[dict]) -> List[dict]:
    """
    Upsert block_plans into Supabase.
    Uses plan_id as the conflict key so re-running generate-all is idempotent.
    Filters out any extra metadata keys not defined on the block_plans schema.
    """
    if not plans:
        return []

    import uuid
    clean_plans = []
    for p in plans:
        row = {k: v for k, v in p.items() if k in ALLOWED_PLAN_COLUMNS}
        # In PostgreSQL block_plans, request_id is a UUID foreign key referencing block_requests.id.
        req_val = row.get("request_id")
        is_valid_uuid = False
        if req_val:
            try:
                uuid.UUID(str(req_val))
                is_valid_uuid = True
            except (ValueError, TypeError):
                is_valid_uuid = False

        if not is_valid_uuid:
            # Fallback to actual block_requests.id UUID from all_request_uuids
            uuids = p.get("all_request_uuids") or []
            found = False
            for u in uuids:
                if u:
                    try:
                        uuid.UUID(str(u))
                        row["request_id"] = str(u)
                        found = True
                        break
                    except (ValueError, TypeError):
                        pass
            if not found:
                row["request_id"] = None

        clean_plans.append(row)

    resp = (
        supabase
        .table("block_plans")
        .upsert(clean_plans, on_conflict="plan_id")
        .execute()
    )
    return resp.data or []


def _update_request_status(request_uuid: str, new_status: str) -> None:
    """Update block_request status after a plan is generated."""
    try:
        supabase.table("block_requests").update(
            {"status": new_status, "updated_at": datetime.utcnow().isoformat()}
        ).eq("id", request_uuid).execute()
    except Exception as e:
        logger.warning("Could not update request status for %s: %s", request_uuid, e)


# ─── Health ───────────────────────────────────────────────────────────────────

@router.get("/health", summary="Health check")
def health_check():
    """Check API health and Supabase connectivity."""
    try:
        resp = supabase.table("block_requests").select("id").limit(1).execute()
        db_ok = resp.data is not None
    except Exception as e:
        db_ok = False
        logger.error("DB ping failed: %s", e)

    return {
        "status":    "healthy" if db_ok else "degraded",
        "database":  "connected" if db_ok else "error",
        "engine":    "AI Block Planner v2.0 (CP-SAT + Constraint Engine)",
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }


# ─── Data read endpoints ──────────────────────────────────────────────────────

@router.get("/requests", summary="List block requests")
def get_requests(
    status: Optional[str] = Query(None, description="Filter by status, e.g. 'Pending Planning'")
):
    """Return block_requests, optionally filtered by status."""
    try:
        if status:
            data = _fetch_requests(status_filter=[status])
        else:
            data = _fetch_requests()
        return {"count": len(data), "data": data}
    except Exception as e:
        logger.exception("get_requests error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/plans", summary="List block plans")
def get_plans():
    """Return all block_plans ordered by priority score."""
    try:
        data = _fetch_plans()
        return {"count": len(data), "data": data}
    except Exception as e:
        logger.exception("get_plans error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/blocks", summary="List existing blocks")
def get_blocks():
    """Return existing active/scheduled blocks."""
    try:
        data = _fetch_existing_blocks()
        return {"count": len(data), "data": data}
    except Exception as e:
        logger.exception("get_blocks error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/corridors", summary="List corridors")
def get_corridors():
    """Return all corridor sections."""
    try:
        data = _fetch_corridors()
        return {"count": len(data), "data": data}
    except Exception as e:
        logger.exception("get_corridors error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/trains", summary="List train movements")
def get_trains(
    date: Optional[str] = Query(None, description="Filter by date YYYY-MM-DD")
):
    """Return train movement records."""
    try:
        data = _fetch_train_movements(date_str=date)
        return {"count": len(data), "data": data}
    except Exception as e:
        logger.exception("get_trains error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


# ─── POST /generate — plan a single request ──────────────────────────────────

@router.post("/generate", summary="Generate plan for one request")
def generate_plan(body: GenerateRequest):
    """
    Run the AI Block Planning Engine for a single block_request.

    Input:  { "request_id": "BR-2026-001" }
    Output: The generated block_plan dict, saved to block_plans table.

    Pipeline:
      Read request → Generate candidates → Check constraints →
      CP-SAT optimization → Save plan → Return recommendation
    """
    t0 = time_module.perf_counter()
    logger.info("POST /generate  request_id=%s", body.request_id)

    # ── 1. Fetch the request by human-readable request_id ─────────────────────
    try:
        resp = (
            supabase
            .table("block_requests")
            .select("""
                id, request_id, corridor_id, department_id,
                asset_type, asset_name, maintenance_type, defect_reason, description,
                priority, urgency, requested_date, preferred_start_time,
                duration_minutes, block_required, disconnection_required,
                safety_requirements, resources_required, requested_by, status, remarks,
                departments!block_requests_department_id_fkey (id, name, system_name),
                corridors!block_requests_corridor_id_fkey (id, corridor_name, block_section, line, availability_status)
            """)
            .eq("request_id", body.request_id)
            .single()
            .execute()
        )
        request = resp.data
    except Exception as e:
        logger.exception("DB fetch for %s failed: %s", body.request_id, e)
        raise HTTPException(status_code=404, detail=f"Request '{body.request_id}' not found: {e}")

    if not request:
        raise HTTPException(status_code=404, detail=f"Request '{body.request_id}' not found")

    # ── 2. Eligibility check ──────────────────────────────────────────────────
    req_status = request.get("status", "")
    if req_status not in ELIGIBLE_STATUSES:
        raise HTTPException(
            status_code=409,
            detail=f"Request '{body.request_id}' has status '{req_status}' — not eligible for planning. "
                   f"Eligible statuses: {sorted(ELIGIBLE_STATUSES)}",
        )

    # ── 3. Fetch supporting data ──────────────────────────────────────────────
    try:
        existing_blocks = _fetch_existing_blocks()
        train_movements = _fetch_train_movements()
        corridors       = _fetch_corridors()
        corridors_map   = {str(c["id"]): c for c in corridors if c.get("id")}
    except Exception as e:
        logger.exception("Data fetch error: %s", e)
        raise HTTPException(status_code=500, detail=f"Data fetch failed: {e}")

    # ── 4. Run planning engine ────────────────────────────────────────────────
    try:
        plan = plan_single_request(
            request=request,
            existing_blocks=existing_blocks,
            train_movements=train_movements,
            all_pending_requests=[request],   # single-request run
            plan_index=1,
            corridors_map=corridors_map,
        )
    except Exception as e:
        logger.exception("Planning engine error for %s: %s", body.request_id, e)
        raise HTTPException(status_code=500, detail=f"Planning engine error: {e}")

    if plan is None:
        raise HTTPException(
            status_code=422,
            detail=(
                f"No feasible block window found for request '{body.request_id}'. "
                "All candidate windows failed hard constraint checks. "
                "Review train movements, existing blocks, or adjust requested date."
            ),
        )

    # ── 5. Save to block_plans ────────────────────────────────────────────────
    try:
        saved = _save_plans([plan])
    except Exception as e:
        logger.exception("Save plan error: %s", e)
        raise HTTPException(status_code=500, detail=f"Failed to save plan: {e}")

    # Optionally update request status to 'Under Planning'
    _update_request_status(request.get("id", ""), "Under Planning")

    elapsed = round((time_module.perf_counter() - t0) * 1000)
    logger.info(
        "generate: %s → %s  (%.1f score, %d ms)",
        body.request_id, plan["plan_id"], plan["priority_score"], elapsed,
    )

    return {
        "message":         "Plan generated successfully",
        "elapsed_ms":      elapsed,
        "plan":            plan,
        "saved_to_db":     len(saved) > 0,
    }


# ─── POST /generate-all — plan all pending requests ──────────────────────────

@router.post("/generate-all", summary="Generate plans for all eligible requests")
def generate_all():
    """
    Run the AI Block Planning Engine over all eligible pending requests.

    Processes all requests with status in {Pending Planning, Under Planning}.
    Skips any request that already has a plan.

    Returns a summary of plans generated.
    """
    t0 = time_module.perf_counter()
    logger.info("POST /generate-all")

    # ── Fetch all data in parallel (sequential calls — simple & safe) ─────────
    try:
        requests        = _fetch_requests(status_filter=list(ELIGIBLE_STATUSES))
        existing_blocks = _fetch_existing_blocks()
        train_movements = _fetch_train_movements()
        corridors       = _fetch_corridors()
    except Exception as e:
        logger.exception("Data fetch error in generate-all: %s", e)
        raise HTTPException(status_code=500, detail=f"Data fetch failed: {e}")

    if not requests:
        return {
            "message":            "No eligible requests found",
            "requests_processed": 0,
            "plans_generated":    0,
            "plans":              [],
        }

    # ── Run engine ────────────────────────────────────────────────────────────
    try:
        plans, metrics = run_planning_engine_with_metrics(
            requests=requests,
            existing_blocks=existing_blocks,
            train_movements=train_movements,
            corridors=corridors,
        )
    except Exception as e:
        logger.exception("Planning engine error: %s", e)
        raise HTTPException(status_code=500, detail=f"Planning engine error: {e}")

    # ── Save all plans ────────────────────────────────────────────────────────
    saved_plans = []
    if plans:
        try:
            # Purge stale unapproved candidate plans so old plans don't linger
            supabase.table("block_plans").delete().in_("status", ["AI Recommended", "COA Approval Required"]).execute()
        except Exception as e:
            logger.warning("Could not purge stale candidate plans: %s", e)

        try:
            saved_plans = _save_plans(plans)
        except Exception as e:
            logger.exception("Bulk save error: %s", e)
            raise HTTPException(status_code=500, detail=f"Failed to save plans: {e}")

        # Update request statuses for all constituent requests
        plan_req_uuids = set()
        for p in plans:
            if p.get("all_request_uuids"):
                plan_req_uuids.update(p["all_request_uuids"])
            elif p.get("request_id"):
                plan_req_uuids.add(p["request_id"])

        for req in requests:
            if req.get("id") in plan_req_uuids:
                _update_request_status(req["id"], "Under Planning")

    elapsed = round((time_module.perf_counter() - t0) * 1000)
    logger.info(
        "generate-all complete: %d/%d plans saved in %d ms",
        len(saved_plans), len(requests), elapsed,
    )

    return {
        "message":                   f"Generated {len(plans)} plans for {len(requests)} eligible requests",
        "elapsed_ms":                elapsed,
        "run_id":                    f"RUN-{datetime.utcnow().strftime('%Y%m%d-%H%M')}",
        "requests_processed":        metrics.get("requests_processed", len(requests)),
        "plans_generated":           metrics.get("plans_generated", len(plans)),
        "plans_saved":               len(saved_plans),
        "skipped":                   len(requests) - len(plans),
        "candidate_windows":         metrics.get("candidate_windows", 0),
        "valid_windows":             metrics.get("valid_windows", 0),
        "conflicts_removed":         metrics.get("conflicts_removed", 0),
        "conflicts_detected":        metrics.get("conflicts_detected", 0),
        "baseline_hours":            metrics.get("baseline_hours", 0.0),
        "optimized_hours":           metrics.get("optimized_hours", 0.0),
        "coordination_opportunities": metrics.get("coordination_opportunities", 0),
        "plans":                     plans,
    }


# ─── POST /run — alias for generate-all (frontend compatibility) ──────────────

@router.post("/run", summary="Run planning engine (alias for generate-all)")
def run_planning():
    """Alias for POST /generate-all — kept for frontend compatibility."""
    return generate_all()


# ─── POST /plans/{plan_id}/approve ───────────────────────────────────────────

@router.post("/plans/{plan_id}/approve", summary="Approve a block plan")
def approve_plan(plan_id: str, body: ApproveRejectBody = ApproveRejectBody()):
    """
    COA controller approves a plan.
    Updates block_plans.status to 'Approved'.
    Creates an existing_blocks record with status 'Scheduled' or 'Active' according to date & time.
    """
    logger.info("POST /plans/%s/approve", plan_id)
    try:
        # 1. Fetch full plan details
        plan_resp = (
            supabase
            .table("block_plans")
            .select("""
                id, plan_id, request_id, corridor_id,
                recommended_date, recommended_start_time, recommended_end_time,
                duration_minutes,
                block_requests!block_plans_request_id_fkey (
                    id, department_id, asset_name, maintenance_type
                ),
                corridors!block_plans_corridor_id_fkey (
                    id, line
                )
            """)
            .eq("plan_id", plan_id)
            .single()
            .execute()
        )
        plan_data = plan_resp.data
        if not plan_data:
            raise HTTPException(status_code=404, detail=f"Plan '{plan_id}' not found")

        # 2. Update block_plans to Approved
        supabase.table("block_plans").update({
            "status":      "Approved",
            "coa_remarks": body.remarks,
            "approved_at": datetime.utcnow().isoformat(),
        }).eq("plan_id", plan_id).execute()

        # 3. Determine status: 'Active' or 'Scheduled' according to date & time
        rec_date = str(plan_data.get("recommended_date") or "")[:10]
        start_t = str(plan_data.get("recommended_start_time") or "00:00:00")
        end_t = str(plan_data.get("recommended_end_time") or "23:59:59")
        now = datetime.now()
        today_str = now.strftime("%Y-%m-%d")

        if rec_date > today_str:
            computed_status = "Scheduled"
        elif rec_date == today_str:
            s_parts = [int(p) for p in start_t.split(":")[:2]]
            e_parts = [int(p) for p in end_t.split(":")[:2]]
            start_min = s_parts[0] * 60 + s_parts[1]
            end_min = e_parts[0] * 60 + e_parts[1]
            now_min = now.hour * 60 + now.minute

            if end_min < start_min: # overnight
                if now_min >= start_min or now_min <= end_min:
                    computed_status = "Active"
                else:
                    computed_status = "Scheduled"
            elif now_min >= start_min and now_min <= end_min:
                computed_status = "Active"
            elif now_min < start_min:
                computed_status = "Scheduled"
            else:
                computed_status = "Active"
        else:
            computed_status = "Scheduled"

        # 4. Insert into existing_blocks
        req_obj = plan_data.get("block_requests") or {}
        cor_obj = plan_data.get("corridors") or {}
        dept_id = req_obj.get("department_id")
        corridor_id = plan_data.get("corridor_id")
        clean_id = plan_id.replace("PLAN-", "").replace("BP-", "")
        block_id = f"BLK-{clean_id}"

        if not dept_id:
            dept_res = supabase.table("departments").select("id").limit(1).execute()
            if dept_res.data:
                dept_id = dept_res.data[0]["id"]

        if corridor_id and dept_id:
            purpose = f"{req_obj.get('maintenance_type', '')} - {req_obj.get('asset_name', '')}".strip(" -")
            supabase.table("existing_blocks").upsert({
                "block_id": block_id,
                "corridor_id": corridor_id,
                "department_id": dept_id,
                "purpose": purpose,
                "block_date": rec_date,
                "start_time": start_t,
                "end_time": end_t,
                "duration_minutes": plan_data.get("duration_minutes", 60),
                "line": cor_obj.get("line") or "UP Line",
                "status": computed_status,
                "source": "COA Schedule",
                "remarks": f"Approved from Plan {plan_id} by COA Chief Controller",
            }, on_conflict="block_id").execute()

        # Update corridor availability_status to Blocked
        if corridor_id:
            try:
                supabase.table("corridors").update({
                    "availability_status": "Blocked"
                }).eq("id", corridor_id).execute()
            except Exception as e:
                logger.warning("Could not update corridor %s status: %s", corridor_id, e)

        # 5. Update request status to Planned
        req_uuid = plan_data.get("request_id")
        if req_uuid:
            _update_request_status(req_uuid, "Planned")

        # Also mark all constituent requests found in coa_remarks / optimization_status as Planned
        raw_text = f"{plan_data.get('coa_remarks') or ''} {plan_data.get('optimization_status') or ''}"
        found_req_ids = re.findall(r"BR-\d{4}-[A-Za-z0-9]+", raw_text)
        for req_id_str in set(found_req_ids):
            try:
                supabase.table("block_requests").update({
                    "status": "Planned",
                    "updated_at": datetime.utcnow().isoformat(),
                }).eq("request_id", req_id_str).execute()
            except Exception as e:
                logger.warning("Could not update request %s: %s", req_id_str, e)

        return {
            "message": f"Plan {plan_id} approved and moved to Existing Blocks as {computed_status}",
            "plan_id": plan_id,
            "status": "Approved",
            "block_id": block_id,
            "block_status": computed_status
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("approve_plan error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


# ─── POST /plans/{plan_id}/reject ────────────────────────────────────────────

@router.post("/plans/{plan_id}/reject", summary="Reject a block plan")
def reject_plan(plan_id: str, body: ApproveRejectBody = ApproveRejectBody()):
    """
    COA controller rejects a plan.
    Updates block_plans.status to 'Rejected'.
    """
    logger.info("POST /plans/%s/reject", plan_id)
    try:
        resp = (
            supabase
            .table("block_plans")
            .update({
                "status":      "Rejected",
                "coa_remarks": body.remarks,
            })
            .eq("plan_id", plan_id)
            .execute()
        )
        if not resp.data:
            raise HTTPException(status_code=404, detail=f"Plan '{plan_id}' not found")
        return {"message": f"Plan {plan_id} rejected", "plan_id": plan_id, "status": "Rejected"}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("reject_plan error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))