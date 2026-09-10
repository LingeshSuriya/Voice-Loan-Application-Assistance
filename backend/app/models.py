import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    phone_number = Column(String(16), unique=True, index=True, nullable=False)
    full_name = Column(String(128), default="Borrower", nullable=False)
    hashed_pin = Column(String(128), nullable=True) # SHA-256 hashed 4-digit PIN
    role = Column(String(32), default="borrower", nullable=False) # borrower or agent
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    reference_no = Column(String(32), unique=True, index=True, nullable=False)
    user_phone = Column(String(16), index=True, nullable=True) # Linked authenticated phone
    
    # 7 Core Schema Fields
    applicant_name = Column(String(128), nullable=True)
    village_or_address = Column(String(255), nullable=True)
    loan_amount = Column(Float, nullable=True)
    loan_purpose = Column(String(255), nullable=True)
    monthly_income = Column(Float, nullable=True)
    income_source = Column(String(128), nullable=True)
    aadhaar_last4 = Column(String(4), nullable=True)
    
    # Metadata, Underwriting & Decisioning
    status = Column(String(64), default="LOAN_ACCEPTED", nullable=False)
    verification_status = Column(String(64), default="VERIFIED", nullable=False)
    risk_tier = Column(String(32), default="LOW", nullable=False)
    cibil_score = Column(Integer, default=720, nullable=True)
    alternative_score = Column(Integer, default=745, nullable=True)
    sanctioned_amount = Column(Float, nullable=True)
    monthly_emi = Column(Float, nullable=True)
    tenure_months = Column(Integer, default=12, nullable=False)
    whatsapp_voice_text = Column(Text, nullable=True)
    language = Column(String(16), default="hi-IN")
    transcript = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
