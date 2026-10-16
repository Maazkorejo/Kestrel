"""
Kestrel AI - Internal Exploit Sandbox & Attack Simulator Router.
Executes dynamic exploit payloads and mitigations in isolated environments.
"""
import asyncio
from typing import Dict, Any, List
from fastapi import APIRouter, HTTPException

from backend.models import (
    AttackScenario,
    SimulatorRunRequest,
    SimulatorRunResponse
)
from backend.services.sandbox_service import (
    simulate_exploit_and_mitigation,
    is_docker_available,
    get_attack_scenarios,
    simulate_custom_attack
)

router = APIRouter(tags=["Internal - Sandbox"])


@router.get("/sandbox/status")
async def sandbox_status_endpoint():
    """Returns local Docker container daemon availability status."""
    docker_active = is_docker_available()
    return {
        "docker_available": docker_active,
        "engine": "Docker Container (Debian Slim)" if docker_active else "Process Isolation Sandbox",
        "description": "Disposable container sandbox with zero-network isolation" if docker_active else "Quarantined local subprocess sandbox with 3s timeout limit"
    }


@router.post("/sandbox/simulate")
async def sandbox_simulate_endpoint(payload: Dict[str, Any]):
    """
    Executes vulnerable code and patched code in isolated sandboxes
    to verify dynamic mitigation efficacy.
    """
    vuln_code = payload.get("vulnerable_code", "")
    patched_code = payload.get("patched_code", "")
    filename = payload.get("filename", "buffer_overflow.py")
    if not vuln_code:
        raise HTTPException(status_code=400, detail="Missing vulnerable code for simulation")

    return await asyncio.to_thread(
        simulate_exploit_and_mitigation,
        vuln_code,
        patched_code or vuln_code,
        filename
    )


@router.get("/simulator/scenarios", response_model=List[AttackScenario])
async def simulator_scenarios_endpoint():
    """Returns the catalog of supported attack simulation scenarios and test vectors."""
    return await asyncio.to_thread(get_attack_scenarios)


@router.post("/simulator/run", response_model=SimulatorRunResponse)
async def simulator_run_endpoint(payload: SimulatorRunRequest):
    """
    Executes code against a simulated attack vector in an isolated container/process sandbox
    to verify vulnerability exploitability and validate defensive mitigations.
    """
    return await asyncio.to_thread(
        simulate_custom_attack,
        payload.code,
        payload.filename or "inference.py",
        payload.scenario_id,
        payload.custom_vector,
        payload.function_name,
        payload.force_sandbox or "auto"
    )
