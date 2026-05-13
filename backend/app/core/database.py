from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from .config import settings

engine = create_async_engine(
    settings.DATABASE_URL, 
    echo=settings.DEBUG,
    pool_pre_ping=True,
    pool_size=20,
    max_overflow=20
)
SessionLocal = async_sessionmaker(autocommit=False, autoflush=False, expire_on_commit=False, bind=engine, class_=AsyncSession)

class Base(DeclarativeBase):
    pass

async def get_db(schema: str = "public"):
    async with SessionLocal() as session:
        # Set the search path. 'public' should always be at the end for shared tables.
        # We use f-string because schema names are trusted (from our DB) and search_path
        # doesn't support bind parameters in the same way.
        if schema != "public":
            await session.execute(text(f'SET search_path TO "{schema}", public'))
        else:
            await session.execute(text('SET search_path TO public'))
        yield session
