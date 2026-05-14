import asyncio
import sys
import os

# Add the current directory to sys.path to allow importing 'app'
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# pyrefly: ignore [missing-import]
from sqlalchemy import text
# pyrefly: ignore [missing-import]
from app.core.database import engine
# pyrefly: ignore [missing-import]
from app.services.tenant_service import provision_tenant

async def verify_and_fix_tenant(slug: str):
    print(f"\n🔍 Verifying Tenant: {slug}")
    
    async with engine.connect() as conn:
        # 1. Check if company exists in public.companies
        result = await conn.execute(
            text("SELECT company_id, company_name FROM public.companies WHERE company_slug = :slug"),
            {"slug": slug}
        )
        company = result.fetchone()
        
        if not company:
            print(f"❌ Error: Company with slug '{slug}' not found in public.companies table.")
            print("💡 Suggestion: Register the company first or check the spelling.")
            return

        print(f"✅ Found Company: {company.company_name} (ID: {company.company_id})")

        # 2. Check if schema exists
        schema_name = f"tenant_{slug}"
        schema_check = await conn.execute(
            text("SELECT schema_name FROM information_schema.schemata WHERE schema_name = :schema"),
            {"schema": schema_name}
        )
        
        if schema_check.fetchone():
            print(f"✅ Schema '{schema_name}' exists.")
            
            # 3. Check if core tables exist in the schema
            await conn.execute(text(f'SET search_path TO "{schema_name}"'))
            table_check = await conn.execute(
                text("SELECT table_name FROM information_schema.tables WHERE table_schema = :schema AND table_name = 'staff'"),
                {"schema": schema_name}
            )
            if table_check.fetchone():
                print(f"✅ Tables found in '{schema_name}'. Tenant is healthy.")
            else:
                print(f"⚠️  Schema exists but tables are missing. Provisioning now...")
                await provision_tenant(slug)
        else:
            print(f"❌ Schema '{schema_name}' is MISSING.")
            print(f"🛠️  Fixing: Provisioning tenant '{slug}'...")
            try:
                await provision_tenant(slug)
                print(f"🚀 Success! Tenant '{slug}' has been provisioned.")
            except Exception as e:
                print(f"💥 Failed to provision: {str(e)}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python verify_tenant.py <company_slug>")
        sys.exit(1)
    
    slug = sys.argv[1]
    asyncio.run(verify_and_fix_tenant(slug))
