"""
SecStudio AI - Authentication & User Profile Management Service.
Supports local identity resolution, Google Sign In, GitHub OAuth,
and persistent SQLite profile storage.
"""
import os
import json
import time
import uuid
from typing import Optional, Dict, Any
from pathlib import Path
from .cache_db import _get_connection

import hashlib
import hmac
import secrets

# Default guest profile if nobody is signed in
DEFAULT_PROFILE = {
    "id": "guest-workspace",
    "authenticated": False,
    "provider": "guest",
    "name": "Guest Developer",
    "initials": "GD",
    "email": "guest@secstudio.local",
    "avatar_url": "",
    "role": "GUEST",
    "created_at": time.time(),
    "last_login": time.time()
}


def init_auth_table():
    """Initializes the authentication and user session tables in SQLite."""
    with _get_connection() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS user_profiles (
                id TEXT PRIMARY KEY,
                authenticated INTEGER,
                provider TEXT,
                name TEXT,
                initials TEXT,
                email TEXT,
                avatar_url TEXT,
                role TEXT,
                access_token TEXT,
                created_at REAL,
                last_login REAL
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE COLLATE NOCASE,
                password_hash TEXT,
                salt TEXT,
                name TEXT,
                initials TEXT,
                role TEXT,
                avatar_url TEXT,
                created_at REAL,
                last_login REAL,
                provider TEXT DEFAULT 'credentials'
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS user_sessions (
                token TEXT PRIMARY KEY,
                user_id TEXT,
                created_at REAL,
                expires_at REAL
            )
        """)
        try:
            conn.execute("ALTER TABLE users ADD COLUMN provider TEXT DEFAULT 'credentials'")
        except Exception:
            pass
        conn.commit()


# Initialize table on import
init_auth_table()


def hash_password(password: str, salt: Optional[str] = None) -> tuple[str, str]:
    """Generates PBKDF2-HMAC-SHA256 password hash using a secure per-user salt with 100,000 iterations."""
    if not salt:
        salt = secrets.token_hex(16)
    salt_bytes = bytes.fromhex(salt)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt_bytes, 100000)
    return key.hex(), salt


def verify_password(password: str, salt: str, password_hash: str) -> bool:
    """Verifies a plaintext password against stored PBKDF2 hash using constant-time comparison."""
    try:
        salt_bytes = bytes.fromhex(salt)
        key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt_bytes, 100000)
        return hmac.compare_digest(key.hex(), password_hash)
    except Exception:
        return False


def extract_initials(name: str) -> str:
    """Extracts 1-2 character uppercase initials from a name."""
    parts = name.strip().split()
    if len(parts) >= 2:
        return (parts[0][0] + parts[1][0]).upper()
    elif len(name) >= 2:
        return name[:2].upper()
    return name.upper() if name else "US"


def create_session(user_id: str, days_valid: int = 30) -> str:
    """Creates a persistent random session token valid for specified days."""
    token = secrets.token_hex(32)
    now = time.time()
    expires_at = now + (days_valid * 86400)
    with _get_connection() as conn:
        conn.execute(
            "INSERT INTO user_sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
            (token, user_id, now, expires_at)
        )
        conn.commit()
    return token


def register_user(
    email: str,
    password: str,
    name: str,
    role: str = "DEVSECOPS",
    avatar_url: str = "",
    provider: str = "credentials"
) -> Dict[str, Any]:
    """Registers a new user with cryptographic password hashing and returns profile and session token."""
    clean_email = email.strip().lower()
    if not clean_email or "@" not in clean_email:
        raise ValueError("Please provide a valid email address.")
    if len(password) < 6:
        raise ValueError("Password must be at least 6 characters long.")
    clean_name = name.strip() or clean_email.split("@")[0]

    if provider == "credentials":
        if clean_email.endswith("@gmail.com") or clean_email.endswith("@googlemail.com"):
            provider = "google"
        elif "github" in clean_email:
            provider = "github"

    with _get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE email = ?", (clean_email,))
        if cursor.fetchone():
            raise ValueError("An account with this email address already exists.")

        user_id = str(uuid.uuid4())
        pwd_hash, salt = hash_password(password)
        initials = extract_initials(clean_name)
        now = time.time()

        conn.execute("""
            INSERT INTO users (id, email, password_hash, salt, name, initials, role, avatar_url, created_at, last_login, provider)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (user_id, clean_email, pwd_hash, salt, clean_name, initials, role, avatar_url, now, now, provider))
        conn.commit()

    token = create_session(user_id)
    profile = {
        "id": user_id,
        "authenticated": True,
        "provider": provider,
        "name": clean_name,
        "initials": initials,
        "email": clean_email,
        "avatar_url": avatar_url,
        "role": role,
        "token": token,
        "created_at": now,
        "last_login": now
    }
    save_user_profile(
        provider=provider,
        name=clean_name,
        email=clean_email,
        avatar_url=avatar_url,
        role=role,
        access_token=token
    )
    return {"status": "ok", "user": profile, "token": token}


