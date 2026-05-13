from pydantic import BaseModel, ConfigDict
import pandas as pd
import io
import uuid
import httpx
from datetime import datetime
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.api.deps import get_current_user, get_tenant_db
from app.models.models import SalesData, Staff, Store, User, SalesHeader, SalesLine

router = APIRouter()

class SalesLineOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    product_id: Optional[str]
    product_name: Optional[str]
    category: Optional[str]
    unit_price: float
    quantity: float
    total_amount: float
    is_return_line: bool

class SalesHeaderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    external_source: Optional[str] = None
    external_id: Optional[str] = None
    order_no: Optional[str] = None
    order_date: datetime
    staff_id: uuid.UUID
    customer_name: Optional[str] = None
    payment_method: Optional[str] = None
    subtotal: float = 0.0
    total_amount: float = 0.0
    total_amount_incl_tax: float = 0.0
    status: str = "Paid"
    is_return: bool = False
    store_id: uuid.UUID
    lines: List[SalesLineOut] = []

# Keep for backward compatibility during transition
class SalesDataOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    sale_id: uuid.UUID
    staff_id: uuid.UUID
    amount: float
    quantity: int
    sale_date: datetime

INTERNAL_FIELDS = [
    "staff_id", "order_no", "order_date", "total_amount", "quantity",
    "product_name", "category", "unit_price", "customer_name",
    "payment_method", "external_id", "status", "ignore"
]

COLUMN_ALIASES: dict[str, list[str]] = {
    "staff_id": ["staff_id", "staffid", "employee_id", "employeeid", "staff_code", "staffcode", "sales_person_id", "salespersonid", "salesperson", "employee"],
    "order_no": ["order_no", "orderno", "order_id", "orderid", "invoice_no", "invoiceno", "invoice_number", "invoicenumber", "receipt_no", "receiptno", "bill_no", "billno"],
    "order_date": ["order_date", "orderdate", "sale_date", "saledate", "date", "created_at", "createdat", "transaction_date", "transactiondate"],
    "total_amount": ["total_amount", "totalamount", "amount", "grand_total", "grandtotal", "value", "bill_value", "billvalue", "net_amount", "netamount", "total", "subtotal", "sub_total"],
    "quantity": ["quantity", "qty", "units", "count", "items"],
    "product_name": ["product_name", "productname", "item_name", "itemname", "product", "item", "description", "product_description"],
    "category": ["category", "item_category", "itemcategory", "product_category", "productcategory", "dept", "department"],
    "unit_price": ["unit_price", "unitprice", "price", "rate", "selling_price", "sellingprice", "unit_prize", "unitprize", "prize"],
    "customer_name": ["customer_name", "customername", "cust_name", "custname", "customer", "client", "buyer"],
    "payment_method": ["payment_method", "paymentmethod", "payment_type", "paymenttype", "payment_mode", "paymentmode", "payment"],
    "external_id": ["external_id", "externalid", "ref", "reference", "ref_no", "refno"],
    "status": ["status", "order_status", "orderstatus", "state", "payment_status", "paymentstatus"],
}

def _confidence(ext_col: str, internal_field: str) -> str:
    """Return High/Medium/Low based on how well the external column matches."""
    norm = ext_col.lower().strip().replace(" ", "").replace("_", "")
    aliases = [a.replace("_", "") for a in COLUMN_ALIASES.get(internal_field, [])]
    if norm in aliases:
        return "High"
    # Partial match
    for a in aliases:
        if norm in a or a in norm:
            return "Medium"
    return "Low"

def _best_match(ext_col: str) -> tuple[str, str]:
    """Return (best_internal_field, confidence) for a given external column."""
    norm = ext_col.lower().strip().replace(" ", "").replace("_", "")
    # Exact match first
    for field, aliases in COLUMN_ALIASES.items():
        for alias in aliases:
            if norm == alias.replace("_", ""):
                return field, "High"
    # Partial match
    for field, aliases in COLUMN_ALIASES.items():
        for alias in aliases:
            clean_alias = alias.replace("_", "")
            if norm in clean_alias or clean_alias in norm:
                return field, "Medium"
    return ext_col.lower().replace(" ", "_"), "Low"

