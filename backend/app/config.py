"""Application settings, loaded from environment variables or a .env file."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """One flat object for every environment variable the backend reads."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    supabase_url: str = ""
    # Supports both legacy service_role key (eyJ...) and new Secret Key (sb_secret_...)
    supabase_service_role_key: str = ""
    supabase_secret_key: str = ""

    def model_post_init(self, __context) -> None:
        if not self.supabase_service_role_key and self.supabase_secret_key:
            self.supabase_service_role_key = self.supabase_secret_key

    jwt_secret: str = "dev-only-secret-change-me"
    jwt_ttl_hours: int = 12
    organizer_passcode: str = "ORGANIZER"

    cors_origins: str = "http://localhost:5173"

    # "supabase" uses the real database, "memory" keeps everything in RAM
    # so the frontend can be developed before the keys exist.
    repository: str = "supabase"

    node_binary: str = "node"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
