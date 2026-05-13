from datetime import datetime
import uuid
from typing import List, Optional
from sqlalchemy import String, Boolean, Float, DateTime, ForeignKey, Integer, JSON, UUID, Date, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship, DeclarativeBase

class Base(DeclarativeBase):
    pass

class Company(Base):
    __tablename__ = "companies"
    __table_args__ = {"schema": "public"}

    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_name: Mapped[str] = mapped_column(String(255))
    company_slug: Mapped[str] = mapped_column(String(255), unique=True)
    industry: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    currency: Mapped[str] = mapped_column(String(10), default="USD")
    currency_symbol: Mapped[str] = mapped_column(String(10), default="$")
    timezone: Mapped[str] = mapped_column(String(100), default="UTC")
    address: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    logo_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    brand_display_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="active")

    # Fiscal / Sales Config
    fiscal_year_start: Mapped[str] = mapped_column(String(50), default="January")
    default_sales_cycle: Mapped[str] = mapped_column(String(50), default="Monthly")
    tax_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # WhatsApp / Notifications
    whatsapp_api_key: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    whatsapp_sender_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    daily_nudge_time: Mapped[str] = mapped_column(String(10), default="09:00")

    # AI Config
    ai_tone: Mapped[str] = mapped_column(String(50), default="Motivational")
    use_ai_insights: Mapped[bool] = mapped_column(Boolean, default=True)

    # Integration Config
    primary_source: Mapped[str] = mapped_column(String(100), default="Manual")
    sync_frequency: Mapped[str] = mapped_column(String(50), default="Daily")
    source_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    integration_mappings: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    last_sync_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Staff ID Generation
    staff_id_series: Mapped[str] = mapped_column(String(50), default="Alphabetical")
    staff_id_prefix: Mapped[str] = mapped_column(String(20), default="EMP")
    staff_id_suffix: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    staff_id_start_number: Mapped[int] = mapped_column(Integer, default=1)
    staff_id_padding: Mapped[int] = mapped_column(Integer, default=3)
    staff_id_generation_mode: Mapped[str] = mapped_column(String(50), default="Auto")

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    users: Mapped[List["User"]] = relationship(back_populates="company")
    stores: Mapped[List["Store"]] = relationship(back_populates="company")
    staff: Mapped[List["Staff"]] = relationship(back_populates="company")
    rules: Mapped[List["CommissionRule"]] = relationship(back_populates="company")

class User(Base):
    __tablename__ = "users"
    __table_args__ = {"schema": "public"}

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("public.companies.company_id"))
    email: Mapped[str] = mapped_column(String(255), unique=True)
    full_name: Mapped[str] = mapped_column(String(255))
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(50), default="Admin")
    
    company: Mapped["Company"] = relationship(back_populates="users")

class Store(Base):
    __tablename__ = "stores"
    __table_args__ = (
        UniqueConstraint("company_id", "store_name", name="uq_store_name_per_company"),
    )

    store_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("public.companies.company_id"))
    store_name: Mapped[str] = mapped_column(String(255))
    store_code: Mapped[Optional[str]] = mapped_column(String(50))
    location: Mapped[Optional[str]] = mapped_column(String(255))

    company: Mapped["Company"] = relationship(back_populates="stores")
    staff: Mapped[List["Staff"]] = relationship(back_populates="store")
    sales: Mapped[List["SalesData"]] = relationship(back_populates="store", cascade="all, delete-orphan")
    sales_headers: Mapped[List["SalesHeader"]] = relationship(back_populates="store", cascade="all, delete-orphan")

class Staff(Base):
    __tablename__ = "staff"

    staff_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("public.companies.company_id"))
    
    # user_id now strictly references the ADMIN who created this record for audit
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("public.users.user_id"), nullable=True)
    
    store_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("stores.store_id", ondelete="SET NULL"), nullable=True)
    staff_code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    name: Mapped[str] = mapped_column(String(255))
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    password_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    whatsapp_number: Mapped[str] = mapped_column(String(20))
    role: Mapped[str] = mapped_column(String(50), default="Staff")  # Staff or Supervisor
    hire_date: Mapped[Optional[datetime]] = mapped_column(DateTime, default=datetime.utcnow)
    status: Mapped[str] = mapped_column(String(50), default="active")
    photo_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    company: Mapped["Company"] = relationship(back_populates="staff")
    store: Mapped["Store"] = relationship(back_populates="staff")
    rules: Mapped[List["EmployeeRuleMapping"]] = relationship(back_populates="staff")
    sales: Mapped[List["SalesData"]] = relationship(back_populates="staff")
    sales_headers: Mapped[List["SalesHeader"]] = relationship(back_populates="staff")