async def _fetch_from_url(url: str) -> bytes:
    """Download a file from Google Sheets or OneDrive/Excel Online."""
    source_url = url
    if "docs.google.com/spreadsheets" in source_url:
        if "/edit" in source_url:
            source_url = source_url.split("/edit")[0] + "/export?format=csv"
        elif "/view" in source_url:
            source_url = source_url.split("/view")[0] + "/export?format=csv"
        elif not source_url.endswith("/export?format=csv"):
            if not source_url.endswith("/"): source_url += "/"
            source_url += "export?format=csv"
            
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=30.0) as client:
            final_url = source_url
            if "1drv.ms" in source_url or "onedrive.live.com" in source_url:
                import base64
                clean_url = source_url.split("#")[0]
                encoded = base64.b64encode(clean_url.encode()).decode().replace('+', '-').replace('/', '_').rstrip('=')
                final_url = f"https://api.onedrive.com/v1.0/shares/u!{encoded}/root/content"

            response = await client.get(final_url)
            if response.status_code != 200:
                backup_url = source_url + ("&" if "?" in source_url else "?") + "download=1"
                response = await client.get(backup_url)
            
            if response.status_code != 200:
                raise HTTPException(status_code=400, detail=f"Failed to fetch source ({response.status_code})")
            return response.content
    except Exception as e:
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=400, detail=f"Network error: {str(e)}")

