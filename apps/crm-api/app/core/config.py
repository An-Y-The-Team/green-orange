"""Application settings, loaded from environment / .env via pydantic-settings."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Postgres `crm` database provisioned by the repo's docker-compose.yml.
    database_url: str = (
        "postgresql+psycopg://postgres:password@localhost:5432/crm"
    )

    # --- Local JWT auth (teaching default) ---------------------------------
    # Generate a real secret with:  openssl rand -hex 32
    jwt_secret: str = "dev-only-change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # Auth mode: "local" (username/password + local JWT) or "oidc" (validate
    # tokens issued by self-hosted Authentik). See app/core/security.py.
    auth_mode: str = "local"

    # --- Authentik OIDC (used when auth_mode == "oidc") --------------------
    oidc_issuer: str = ""  # e.g. https://auth.example.com/application/o/crm/
    oidc_audience: str = ""  # the client_id configured in Authentik

    # CORS — the crm-web dev origin. Comma-separated in the env var.
    cors_origins: str = "http://localhost:3002"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
