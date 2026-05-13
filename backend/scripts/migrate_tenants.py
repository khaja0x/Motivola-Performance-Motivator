import asyncio
import sys
import os

# Add the current directory to sys.path so we can import app
sys.path.append(os.getcwd())

from sqlalchemy import text, select
from app.core.database import engine, SessionLocal, Base
from app.models.models import *

async def migrate_all_tenants():
    print("Starting tenant migration...")
    async with SessionLocal() as db:
        result = await db.execute(select(Company))
        companies = result.scalars().all()
        print(f"Found {len(companies)} companies.")

    for company in companies:
        schema_name = f"tenant_{company.company_slug}"
        print(f"Updating schema: {schema_name}")
        
        async with engine.begin() as conn:
            # 1. Ensure schema exists
            await conn.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{schema_name}"'))
            
            # 2. Set search_path to this schema
            await conn.execute(text(f'SET search_path TO "{schema_name}"'))
            
            # 3. Create missing tables
            def create_tables(sync_conn):
                # Filter out tables that are explicitly in the public schema
                target_tables = [
                    table for table in Base.metadata.sorted_tables 
                    if table.schema != "public"
                ]
                print(f"  Creating/Checking {len(target_tables)} tables in {schema_name}...")
                Base.metadata.create_all(sync_conn, tables=target_tables)
            
            await conn.run_sync(create_tables)
            
    print("Migration completed successfully!")

if __name__ == "__main__":
    asyncio.run(migrate_all_tenants())
