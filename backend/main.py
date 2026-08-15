import uvicorn
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List
import logging
import json
import os

from config import settings
from database import engine, Base, get_db
import models, schemas
from redis_lock import order_claim_lock, RedisLockException
from geo_utils import calculate_distance_meters

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.PROJECT_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Seed Database if empty
@app.on_event("startup")
def seed_database():
    db = next(get_db())
    try:
        if db.query(models.User).count() == 0:
            logger.info("Seeding database tables...")
            # 1. Users
            customer = models.User(id="u-1", name="林艾麗斯 (Alice)", phone="+886912345678", email="alice@example.com", role="CUSTOMER")
            cleaner1 = models.User(id="u-2", name="陳小兵 (Bob)", phone="+886987654321", email="bob@example.com", role="CLEANER")
            cleaner2 = models.User(id="u-3", name="王經理 (Charlie)", phone="+886933333333", email="charlie@example.com", role="CLEANER")
            staff = models.User(id="u-4", name="曾阿水 (David)", phone="+886944444444", email="david@example.com", role="CLEANER")
            admin = models.User(id="u-5", name="平台管理員 (Admin)", phone="+886900000000", email="admin@cleanmatch.com", role="ADMIN")
            
            db.add_all([customer, cleaner1, cleaner2, staff, admin])
            db.commit()

            # 2. Cleaner Profiles
            profile_bob = models.CleanerProfile(
                id="c-bob", user_id="u-2", cleaner_type="INDIVIDUAL",
                service_radius_km=10, service_location={"lat": 24.150, "lng": 120.650},
                avg_rating=4.85, total_orders_completed=42, verified_status="VERIFIED"
            )
            profile_charlie = models.CleanerProfile(
                id="c-charlie", user_id="u-3", cleaner_type="AGENCY",
                business_name="潔淨科技股份有限公司", tax_id="12345678",
                service_radius_km=15, service_location={"lat": 24.162, "lng": 120.665},
                avg_rating=4.90, total_orders_completed=156, verified_status="VERIFIED"
            )
            db.add_all([profile_bob, profile_charlie])
            db.commit()

            # 3. Agency Staff
            agency_staff = models.AgencyStaff(id="as-1", agency_id="c-charlie", staff_user_id="u-4", role_in_agency="WORKER", status="ACTIVE")
            db.add(agency_staff)

            # 4. Addresses
            addr1 = models.CustomerAddress(
                id="addr-1", user_id="u-1", category="RESIDENTIAL", contact_name="林艾麗斯", contact_phone="+886912345678",
                city="台中市", district="西區", street_address="公益路二段61號 (公益大樓)",
                building_has_elevator=True, parking_info="大樓地下室收費停車場", geo_location={"lat": 24.1512, "lng": 120.6521}
            )
            addr2 = models.CustomerAddress(
                id="addr-2", user_id="u-1", category="OFFICE", contact_name="林艾麗斯", contact_phone="+886912345678",
                city="台中市", district="南屯區", street_address="大墩路588號 (商務辦公室 8F)",
                building_has_elevator=True, parking_info="路邊停車格", geo_location={"lat": 24.1585, "lng": 120.6482}
            )
            db.add_all([addr1, addr2])
            db.commit()
            logger.info("Seeding completed successfully.")
    except Exception as e:
        logger.error(f"Error seeding DB: {e}")
    finally:
        db.close()


# --- RESTful API Specifications ---

# 4.1 Authentication & Profile
@app.post("/api/v1/auth/otp/send", status_code=200)
def send_otp(payload: schemas.OTPSend):
    # Simulated sending (actual system would invoke SMS gateways like Twilio or Mitake)
    logger.info(f"OTP code '123456' sent to {payload.phone}")
    return {"message": "驗證碼發送成功", "debug_code": "123456"}

