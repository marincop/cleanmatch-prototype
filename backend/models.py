import uuid
from sqlalchemy import Column, String, Integer, Boolean, Numeric, DateTime, ForeignKey, SmallInteger, func
from sqlalchemy.orm import relationship
from sqlalchemy.types import UserDefinedType
from database import Base

# Custom Geometry Column type compatible with PostgreSQL PostGIS and SQLite
class GeometryPoint(UserDefinedType):
    def get_col_spec(self, **kw):
        from config import settings
        if settings.DATABASE_URL.startswith("sqlite"):
            return "TEXT"
        return "GEOMETRY(Point, 4326)"

    def bind_processor(self, dialect):
        def process(value):
            if value is None:
                return None
            if isinstance(value, dict) and "lat" in value and "lng" in value:
                return f"POINT({value['lng']} {value['lat']})"
            return value
        return process

    def result_processor(self, dialect, coltype):
        def process(value):
            if value is None:
                return None
            # Parses standard WKT: POINT(120.6521 24.1512)
            if isinstance(value, str) and value.startswith("POINT"):
                try:
                    coords = value.replace("POINT(", "").replace(")", "").split()
                    return {"lat": float(coords[1]), "lng": float(coords[0])}
                except Exception:
                    return value
            return value
        return process

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    phone = Column(String(20), unique=True, nullable=False, index=True)
    email = Column(String(255))
    password_hash = Column(String(255))
    name = Column(String(100), nullable=False)
    role = Column(String(20), nullable=False) # 'CUSTOMER', 'CLEANER', 'ADMIN'
    status = Column(String(20), default="ACTIVE") # 'ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION'
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now())

    addresses = relationship("CustomerAddress", back_populates="user", cascade="all, delete-orphan")
    cleaner_profile = relationship("CleanerProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")

class CleanerProfile(Base):
    __tablename__ = "cleaner_profiles"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    cleaner_type = Column(String(20), nullable=False) # 'INDIVIDUAL', 'AGENCY'
    business_name = Column(String(150))
    tax_id = Column(String(20))
    id_card_encrypted = Column(String)
    police_record_url = Column(String)
    service_radius_km = Column(Integer, default=10)
    service_location = Column(GeometryPoint) # PostGIS Point type
    avg_rating = Column(Numeric(3, 2), default=5.00)
    total_orders_completed = Column(Integer, default=0)
    verified_status = Column(String(20), default="UNVERIFIED") # 'UNVERIFIED', 'UNDER_REVIEW', 'VERIFIED'

    user = relationship("User", back_populates="cleaner_profile")
    staff = relationship("AgencyStaff", back_populates="agency", cascade="all, delete-orphan")
    schedules = relationship("CleanerSchedule", back_populates="cleaner", cascade="all, delete-orphan")
    bids = relationship("QuotationBid", back_populates="cleaner", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="cleaner")

class AgencyStaff(Base):
    __tablename__ = "agency_staff"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    agency_id = Column(String(36), ForeignKey("cleaner_profiles.id", ondelete="CASCADE"), nullable=False)
    staff_user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role_in_agency = Column(String(20), default="WORKER") # 'MANAGER', 'WORKER'
    status = Column(String(20), default="ACTIVE")

    agency = relationship("CleanerProfile", back_populates="staff")

class CustomerAddress(Base):
    __tablename__ = "customer_addresses"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    category = Column(String(20), nullable=False) # 'RESIDENTIAL', 'OFFICE'
    contact_name = Column(String(100), nullable=False)
    contact_phone = Column(String(20), nullable=False)
    city = Column(String(50), nullable=False)
    district = Column(String(50), nullable=False)
    street_address = Column(String(255), nullable=False)
    building_has_elevator = Column(Boolean, default=True)
    parking_info = Column(String(100))
    geo_location = Column(GeometryPoint, nullable=False)

    user = relationship("User", back_populates="addresses")
    orders = relationship("Order", back_populates="address")

