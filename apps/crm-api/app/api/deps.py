"""Shared FastAPI dependencies: db session + current authenticated user."""

from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session, select

from app.core.config import settings
from app.core.db import get_session
from app.core.security import decode_access_token, verify_oidc_token
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
    if not user or user.disabled:
        raise credentials_exception
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