@router.post("/preview", response_model=dict)
async def preview_file(
    file: Optional[UploadFile] = File(None),
    company_id: Optional[uuid.UUID] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db)
) -> Any:
    """Parse an uploaded file OR a configured URL and return detected columns with smart mapping suggestions."""
    contents = None
    filename = ""
    
    if file:
        contents = await file.read()
        filename = file.filename or "uploaded_file"
    else:
        # Fetch from company config if no file provided
        from app.models.models import Company
        cid = company_id or current_user.company_id
        company = await db.get(Company, cid)
        if not company or not company.source_url:
            raise HTTPException(status_code=400, detail="No file uploaded and no integration URL configured.")
        contents = await _fetch_from_url(company.source_url)
        filename = company.source_url

    try:
        if filename.endswith(('.xls', '.xlsx')) or (not file and ("onedrive" in filename.lower() or "api.onedrive" in filename.lower())):
            try:
                df = pd.read_excel(io.BytesIO(contents))
            except:
                df = pd.read_csv(io.BytesIO(contents))
        else:
            try:
                df = pd.read_csv(io.BytesIO(contents))
            except:
                df = pd.read_excel(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error parsing file: {str(e)}")

    if df.empty:
        raise HTTPException(status_code=400, detail="The data source is empty.")

    columns = [str(c) for c in df.columns]
    # Priority matching: High > Medium > Low
    candidates = []
    for col in columns:
        field, conf = _best_match(col)
        score = 3 if conf == "High" else (2 if conf == "Medium" else 1)
        candidates.append((score, col, field, conf))
    
    # Sort candidates by confidence score
    candidates.sort(key=lambda x: x[0], reverse=True)
    
    mapping_results = {} # col -> (field, conf)
    used_internal = set()
    used_cols = set()
    
    # First pass: Allocate High and Medium matches
    for score, col, field, conf in candidates:
        if score > 1 and field not in used_internal and col not in used_cols:
            mapping_results[col] = (field, conf)
            used_internal.add(field)
            used_cols.add(col)
            
    # Second pass: Everything else (Low or clash)
    mappings = []
    for col in columns:
        if col in mapping_results:
            field, conf = mapping_results[col]
        else:
            field = "ignore"
            mapping_results[col] = (field, "Low")
            used_cols.add(col) # but don't add to used_internal since multiple can be ignored
        
        mappings.append({
            "external_column": col,
            "internal_field": field,
            "confidence": "Low" if field == "ignore" else conf
        })

    return {
        "filename": filename,
        "row_count": len(df),
        "columns": columns,
        "mappings": mappings,
        "internal_fields": INTERNAL_FIELDS,
    }

def _apply_mappings(df: pd.DataFrame, mappings: Optional[List[dict]] = None) -> pd.DataFrame:
    """Standardize dataframe columns based on user-provided mappings or heuristics."""
    if mappings:
        # 1. Identify columns to rename and columns to ignore
        rename_map = {}
        to_drop = []
        for m in mappings:
            ext_col = m.get('external_column')
            int_field = m.get('internal_field')
            if not ext_col: continue
            
            if int_field == 'ignore' or not int_field:
                to_drop.append(ext_col)
            else:
                rename_map[ext_col] = int_field
        
        # 2. Rename
        df = df.rename(columns=rename_map)
        
        # 3. Drop ignored columns that are still in the DF
        for col in to_drop:
            if col in df.columns:
                df = df.drop(columns=[col])
    else:

        # Fallback to heuristics
        actual_cols_map = {str(c).lower().strip().replace(" ", "").replace("_", ""): c for c in df.columns}
        
        # Internal fields we care about
        targets = {
            'staff_id': ['staff_id', 'staffid', 'employeeid', 'staffcode', 'employee'],
            'total_amount': ['total_amount', 'totalamount', 'amount', 'grandtotal', 'value', 'subtotal', 'sub_total'],
            'order_date': ['order_date', 'orderdate', 'sale_date', 'saledate', 'date'],
            'order_no': ['order_no', 'orderno', 'order_id', 'orderid', 'invoice_no'],
            'product_name': ['product_name', 'productname', 'item_name', 'product', 'item'],
            'quantity': ['quantity', 'qty', 'units', 'count'],
            'unit_price': ['unit_price', 'unitprice', 'price', 'rate', 'prize'],
            'category': ['category', 'dept', 'department'],
            'external_id': ['external_id', 'externalid', 'ref', 'reference'],
            'status': ['status', 'state', 'payment_status']
        }
        
        rename_map = {}
        for target, aliases in targets.items():
            for alias in aliases:
                if alias in actual_cols_map:
                    rename_map[actual_cols_map[alias]] = target
                    break
        df = df.rename(columns=rename_map)
    
    # Final check: rename 'amount' to 'total_amount' if it was renamed to just 'amount'
    if 'amount' in df.columns and 'total_amount' not in df.columns:
        df = df.rename(columns={'amount': 'total_amount'})
    
    return df

@router.post("/upload", response_model=dict)
async def upload_sales(
    file: UploadFile = File(...),
    mappings: Optional[str] = Form(None), # JSON string of mappings
    db: AsyncSession = Depends(get_tenant_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    # 1. Read file content
    contents = await file.read()
    import json
    parsed_mappings = json.loads(mappings) if mappings else None
    
    try:
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents))
        elif file.filename.endswith(('.xls', '.xlsx')):
            df = pd.read_excel(io.BytesIO(contents))
        else:
            raise HTTPException(status_code=400, detail="Invalid file format.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error parsing file: {str(e)}")

    df = df.fillna(0)
    df = _apply_mappings(df, parsed_mappings)

    # Validate essential columns
    if 'staff_id' not in df.columns:
        raise HTTPException(status_code=400, detail="Missing 'staff_id' mapping. Please map a column to 'staff_id'.")
    if 'total_amount' not in df.columns:
        if 'quantity' not in df.columns or 'unit_price' not in df.columns:
            raise HTTPException(status_code=400, detail="Missing amount mapping. Please map a column to 'total_amount', or map both 'Unit Price' and 'Quantity'.")

    # 3. Process records
    try:
        result = await _import_dataframe(df, db, current_user.company_id)
        return result
    except Exception as e:
        import traceback
        import logging
        logging.error(f"Manual upload failed for company {current_user.company_id}: {str(e)}", exc_info=True)
        # Removed writing to sync_error.txt - use logging instead
        error_type = type(e).__name__
        raise HTTPException(status_code=400, detail=f"Import failed: [{error_type}] {str(e) or 'Internal processing error'}")

async def _import_dataframe(df: pd.DataFrame, db: AsyncSession, company_id: uuid.UUID) -> dict:
    """Core logic to import a standardized dataframe into the DB."""
    
    # Ensure numeric columns
    numeric_cols = ['total_amount', 'quantity', 'unit_price']
    for col in numeric_cols:
        if col in df.columns:
            # Handle string numbers with currency symbols, commas, etc.
            if df[col].dtype == object or df[col].dtype == str:
                # Remove anything that isn't a digit, dot, or minus sign
                df[col] = df[col].astype(str).replace(r'[^0-9.\-]', '', regex=True)
            
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)

    if 'total_amount' not in df.columns and 'unit_price' in df.columns and 'quantity' in df.columns:
        df['total_amount'] = df['unit_price'] * df['quantity']

    staff_result = await db.execute(select(Staff).where(Staff.company_id == company_id))
    valid_staff_map = {}
    for s in staff_result.scalars().all():
        valid_staff_map[str(s.staff_id).lower()] = s
        if s.staff_code:
            valid_staff_map[s.staff_code.upper()] = s
        if s.name:
            valid_staff_map[s.name.upper()] = s
    
    imported_count = 0
    duplicate_count = 0
    errors = []
    
    # Process by grouping by order_no if present
    available_cols = [str(c) for c in df.columns]
    group_col = 'order_no' if 'order_no' in available_cols else ('external_id' if 'external_id' in available_cols else None)
    
    if group_col:
        # Fill na with empty string to avoid dropna=True issues in groupby
        df[group_col] = df[group_col].fillna('')
        grouped = df.groupby(group_col)
        for name, group in grouped:
            try:
                # If grouping on empty strings, treat as individual rows
                if not str(name).strip() or str(name).lower() in ['nan', '0', '0.0']:
                    # Fallback to individual processing for rows with no order_no
                    for _, row in group.iterrows():
                        if await _import_single_row(row, db, company_id, valid_staff_map, errors):
                            imported_count += 1
                    continue

                first_row = group.iloc[0]
                # Clean staff_ref
                val_ref = str(first_row.get('staff_id', '')).strip()
                if val_ref.endswith('.0'): val_ref = val_ref[:-2]
                staff_ref = val_ref.upper()
                
                staff = valid_staff_map.get(staff_ref) or valid_staff_map.get(staff_ref.lower()) or valid_staff_map.get(val_ref)
                
                if not staff:
                    # Try partial name match as last resort
                    found_staff = None
                    for key, s_obj in valid_staff_map.items():
                        if len(staff_ref) > 2 and (staff_ref in key or key in staff_ref):
                            found_staff = s_obj
                            break
                    if found_staff:
                        staff = found_staff
                    else:
                        errors.append(f"Order {name}: Staff '{val_ref}' not found.")
                        continue
                
                ext_id = str(name).strip()
                
                # Check for duplicate - only if ext_id is meaningful
                if ext_id and ext_id.lower() not in ['nan', '0', '0.0']:
                    existing_check = await db.execute(select(SalesHeader).where((SalesHeader.external_id == ext_id) & (SalesHeader.company_id == company_id)))
                    if existing_check.scalars().first():
                        duplicate_count += 1
                        continue # Skip duplicate
                
                date_val = first_row.get('order_date', first_row.get('sale_date', datetime.now()))
                try:
                    pdate = pd.to_datetime(date_val).to_pydatetime()
                except:
                    pdate = datetime.now()

                # Ensure store_id - fallback to staff's store or first store
                target_store_id = staff.store_id
                if not target_store_id:
                    store_result = await db.execute(select(Store).where(Store.company_id == company_id).limit(1))
                    first_store = store_result.scalars().first()
                    if first_store:
                        target_store_id = first_store.store_id
                    else:
                        errors.append(f"Order {name}: No store assigned to staff and no company stores found.")
                        continue

                header = SalesHeader(
                    company_id=company_id,
                    external_id=ext_id if ext_id else None,
                    order_no=ext_id if ext_id else None,
                    order_date=pdate,
                    staff_id=staff.staff_id,
                    store_id=target_store_id,
                    total_amount=group['total_amount'].sum(),
                    payment_method=str(first_row.get('payment_method', 'Other')),
                    payment_status=str(first_row.get('status', 'Paid')),
                    customer_name=str(first_row.get('customer_name', ''))
                )
                db.add(header)
                await db.flush()
                
                for _, row in group.iterrows():
                    db.add(SalesLine(
                        sales_header_id=header.id,
                        product_id=str(row.get('product_id', '')),
                        product_name=str(row.get('product_name', 'Product')),
                        category=str(row.get('category', '')),
                        unit_price=float(row.get('unit_price', 0)),
                        quantity=float(row.get('quantity', 1)),
                        total_amount=float(row.get('total_amount', 0))
                    ))
                imported_count += 1
            except Exception as e:
                errors.append(f"Order {name}: {str(e)}")
    else:
        # Fallback to single-row orders
        for index, row in df.iterrows():
            if await _import_single_row(row, db, company_id, valid_staff_map, errors, index):
                imported_count += 1

    await db.commit()
    
    # Recalculate commissions
    try:
        from app.services.commission_service import CommissionService
        now = datetime.now()
        await CommissionService.calculate_all_active(db, company_id, now.month, now.year)
        await db.commit()
    except Exception as comm_err:
        errors.append(f"System: Sales imported but commission calculation failed: {str(comm_err)}")
        await db.rollback()

    summary = f"Successfully imported {imported_count} orders."
    if duplicate_count > 0:
        summary += f" Skipped {duplicate_count} duplicates."
    
    if imported_count == 0:
        if duplicate_count > 0:
            summary = f"No new orders found. All {duplicate_count} rows were duplicates."
        elif errors:
            summary = f"Integration failed. First error: {errors[0]}"
        else:
            summary = "No valid orders found in the source."

    return {
        "message": summary,
        "imported_count": imported_count,
        "duplicate_count": duplicate_count,
        "errors": errors[:10],
        "total_errors": len(errors)
    }

