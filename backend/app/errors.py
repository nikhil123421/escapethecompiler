"""Centralized error handling for FastAPI.

In FastAPI, when an endpoint raises an ApiError, this handler automatically
catches it and sends a clean JSON response back to the frontend:
{
    "code": "bad_passcode",
    "message": "Wrong event passcode."
}
"""

import logging
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

logger = logging.getLogger("uvicorn.error")


class ApiError(Exception):
    """Custom exception for expected business/logic errors."""

    def __init__(self, code: str, message: str, status: int = 400) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status = status


def install_error_handler(app: FastAPI) -> None:
    """Registers exception handlers on the FastAPI app."""

    @app.exception_handler(ApiError)
    async def _handle_api_error(_: Request, exc: ApiError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status,
            content={"code": exc.code, "message": exc.message},
        )

    @app.exception_handler(Exception)
    async def _handle_unexpected_error(_: Request, exc: Exception) -> JSONResponse:
        logger.exception(f"Unhandled error in API: {exc}")
        return JSONResponse(
            status_code=500,
            content={
                "code": "internal_error",
                "message": "A server error occurred. Check the backend console logs.",
            },
        )
