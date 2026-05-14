#!/bin/bash
# Production start script for Render
# Uses gunicorn with uvicorn workers for better process management

# Ensure static directories exist
mkdir -p static/uploads

# Run DB verify script (optional but recommended for observability)
# python -c "from app.core.database import verify_db_connection; import asyncio; asyncio.run(verify_db_connection())"

# Start Gunicorn
# -w: Number of workers (usually 2-4 per core)
# -k: Worker class (uvicorn.workers.UvicornWorker)
# -b: Bind to address/port
gunicorn app.main:app \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:$PORT \
    --timeout 120 \
    --access-logfile - \
    --error-logfile -