async def _import_single_row(row, db, company_id, valid_staff_map, errors, index=0) -> bool:
    try:
        val_ref = str(row.get('staff_id', '')).strip()
        if val_ref.endswith('.0'): val_ref = val_ref[:-2]
        staff_ref = val_ref.upper()
        
        staff = valid_staff_map.get(staff_ref) or valid_staff_map.get(staff_ref.lower()) or valid_staff_map.get(val_ref)
        
        if not staff:
            # Try a partial name match as last resort
            found_staff = None
            for key, s_obj in valid_staff_map.items():
                if len(staff_ref) > 2 and (staff_ref in key or key in staff_ref):
                    found_staff = s_obj
                    break
            
            if found_staff:
                staff = found_staff
            else:
                errors.append(f"Row {index+2}: Staff '{val_ref}' not found.")
                return False

        # Ensure store_id - fallback to staff's store or first store
        target_store_id = staff.store_id
        if not target_store_id:
            store_result = await db.execute(select(Store).where(Store.company_id == company_id).limit(1))
            first_store = store_result.scalars().first()
            if first_store:
                target_store_id = first_store.store_id
            else:
                errors.append(f"Row {index+2}: No store assigned to staff and no company stores found.")
                return False

        
        val = float(row.get('total_amount', 0))
        if val == 0: return False # Skip zero-amount lines

        date_ref = row.get('order_date', row.get('sale_date', datetime.now()))
        try:
            pdate = pd.to_datetime(date_ref).to_pydatetime()
        except:
            pdate = datetime.now()

        header = SalesHeader(
            company_id=company_id,
            staff_id=staff.staff_id,
            store_id=target_store_id,
            order_date=pdate,
            total_amount=val
        )
        db.add(header)
        await db.flush()
        db.add(SalesLine(
            sales_header_id=header.id,
            product_name=str(row.get('product_name', 'Product')),
            quantity=float(row.get('quantity', 1)),
            total_amount=val
        ))
        return True
    except Exception as e:
        errors.append(f"Row {index+2}: {str(e)}")
        return False

