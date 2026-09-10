import random
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional
import jwt
import hashlib
from fastapi import FastAPI, Depends, UploadFile, File, Form, HTTPException, status, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

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

# Initialize database tables
Base.metadata.create_all(bind=engine)

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
    """Ensure standard demo accounts are seeded in SQLite with hashed PINs."""
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
    Mock submission endpoint:
    Stores application in SQLite with timestamp and fake 'pending verification' status.
    Generates reference number and voice receipt.
    """
    ref_no = f"LN-2026-{random.randint(1000, 9999)}"
    
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
        status="pending verification",  # Requirement: Must be "pending verification", not "approved"
        language=payload.language,
        transcript=payload.transcript,
        created_at=datetime.now(timezone.utc)
    )
    
    db.add(application)
    db.commit()
    db.refresh(application)

    lang = payload.language or "hi-IN"
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
        applicant_name=application.applicant_name,
        loan_amount=application.loan_amount,
        voice_receipt_text=voice_receipt_text,
        audio_base64=audio_b64,
        disclaimer=disclaimer_copy,
        user_phone=application.user_phone,
        created_at=application.created_at
    )

@app.get("/api/applications", response_model=List[ApplicationRead])
def list_applications(db: Session = Depends(get_db)):
    """Retrieve all submitted loan applications from SQLite."""
    apps = db.query(Application).order_by(Application.created_at.desc()).all()
    return apps
