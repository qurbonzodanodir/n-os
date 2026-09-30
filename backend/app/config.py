from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="N_OS_",
        extra="ignore",
    )

    environment: str = "development"
    database_url: str = "sqlite+aiosqlite:///./.local/n-os.db"
    write_rate_limit_per_minute: int = 120
    frontend_origins: list[str] = Field(default_factory=lambda: ["http://localhost:5173"])

    @property
    def is_development(self) -> bool:
        return self.environment == "development"


@lru_cache
def get_settings() -> Settings:
    return Settings()
