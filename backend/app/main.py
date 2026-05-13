from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings

from app.api import auth, stores, staff, sales, rules, incentives, targets

app = FastAPI(title=settings.APP_NAME)
from fastapi.staticfiles import StaticFiles
import os

# Ensure static/uploads exists
os.makedirs("static/uploads", exist_ok=True)

app.mount("/static", StaticFiles(directory="static"), name="static")

# Set up CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.FRONTEND_URL.split(",")] if settings.FRONTEND_URL else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(stores.router, prefix="/api/stores", tags=["stores"])
app.include_router(staff.router, prefix="/api/staff", tags=["staff"])
app.include_router(sales.router, prefix="/api/sales", tags=["sales"])
app.include_router(rules.router, prefix="/api/rules", tags=["rules"])
app.include_router(incentives.router, prefix="/api/incentives", tags=["incentives"])
app.include_router(targets.router, prefix="/api/targets", tags=["targets"])


@app.get("/health")
async def health_check():
    return {"status": "healthy", "project": settings.APP_NAME}

import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Global error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
        headers={"Access-Control-Allow-Origin": "*"} # Crucial for debugging from frontend
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