def login_with_credentials(email: str, password: str, provider: Optional[str] = None) -> Dict[str, Any]:
    """Authenticates email and password against PBKDF2 hash and returns token."""
    clean_email = email.strip().lower()
    with _get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE email = ?", (clean_email,))
        row = cursor.fetchone()
        if not row:
            raise ValueError("Invalid email or password.")

        if not verify_password(password, row["salt"], row["password_hash"]):
            raise ValueError("Invalid email or password.")

        now = time.time()
        conn.execute("UPDATE users SET last_login = ? WHERE id = ?", (now, row["id"]))
        conn.commit()

        user_id = row["id"]
        token = create_session(user_id)
        row_keys = row.keys() if hasattr(row, "keys") else []
        saved_provider = row["provider"] if "provider" in row_keys and row["provider"] else None
        user_provider = provider or saved_provider or ("google" if ("@gmail.com" in clean_email or "@googlemail.com" in clean_email) else "credentials")

        profile = {
            "id": user_id,
            "authenticated": True,
            "provider": user_provider,
            "name": row["name"],
            "initials": row["initials"],
            "email": row["email"],
            "avatar_url": row["avatar_url"] or "",
            "role": row["role"],
            "token": token,
            "created_at": row["created_at"],
            "last_login": now
        }

    save_user_profile(
        provider=user_provider,
        name=profile["name"],
        email=profile["email"],
        avatar_url=profile["avatar_url"],
        role=profile["role"],
        access_token=token
    )
    return {"status": "ok", "user": profile, "token": token}


def get_saved_accounts() -> list[Dict[str, Any]]:
    """Returns all accounts registered or authenticated on this local installation."""
    try:
        with _get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, email, name, initials, role, avatar_url, last_login,
                       COALESCE(provider, 'credentials') as provider
                FROM users
                ORDER BY last_login DESC
                LIMIT 15
            """)
            rows = cursor.fetchall()
            return [
                {
                    "id": r["id"],
                    "email": r["email"],
                    "name": r["name"],
                    "initials": r["initials"],
                    "role": r["role"],
                    "avatar_url": r["avatar_url"] or "",
                    "provider": r["provider"] if r["provider"] in ["google", "github"] else ("google" if ("@gmail.com" in r["email"] or "@googlemail.com" in r["email"]) else "credentials"),
                    "last_login": r["last_login"]
                }
                for r in rows
            ]
    except Exception:
        return []


def quick_switch_account(user_id: str) -> Dict[str, Any]:
    """Switches active session to a previously saved account."""
    with _get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        row = cursor.fetchone()
        if not row:
            raise ValueError("Account not found.")

        now = time.time()
        conn.execute("UPDATE users SET last_login = ? WHERE id = ?", (now, row["id"]))
        conn.commit()

        token = create_session(row["id"])
        row_keys = row.keys() if hasattr(row, "keys") else []
        saved_provider = row["provider"] if "provider" in row_keys and row["provider"] else None
        user_provider = saved_provider or ("google" if ("@gmail.com" in row["email"] or "@googlemail.com" in row["email"]) else "credentials")

        profile = {
            "id": row["id"],
            "authenticated": True,
            "provider": user_provider,
            "name": row["name"],
            "initials": row["initials"],
            "email": row["email"],
            "avatar_url": row["avatar_url"] or "",
            "role": row["role"],
            "token": token,
            "created_at": row["created_at"],
            "last_login": now
        }

    save_user_profile(
        provider=user_provider,
        name=profile["name"],
        email=profile["email"],
        avatar_url=profile["avatar_url"],
        role=profile["role"],
        access_token=token
    )
    return {"status": "ok", "user": profile, "token": token}


def validate_session_token(token: str) -> Optional[Dict[str, Any]]:
    """Validates session token in SQLite and returns active user profile if valid."""
    if not token or not token.strip():
        return None
    token = token.strip()
    now = time.time()
    try:
        with _get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT s.user_id, s.expires_at, u.name, u.initials, u.email, u.avatar_url, u.role, u.created_at, u.last_login
                FROM user_sessions s
                JOIN users u ON s.user_id = u.id
                WHERE s.token = ? AND s.expires_at > ?
            """, (token, now))
            row = cursor.fetchone()
            if row:
                return {
                    "id": row["user_id"],
                    "authenticated": True,
                    "provider": "credentials",
                    "name": row["name"],
                    "initials": row["initials"],
                    "email": row["email"],
                    "avatar_url": row["avatar_url"] or "",
                    "role": row["role"],
                    "token": token,
                    "created_at": row["created_at"],
                    "last_login": row["last_login"]
                }
            cursor.execute("SELECT * FROM user_profiles WHERE access_token = ?", (token,))
            p_row = cursor.fetchone()
            if p_row and p_row["authenticated"]:
                return {
                    "id": p_row["id"],
                    "authenticated": True,
                    "provider": p_row["provider"],
                    "name": p_row["name"],
                    "initials": p_row["initials"],
                    "email": p_row["email"],
                    "avatar_url": p_row["avatar_url"] or "",
                    "role": p_row["role"],
                    "token": token,
                    "created_at": p_row["created_at"],
                    "last_login": p_row["last_login"]
                }
    except Exception as e:
        print(f"[!] Session validation error: {e}")
    return None


