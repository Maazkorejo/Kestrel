"""
Kestrel AI - External OAuth Authentication Router.
Manages GitHub and Google OAuth 2.0 authorization, CSRF state verification, and token exchange.
"""
import os
import json
from typing import Dict, Any
from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse, RedirectResponse

from backend.services.auth_service import (
    get_auth_config,
    get_oauth_authorization_url,
    validate_oauth_state,
    exchange_github_code,
    exchange_google_code,
    save_oauth_config
)

router = APIRouter(prefix="/auth", tags=["External - OAuth"])


def _get_request_base_url(request: Request) -> str:
    """Resolves base URL for OAuth callbacks, honoring custom proxy or env override."""
    env_base = os.getenv("OAUTH_REDIRECT_BASE_URL", "").strip()
    if env_base:
        return env_base.rstrip("/")
    return str(request.base_url).rstrip("/")


def _render_oauth_setup_html(provider: str) -> HTMLResponse:
    provider_name = "GitHub" if provider.lower() == "github" else "Google"
    client_id_var = f"{provider.upper()}_CLIENT_ID"
    client_secret_var = f"{provider.upper()}_CLIENT_SECRET"
    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kestrel AI - {provider_name} OAuth Configuration</title>
    <style>
        * {{ box-sizing: border-box; margin: 0; padding: 0; }}
        body {{
            background-color: #0d1117;
            color: #c9d1d9;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 24px;
        }}
        .card {{
            background-color: #161b22;
            border: 1px solid #30363d;
            border-radius: 12px;
            max-width: 500px;
            width: 100%;
            padding: 32px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            text-align: center;
        }}
        .badge {{
            display: inline-block;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            background: rgba(245, 158, 11, 0.15);
            color: #fbbf24;
            border: 1px solid rgba(245, 158, 11, 0.3);
            border-radius: 20px;
            padding: 4px 12px;
            margin-bottom: 16px;
        }}
        h1 {{
            font-size: 20px;
            font-weight: 700;
            color: #f0f6fc;
            margin-bottom: 12px;
        }}
        p {{
            font-size: 13px;
            line-height: 1.6;
            color: #8b949e;
            margin-bottom: 16px;
        }}
        .code-box {{
            background: #0d1117;
            border: 1px solid #21262d;
            border-radius: 6px;
            padding: 12px;
            font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
            font-size: 12px;
            color: #58a6ff;
            text-align: left;
            margin-bottom: 20px;
        }}
        .btn {{
            display: inline-block;
            background: #10b981;
            color: #ffffff;
            font-size: 13px;
            font-weight: 600;
            padding: 10px 20px;
            border-radius: 6px;
            border: none;
            cursor: pointer;
            transition: background 0.2s;
        }}
        .btn:hover {{
            background: #059669;
        }}
    </style>
</head>
<body>
    <div class="card">
        <div class="badge">Configuration Required</div>
        <h1>{provider_name} OAuth Not Configured</h1>
        <p>To enable live {provider_name} sign-in, add your OAuth application credentials to the project <code>.env</code> file:</p>
        <div class="code-box">
            {client_id_var}=your_client_id_here<br>
            {client_secret_var}=your_client_secret_here
        </div>
        <p>Alternatively, return to Kestrel AI to sign in with email credentials, use Demo Mode, or Continue as Guest.</p>
        <button class="btn" onclick="window.close()">Close Window</button>
    </div>
