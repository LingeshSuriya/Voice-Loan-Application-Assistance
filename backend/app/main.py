import random
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional
import jwt
import hashlib
from fastapi import FastAPI, Depends, UploadFile, File, Form, HTTPException, status, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from sqlalchemy import text
from .config import settings
from .database import engine, Base, get_db, SessionLocal
from .models import Application, User
from .schemas import (
    ExtractionResponse,
    FieldConfirmRequest,
    FieldConfirmResponse,
    TTSRequest,
    TTSResponse,
    ApplicationSubmitRequest,
    ApplicationSubmitResponse,
    ApplicationRead,
    RegisterUserRequest,
    LoginRequest,
    AuthResponse,
    SendOTPRequest,
    SendOTPResponse,
    VerifyOTPRequest,
    AuthTokenResponse
)
from .speech_service import speech_service
from .extraction_service import extraction_service
from .mock_data import DEMO_PROFILES, VOICE_PROMPTS, FIELD_LABELS
from .underwriting_service import evaluate_rural_credit

def migrate_sqlite_columns():
    """Ensure all underwriting columns exist in the SQLite applications table."""
    with engine.connect() as conn:
        try:
            res = conn.execute(text("PRAGMA table_info(applications)"))
            existing_cols = {row[1] for row in res.fetchall()}
            new_cols = [
                ("verification_status", "VARCHAR(64) DEFAULT 'VERIFIED'"),
                ("risk_tier", "VARCHAR(32) DEFAULT 'LOW'"),
                ("cibil_score", "INTEGER DEFAULT 720"),
                ("alternative_score", "INTEGER DEFAULT 745"),
                ("sanctioned_amount", "FLOAT"),
                ("monthly_emi", "FLOAT"),
                ("tenure_months", "INTEGER DEFAULT 12"),
                ("whatsapp_voice_text", "TEXT"),
            ]
            for col_name, col_def in new_cols:
                if col_name not in existing_cols:
                    conn.execute(text(f"ALTER TABLE applications ADD COLUMN {col_name} {col_def}"))
            conn.commit()
        except Exception as e:
            pass

# Initialize database tables
Base.metadata.create_all(bind=engine)
migrate_sqlite_columns()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Voice-Only Loan Application Assistant API",
    description="Backend for rural voice-first loan application PWA",
    version="1.0.0"
)

# Enable CORS for Vite frontend and local testing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health_check():
    """Health check endpoint showing active providers and status."""
    return {
        "status": "healthy",
        "providers": {
            "sarvam_ai": "active" if settings.has_sarvam else "mock_fallback",
            "gemini_llm": "active" if settings.has_gemini else "rule_based_fallback"
        },
        "default_language": settings.DEFAULT_LANGUAGE,
        "database": "connected"
    }

@app.get("/api/demo-profiles")
def get_demo_profiles():
    """Returns curated demo scenarios for testing and hackathon judges."""
    return {
        "profiles": list(DEMO_PROFILES.values()),
        "voice_prompts": VOICE_PROMPTS
    }

JWT_SECRET = "rural-voice-loan-secret-key-mfi-hackathon-2026-vignesh"
JWT_ALGORITHM = "HS256"
OTP_STORE = {"9999999999": "1234", "9876543210": "1234"}

def hash_pin(pin: str) -> str:
    """Hash 4-digit PIN using SHA-256 for secure credential storage."""
    return hashlib.sha256(pin.encode("utf-8")).hexdigest()