def invalidate_session_token(token: str) -> bool:
    """Invalidates active session token from SQLite."""
    if not token:
        return False
    with _get_connection() as conn:
        conn.execute("DELETE FROM user_sessions WHERE token = ?", (token.strip(),))
        conn.execute("DELETE FROM user_profiles WHERE access_token = ?", (token.strip(),))
        conn.commit()
    return True


def create_guest_session() -> Dict[str, Any]:
    """Generates an unauthenticated local guest workspace session."""
    guest_profile = DEFAULT_PROFILE.copy()
    guest_profile["created_at"] = time.time()
    guest_profile["last_login"] = time.time()
    with _get_connection() as conn:
        conn.execute("DELETE FROM user_profiles")
        conn.execute("""
            INSERT INTO user_profiles 
            (id, authenticated, provider, name, initials, email, avatar_url, role, access_token, created_at, last_login)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            guest_profile["id"], 0, "guest", guest_profile["name"],
            guest_profile["initials"], guest_profile["email"], "",
            "GUEST", "", guest_profile["created_at"], guest_profile["last_login"]
        ))
        conn.commit()
    return guest_profile


def get_current_user() -> Dict[str, Any]:
    """Retrieves the active user profile or defaults to local developer identity."""
    try:
        with _get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM user_profiles ORDER BY last_login DESC LIMIT 1")
            row = cursor.fetchone()
            if row:
                return {
                    "id": row["id"],
                    "authenticated": bool(row["authenticated"]),
                    "provider": row["provider"],
                    "name": row["name"],
                    "initials": row["initials"],
                    "email": row["email"],
                    "avatar_url": row["avatar_url"] or "",
                    "role": row["role"],
                    "token": row["access_token"] or "",
                    "created_at": row["created_at"],
                    "last_login": row["last_login"]
                }
    except Exception as e:
        print(f"[!] Error fetching active user profile: {e}")

    return DEFAULT_PROFILE.copy()


def save_user_profile(
    provider: str,
    name: str,
    email: str,
    avatar_url: str = "",
    role: str = "SYS_ADMIN",
    access_token: str = ""
) -> Dict[str, Any]:
    """Saves or updates a user profile following successful sign in."""
    initials = extract_initials(name)
    user_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{provider}:{email}"))
    now = time.time()
    if not access_token:
        access_token = secrets.token_hex(32)

    with _get_connection() as conn:
        conn.execute("""
            INSERT OR REPLACE INTO user_profiles 
            (id, authenticated, provider, name, initials, email, avatar_url, role, access_token, created_at, last_login)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            user_id,
            1,
            provider,
            name,
            initials,
            email,
            avatar_url,
            role,
            access_token,
            now,
            now
        ))
        conn.execute("""
            INSERT OR REPLACE INTO user_sessions (token, user_id, created_at, expires_at)
            VALUES (?, ?, ?, ?)
        """, (access_token, user_id, now, now + (30 * 86400)))
        conn.commit()

    return {
        "id": user_id,
        "authenticated": True,
        "provider": provider,
        "name": name,
        "initials": initials,
        "email": email,
        "avatar_url": avatar_url,
        "role": role,
        "token": access_token,
        "created_at": now,
        "last_login": now
    }


