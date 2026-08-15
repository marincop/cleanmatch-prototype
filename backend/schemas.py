from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from decimal import Decimal

# Auth Schemas
class OTPSend(BaseModel):
    phone: str = Field(..., description="Phone number with country code")

class OTPVerify(BaseModel):
    phone: str
    code: str

class TokenResponse(BaseModel):
    token: str
    user_id: str
    name: str
    role: str

class CleanerOnboard(BaseModel):
    cleaner_type: str = Field(..., description="INDIVIDUAL or AGENCY")
    business_name: Optional[str] = None
    tax_id: Optional[str] = None
    service_radius_km: int = 10
    lat: float
    lng: float

# Order Schemas
class OrderItemCreate(BaseModel):
    item_name: str
    quantity: int = 1
    unit_price: float

class OrderCreate(BaseModel):
    address_id: str
    service_type: str = Field(..., description="HOME_GENERAL, DEEP_CLEAN, OFFICE, MOVE_IN_OUT")
    space_size_ping: int
    scheduled_start_at: datetime
    items: List[OrderItemCreate]
    booking_type: str = "INSTANT_FIXED" # 'INSTANT_FIXED' or 'CUSTOM_BIDDING'

class BidCreate(BaseModel):
    order_id: str
    bid_amount: float
    proposed_duration_hours: float
    notes: Optional[str] = None

# Execution Schemas
class CheckInRequest(BaseModel):
    lat: float
    lng: float

class ProofPhotoUpload(BaseModel):
    phase: str = Field(..., description="BEFORE_CLEANING or AFTER_CLEANING")
    area_tag: str = Field(..., description="KITCHEN, LIVING_ROOM, BATHROOM, etc.")
    photo_url: str

class CompleteSignRequest(BaseModel):
    client_signature_url: str

class DisputeRequest(BaseModel):
    comment: str

class ArbitrateRequest(BaseModel):
    decision: str = Field(..., description="RELEASE_PAYMENT or REFUND")

class ReviewCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None
