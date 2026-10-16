"""
Kestrel AI - Internal Authentication & User Session Router.
Handles PBKDF2 credentials, local sessions, guest access, and device account switching.
"""
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, Request

from backend.models import (
    RegisterRequest,
    LoginCredentialsRequest,
    AuthResponse
)
from backend.services.auth_service import (
    get_current_user,
    save_user_profile,
    logout_user,
    register_user,
    login_with_credentials,
    validate_session_token,
    invalidate_session_token,
    create_guest_session,
    get_saved_accounts,
    quick_switch_account
)

router = APIRouter(prefix="/auth", tags=["Internal - Auth"])


@router.get("/me")
async def get_auth_me(request: Request):
    """Returns the currently active user profile by token or active session."""
    auth_header = request.headers.get("authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1].strip()
        user = validate_session_token(token)
        if user:
            return user
    return get_current_user()


@router.post("/register", response_model=AuthResponse)
async def register_endpoint(req: RegisterRequest):
    """Registers a new user with PBKDF2 password hashing and returns profile and session token."""
    try:
        result = register_user(
            email=req.email,
            password=req.password,
            name=req.name or "",
            role=req.role or "DEVSECOPS",
            provider=req.provider or "credentials"
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")


@router.post("/login-credentials", response_model=AuthResponse)
async def login_credentials_endpoint(req: LoginCredentialsRequest):
    """Authenticates email and password against PBKDF2 hash and returns session token."""
    try:
        result = login_with_credentials(email=req.email, password=req.password, provider=req.provider)
        return result
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Authentication failed: {str(e)}")


@router.post("/guest")
async def guest_session_endpoint():
    """Creates and returns an offline guest session."""
    guest = create_guest_session()
    return {"status": "ok", "user": guest}


@router.post("/login")
async def login_endpoint(payload: Dict[str, Any]):
    """
    Logs in a user via OAuth or credential provider.
    Accepts provider ('google' or 'github'), name, email, and optional avatar_url.
    """
    provider = payload.get("provider", "github").lower()
    if provider not in ["google", "github"]:
        raise HTTPException(status_code=400, detail="Provider must be 'google' or 'github'")

    email = payload.get("email")
    name = payload.get("name")
    if not email or not name:
        if provider == "google":
            name = name or "Google Operator"
            email = email or "operator@gmail.com"
        else:
            name = name or "GitHub Developer"
            email = email or "developer@github.com"

    avatar_url = payload.get("avatar_url", "")
    role = payload.get("role", "SYS_ADMIN")
    token = payload.get("token", "")

    profile = save_user_profile(
        provider=provider,
        name=name,
        email=email,
        avatar_url=avatar_url,
        role=role,
        access_token=token
    )
    return {"status": "ok", "user": profile, "token": profile.get("token", "")}


@router.post("/logout")
async def logout_endpoint(request: Request):
    """Clears the active authenticated user profile and revokes token."""
    auth_header = request.headers.get("authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1].strip()
        invalidate_session_token(token)
    guest_profile = logout_user()
    return {"status": "ok", "user": guest_profile}


@router.get("/saved-accounts")
async def get_saved_accounts_endpoint():
    """Returns previously registered or signed-in accounts on this device."""
    return {"accounts": get_saved_accounts()}


@router.post("/switch-account")
async def switch_account_endpoint(payload: Dict[str, Any]):
    """Switches active session to a previously saved account."""
    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID is required.")
    try:
        return quick_switch_account(user_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Account switch failed: {str(e)}")
