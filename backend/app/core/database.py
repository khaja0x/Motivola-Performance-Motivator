from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from .config import settings
import logging

logger = logging.getLogger(__name__)

engine = create_async_engine(
    settings.DATABASE_URL, 
    echo=settings.DEBUG,
    pool_pre_ping=True,
    pool_size=20,
    max_overflow=20,
    # HINT: Required for Supabase/PgBouncer in transaction mode
    connect_args={
        "prepared_statement_cache_size": 0,
        "statement_cache_size": 0
    }
)
SessionLocal = async_sessionmaker(autocommit=False, autoflush=False, expire_on_commit=False, bind=engine, class_=AsyncSession)

class Base(DeclarativeBase):
    pass

async def verify_db_connection():
    """Test the database connection on startup. Raises on failure."""
    try:
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT 1"))
            result.close()
        logger.info("✅ Database connection verified successfully")
        return True
    except Exception as e:
        logger.error(f"❌ Database connection FAILED: {e}")
        raise RuntimeError(f"Cannot connect to database: {e}") from e

async def get_db(schema: str = "public"):
    async with SessionLocal() as session:
        # Set the search path. 'public' should always be at the end for shared tables.
        # We use f-string because schema names are trusted (from our DB) and search_path
        # doesn't support bind parameters in the same way.
        try:
            if schema != "public":
                await session.execute(text(f'SET search_path TO "{schema}", public'))
            else:
                await session.execute(text('SET search_path TO public'))
        except Exception as e:
            logger.error(f"Failed to set search_path to '{schema}': {e}")
            raise
        yield session