class CommissionRule(Base):
    __tablename__ = "commission_rules"
    __table_args__ = (UniqueConstraint("company_id", "rule_name", name="uq_rule_name_per_company"),)

    rule_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("public.companies.company_id"))
    rule_name: Mapped[str] = mapped_column(String(255))
    basis_type: Mapped[str] = mapped_column(String(50)) # Amount / Quantity
    commission_mode: Mapped[str] = mapped_column(String(50)) # Percentage / Fixed
    rule_type: Mapped[str] = mapped_column(String(50), default="Tiered/Slab") # Tiered/Slab / Threshold Multiplier

    company: Mapped["Company"] = relationship(back_populates="rules")
    slabs: Mapped[List["CommissionRuleSlab"]] = relationship(back_populates="rule", cascade="all, delete-orphan")
    staff_mappings: Mapped[List["EmployeeRuleMapping"]] = relationship(back_populates="rule", cascade="all, delete-orphan")

class CommissionRuleSlab(Base):
    __tablename__ = "commission_rule_slabs"

    slab_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rule_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("commission_rules.rule_id"))
    min_value: Mapped[float] = mapped_column(Float)
    max_value: Mapped[Optional[float]] = mapped_column(Float)
    commission_value: Mapped[float] = mapped_column(Float)

    rule: Mapped["CommissionRule"] = relationship(back_populates="slabs")

class EmployeeRuleMapping(Base):
    __tablename__ = "employee_rule_mapping"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    staff_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("staff.staff_id"))
    rule_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("commission_rules.rule_id"))
    effective_from: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    staff: Mapped["Staff"] = relationship(back_populates="rules")
    rule: Mapped["CommissionRule"] = relationship(back_populates="staff_mappings")

class SalesData(Base):
    __tablename__ = "sales_data"

    sale_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("public.companies.company_id"))
    store_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("stores.store_id", ondelete="CASCADE"))
    staff_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("staff.staff_id"), nullable=True)
    rule_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("commission_rules.rule_id"), nullable=True)
    
    # Raw Sales Record
    bill_no: Mapped[str] = mapped_column(String(100))
    bill_date: Mapped[datetime] = mapped_column(DateTime)
    customer_name: Mapped[Optional[str]] = mapped_column(String(255))
    sku_code: Mapped[Optional[str]] = mapped_column(String(100))
    product_name: Mapped[Optional[str]] = mapped_column(String(500))
    quantity: Mapped[float] = mapped_column(Float, default=1.0)
    net_amount: Mapped[float] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(50), default="Paid")
    
    # Calculated values
    commission_amount: Mapped[float] = mapped_column(Float, default=0.0)
    
    company: Mapped["Company"] = relationship()
    store: Mapped["Store"] = relationship(back_populates="sales")
    staff: Mapped["Staff"] = relationship(back_populates="sales")
    rule: Mapped["CommissionRule"] = relationship()

class SalesHeader(Base):
    __tablename__ = "sales_headers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("public.companies.company_id"))
    store_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("stores.store_id", ondelete="CASCADE"))
    staff_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("staff.staff_id"), nullable=True)
    
    external_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    order_no: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    order_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    customer_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    payment_method: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    subtotal: Mapped[float] = mapped_column(Float, default=0.0)
    total_amount: Mapped[float] = mapped_column(Float, default=0.0)
    total_amount_incl_tax: Mapped[float] = mapped_column(Float, default=0.0)
    external_source: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    payment_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="Paid")
    is_return: Mapped[bool] = mapped_column(Boolean, default=False)
    
    store: Mapped["Store"] = relationship(back_populates="sales_headers")
    staff: Mapped["Staff"] = relationship(back_populates="sales_headers")
    lines: Mapped[List["SalesLine"]] = relationship(back_populates="header", cascade="all, delete-orphan")

class SalesLine(Base):
    __tablename__ = "sales_lines"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sales_header_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("sales_headers.id"))
    
    product_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    product_name: Mapped[str] = mapped_column(String(255))
    category: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    unit_price: Mapped[float] = mapped_column(Float, default=0.0)
    quantity: Mapped[float] = mapped_column(Float, default=1.0)
    total_amount: Mapped[float] = mapped_column(Float)
    is_return_line: Mapped[bool] = mapped_column(Boolean, default=False)
    
    header: Mapped["SalesHeader"] = relationship(back_populates="lines")

class CommissionReport(Base):
    __tablename__ = "commission_reports"

    report_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("public.companies.company_id"))
    staff_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("staff.staff_id"))
    month: Mapped[int] = mapped_column(Integer)
    year: Mapped[int] = mapped_column(Integer)
    total_sales_amount: Mapped[float] = mapped_column(Float, default=0.0)
    total_sales_quantity: Mapped[float] = mapped_column(Float, default=0.0)
    calculated_commission: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String(50), default="draft")
    
    staff: Mapped["Staff"] = relationship()
    company: Mapped["Company"] = relationship()

class Target(Base):
    __tablename__ = "targets"

    target_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("public.companies.company_id"))
    
    entity_type: Mapped[str] = mapped_column(String(50)) # Staff, Store
    entity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    
    period_type: Mapped[str] = mapped_column(String(50)) # Monthly, Weekly, Daily
    year: Mapped[int] = mapped_column(Integer)
    month: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    week: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    day: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    target_amount: Mapped[float] = mapped_column(Float, default=0.0)
    target_quantity: Mapped[float] = mapped_column(Float, default=0.0)
    target_type: Mapped[str] = mapped_column(String(50), default="Amount")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    company: Mapped["Company"] = relationship()