</body>
</html>"""
    return HTMLResponse(content=html_content, status_code=200)


@router.get("/providers")
async def get_providers_endpoint():
    """Returns OAuth integration status for Google and GitHub."""
    return get_auth_config()


@router.get("/oauth-config")
async def get_oauth_config_endpoint():
    """Returns status and configuration details for Google and GitHub OAuth."""
    return get_auth_config()


@router.post("/oauth-config/save")
async def save_oauth_config_endpoint(payload: Dict[str, Any]):
    """Updates OAuth client IDs and secrets in environment and persists to .env."""
    return save_oauth_config(
        google_client_id=payload.get("google_client_id"),
        google_client_secret=payload.get("google_client_secret"),
        github_client_id=payload.get("github_client_id"),
        github_client_secret=payload.get("github_client_secret"),
    )


@router.get("/github/start")
async def github_oauth_start(request: Request):
    """Initiates GitHub OAuth flow by generating authorization URL with CSRF state."""
    host_base = _get_request_base_url(request)
    auth_info = get_oauth_authorization_url("github", host_base)
    accept = request.headers.get("accept", "")
    if "text/html" in accept and "application/json" not in accept:
        if auth_info.get("configured") and auth_info.get("auth_url"):
            return RedirectResponse(auth_info["auth_url"], status_code=307)
        return _render_oauth_setup_html("github")
    return auth_info


@router.get("/github/callback", response_class=HTMLResponse)
async def github_oauth_callback(request: Request, code: str = "", state: str = ""):
    """Handles GitHub OAuth callback, verifies CSRF token, and creates user profile."""
    if not code or not state:
        return HTMLResponse(
            "<html><body><script>alert('Missing OAuth parameters'); window.location.href='/';</script></body></html>",
            status_code=400
        )

    if not validate_oauth_state(state, "github"):
        return HTMLResponse(
            "<html><body><script>alert('Invalid or expired OAuth state parameter.'); window.location.href='/';</script></body></html>",
            status_code=403
        )

    host_base = _get_request_base_url(request)
    try:
        profile = await exchange_github_code(code, host_base)
        return HTMLResponse(f"""
        <!DOCTYPE html>
        <html>
        <head><title>Authentication Successful</title></head>
        <body style="background:#1a131d; color:#e2dbe5; font-family:sans-serif; display:flex; align-items:center; justify-content:center; height:100vh;">
            <div style="text-align:center;">
                <h3>Authenticated via GitHub</h3>
                <p>Welcome, {profile.get('name')}. Synchronizing IDE session...</p>
                <script>
                    if (window.opener) {{
                        window.opener.postMessage({{ type: 'OAUTH_AUTH_SUCCESS', user: {json.dumps(profile)} }}, '*');
                        window.close();
                    }} else {{
                        window.location.href = '/?auth=success&provider=github';
                    }}
                </script>
            </div>
        </body>
        </html>
        """)
    except Exception as e:
        err_str = str(e).replace("'", "\\'")
        return HTMLResponse(
            f"<html><body><script>alert('GitHub Authentication Error: {err_str}'); window.location.href='/';</script></body></html>",
            status_code=500
        )


@router.get("/google/start")
async def google_oauth_start(request: Request):
    """Initiates Google OAuth flow by generating authorization URL with CSRF state."""
    host_base = _get_request_base_url(request)
    auth_info = get_oauth_authorization_url("google", host_base)
    accept = request.headers.get("accept", "")
    if "text/html" in accept and "application/json" not in accept:
        if auth_info.get("configured") and auth_info.get("auth_url"):
            return RedirectResponse(auth_info["auth_url"], status_code=307)
        return _render_oauth_setup_html("google")
    return auth_info


@router.get("/google/callback", response_class=HTMLResponse)
async def google_oauth_callback(request: Request, code: str = "", state: str = ""):
    """Handles Google OAuth callback, verifies CSRF token, and creates user profile."""
    if not code or not state:
        return HTMLResponse(
            "<html><body><script>alert('Missing OAuth parameters'); window.location.href='/';</script></body></html>",
            status_code=400
        )

    if not validate_oauth_state(state, "google"):
        return HTMLResponse(
            "<html><body><script>alert('Invalid or expired OAuth state parameter.'); window.location.href='/';</script></body></html>",
            status_code=403
        )

    host_base = _get_request_base_url(request)
    try:
        profile = await exchange_google_code(code, host_base)
        return HTMLResponse(f"""
        <!DOCTYPE html>
        <html>
        <head><title>Authentication Successful</title></head>
        <body style="background:#1a131d; color:#e2dbe5; font-family:sans-serif; display:flex; align-items:center; justify-content:center; height:100vh;">
            <div style="text-align:center;">
                <h3>Authenticated via Google</h3>
                <p>Welcome, {profile.get('name')}. Synchronizing IDE session...</p>
                <script>
                    if (window.opener) {{
                        window.opener.postMessage({{ type: 'OAUTH_AUTH_SUCCESS', user: {json.dumps(profile)} }}, '*');
                        window.close();
                    }} else {{
                        window.location.href = '/?auth=success&provider=google';
                    }}
                </script>
            </div>
        </body>
        </html>
        """)
    except Exception as e:
        err_str = str(e).replace("'", "\\'")
        return HTMLResponse(
            f"<html><body><script>alert('Google Authentication Error: {err_str}'); window.location.href='/';</script></body></html>",
            status_code=500
        )