@app.post("/api/v1/auth/otp/verify", response_model=schemas.TokenResponse)
def verify_otp(payload: schemas.OTPVerify, db: Session = Depends(get_db)):
    if payload.code != "123456":
        raise HTTPException(status_code=400, detail="驗證碼不正確或已過期")
    
    # Try finding user
    user = db.query(models.User).filter(models.User.phone == payload.phone).first()
    if not user:
        # Auto register as Customer if brand new
        user = models.User(
            name=f"新用戶 ({payload.phone[-4:]})",
            phone=payload.phone,
            role="CUSTOMER"
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    return {
        "token": f"mock_jwt_token_for_{user.id}",
        "user_id": user.id,
        "name": user.name,
        "role": user.role
    }

@app.post("/api/v1/cleaner/onboard", status_code=200)
def onboard_cleaner(payload: schemas.CleanerOnboard, db: Session = Depends(get_db)):
    # Simulates cleaner onboarding. Sets role & profile
    # For demo, onboard Bob's user again or create new profile
    # We will look for u-2 or a new register
    user = db.query(models.User).filter(models.User.phone == "+886987654321").first()
    if not user:
        raise HTTPException(status_code=404, detail="用戶不存在")
    
    user.role = "CLEANER"
    
    profile = db.query(models.CleanerProfile).filter(models.CleanerProfile.user_id == user.id).first()
    if not profile:
        profile = models.CleanerProfile(
            user_id=user.id,
            cleaner_type=payload.cleaner_type,
            business_name=payload.business_name,
            tax_id=payload.tax_id,
            service_radius_km=payload.service_radius_km,
            service_location={"lat": payload.lat, "lng": payload.lng},
            verified_status="UNDER_REVIEW"
        )
        db.add(profile)
    
    db.commit()
    return {"message": "服務商資料填寫成功，進入審核流程"}


# 4.2 Order & Matching
@app.post("/api/v1/orders/instant", status_code=201)
def create_instant_order(payload: schemas.OrderCreate, db: Session = Depends(get_db)):
    # Standard or Custom RFQ creations
    address = db.query(models.CustomerAddress).filter(models.CustomerAddress.id == payload.address_id).first()
    if not address:
        raise HTTPException(status_code=404, detail="找不到指定的服務地址")
    
    # Calculate amount
    total_amount = sum(item.unit_price * item.quantity for item in payload.items)
    platform_fee = float(f"{total_amount * 0.15:.2f}")
    cleaner_payout = float(f"{total_amount - platform_fee:.2f}")

    order_no = f"CM-{datetime.now().strftime('%Y%m%d')}-{uuid_to_short()}"
    
    new_order = models.Order(
        order_no=order_no,
        customer_id="u-1", # hardcoded for Alice customer demo
        address_id=payload.address_id,
        booking_type=payload.booking_type,
        service_type=payload.service_type,
        space_size_ping=payload.space_size_ping,
        scheduled_start_at=payload.scheduled_start_at,
        estimated_duration_hours=Decimal(str(payload.space_size_ping * 0.1 + 2)),
        total_amount=Decimal(str(total_amount)) if payload.booking_type == "INSTANT_FIXED" else Decimal("0.00"),
        platform_fee=Decimal(str(platform_fee)) if payload.booking_type == "INSTANT_FIXED" else Decimal("0.00"),
        cleaner_payout=Decimal(str(cleaner_payout)) if payload.booking_type == "INSTANT_FIXED" else Decimal("0.00"),
        status="PENDING_MATCH"
    )
    db.add(new_order)
    db.commit()
    db.refresh(new_order)

    # Insert items
    for item in payload.items:
        db_item = models.OrderItem(
            order_id=new_order.id,
            item_name=item.item_name,
            quantity=item.quantity,
            unit_price=Decimal(str(item.unit_price)),
            subtotal=Decimal(str(item.unit_price * item.quantity))
        )
        db.add(db_item)

    # In Instant Fixed, perform mock payment preauth
    if payload.booking_type == "INSTANT_FIXED":
        payment = models.Payment(
            order_id=new_order.id,
            payment_gateway="ECPay",
            gateway_transaction_id=f"gate-tx-{uuid_to_short()}",
            auth_amount=Decimal(str(total_amount)),
            status="AUTHORIZED",
            invoice_number=f"IN-{uuid_to_short().upper()}"
        )
        db.add(payment)

    db.commit()
    return {"message": "訂單建立成功", "order_id": new_order.id, "order_no": order_no}


@app.post("/api/v1/orders/{order_id}/claim", status_code=200)
def claim_order(order_id: str, cleaner_id: str = "c-bob", db: Session = Depends(get_db)):
    # Concurrency protected via Redis Redlock
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="找不到該訂單")
    
    if order.status != "PENDING_MATCH":
        raise HTTPException(status_code=400, detail="搶單失敗: 訂單已被承接或已取消")

    try:
        with order_claim_lock(order_id=order_id, expire_seconds=3):
            # Verify again inside lock
            cleaner = db.query(models.CleanerProfile).filter(models.CleanerProfile.id == cleaner_id).first()
            if not cleaner:
                raise HTTPException(status_code=404, detail="找不到服務商")

            order.cleaner_id = cleaner_id
            order.assigned_staff_id = cleaner.user_id
            order.status = "ACCEPTED"
            
            # Setup schedule
            schedule = models.CleanerSchedule(
                cleaner_id=cleaner_id,
                start_time=order.scheduled_start_at,
                end_time=order.scheduled_start_at + timedelta(hours=float(order.estimated_duration_hours)),
                status="BOOKED",
                order_id=order_id
            )
            db.add(schedule)
            db.commit()
            
    except RedisLockException as e:
        raise HTTPException(status_code=409, detail=str(e))
        
    return {"message": "搶單成功！已成功鎖定此筆清潔排程"}


