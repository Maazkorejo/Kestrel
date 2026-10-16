"""
Kestrel AI - Backend Server Entrypoint.
FastAPI orchestration layer mounting internal and external API modules,
health checks, and desktop reverse proxying. Hunt flaws. Ship armor.
"""
import os
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, Response
import httpx

_ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=_ENV_PATH)

from .models import HealthResponse
from .api import internal_router, external_router

app = FastAPI(
    title="Kestrel AI Engine",
    description="Deterministic DevSecOps IDE backend powered by NVIDIA Nemotron and Tavily Search. Hunt flaws. Ship armor.",
    version="1.0.0"
)

# Enable CORS for local development and desktop clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health status and configuration check
@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    """Health status and configuration check."""
    nebius_key = os.getenv("NEBIUS_API_KEY", "").strip()
    tavily_key = os.getenv("TAVILY_API_KEY", "").strip()
    model = os.getenv("NVIDIA_MODEL", "nvidia/nemotron-3.5-lightning:free")

    return HealthResponse(
        status="ok",
        service="Kestrel AI Backend",
        model=model,
        tavily_configured=bool(tavily_key and tavily_key != "your_tavily_api_key_here"),
        openrouter_configured=bool(nebius_key and nebius_key != "your_nebius_api_key_here"),
    )

# Mount internal and external modular API routers
app.include_router(internal_router, prefix="/api")
app.include_router(external_router, prefix="/api")


# Reverse proxy to local Vite development server
FRONTEND_DEV_URL = "http://127.0.0.1:8080"


async def proxy_to_frontend(request: Request, path: str = ""):
    url = f"{FRONTEND_DEV_URL}/{path}" if path else FRONTEND_DEV_URL
    if request.url.query:
        url += f"?{request.url.query}"

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            req_content = await request.body()
            resp = await client.request(
                method=request.method,
                url=url,
                headers={k: v for k, v in request.headers.items() if k.lower() not in ("host", "content-length")},
                content=req_content
            )
            excluded = {"content-encoding", "content-length", "transfer-encoding", "connection"}
            headers = {k: v for k, v in resp.headers.items() if k.lower() not in excluded}
            return Response(content=resp.content, status_code=resp.status_code, headers=headers)
        except Exception:
            return HTMLResponse(
                """<!DOCTYPE html>
                <html>
                <head>
                    <title>Kestrel AI - Launching</title>
                    <meta http-equiv="refresh" content="2">
                </head>
                <body style="background:#0B0B0D; color:#22c55e; font-family:system-ui,sans-serif; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; margin:0;">
                    <div style="background:#121215; border:1px solid #27272a; border-radius:12px; padding:32px; max-width:480px; text-align:center; box-shadow:0 10px 25px rgba(0,0,0,0.5);">
                        <div style="font-size:32px; margin-bottom:12px;">🛡️</div>
                        <h2 style="color:#ffffff; margin:0 0 8px 0; font-size:18px;">Kestrel AI Frontend</h2>
                        <p style="color:#a1a1aa; font-size:13px; margin:0 0 16px 0;">Connecting to the Vite development server on port 8080...</p>
                        <div style="display:inline-block; border:2px solid #22c55e; border-top-color:transparent; border-radius:50%; width:20px; height:20px; animation:spin 1s linear infinite;"></div>
                        <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
                    </div>
                </body>
                </html>""",
                status_code=503
            )


@app.get("/")
async def serve_root(request: Request):
    """Serves root by proxying directly to Kestrel frontend."""
    return await proxy_to_frontend(request, "")


@app.api_route("/{full_path:path}", methods=["GET", "HEAD", "POST", "PUT", "DELETE", "OPTIONS"])
async def catchall_frontend_proxy(request: Request, full_path: str):
    """Proxies any non-API web asset request to Kestrel frontend."""
    if full_path.startswith("api/") or full_path in ("docs", "openapi.json", "redoc"):
        raise HTTPException(status_code=404, detail="Not Found")
    return await proxy_to_frontend(request, full_path)
