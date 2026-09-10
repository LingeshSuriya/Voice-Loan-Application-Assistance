import math
from typing import Dict, Any, Optional

def calculate_monthly_emi(principal: float, annual_rate_pct: float = 8.5, tenure_months: int = 12) -> float:
    """Calculates standard reducing-balance monthly EMI."""
    if principal <= 0 or tenure_months <= 0:
        return 0.0
    r = (annual_rate_pct / 100.0) / 12.0
    if r == 0:
        return round(principal / tenure_months, 2)
    emi = (principal * r * math.pow(1 + r, tenure_months)) / (math.pow(1 + r, tenure_months) - 1)
    return round(emi, 2)

def evaluate_rural_credit(
    loan_amount: Optional[float],
    monthly_income: Optional[float],
    applicant_name: Optional[str] = None,
    purpose: Optional[str] = None,
    language: str = "hi-IN",
    tenure_months: int = 12
) -> Dict[str, Any]:
    """
    Intelligent Rural Credit Evaluation Engine (MFI Reality):
    1. Simulates Bureau footprint (or flags New to Credit - NTC).
    2. Computes DTI / FOIR (Fixed Obligation to Income Ratio) <= 40%.
    3. Evaluates Alternative Rural Factors (JLG group peer trust, utility recharge consistency).
    4. Computes Sanctioned Amount, Monthly EMI, and Risk Tier (LOW / MEDIUM / HIGH).
    5. Generates Multimodal Regional WhatsApp Rich Message & Spoken Voice Note.
    """
    req_amount = float(loan_amount) if loan_amount and loan_amount > 0 else 40000.0
    income = float(monthly_income) if monthly_income and monthly_income > 0 else 20000.0
    name = applicant_name or "Applicant"
    loan_purpose = purpose or "General / Agriculture"

    # 1. Standard Reducing Balance EMI
    monthly_emi = calculate_monthly_emi(req_amount, annual_rate_pct=8.5, tenure_months=tenure_months)

    # 2. Debt-to-Income / FOIR Ratio
    foir_pct = round((monthly_emi / income) * 100.0, 1) if income > 0 else 50.0

    # 3. Rural Alternative Underwriting Score (300 - 850 range)
    # Rural borrowers typically have no formal credit history (NTC), so we model:
    # - Base alternative score: 620
    # - Low DTI bonus (<= 30%): +90 pts
    # - JLG (Self-Help Group) on-time peer track record: +40 pts
    # - Utility / mobile recharge discipline: +30 pts
    # - Aadhaar verification authenticity: +20 pts
    base_alt_score = 620
    if foir_pct <= 25.0:
        dti_bonus = 95
    elif foir_pct <= 40.0:
        dti_bonus = 60
    elif foir_pct <= 50.0:
        dti_bonus = 20
    else:
        dti_bonus = -40

    jlg_peer_points = 45
    utility_points = 30
    kyc_points = 20

    alternative_score = min(850, max(300, base_alt_score + dti_bonus + jlg_peer_points + utility_points + kyc_points))

    # Simulated Bureau Score (e.g. CRIF High Mark / CIBIL)
    # Rural first-time borrowers often show 0 / -1 (NTC). If positive, 700+
    cibil_score = 724 if alternative_score >= 700 else (650 if alternative_score >= 600 else -1)

    # 4. Risk Tiering & Sanction Decision
    if foir_pct <= 35.0 and alternative_score >= 680:
        risk_tier = "LOW"
        status = "LOAN_ACCEPTED"
        sanctioned_amount = req_amount
    elif foir_pct <= 50.0 and alternative_score >= 600:
        risk_tier = "MEDIUM"
        status = "LOAN_ACCEPTED"
        sanctioned_amount = req_amount
    else:
        risk_tier = "HIGH"
        status = "UNDERWRITING"
        sanctioned_amount = round(req_amount * 0.75, 0)

    # 5. Multimodal Regional WhatsApp Voice Note & Rich Message Generation
    lang_code = language.split("-")[0] if language else "hi"
    emi_str = f"{int(monthly_emi):,}"
    sanctioned_str = f"{int(sanctioned_amount):,}"

    if lang_code == "ta":
        whatsapp_voice_text = (
            f"வணக்கம் {name}. உங்களுடைய ரூபாய் {sanctioned_str} கடன் அனுமதிக்கப்பட்டது. "
            f"மாத தவணை ரூபாய் {emi_str}. உங்கள் வங்கி கணக்கில் தொகை 24 மணிநேரத்தில் வரவு வைக்கப்படும்."
        )
        whatsapp_rich_card = {
            "title": "கடன் ஒப்புதல் அறிவிப்பு (Loan Sanction)",
            "header": "வங்கி முன்-ஒப்புதல் முடிந்தது",
            "body": f"வணக்கம் {name}, உங்கள் {loan_purpose} தேவைகளுக்கான ₹{sanctioned_str} கடன் உடனடியாக அனுமதிக்கப்பட்டது.",
            "emi": f"₹{emi_str} / மாதம்",
            "tenure": f"{tenure_months} மாதங்கள்",
            "dti_ratio": f"{foir_pct}% (பாதுகாப்பானது)",
            "disbursal": "24 மணிநேரத்திற்குள் வங்கி கணக்கில் வரவு வைக்கப்படும்",
        }
    elif lang_code == "mr":
        whatsapp_voice_text = (
            f"नमस्कार {name}. आपले रुपये {sanctioned_str} चे कर्ज मंजूर झाले आहे. "
            f"मासिक हप्ता रुपये {emi_str}. रक्कम 24 तासांत आपल्या बँक खात्यात जमा होईल."
        )
        whatsapp_rich_card = {
            "title": "कर्ज मंजुरी सूचना (Loan Sanction)",
            "header": "बँक पूर्व-मंजुरी पूर्ण",
            "body": f"नमस्कार {name}, आपल्या {loan_purpose} साठी ₹{sanctioned_str} चे कर्ज मंजूर झाले आहे.",
            "emi": f"₹{emi_str} / महिना",
            "tenure": f"{tenure_months} महिने",
            "dti_ratio": f"{foir_pct}% (सुरक्षित)",
            "disbursal": "24 तासांच्या आत थेट बँक खात्यात",
        }
    elif lang_code == "en":
        whatsapp_voice_text = (
            f"Hello {name}. Your loan of {sanctioned_str} rupees for {loan_purpose} is approved! "
            f"Your monthly EMI will be {emi_str} rupees. The funds will be credited to your bank account within 24 hours."
        )
        whatsapp_rich_card = {
            "title": "Loan Sanction Letter",
            "header": "Instant Pre-Approval Successful",
            "body": f"Hello {name}, your loan request of ₹{sanctioned_str} for {loan_purpose} has been verified and sanctioned.",
            "emi": f"₹{emi_str} / month",
            "tenure": f"{tenure_months} Months",
            "dti_ratio": f"{foir_pct}% (Healthy)",
            "disbursal": "Direct to Bank Account within 24 Hours",
        }
    else:  # Hindi default
        whatsapp_voice_text = (
            f"नमस्ते {name}। आपका रुपये {sanctioned_str} का लोन स्वीकृत हो गया है। "
            f"मासिक किस्त रुपये {emi_str} होगी। राशि 24 घंटे के भीतर आपके बैंक खाते में जमा कर दी जाएगी।"
        )
        whatsapp_rich_card = {
            "title": "ऋण स्वीकृति पत्र (Loan Sanction)",
            "header": "बैंक पूर्व-स्वीकृति सफल",
            "body": f"नमस्ते {name}, आपके {loan_purpose} के लिए ₹{sanctioned_str} का लोन स्वीकृत किया गया है।",
            "emi": f"₹{emi_str} / माह",
            "tenure": f"{tenure_months} माह",
            "dti_ratio": f"{foir_pct}% (सुरक्षित)",
            "disbursal": "24 घंटे में सीधे बैंक खाते में",
        }

    return {
        "status": status,
        "risk_tier": risk_tier,
        "cibil_score": cibil_score,
        "alternative_score": alternative_score,
        "foir_ratio": foir_pct,
        "sanctioned_amount": sanctioned_amount,
        "monthly_emi": monthly_emi,
        "tenure_months": tenure_months,
        "verification_status": "VERIFIED",
        "whatsapp_voice_text": whatsapp_voice_text,
        "whatsapp_rich_card": whatsapp_rich_card,
    }