@app.post("/api/v1/orders/bidding/quote", status_code=201)
def submit_bid(payload: schemas.BidCreate, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == payload.order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="找不到該專案訂單")
    
    new_bid = models.QuotationBid(
        order_id=payload.order_id,
        cleaner_id=payload.cleaner_id,
        bid_amount=Decimal(str(payload.bid_amount)),
        proposed_duration_hours=Decimal(str(payload.proposed_duration_hours)),
        notes=payload.notes,
        status="PENDING"
    )
    db.add(new_bid)
    db.commit()
    return {"message": "報價提送成功"}


@app.post("/api/v1/orders/{order_id}/bids/{bid_id}/accept", status_code=200)
def accept_bid(order_id: str, bid_id: str, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="找不到訂單")
    
    bid = db.query(models.QuotationBid).filter(models.QuotationBid.id == bid_id).first()
    if not bid:
        raise HTTPException(status_code=404, detail="找不到該報價單")

    # Update bids status
    db.query(models.QuotationBid).filter(models.QuotationBid.order_id == order_id).update({"status": "REJECTED"})
    bid.status = "ACCEPTED"

    # Update order price details
    total_amount = bid.bid_amount
    platform_fee = float(f"{total_amount * 0.15:.2f}")
    cleaner_payout = float(f"{total_amount - platform_fee:.2f}")

    order.cleaner_id = bid.cleaner_id
    order.assigned_staff_id = bid.cleaner.user_id
    order.total_amount = total_amount
    order.platform_fee = Decimal(str(platform_fee))
    order.cleaner_payout = Decimal(str(cleaner_payout))
    order.estimated_duration_hours = bid.proposed_duration_hours
    order.status = "ACCEPTED"

    # Pre-authorize payment for the final quote
    payment = models.Payment(
        order_id=order_id,
        payment_gateway="ECPay",
        gateway_transaction_id=f"gate-tx-{uuid_to_short()}",
        auth_amount=total_amount,
        status="AUTHORIZED",
        invoice_number=f"IN-{uuid_to_short().upper()}"
    )
    db.add(payment)

    # Setup schedule
    schedule = models.CleanerSchedule(
        cleaner_id=bid.cleaner_id,
        start_time=order.scheduled_start_at,
        end_time=order.scheduled_start_at + timedelta(hours=float(bid.proposed_duration_hours)),
        status="BOOKED",
        order_id=order_id
    )
    db.add(schedule)
    db.commit()
    
    return {"message": "已成功選用服務商報價，款項已預授權託管"}


# 4.3 Execution & Verification
@app.post("/api/v1/orders/{order_id}/check-in", status_code=200)
def check_in(order_id: str, payload: schemas.CheckInRequest, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="找不到訂單")
    
    # Calculate distance with address (simulating PostGIS spatial DWithin)
    address = order.address
    distance = calculate_distance_meters(
        payload.lat, payload.lng,
        address.geo_location["lat"], address.geo_location["lng"]
    )
    
    if distance > 200:
        raise HTTPException(
            status_code=400, 
            detail=f"打卡失敗：您距離工作地點約 {distance:.0f} 公尺，已超出 200 公尺電子圍籬限制！"
        )
    
    order.status = "IN_PROGRESS"
    db.commit()
    return {"message": f"定位打卡成功！距離：{distance:.1f} 公尺。進入服務狀態"}


@app.post("/api/v1/orders/{order_id}/proof-photos", status_code=201)
def upload_proof_photo(order_id: str, payload: schemas.ProofPhotoUpload, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="找不到該訂單")
        
    photo = models.ServiceProofPhoto(
        order_id=order_id,
        photo_phase=payload.phase,
        area_tag=payload.area_tag,
        photo_url=payload.photo_url,
        captured_lat_lng=order.address.geo_location
    )
    db.add(photo)
    db.commit()
    return {"message": "存證相片直傳 S3 上傳登記成功"}


@app.post("/api/v1/orders/{order_id}/request-verify", status_code=200)
def request_completion_verify(order_id: str, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="找不到訂單")
        
    order.status = "PENDING_APPROVAL"
    db.commit()
    return {"message": "服務已提交完工審核"}


@app.post("/api/v1/orders/{order_id}/complete-sign", status_code=200)
def complete_and_sign(order_id: str, payload: schemas.CompleteSignRequest, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="找不到訂單")
    
    # Save signature to photos metadata
    photo = db.query(models.ServiceProofPhoto).filter(
        models.ServiceProofPhoto.order_id == order_id, 
        models.ServiceProofPhoto.photo_phase == "AFTER_CLEANING"
    ).first()
    if photo:
        photo.client_signed_url = payload.client_signature_url
    
    order.status = "COMPLETED"
    db.commit()

    # Trigger Payment Capture (Async Worker)
    payment = db.query(models.Payment).filter(models.Payment.order_id == order_id).first()
    if payment:
        payment.captured_amount = order.total_amount
        payment.status = "PAID"
    
    order.status = "SETTLED"
    db.commit()
    return {"message": "簽名驗收成功。信用卡款項已請款結案，並分帳撥款給服務商"}