@app.on_event("startup")
def startup_seed_users():
    """Ensure schema is migrated and standard demo accounts are seeded."""
    migrate_sqlite_columns()
    db = SessionLocal()
    try:
        default_users = [
            {"phone": "9999999999", "name": "Field Agent", "pin": "1234", "role": "agent"},
            {"phone": "9876543210", "name": "Ram Kumar", "pin": "1234", "role": "borrower"},
            {"phone": "9123456780", "name": "விக்னேஷ் (Vignesh)", "pin": "1234", "role": "borrower"}
        ]
        for u in default_users:
            user = db.query(User).filter(User.phone_number == u["phone"]).first()
            if not user:
                user = User(
                    phone_number=u["phone"],
                    full_name=u["name"],
                    hashed_pin=hash_pin(u["pin"]),
                    role=u["role"]
                )
                db.add(user)
            else:
                if not user.hashed_pin:
                    user.hashed_pin = hash_pin(u["pin"])
                if not user.full_name or user.full_name == "Borrower":
                    user.full_name = u["name"]
        db.commit()
    except Exception as e:
        logger.warning(f"Startup seed error: {e}")
    finally:
        db.close()

@app.post("/api/auth/register", response_model=AuthResponse)
def register_user(payload: RegisterUserRequest, db: Session = Depends(get_db)):
    """
    Register a new borrower or agent with full name, 10-digit phone, and 4-digit PIN.
    Returns signed JWT access token.
    """
    phone = payload.phone_number.strip().replace(" ", "").replace("-", "")
    if len(phone) < 10 or not phone.isdigit():
        raise HTTPException(
            status_code=400,
            detail="செல்லுபடியாகும் 10 இலக்க மொபைல் எண்ணை உள்ளிடவும் / Enter a valid 10-digit phone number"
        )

    pin = payload.pin.strip()
    if len(pin) != 4 or not pin.isdigit():
        raise HTTPException(
            status_code=400,
            detail="4 இலக்க எண்களைக் கொண்ட பின்னை உள்ளிடவும் / Enter a 4-digit numeric PIN"
        )

    existing = db.query(User).filter(User.phone_number == phone).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="இந்த மொபைல் எண் ஏற்கனவே பதிவு செய்யப்பட்டுள்ளது / Mobile number already registered. Please login."
        )

    role = payload.role if payload.role in ("agent", "borrower") else "borrower"
    name = payload.full_name.strip() or "Borrower"

    user = User(
        phone_number=phone,
        full_name=name,
        hashed_pin=hash_pin(pin),
        role=role
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token_payload = {
        "sub": user.phone_number,
        "name": user.full_name,
        "role": user.role,
        "user_id": user.id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7)
    }
    token = jwt.encode(token_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

    return AuthResponse(
        access_token=token,
        token_type="bearer",
        phone_number=user.phone_number,
        full_name=user.full_name,
        role=user.role
    )

@app.post("/api/auth/login", response_model=AuthResponse)
def login_user(payload: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate user using phone number and 4-digit PIN with genuine database verification.
    Rejects wrong PIN or unregistered phone numbers with 401 Unauthorized.
    """
    phone = payload.phone_number.strip().replace(" ", "").replace("-", "")
    pin = payload.pin.strip()

    if not phone or not pin:
        raise HTTPException(
            status_code=400,
            detail="மொபைல் எண் மற்றும் 4 இலக்க பின் இரண்டும் தேவை / Phone number and 4-digit PIN are required"
        )

    user = db.query(User).filter(User.phone_number == phone).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="இந்த மொபைல் எண் பதிவு செய்யப்படவில்லை. தயவுசெய்து புதிய கணக்கை பதிவு செய்யவும் / Phone number not found. Please register."
        )

    if not user.hashed_pin or user.hashed_pin != hash_pin(pin):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="தவறான பின் எண்! தயவுசெய்து சரியான 4 இலக்க பின்னை உள்ளிடவும் / Invalid PIN. Please check and try again."
        )

    token_payload = {
        "sub": user.phone_number,
        "name": user.full_name or "Borrower",
        "role": user.role,
        "user_id": user.id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7)
    }
    token = jwt.encode(token_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

    return AuthResponse(
        access_token=token,
        token_type="bearer",
        phone_number=user.phone_number,
        full_name=user.full_name or "Borrower",
        role=user.role
    )

@app.post("/api/auth/send-otp", response_model=SendOTPResponse)
def send_otp(payload: SendOTPRequest, db: Session = Depends(get_db)):
    """Send 4-digit mock OTP with voice announcement in Hindi/Marathi/Tamil."""
    phone = payload.phone_number.strip().replace(" ", "").replace("-", "")
    if len(phone) < 10:
        raise HTTPException(status_code=400, detail="10 இலக்க அல்லது 10 अंकों का वैध मोबाइल नंबर दर्ज करें")
    
    otp = "1234"
    OTP_STORE[phone] = otp

    # Upsert user record
    user = db.query(User).filter(User.phone_number == phone).first()
    if not user:
        role = "agent" if phone in ("9999999999", "8888888888") else "borrower"
        user = User(phone_number=phone, role=role, hashed_pin=hash_pin("1234"))
        db.add(user)
        db.commit()

    if payload.language == "ta-IN":
        voice_otp_text = "உங்கள் ஒருமுறை கடவுச்சொல் 1 2 3 4 ஆகும். (Your OTP is 1 2 3 4)."
    else:
        voice_otp_text = "आपका ओटीपी 1 2 3 4 है। (Your OTP is 1 2 3 4)."
    audio_b64, _ = speech_service.synthesize(voice_otp_text, language_code=payload.language)

    return SendOTPResponse(
        success=True,
        message="OTP sent successfully",
        otp_hint="1234",
        voice_otp_text=voice_otp_text,
        audio_base64=audio_b64
    )

@app.post("/api/auth/verify-otp", response_model=AuthTokenResponse)
def verify_otp(payload: VerifyOTPRequest, db: Session = Depends(get_db)):
    """Verify 4-digit OTP and issue JWT token."""
    phone = payload.phone_number.strip().replace(" ", "").replace("-", "")
    expected = OTP_STORE.get(phone, "1234")

    if payload.otp.strip() != expected and payload.otp.strip() != "1234":
        raise HTTPException(status_code=400, detail="गलत OTP है / தவறான OTP. Use 1234 for demo.")

    user = db.query(User).filter(User.phone_number == phone).first()
    if not user:
        role = "agent" if phone in ("9999999999", "8888888888") else "borrower"
        user = User(phone_number=phone, role=role, hashed_pin=hash_pin("1234"))
        db.add(user)
        db.commit()
        db.refresh(user)

    token_payload = {
        "sub": user.phone_number,
        "name": user.full_name or "Borrower",
        "role": user.role,
        "user_id": user.id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7)
    }
    token = jwt.encode(token_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

    return AuthTokenResponse(
        access_token=token,
        token_type="bearer",
        phone_number=user.phone_number,
        role=user.role
    )

@app.get("/api/auth/me")
def get_current_user(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    """Check authenticated session status."""
    if not authorization or not authorization.startswith("Bearer "):
        return {"authenticated": False, "user": None}
    raw_token = authorization.split(" ")[1]
    try:
        decoded = jwt.decode(raw_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return {"authenticated": True, "user": decoded}
    except Exception:
        return {"authenticated": False, "user": None}

@app.post("/api/stt")
async def transcribe_audio(
    file: UploadFile = File(...),
    language: str = Form("hi-IN")
):
    """Transcribe uploaded audio file to text transcript."""
    try:
        audio_bytes = await file.read()
        transcript = speech_service.transcribe(audio_bytes, filename=file.filename or "audio.wav", language_code=language)
        return {
            "transcript": transcript,
            "language": language,
            "audio_size_bytes": len(audio_bytes)
        }
    except Exception as e:
        logger.error(f"STT Error: {e}")
        raise HTTPException(status_code=500, detail=f"Speech-to-text failed: {str(e)}")

@app.post("/api/extract", response_model=ExtractionResponse)
def extract_fields_from_text(
    payload: dict
):
    """Extract structured 7-field schema from a transcript string."""
    transcript = payload.get("transcript", "")
    language = payload.get("language", "hi-IN")
    if not transcript:
        raise HTTPException(status_code=400, detail="Transcript is required")
    
    result = extraction_service.extract_fields(transcript, language_code=language)
    return result

@app.post("/api/process-voice")
async def process_voice_intake(
    file: UploadFile = File(...),
    language: str = Form("hi-IN"),
    client_transcript: Optional[str] = Form(None)
):
    """
    Combined voice processing:
    Takes user's free-flowing audio intake -> STT -> Structured Extraction with explanations.
    If client_transcript is provided from live browser recognition, uses it directly.
    """
    try:
        audio_bytes = await file.read()
        if client_transcript and client_transcript.strip():
            transcript = client_transcript.strip()
            logger.info(f"Using live client transcript: {transcript}")
        else:
            transcript = speech_service.transcribe(audio_bytes, filename=file.filename or "intake.wav", language_code=language)
            
        extraction = extraction_service.extract_fields(transcript, language_code=language)
        return {
            "transcript": transcript,
            "language": language,
            "data": extraction.data.dict(),
            "explanations": extraction.explanations
        }
    except Exception as e:
        logger.error(f"Process Voice Error: {e}")
        raise HTTPException(status_code=500, detail=f"Voice processing failed: {str(e)}")

@app.post("/api/tts", response_model=TTSResponse)
def synthesize_speech(payload: TTSRequest):
    """Synthesize voice audio for a given text prompt."""
    base64_audio, _ = speech_service.synthesize(payload.text, language_code=payload.language)
    provider = "sarvam" if settings.has_sarvam else "mock_synth"
    return TTSResponse(
        text=payload.text,
        language=payload.language,
        audio_base64=base64_audio,
        provider=provider
    )

@app.post("/api/confirm-field", response_model=FieldConfirmResponse)
def handle_field_confirmation(payload: FieldConfirmRequest):
    """
    Field-by-field interactive confirmation logic:
    - User says 'haan' / 'yes' -> field confirmed
    - User says 'nahi' / provides correction -> field re-extracted & updated
    """
    lang = payload.language or "hi-IN"
    prompts = VOICE_PROMPTS.get(lang, VOICE_PROMPTS["hi-IN"])
    labels = FIELD_LABELS.get(lang, FIELD_LABELS["hi-IN"])
    field_label = labels.get(payload.field_name, payload.field_name)

    response_text = (payload.user_response or "").strip().lower()
    is_positive = any(w in response_text for w in [
        "haan", "ha", "yes", "sahi", "theek", "बरोबर", "होय", "हाँ",
        "ஆம்", "ஆமா", "சரி", "சரிங்க", "சரியா", "ok", "correct", "right", "sure", "confirmed", "true"
    ])
    is_negative = any(w in response_text for w in [
        "nahi", "na", "no", "galat", "नाही", "ना", "नहीं",
        "இல்லை", "இல்ல", "தவறு", "தப்பு", "மாத்து", "மாற்று", "wrong", "change", "incorrect", "nope", "false"
    ])

    if is_positive and not is_negative:
        if lang == "ta-IN":
            explanation_text = f"{field_label} சரிபார்க்கப்பட்டது"
            tts_text = f"{field_label} சரி."
        elif lang == "mr-IN":
            explanation_text = f"{field_label} पडताळले गेले"
            tts_text = f"{field_label} बरोबर आहे."
        elif lang == "en-IN":
            explanation_text = f"{field_label} verified"
            tts_text = f"{field_label} confirmed."
        else:
            explanation_text = f"{field_label} सत्यापित हुआ"
            tts_text = f"{field_label} ठीक है।"

        return FieldConfirmResponse(
            field_name=payload.field_name,
            confirmed=True,
            updated_value=payload.current_value,
            explanation=explanation_text,
            tts_prompt=tts_text
        )

    # If user provided a correction or rejected
    new_val, explanation = extraction_service.extract_single_field(
        payload.field_name,
        payload.user_response or "",
        current_value=payload.current_value
    )

    # Generate new confirmation question for the updated value
    confirm_template = prompts["field_confirm"].get(payload.field_name, "क्या {value} सही है?")
    next_tts = confirm_template.format(value=new_val if new_val is not None else "")

    audio_b64, _ = speech_service.synthesize(next_tts, language_code=lang)

    return FieldConfirmResponse(
        field_name=payload.field_name,
        confirmed=False,
        updated_value=new_val,
        explanation=explanation,
        tts_prompt=next_tts,
        audio_base64=audio_b64
    )

@app.post("/api/submit", response_model=ApplicationSubmitResponse)
def submit_loan_application(
    payload: ApplicationSubmitRequest,
    db: Session = Depends(get_db)
):
    """
    Submission & Rural Underwriting endpoint:
    - Stores application in SQLite with timestamp and status.
    - Evaluates alternative rural credit scoring, DTI / FOIR, and risk tiering.
    - Generates localized WhatsApp voice note approval text and receipt audio.
    """
    ref_no = f"LN-2026-{random.randint(1000, 9999)}"
    lang = payload.language or "hi-IN"

    # Evaluate Rural Credit & Sanction Logic
    credit_eval = evaluate_rural_credit(
        loan_amount=payload.loan_amount,
        monthly_income=payload.monthly_income,
        applicant_name=payload.applicant_name,
        purpose=payload.loan_purpose,
        language=lang
    )

    application = Application(
        reference_no=ref_no,
        user_phone=payload.user_phone,
        applicant_name=payload.applicant_name,
        village_or_address=payload.village_or_address,
        loan_amount=payload.loan_amount,
        loan_purpose=payload.loan_purpose,
        monthly_income=payload.monthly_income,
        income_source=payload.income_source,
        aadhaar_last4=payload.aadhaar_last4,
        status="pending verification",  # Preserved for contract test compatibility
        verification_status=credit_eval["verification_status"],
        risk_tier=credit_eval["risk_tier"],
        cibil_score=credit_eval["cibil_score"],
        alternative_score=credit_eval["alternative_score"],
        sanctioned_amount=credit_eval["sanctioned_amount"],
        monthly_emi=credit_eval["monthly_emi"],
        tenure_months=credit_eval["tenure_months"],
        whatsapp_voice_text=credit_eval["whatsapp_voice_text"],
        language=lang,
        transcript=payload.transcript,
        created_at=datetime.now(timezone.utc)
    )
    
    db.add(application)
    db.commit()
    db.refresh(application)

    prompts = VOICE_PROMPTS.get(lang, VOICE_PROMPTS["hi-IN"])
    receipt_template = prompts["receipt"]
    voice_receipt_text = receipt_template.format(ref_no=ref_no)

    # Synthesize closing receipt speech
    audio_b64, _ = speech_service.synthesize(voice_receipt_text, language_code=lang)

    disclaimer_copy = "Identity verification happens downstream via the lender's existing KYC pipeline before any disbursal."

    return ApplicationSubmitResponse(
        id=application.id,
        reference_no=ref_no,
        status=application.status,
        risk_tier=application.risk_tier,
        verification_status=application.verification_status,
        cibil_score=application.cibil_score,
        alternative_score=application.alternative_score,
        applicant_name=application.applicant_name,
        loan_amount=application.loan_amount,
        sanctioned_amount=application.sanctioned_amount,
        monthly_emi=application.monthly_emi,
        tenure_months=application.tenure_months,
        voice_receipt_text=voice_receipt_text,
        whatsapp_voice_text=application.whatsapp_voice_text,
        whatsapp_rich_card=credit_eval.get("whatsapp_rich_card"),
        audio_base64=audio_b64,
        disclaimer=disclaimer_copy,
        user_phone=application.user_phone,
        created_at=application.created_at
    )

@app.get("/api/applications", response_model=List[ApplicationRead])
def list_applications(q: Optional[str] = None, db: Session = Depends(get_db)):
    """Retrieve all submitted loan applications from SQLite, seeding demo applications if empty."""
    apps = db.query(Application).order_by(Application.created_at.desc()).all()
    
    # Auto-seed historical reference applications matching UI Screenshot 5 if empty
    if not apps:
        seeds = [
            Application(
                reference_no="AGR-2693",
                applicant_name="என்னுடைய பெயர் உனக்கு தெரியுமா",
                village_or_address="மதுரை (Madurai)",
                loan_amount=30000.0,
                loan_purpose="Agriculture",
                monthly_income=18000.0,
                income_source="Farming",
                aadhaar_last4="3210",
                status="LOAN_ACCEPTED",
                verification_status="VERIFIED",
                risk_tier="MEDIUM",
                cibil_score=685,
                alternative_score=710,
                sanctioned_amount=30000.0,
                monthly_emi=2700.0,
                tenure_months=12,
                whatsapp_voice_text="வணக்கம். உங்களுடைய ரூபாய் 30,000 வேளாண்மை கடன் அனுமதிக்கப்பட்டது. மாத தவணை ரூபாய் 2,700.",
                language="ta-IN",
                user_phone="+919876543210",
                created_at=datetime.now(timezone.utc) - timedelta(hours=3)
            ),
            Application(
                reference_no="AGR-2832",
                applicant_name="என் பெயர் இன்பன் செல்வி",
                village_or_address="திருநெல்வேலி (Tirunelveli)",
                loan_amount=100000.0,
                loan_purpose="Agriculture",
                monthly_income=35000.0,
                income_source="Dairy & Poultry",
                aadhaar_last4="3210",
                status="LOAN_ACCEPTED",
                verification_status="VERIFIED",
                risk_tier="LOW",
                cibil_score=740,
                alternative_score=780,
                sanctioned_amount=100000.0,
                monthly_emi=9000.0,
                tenure_months=12,
                whatsapp_voice_text="வணக்கம் இன்பன் செல்வி. உங்களுடைய ரூபாய் 1,00,000 கடன் அனுமதிக்கப்பட்டது. மாத தவணை ரூபாய் 9,000.",
                language="ta-IN",
                user_phone="+919876543210",
                created_at=datetime.now(timezone.utc) - timedelta(hours=5)
            ),
            Application(
                reference_no="AGR-9146",
                applicant_name="இருப்பான்",
                village_or_address="தஞ்சாவூர் (Thanjavur)",
                loan_amount=50000.0,
                loan_purpose="Agriculture",
                monthly_income=22000.0,
                income_source="Crop Cultivation",
                aadhaar_last4="3210",
                status="LOAN_ACCEPTED",
                verification_status="VERIFIED",
                risk_tier="LOW",
                cibil_score=755,
                alternative_score=790,
                sanctioned_amount=50000.0,
                monthly_emi=4500.0,
                tenure_months=12,
                whatsapp_voice_text="வணக்கம் இருப்பான். உங்களுடைய ரூபாய் 50,000 கடன் அனுமதிக்கப்பட்டது. மாத தவணை ரூபாய் 4,500.",
                language="ta-IN",
                user_phone="+919876543210",
                created_at=datetime.now(timezone.utc) - timedelta(hours=8)
            ),
        ]
        for s in seeds:
            db.add(s)
        db.commit()
        apps = db.query(Application).order_by(Application.created_at.desc()).all()

    if q and q.strip():
        term = q.strip().lower()
        apps = [
            a for a in apps
            if term in (a.reference_no or "").lower()
            or term in (a.applicant_name or "").lower()
            or term in (a.loan_purpose or "").lower()
            or term in (a.village_or_address or "").lower()
        ]

    return apps

@app.get("/api/applications/{app_id}/voice-note")
def get_application_voice_note(app_id: int, db: Session = Depends(get_db)):
    """Synthesizes and returns base64 audio for an application's WhatsApp voice note."""
    app_record = db.query(Application).filter(Application.id == app_id).first()
    if not app_record:
        raise HTTPException(status_code=404, detail="Application not found")
    
    text = app_record.whatsapp_voice_text or f"Loan application {app_record.reference_no} is verified."
    lang = app_record.language or "hi-IN"
    audio_b64, _ = speech_service.synthesize(text, language_code=lang)
    
    return {
        "id": app_record.id,
        "reference_no": app_record.reference_no,
        "text": text,
        "audio_base64": audio_b64,
        "language": lang
    }
