import logging
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.api.routes import api_router
from app.config import settings
from app.core.init_db import init_db
from app.core.logging import configure_logging
from app.database import engine
from app.dependencies import RoleChecker
from app.models.enums import UserRole

configure_logging(settings.LOG_LEVEL)
settings.validate_production()
logger = logging.getLogger("app")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run startup tasks before the application begins serving requests."""
    logger.info("startup: initialising database defaults")
    try:
        init_db()
        logger.info("startup: database initialisation complete")
    except Exception:
        logger.exception("startup: database initialisation failed — continuing anyway")
    yield
    # Shutdown tasks (none required at this time)


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json" if settings.ENABLE_DOCS else None,
    docs_url="/docs" if settings.ENABLE_DOCS else None,
    redoc_url="/redoc" if settings.ENABLE_DOCS else None,
    lifespan=lifespan,
)


@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    request_id = request.headers.get("x-request-id", str(uuid.uuid4()))
    started = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        logger.exception("unhandled_request_failure", extra={"request_id": request_id, "method": request.method, "path": request.url.path})
        raise
    response.headers["X-Request-ID"] = request_id
    logger.info(
        "request_complete",
        extra={
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "duration_ms": round((time.perf_counter() - started) * 1000, 2),
        },
    )
    return response


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning("request_validation_failed", extra={"method": request.method, "path": request.url.path})
    return JSONResponse(
        status_code=422,
        content={"error": {"code": "validation_error", "message": "Request validation failed", "details": exc.errors()}},
    )


@app.exception_handler(SQLAlchemyError)
async def database_exception_handler(request: Request, exc: SQLAlchemyError):
    logger.exception("database_error", extra={"method": request.method, "path": request.url.path})
    return JSONResponse(status_code=503, content={"error": {"code": "database_unavailable", "message": "Database operation failed"}})


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("unhandled_error", extra={"method": request.method, "path": request.url.path})
    return JSONResponse(status_code=500, content={"error": {"code": "internal_error", "message": "Internal server error"}})


if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_origin_regex=r"https://.*\.vercel\.app",
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
    )

app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/")
def read_root():
    return {"message": "Welcome to Digital Microscopy Platform API"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.get("/ready")
def readiness_check():
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))
    return {"status": "ready"}


@app.get("/api/v1/test-teacher-only")
def test_teacher_only(current_user=Depends(RoleChecker([UserRole.TEACHER]))):
    return {"message": "You are a teacher!", "user": current_user.email}