def logout_user() -> Dict[str, Any]:
    """Clears the authenticated user session from SQLite and reverts to guest mode."""
    with _get_connection() as conn:
        conn.execute("DELETE FROM user_profiles")
        conn.execute("DELETE FROM user_sessions")
        conn.commit()

    return DEFAULT_PROFILE.copy()


def get_auth_config() -> Dict[str, Any]:
    """Returns status of external OAuth integrations."""
    return {
        "github_enabled": bool(os.getenv("GITHUB_CLIENT_ID")),
        "google_enabled": bool(os.getenv("GOOGLE_CLIENT_ID")),
        "github_client_id": os.getenv("GITHUB_CLIENT_ID", ""),
        "google_client_id": os.getenv("GOOGLE_CLIENT_ID", "")
    }


def save_oauth_config(
    google_client_id: Optional[str] = None,
    google_client_secret: Optional[str] = None,
    github_client_id: Optional[str] = None,
    github_client_secret: Optional[str] = None
) -> Dict[str, Any]:
    """Saves OAuth credentials to runtime environment and persists to .env file."""
    updates: Dict[str, str] = {}
    if google_client_id is not None:
        updates["GOOGLE_CLIENT_ID"] = google_client_id.strip()
    if google_client_secret is not None:
        updates["GOOGLE_CLIENT_SECRET"] = google_client_secret.strip()
    if github_client_id is not None:
        updates["GITHUB_CLIENT_ID"] = github_client_id.strip()
    if github_client_secret is not None:
        updates["GITHUB_CLIENT_SECRET"] = github_client_secret.strip()

    for k, v in updates.items():
        os.environ[k] = v

    try:
        env_path = Path(__file__).resolve().parent.parent.parent / ".env"
        lines = []
        if env_path.exists():
            with open(env_path, "r", encoding="utf-8") as f:
                lines = f.readlines()

        for k, v in updates.items():
            found = False
            new_lines = []
            for line in lines:
                if line.strip().startswith(f"{k}="):
                    new_lines.append(f"{k}={v}\n")
                    found = True
                else:
                    new_lines.append(line)
            if not found and v:
                if new_lines and not new_lines[-1].endswith("\n"):
                    new_lines.append("\n")
                new_lines.append(f"{k}={v}\n")
            lines = new_lines

        with open(env_path, "w", encoding="utf-8") as f:
            f.writelines(lines)
    except Exception as e:
        print(f"[!] Warning: Could not write OAuth credentials to .env file: {e}")

    return get_auth_config()


# In-memory CSRF state cache with 10-minute validity
_OAUTH_STATES: Dict[str, Dict[str, Any]] = {}
STATE_EXPIRATION_SECONDS = 600


def generate_oauth_state(provider: str) -> str:
    """Generates a secure random state token to prevent CSRF attacks."""
    now = time.time()
    # Prune expired states
    expired = [k for k, v in _OAUTH_STATES.items() if now - v.get("created_at", 0) > STATE_EXPIRATION_SECONDS]
    for k in expired:
        _OAUTH_STATES.pop(k, None)

    state = uuid.uuid4().hex
    _OAUTH_STATES[state] = {
        "provider": provider,
        "created_at": now
    }
    return state


def validate_oauth_state(state: str, provider: str) -> bool:
    """Validates and consumes a CSRF state token."""
    entry = _OAUTH_STATES.pop(state, None)
    if not entry:
        return False
    if entry.get("provider") != provider:
        return False
    if time.time() - entry.get("created_at", 0) > STATE_EXPIRATION_SECONDS:
        return False
    return True


def get_oauth_authorization_url(provider: str, host_base: str) -> Dict[str, Any]:
    """
    Constructs the authorization redirect URL for GitHub or Google.
    Returns URL if credentials are configured, or status flag if not.
    """
    provider = provider.lower()
    state = generate_oauth_state(provider)

    if provider == "github":
        client_id = os.getenv("GITHUB_CLIENT_ID", "").strip()
        if not client_id:
            return {"configured": False, "provider": "github", "message": "GITHUB_CLIENT_ID is not configured in .env"}
        redirect_uri = f"{host_base.rstrip('/')}/api/auth/github/callback"
        auth_url = (
            f"https://github.com/login/oauth/authorize?"
            f"client_id={client_id}&"
            f"redirect_uri={redirect_uri}&"
            f"scope=read:user%20user:email&"
            f"state={state}"
        )
        return {"configured": True, "provider": "github", "auth_url": auth_url, "state": state}

    elif provider == "google":
        client_id = os.getenv("GOOGLE_CLIENT_ID", "").strip()
        if not client_id:
            return {"configured": False, "provider": "google", "message": "GOOGLE_CLIENT_ID is not configured in .env"}
        redirect_uri = f"{host_base.rstrip('/')}/api/auth/google/callback"
        auth_url = (
            f"https://accounts.google.com/o/oauth2/v2/auth?"
            f"client_id={client_id}&"
            f"redirect_uri={redirect_uri}&"
            f"response_type=code&"
            f"scope=openid%20profile%20email&"
            f"state={state}&"
            f"access_type=online"
        )
        return {"configured": True, "provider": "google", "auth_url": auth_url, "state": state}

    raise ValueError(f"Unsupported OAuth provider: {provider}")


