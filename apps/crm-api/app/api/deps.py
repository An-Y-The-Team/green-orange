"""Shared FastAPI dependencies: db session + current authenticated user."""

from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session, select

from app.core.config import settings
from app.core.db import get_session
from app.core.security import (
    decode_access_token,
    decode_oidc_token,
    verify_oidc_token,
)
from app.models.user import User

# tokenUrl points clients (and the /docs "Authorize" button) at the login route.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")

SessionDep = Annotated[Session, Depends(get_session)]
TokenDep = Annotated[str, Depends(oauth2_scheme)]


def get_current_user(token: TokenDep, session: SessionDep) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if settings.auth_mode == "oidc":
        # Authentik milestone: resolve the username from the verified OIDC token.
        username = verify_oidc_token(token)
    else:
        username = decode_access_token(token)

    if not username:
        raise credentials_exception

    user = session.exec(select(User).where(User.username == username)).first()
    if user is None and settings.auth_mode == "oidc":
        # Provision-on-first-login: identities are owned by Authentik, so the
        # first time we see a valid token for a user we create a local row
        # (empty password — they authenticate via OIDC, never locally).
        user = User(username=username, hashed_password="")
        session.add(user)
        session.commit()
        session.refresh(user)
    if not user or user.disabled:
        raise credentials_exception
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]

# The Authentik group allowed to see workers' personal papers (CCCD, chứng chỉ);
# the same group crm-web gates /settings/users on.
# NestJS mirror: `CRM_ADMIN_GROUP` in src/auth/admin.ts.
CRM_ADMIN_GROUP = "crm-admins"


def is_crm_admin(token: TokenDep) -> bool:
    """Membership comes from the token's `groups` claim (Authentik's default
    `profile` scope mapping emits it). Local mode has no groups, so every local
    user counts as an admin there. Runs after get_current_user on the routes
    that use it, so the token is already known to be valid."""
    if settings.auth_mode != "oidc":
        return True
    groups = (decode_oidc_token(token) or {}).get("groups") or []
    return CRM_ADMIN_GROUP in groups


CrmAdminDep = Annotated[bool, Depends(is_crm_admin)]
