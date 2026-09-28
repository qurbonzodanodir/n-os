from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import router
from .config import get_settings
from .database import engine
from .models import Base

settings = get_settings()


def prepare_development_storage() -> None:
    if settings.database_url.startswith("sqlite"):
        Path(".local").mkdir(exist_ok=True)


@asynccontextmanager
async def lifespan(_: FastAPI):
    if settings.is_development:
        prepare_development_storage()
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(title="n-os API", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.frontend_origins,
    allow_credentials=True,
    allow_methods=["GET", "PUT", "OPTIONS"],
    allow_headers=["Content-Type", "X-User-Id"],
)
app.include_router(router, prefix="/api/v1")
