import asyncio
import sys
from app.services.tenant_service import provision_tenant

async def run_provision(slug: str):
    await provision_tenant(slug)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python provision_tenant.py <company_slug>")
        sys.exit(1)
    
    slug = sys.argv[1]
    asyncio.run(run_provision(slug))
