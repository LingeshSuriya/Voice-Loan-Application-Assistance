from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class CandidateFieldData(BaseModel):
    candidates: List[Any] = Field(default_factory=list)
    english_variants: Optional[List[str]] = Field(default_factory=list)
    confidence_note: Optional[str] = None

class LoanApplicationData(BaseModel):
    applicant_name: Optional[Any] = Field(None, description="Full name of applicant (string or CandidateFieldData dict)")
    village_or_address: Optional[Any] = Field(None, description="Village, town, or address (string or CandidateFieldData dict)")
    loan_amount: Optional[float] = Field(None, description="Requested loan amount in INR")
    loan_purpose: Optional[str] = Field(None, description="Purpose of loan, e.g. business, agriculture, medical")
    monthly_income: Optional[float] = Field(None, description="Monthly income in INR")
    income_source: Optional[str] = Field(None, description="Source of income, e.g. farming, daily wage, shop")
    aadhaar_last4: Optional[str] = Field(None, description="Last 4 digits of Aadhaar (4 digits string)")

class FieldExplanation(BaseModel):
    field: str
    value: Any
    explanation_hi: str
    explanation_en: str

class ExtractionResponse(BaseModel):
    data: LoanApplicationData
    explanations: Dict[str, str] = Field(default_factory=dict)
    raw_transcript: str
    language: str = "hi-IN"

class FieldConfirmRequest(BaseModel):
    field_name: str
    current_value: Optional[Any] = None
    user_response: Optional[str] = None  # "haan", "nahi", or transcribed correction
    audio_base64: Optional[str] = None
    language: str = "hi-IN"

class FieldConfirmResponse(BaseModel):
    field_name: str
    confirmed: bool
    updated_value: Optional[Any] = None
    explanation: Optional[str] = None
    tts_prompt: str
    audio_base64: Optional[str] = None

class TTSRequest(BaseModel):
    text: str
    language: str = "hi-IN"

class TTSResponse(BaseModel):
    text: str
    language: str
    audio_base64: Optional[str] = None
    provider: str = "sarvam"

class RegisterUserRequest(BaseModel):
    phone_number: str = Field(..., description="10-digit mobile number")
    full_name: str = "Borrower"
    pin: str = Field(..., description="4-digit security PIN")
    role: str = "borrower"

class LoginRequest(BaseModel):
    phone_number: str
    pin: str

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    phone_number: str
    full_name: str
    role: str

class SendOTPRequest(BaseModel):
    phone_number: str = Field(..., description="10-digit mobile number")
    language: str = "hi-IN"

class SendOTPResponse(BaseModel):
    success: bool = True
    message: str
    otp_hint: str
    voice_otp_text: str
    audio_base64: Optional[str] = None

class VerifyOTPRequest(BaseModel):
    phone_number: str
    otp: str

class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    phone_number: str
    role: str = "borrower"

class ApplicationSubmitRequest(BaseModel):
    applicant_name: Optional[str] = None
    village_or_address: Optional[str] = None
    loan_amount: Optional[float] = None
    loan_purpose: Optional[str] = None
    monthly_income: Optional[float] = None
    income_source: Optional[str] = None
    aadhaar_last4: Optional[str] = None
    language: str = "hi-IN"
    transcript: Optional[str] = None
    user_phone: Optional[str] = None
    unverified_fields: Optional[List[str]] = None

class ApplicationSubmitResponse(BaseModel):
    id: int
    reference_no: str
    status: str
    risk_tier: str = "LOW"
    verification_status: str = "VERIFIED"
    cibil_score: Optional[int] = 720
    alternative_score: Optional[int] = 745
    applicant_name: Optional[str]
    loan_amount: Optional[float]
    sanctioned_amount: Optional[float] = None
    monthly_emi: Optional[float] = None
    tenure_months: int = 12
    voice_receipt_text: str
    whatsapp_voice_text: Optional[str] = None
    whatsapp_rich_card: Optional[Dict[str, Any]] = None
    audio_base64: Optional[str] = None
    disclaimer: str
    user_phone: Optional[str] = None
    unverified_fields: Optional[List[str]] = None
    created_at: datetime

class ApplicationRead(BaseModel):
    id: int
    reference_no: str
    applicant_name: Optional[str]
    village_or_address: Optional[str]
    loan_amount: Optional[float]
    loan_purpose: Optional[str]
    monthly_income: Optional[float]
    income_source: Optional[str]
    aadhaar_last4: Optional[str]
    status: str
    risk_tier: str = "LOW"
    verification_status: str = "VERIFIED"
    cibil_score: Optional[int] = 720
    alternative_score: Optional[int] = 745
    sanctioned_amount: Optional[float] = None
    monthly_emi: Optional[float] = None
    tenure_months: int = 12
    whatsapp_voice_text: Optional[str] = None
    language: str
    user_phone: Optional[str] = None
    unverified_fields: Optional[List[str]] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