class Order(Base):
    __tablename__ = "orders"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    order_no = Column(String(32), unique=True, nullable=False, index=True)
    customer_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    cleaner_id = Column(String(36), ForeignKey("cleaner_profiles.id"))
    assigned_staff_id = Column(String(36), ForeignKey("users.id"))
    address_id = Column(String(36), ForeignKey("customer_addresses.id"), nullable=False)
    booking_type = Column(String(20), nullable=False) # 'INSTANT_FIXED', 'CUSTOM_BIDDING'
    service_type = Column(String(20), nullable=False) # 'HOME_GENERAL', 'DEEP_CLEAN', 'OFFICE', 'MOVE_IN_OUT'
    space_size_ping = Column(Integer, nullable=False)
    scheduled_start_at = Column(DateTime(timezone=True), nullable=False)
    estimated_duration_hours = Column(Numeric(3, 1))
    total_amount = Column(Numeric(10, 2))
    platform_fee = Column(Numeric(10, 2))
    cleaner_payout = Column(Numeric(10, 2))
    status = Column(String(30), default="PENDING_MATCH")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    customer = relationship("User", foreign_keys=[customer_id])
    cleaner = relationship("CleanerProfile", back_populates="orders")
    address = relationship("CustomerAddress", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    schedules = relationship("CleanerSchedule", back_populates="order")
    bids = relationship("QuotationBid", back_populates="order", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="order", cascade="all, delete-orphan")
    photos = relationship("ServiceProofPhoto", back_populates="order", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="order", cascade="all, delete-orphan")

class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    order_id = Column(String(36), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    item_name = Column(String(100), nullable=False)
    quantity = Column(Integer, default=1)
    unit_price = Column(Numeric(10, 2), nullable=False)
    subtotal = Column(Numeric(10, 2), nullable=False)

    order = relationship("Order", back_populates="items")

class CleanerSchedule(Base):
    __tablename__ = "cleaner_schedules"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    cleaner_id = Column(String(36), ForeignKey("cleaner_profiles.id", ondelete="CASCADE"), nullable=False)
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=False)
    status = Column(String(20), default="AVAILABLE") # 'AVAILABLE', 'BOOKED', 'UNAVAILABLE'
    order_id = Column(String(36), ForeignKey("orders.id", ondelete="SET NULL"))

    cleaner = relationship("CleanerProfile", back_populates="schedules")
    order = relationship("Order", back_populates="schedules")

class QuotationBid(Base):
    __tablename__ = "quotation_bids"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    order_id = Column(String(36), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    cleaner_id = Column(String(36), ForeignKey("cleaner_profiles.id", ondelete="CASCADE"), nullable=False)
    bid_amount = Column(Numeric(10, 2), nullable=False)
    proposed_duration_hours = Column(Numeric(3, 1), nullable=False)
    notes = Column(String)
    status = Column(String(20), default="PENDING") # 'PENDING', 'ACCEPTED', 'REJECTED'
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    order = relationship("Order", back_populates="bids")
    cleaner = relationship("CleanerProfile", back_populates="bids")

class Payment(Base):
    __tablename__ = "payments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    order_id = Column(String(36), ForeignKey("orders.id"), nullable=False)
    payment_gateway = Column(String(30))
    gateway_transaction_id = Column(String(100))
    auth_amount = Column(Numeric(10, 2), nullable=False)
    captured_amount = Column(Numeric(10, 2))
    status = Column(String(20), nullable=False) # 'AUTHORIZED', 'PAID', 'REFUNDED', 'FAILED'
    invoice_number = Column(String(50))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    order = relationship("Order", back_populates="payments")

class ServiceProofPhoto(Base):
    __tablename__ = "service_proof_photos"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    order_id = Column(String(36), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    photo_phase = Column(String(20), nullable=False) # 'BEFORE_CLEANING', 'AFTER_CLEANING'
    area_tag = Column(String(50), nullable=False)
    photo_url = Column(String, nullable=False)
    captured_lat_lng = Column(GeometryPoint)
    client_signed_url = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    order = relationship("Order", back_populates="photos")

class Review(Base):
    __tablename__ = "reviews"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    order_id = Column(String(36), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    reviewer_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    reviewee_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    rating = Column(SmallInteger, nullable=False) # 1 to 5
    punctuality_score = Column(SmallInteger)
    cleanliness_score = Column(SmallInteger)
    comment = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    order = relationship("Order", back_populates="reviews")
