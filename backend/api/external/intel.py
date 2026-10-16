"""
Kestrel AI - External Threat Intelligence Router.
Queries Tavily Search for authoritative live CVE advisories, CVSS metrics, and mitigations.
"""
from fastapi import APIRouter

from backend.models import ThreatIntelRequest, ThreatIntelResponse
from backend.services.threat_intel import search_threat_intel

router = APIRouter(prefix="/intel", tags=["External - Threat Intel"])


@router.post("/cve", response_model=ThreatIntelResponse)
async def get_threat_intel(request: ThreatIntelRequest):
    """Retrieves live threat advisories from Tavily Search based on CWE ID."""
    return search_threat_intel(request.cwe_id, request.keyword or "")
