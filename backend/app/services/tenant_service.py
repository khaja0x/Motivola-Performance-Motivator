import asyncio
from sqlalchemy import text
from app.core.database import engine, Base
from app.models.models import *

async def provision_tenant(company_slug: str):
    schema_name = f"tenant_{company_slug}"
    print(f"Provisioning tenant schema: {schema_name}")
    
    async with engine.begin() as conn:
        # Create schema
        await conn.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{schema_name}"'))
        # 2. Set search_path STRICTLY to this schema. 
        # By excluding 'public' here, we force SQLAlchemy to create NEW tables here
        # rather than "seeing" the ones in public and skipping creation.
        await conn.execute(text(f'SET search_path TO "{schema_name}"'))
        
        # Create all tables in this schema
        def create_tables(sync_conn):
            # Only create tables that don't belong to the 'public' schema
            target_tables = [
                table for table in Base.metadata.sorted_tables 
                if table.schema != "public"
            ]
            Base.metadata.create_all(sync_conn, tables=target_tables)
            
        await conn.run_sync(create_tables)
    
    print(f"Successfully provisioned schema: {schema_name}")