# Disputes & Admin Arbitration
@app.post("/api/v1/orders/{order_id}/dispute", status_code=200)
def file_dispute(order_id: str, payload: schemas.DisputeRequest, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="找不到訂單")
    
    order.status = "DISPUTED"
    db.commit()
    logger.warning(f"Order {order.order_no} disputed. Comment: {payload.comment}")
    return {"message": "已為您發起爭議流程。該筆託管資金已被暫時凍結"}


@app.post("/api/v1/orders/{order_id}/arbitrate", status_code=200)
def arbitrate_order(order_id: str, payload: schemas.ArbitrateRequest, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="找不到該筆訂單")
    
    payment = db.query(models.Payment).filter(models.Payment.order_id == order_id).first()
    if not payment:
        raise HTTPException(status_code=400, detail="此筆訂單無授權款項紀錄")

    if payload.decision == "RELEASE_PAYMENT":
        payment.captured_amount = order.total_amount
        payment.status = "PAID"
        order.status = "SETTLED"
    elif payload.decision == "REFUND":
        payment.captured_amount = 0
        payment.status = "REFUNDED"
        order.status = "REFUNDED"
    else:
        raise HTTPException(status_code=400, detail="無效的仲裁決定")

    db.commit()
    return {"message": f"仲裁執行成功。決議：{payload.decision}"}


# Reviews
@app.post("/api/v1/orders/{order_id}/review", status_code=201)
def review_order(order_id: str, payload: schemas.ReviewCreate, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="找不到該訂單")
    
    new_review = models.Review(
        order_id=order_id,
        reviewer_id=order.customer_id,
        reviewee_id=order.cleaner.user_id,
        rating=payload.rating,
        comment=payload.comment
    )
    db.add(new_review)
    
    # Recalculate average rating
    cleaner = order.cleaner
    total_completed = cleaner.total_orders_completed + 1
    new_avg = ((float(cleaner.avg_rating) * cleaner.total_orders_completed) + payload.rating) / total_completed
    
    cleaner.total_orders_completed = total_completed
    cleaner.avg_rating = Decimal(f"{new_avg:.2f}")
    
    db.commit()
    return {"message": "評價送出成功"}


# --- DEBUG / MONITOR ENDPOINT FOR REACT INSPECTOR ---
@app.get("/api/v1/debug/db", status_code=200)
def debug_inspect_db(db: Session = Depends(get_db)):
    # Helper to serialize mock tables so the UI can inspect the DB directly!
    orders = db.query(models.Order).all()
    payments = db.query(models.Payment).all()
    bids = db.query(models.QuotationBid).all()
    photos = db.query(models.ServiceProofPhoto).all()

    return {
        "orders": [
            {
                "id": o.id, "order_no": o.order_no, "customer_id": o.customer_id,
                "cleaner_id": o.cleaner_id, "total_amount": float(o.total_amount or 0),
                "cleaner_payout": float(o.cleaner_payout or 0), "status": o.status,
                "booking_type": o.booking_type, "service_type": o.service_type
            }
            for o in orders
        ],
        "payments": [
            {
                "id": p.id, "order_id": p.order_id, "auth_amount": float(p.auth_amount),
                "captured_amount": float(p.captured_amount) if p.captured_amount is not None else None,
                "status": p.status
            }
            for p in payments
        ],
        "bids": [
            {
                "id": b.id, "order_id": b.order_id, "cleaner_id": b.cleaner_id,
                "bid_amount": float(b.bid_amount), "notes": b.notes, "status": b.status
            }
            for b in bids
        ],
        "photos": [
            {
                "id": ph.id, "order_id": ph.order_id, "photo_phase": ph.photo_phase,
                "area_tag": ph.area_tag, "client_signed_url": ph.client_signed_url
            }
            for ph in photos
        ]
    }


# Helper utilities
def uuid_to_short():
    import uuid
    return str(uuid.uuid4())[:8]

# --- SYNC DATABASE STATE FOR REACT FRONTENDS ---
MOCK_DB_FILE = "mock_db_state.json"

@app.get("/api/v1/sync/db")
def get_sync_db():
    if os.path.exists(MOCK_DB_FILE):
        try:
            with open(MOCK_DB_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}

@app.post("/api/v1/sync/db")
def save_sync_db(payload: dict):
    try:
        with open(MOCK_DB_FILE, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
        return {"status": "ok"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=True)