async def exchange_github_code(code: str, host_base: str) -> Dict[str, Any]:
    """Exchanges an authorization code with GitHub for an access token and user profile."""
    import httpx

    client_id = os.getenv("GITHUB_CLIENT_ID", "").strip()
    client_secret = os.getenv("GITHUB_CLIENT_SECRET", "").strip()
    redirect_uri = f"{host_base.rstrip('/')}/api/auth/github/callback"

    if not client_id or not client_secret:
        raise ValueError("GitHub OAuth credentials are not fully configured.")

    async with httpx.AsyncClient(timeout=10.0) as client:
        # 1. Exchange code for token
        token_res = await client.post(
            "https://github.com/login/oauth/access_token",
            data={
                "client_id": client_id,
                "client_secret": client_secret,
                "code": code,
                "redirect_uri": redirect_uri
            },
            headers={"Accept": "application/json"}
        )
        token_data = token_res.json()
        access_token = token_data.get("access_token")
        if not access_token:
            err_msg = token_data.get("error_description", "Failed to retrieve access token from GitHub")
            raise ValueError(err_msg)

        # 2. Fetch authenticated user profile
        user_res = await client.get(
            "https://api.github.com/user",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/json",
                "User-Agent": "SentinelCode-Studio"
            }
        )
        user_data = user_res.json()

        name = user_data.get("name") or user_data.get("login") or "GitHub Developer"
        avatar_url = user_data.get("avatar_url") or ""
        email = user_data.get("email")

        # 3. If primary email is hidden, fetch user email list
        if not email:
            emails_res = await client.get(
                "https://api.github.com/user/emails",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/json",
                    "User-Agent": "SentinelCode-Studio"
                }
            )
            if emails_res.status_code == 200:
                emails_list = emails_res.json()
                primary = next((e["email"] for e in emails_list if e.get("primary")), None)
                email = primary or (emails_list[0]["email"] if emails_list else f"{user_data.get('login', 'dev')}@users.noreply.github.com")
            else:
                email = f"{user_data.get('login', 'dev')}@users.noreply.github.com"

        # 4. Save and return profile in SQLite
        profile = save_user_profile(
            provider="github",
            name=name,
            email=email,
            avatar_url=avatar_url,
            role="SECURITY_LEAD",
            access_token=access_token
        )
        return profile


async def exchange_google_code(code: str, host_base: str) -> Dict[str, Any]:
    """Exchanges an authorization code with Google for an access token and user profile."""
    import httpx

    client_id = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET", "").strip()
    redirect_uri = f"{host_base.rstrip('/')}/api/auth/google/callback"

    if not client_id or not client_secret:
        raise ValueError("Google OAuth credentials are not fully configured.")

    async with httpx.AsyncClient(timeout=10.0) as client:
        # 1. Exchange code for token
        token_res = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": client_id,
                "client_secret": client_secret,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": redirect_uri
            },
            headers={"Accept": "application/json"}
        )
        token_data = token_res.json()
        access_token = token_data.get("access_token")
        if not access_token:
            err_msg = token_data.get("error_description", "Failed to retrieve access token from Google")
            raise ValueError(err_msg)

        # 2. Fetch authenticated user profile
        user_res = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/json"
            }
        )
        user_data = user_res.json()

        name = user_data.get("name") or "Google User"
        email = user_data.get("email") or "user@gmail.com"
        avatar_url = user_data.get("picture") or ""

        # 3. Save and return profile in SQLite
        profile = save_user_profile(
            provider="google",
            name=name,
            email=email,
            avatar_url=avatar_url,
            role="SYS_ADMIN",
            access_token=access_token
        )
        return profile