class SyncRequest(BaseModel):
    mappings: Optional[List[dict]] = None

@router.post("/sync", response_model=dict)
async def sync_sales(
    request: Optional[SyncRequest] = Body(None),
    db: AsyncSession = Depends(get_tenant_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    # 1. Fetch company config
    from app.models.models import Company
    company = await db.get(Company, current_user.company_id)
    if not company or not company.source_url:
        raise HTTPException(status_code=400, detail="Integration URL not configured.")
    
    # Extract mappings safely
    mappings = request.mappings if request and hasattr(request, "mappings") else None
    if not mappings:
        mappings = company.integration_mappings
        # Ensure it's a list if it was none
        if not mappings: mappings = []
    
    # 2. Fetch data
    try:
        contents = await _fetch_from_url(company.source_url)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch data from source: {str(e)}")

    # 3. Parse
    try:
        # Heuristic for format
        if "onedrive" in company.source_url.lower() or "api.onedrive" in company.source_url.lower():
            try:
                df = pd.read_excel(io.BytesIO(contents))
            except:
                df = pd.read_csv(io.BytesIO(contents))
        else:
            try:
                df = pd.read_csv(io.BytesIO(contents))
            except:
                df = pd.read_excel(io.BytesIO(contents))
        
        if df.empty:
            raise HTTPException(status_code=400, detail="The fetched file is empty.")
        df = df.fillna(0)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Parsing error: {str(e)}")

    # 4. Standardize using mappings
    df = _apply_mappings(df, mappings)
    
    # Validate essential columns
    if 'staff_id' not in df.columns:
        raise HTTPException(status_code=400, detail=f"Missing 'staff_id' mapping. Got columns: {list(df.columns[:5])}")
    if 'total_amount' not in df.columns:
        if 'quantity' not in df.columns or 'unit_price' not in df.columns:
            raise HTTPException(status_code=400, detail="Missing amount mapping. Please map a column to 'total_amount', or map both 'Unit Price' and 'Quantity'.")

    # 5. Import
    try:
        result = await _import_dataframe(df, db, current_user.company_id)
        
        # Refresh company to ensure session is valid after sub-commits
        company = await db.get(Company, current_user.company_id)
        if company:
            company.last_sync_at = datetime.utcnow()
            await db.commit()
        
        return {
            "message": result['message'],
            "last_sync_at": company.last_sync_at if company else None,
            "imported_count": result['imported_count'],
            "duplicate_count": result.get('duplicate_count', 0),
            "errors": result.get('errors', []),
            "total_errors": result.get('total_errors', 0)
        }
    except Exception as e:
        import traceback
        import logging
        logging.error(f"Sync failed for company {current_user.company_id}: {str(e)}", exc_info=True)
        # Removed writing to sync_error.txt - use logging instead
            
        await db.rollback()
        error_type = type(e).__name__
        error_msg = f"Sync failed: [{error_type}] {str(e) or 'Internal Data Error'}"
        raise HTTPException(status_code=400, detail=error_msg)

@router.get("/", response_model=List[SalesHeaderOut])
async def list_sales(
    limit: int = 100,
    offset: int = 0,
    db: AsyncSession = Depends(get_tenant_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    try:
        from sqlalchemy.orm import selectinload
        result = await db.execute(
            select(SalesHeader)
            .where(SalesHeader.company_id == current_user.company_id)
            .options(selectinload(SalesHeader.lines))
            .order_by(SalesHeader.order_date.desc())
            .limit(limit)
            .offset(offset)
        )
        sales_headers = result.scalars().all()
        return [SalesHeaderOut.model_validate(s) for s in sales_headers]
    except Exception as e:
        import logging
        logging.error(f"Error in list_sales: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

