import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.api import auth, stores, staff, sales, rules, incentives, targets

logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


# --- Lifespan: Startup & Shutdown ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run startup checks before the app starts accepting requests."""
    # 1. Log configuration summary
    settings.log_config_summary()
    
    # 2. Verify database connectivity
    from app.core.database import verify_db_connection
    try:
        await verify_db_connection()
    except Exception as e:
        logger.critical(f"🚨 STARTUP FAILED: {e}")
        # Don't raise — let the app start so /health can report the issue.
        # But log it critically so Render logs show the problem immediately.
    
    logger.info(f"✅ {settings.APP_NAME} is ready to accept requests")
    yield
    logger.info(f"👋 {settings.APP_NAME} shutting down")


app = FastAPI(title=settings.APP_NAME, lifespan=lifespan)

# Ensure static/uploads exists
os.makedirs("static/uploads", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# --- CORS Configuration ---
# Parse FRONTEND_URL (supports comma-separated origins for multi-environment)
allowed_origins = [origin.strip() for origin in settings.FRONTEND_URL.split(",") if origin.strip()]

# Always include localhost for development convenience
if "http://localhost:3000" not in allowed_origins:
    allowed_origins.append("http://localhost:3000")

logger.info(f"CORS allowed origins: {allowed_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Routers ---
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(stores.router, prefix="/api/stores", tags=["stores"])
app.include_router(staff.router, prefix="/api/staff", tags=["staff"])
app.include_router(sales.router, prefix="/api/sales", tags=["sales"])
app.include_router(rules.router, prefix="/api/rules", tags=["rules"])
app.include_router(incentives.router, prefix="/api/incentives", tags=["incentives"])
app.include_router(targets.router, prefix="/api/targets", tags=["targets"])


# --- Health Check ---
@app.get("/health")
async def health_check():
    """Health check that also tests database connectivity."""
    health = {"status": "healthy", "project": settings.APP_NAME}
    
    # Quick DB ping
    try:
        from app.core.database import engine
        from sqlalchemy import text
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        health["database"] = "connected"
    except Exception as e:
        health["status"] = "degraded"
        health["database"] = f"error: {str(e)[:100]}"
    
    return health


# --- Global Exception Handler ---
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(
        f"Unhandled error on {request.method} {request.url.path}: {type(exc).__name__}: {exc}", 
        exc_info=True
    )
    
    # In debug mode, return the full error for development
    # In production, return a safe generic message
    detail = str(exc) if settings.DEBUG else "Internal Server Error. Check server logs."
    
    return JSONResponse(
        status_code=500,
        content={
            "detail": detail,
            "path": str(request.url.path),
            "method": request.method,
        },
        # Include CORS headers so the frontend can read the error response
        headers={"Access-Control-Allow-Origin": "*"}
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
