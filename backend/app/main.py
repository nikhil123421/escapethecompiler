"""FastAPI application: middleware, routers, health.

Run it with:
    uvicorn app.main:app --reload --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.clock import utcnow
from app.config import get_settings
from app.deps import get_repository
from app.errors import install_error_handler
from app.routers import admin, auth, game, leaderboard, rooms, teams

DESCRIPTION = """
The backend for Escape the Compiler: five coding rooms, a 90-minute clock,
hidden tests and a shared leaderboard.

Most endpoints need a team token from `POST /api/auth/login`.
"""


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="Escape the Compiler API",
        version="1.0.0",
        description=DESCRIPTION,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    install_error_handler(app)

    for module in (auth, rooms, game, leaderboard, teams, admin):
        app.include_router(module.router)

    @app.get("/", include_in_schema=False)
    def index() -> dict:
        return {"name": "Escape the Compiler API", "docs": "/docs", "health": "/api/health"}

    @app.get("/api/health", tags=["ops"])
    def health():
        try:
            repo = get_repository()
            event = repo.get_active_event()
            return {
                "status": "ok",
                "repository": settings.repository,
                "active_event": event.slug if event else None,
                "time": utcnow().isoformat(),
            }
        except Exception as exc:  # a misconfigured backend should say so loudly
            return JSONResponse(
                status_code=503,
                content={"status": "degraded", "message": str(exc)[:300]},
            )

    return app


app = create_app()
