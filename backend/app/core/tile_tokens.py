"""
Short-lived signed tokens for slide tile access.

These tokens are independent of user JWTs and are embedded directly in
the tile URL as a query parameter. They let OpenSeadragon (which can't
attach Authorization headers reliably across all tile requests) load
tiles without going through the JWT auth flow.

Token format: standard JWT (HS256), short TTL, claims:
  - sub: slide_id (uuid string)
  - uid: requesting user id (uuid string, audit only)
  - role: user role at issue time
  - type: "tile"
  - exp / iat: standard
"""

from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from jose import jwt, JWTError

from app.config import settings


TILE_TOKEN_TYPE = "tile"
TILE_TOKEN_TTL_SECONDS = 10 * 60  # 10 minutes


def create_tile_token(
    slide_id: UUID,
    user_id: UUID,
    role: str,
    ttl_seconds: int = TILE_TOKEN_TTL_SECONDS,
) -> str:
    """Generate a short-lived signed token granting tile access for one slide."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(slide_id),
        "uid": str(user_id),
        "role": str(role),
        "type": TILE_TOKEN_TYPE,
        "iat": now,
        "exp": now + timedelta(seconds=ttl_seconds),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def verify_tile_token(token: str, expected_slide_id: Optional[UUID] = None) -> Optional[dict]:
    """
    Decode and verify a tile token. Returns the payload if valid, None otherwise.
    If expected_slide_id is given, the token's sub must match it.
    """
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        return None
    if payload.get("type") != TILE_TOKEN_TYPE:
        return None
    if expected_slide_id is not None:
        sub = payload.get("sub")
        if sub != str(expected_slide_id):
            return None
    return payload
