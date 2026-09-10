"""Comprehensive automated tests for Voice-Only Loan Application Assistant backend."""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine, SessionLocal
from app.models import Application

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    # Ensure fresh DB state
    Base.metadata.create_all(bind=engine)
    yield

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "providers" in data
    assert data["database"] == "connected"

def test_demo_profiles_endpoint():
    response = client.get("/api/demo-profiles")
    assert response.status_code == 200
    data = response.json()
    assert len(data["profiles"]) >= 3
    assert "voice_prompts" in data

def test_extract_full_profile():
    transcript = (
        "मेरा नाम राम कुमार है, मैं भोजपुर से हूँ। "
        "मुझे किराना दुकान के लिए 50,000 रुपये का लोन चाहिए। "
        "मेरी महीने की कमाई 15,000 रुपये है दुकान से, और आधार 4321 है।"
    )
    response = client.post("/api/extract", json={"transcript": transcript, "language": "hi-IN"})
    assert response.status_code == 200
    res_data = response.json()
    extracted = res_data["data"]
    def get_cand_regional(field_data):
        if not field_data:
            return field_data
        if isinstance(field_data, dict) and "candidates" in field_data:
            cands = field_data["candidates"]
            if cands and len(cands) > 0:
                first = cands[0]
                return first["regional"] if isinstance(first, dict) and "regional" in first else first
        return field_data

    name_val = get_cand_regional(extracted["applicant_name"])
    vill_val = get_cand_regional(extracted["village_or_address"])
    
    assert name_val == "राम कुमार"
    assert vill_val == "भोजपुर"
    assert extracted["loan_amount"] == 50000.0
    assert "दुकान" in extracted["loan_purpose"]
    assert extracted["monthly_income"] == 15000.0
    assert extracted["aadhaar_last4"] == "4321"
    
    # Check explanations exist
    assert "applicant_name" in res_data["explanations"]
    assert "loan_amount" in res_data["explanations"]

def test_extract_partial_profile():
    # Transcript with missing income and aadhaar
    transcript = "मेरा नाम मनोज यादव है, मैं सीतापुर का निवासी हूँ। मुझे 40,000 रुपये का लोन चाहिए।"
    response = client.post("/api/extract", json={"transcript": transcript, "language": "hi-IN"})
    assert response.status_code == 200
    extracted = response.json()["data"]
    
    def get_cand_regional(field_data):
        if not field_data:
            return field_data
        if isinstance(field_data, dict) and "candidates" in field_data:
            cands = field_data["candidates"]
            if cands and len(cands) > 0:
                first = cands[0]
                return first["regional"] if isinstance(first, dict) and "regional" in first else first
        return field_data

    name_val = get_cand_regional(extracted["applicant_name"])
    vill_val = get_cand_regional(extracted["village_or_address"])

    assert name_val == "मनोज यादव"
    assert vill_val == "सीतापुर"
    assert extracted["loan_amount"] == 40000.0
    # Must be null/None when missing, not guessed!
    assert extracted["monthly_income"] is None
    assert extracted["aadhaar_last4"] is None

def test_field_confirmation_positive():
    # User says "हाँ / haan" to confirm name
    payload = {
        "field_name": "applicant_name",
        "current_value": "राम कुमार",
        "user_response": "हाँ, यह बिल्कुल सही है",
        "language": "hi-IN"
    }
    response = client.post("/api/confirm-field", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["confirmed"] is True
    assert data["updated_value"] == "राम कुमार"

def test_field_confirmation_correction():
    # User says "नहीं, मेरा नाम श्याम लाल है"
    payload = {
        "field_name": "applicant_name",
        "current_value": "राम कुमार",
        "user_response": "नहीं, मेरा नाम श्याम लाल है",
        "language": "hi-IN"
    }
    response = client.post("/api/confirm-field", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["confirmed"] is False
    assert "श्याम लाल" in data["updated_value"]
    assert "श्याम लाल" in data["tts_prompt"]

def test_field_confirmation_amount_correction():
    # User says "नहीं, पचास नहीं अस्सी हज़ार चाहिए"
    payload = {
        "field_name": "loan_amount",
        "current_value": 50000.0,
        "user_response": "नहीं अस्सी हज़ार का लोन चाहिए",
        "language": "hi-IN"
    }
    response = client.post("/api/confirm-field", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["confirmed"] is False
    assert data["updated_value"] == 80000.0

def test_tts_endpoint():
    response = client.post("/api/tts", json={"text": "नमस्ते, आपका स्वागत है", "language": "hi-IN"})
    assert response.status_code == 200
    data = response.json()
    assert data["text"] == "नमस्ते, आपका स्वागत है"
    assert data["audio_base64"] is not None

def test_submit_and_verify_sqlite():
    payload = {
        "applicant_name": "राम कुमार",
        "village_or_address": "भोजपुर",
        "loan_amount": 50000.0,
        "loan_purpose": "किराना दुकान",
        "monthly_income": 15000.0,
        "income_source": "दुकान",
        "aadhaar_last4": "4321",
        "language": "hi-IN",
        "transcript": "Mera naam Ram Kumar hai..."
    }
    response = client.post("/api/submit", json=payload)
    assert response.status_code == 200
    res_data = response.json()
    
    # Verify strict requirement: status must be 'pending verification'
    assert res_data["status"] == "pending verification"
    assert res_data["reference_no"].startswith("LN-2026-")
    assert "सत्यापन के लिए लंबित" in res_data["voice_receipt_text"]
    assert res_data["disclaimer"] != ""
    assert res_data["audio_base64"] is not None

    # Verify directly in SQLite DB
    db = SessionLocal()
    saved = db.query(Application).filter(Application.reference_no == res_data["reference_no"]).first()
    db.close()

    assert saved is not None
    assert saved.applicant_name == "राम कुमार"
    assert saved.status == "pending verification"
    assert saved.loan_amount == 50000.0

def test_list_applications():
    response = client.get("/api/applications")
    assert response.status_code == 200
    apps = response.json()
    assert isinstance(apps, list)
    assert len(apps) >= 1

def test_auth_send_otp():
    response = client.post("/api/auth/send-otp", json={"phone_number": "9876543210", "language": "hi-IN"})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["otp_hint"] == "1234"
    assert "ओटीपी" in data["voice_otp_text"]

def test_auth_verify_otp_valid():
    response = client.post("/api/auth/verify-otp", json={"phone_number": "9876543210", "otp": "1234"})
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["phone_number"] == "9876543210"

def test_auth_verify_otp_invalid():
    response = client.post("/api/auth/verify-otp", json={"phone_number": "9876543210", "otp": "9999"})
    assert response.status_code == 400

def test_extract_custom_user_name_vignesh():
    transcript = "मेरा नाम विग्नेश है, मैं पुणे से हूँ। मुझे 60,000 का लोन चाहिए।"
    response = client.post("/api/extract", json={"transcript": transcript, "language": "hi-IN"})
    assert response.status_code == 200
    extracted = response.json()["data"]
    cand = extracted["applicant_name"]["candidates"][0] if isinstance(extracted["applicant_name"], dict) else extracted["applicant_name"]
    name_val = cand["regional"] if isinstance(cand, dict) else cand
    assert name_val == "विग्नेश"
    assert extracted["loan_amount"] == 60000.0

def test_extract_custom_user_name_rajkumar():
    transcript = "मेरा नाम राजकुमार है, मैं वाराणसी से हूँ। मुझे 75,000 का लोन चाहिए।"
    response = client.post("/api/extract", json={"transcript": transcript, "language": "hi-IN"})
    assert response.status_code == 200
    extracted = response.json()["data"]
    cand = extracted["applicant_name"]["candidates"][0] if isinstance(extracted["applicant_name"], dict) else extracted["applicant_name"]
    name_val = cand["regional"] if isinstance(cand, dict) else cand
    assert name_val == "राजकुमार"
    assert extracted["loan_amount"] == 75000.0

def test_auth_register_and_duplicate():
    import random
    unique_phone = f"91{random.randint(10000000, 99999999)}"
    # Register a new user
    reg_payload = {
        "phone_number": unique_phone,
        "full_name": "சுரேஷ் குமார்",
        "pin": "5678",
        "role": "borrower"
    }
    res = client.post("/api/auth/register", json=reg_payload)
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["phone_number"] == unique_phone
    assert data["full_name"] == "சுரேஷ் குமார்"

    # Duplicate registration should return 400
    res_dup = client.post("/api/auth/register", json=reg_payload)
    assert res_dup.status_code == 400
    assert "ஏற்கனவே பதிவு" in res_dup.json()["detail"] or "already registered" in res_dup.json()["detail"]

def test_auth_login_valid_and_invalid():
    # Valid login with pre-seeded user (Ram Kumar: 9876543210 / 1234)
    res_valid = client.post("/api/auth/login", json={"phone_number": "9876543210", "pin": "1234"})
    assert res_valid.status_code == 200
    data = res_valid.json()
    assert "access_token" in data
    assert data["phone_number"] == "9876543210"

    # Invalid PIN returns 401 Unauthorized
    res_wrong_pin = client.post("/api/auth/login", json={"phone_number": "9876543210", "pin": "0000"})
    assert res_wrong_pin.status_code == 401
    assert "தவறான பின்" in res_wrong_pin.json()["detail"] or "Invalid PIN" in res_wrong_pin.json()["detail"]

    # Non-existent phone returns 401 Unauthorized
    res_wrong_phone = client.post("/api/auth/login", json={"phone_number": "9000000001", "pin": "1234"})
    assert res_wrong_phone.status_code == 401

def test_tamil_extraction():
    # Direct Tamil transcript extraction
    transcript = "என் பெயர் விக்னேஷ், நான் மதுரை ஊரைச் சேர்ந்தவன். எனக்கு மளிகை கடை வியாபாரத்திற்காக 60,000 ரூபாய் கடன் தேவை. என் மாத வருமானம் 18,000 ரூபாய், என் ஆதார் கடைசி நான்கு எண்கள் 5544."
    res = client.post("/api/extract", json={"transcript": transcript, "language": "ta-IN"})
    assert res.status_code == 200
    extracted = res.json()["data"]
    name_cand = extracted["applicant_name"]["candidates"][0] if isinstance(extracted["applicant_name"], dict) else extracted["applicant_name"]
    vill_cand = extracted["village_or_address"]["candidates"][0] if isinstance(extracted["village_or_address"], dict) else extracted["village_or_address"]
    name_val = name_cand["regional"] if isinstance(name_cand, dict) else name_cand
    vill_val = vill_cand["regional"] if isinstance(vill_cand, dict) else vill_cand
    assert name_val == "விக்னேஷ்"
    assert vill_val == "மதுரை"
    assert extracted["loan_amount"] == 60000.0
    assert "மளிகை" in extracted["loan_purpose"]
    assert extracted["monthly_income"] == 18000.0
    assert extracted["aadhaar_last4"] == "5544"

def test_tamil_field_confirmation():
    # Confirm field with "ஆம் / சரி"
    payload_confirm = {
        "field_name": "applicant_name",
        "current_value": "விக்னேஷ்",
        "user_response": "ஆம், சரிங்க",
        "language": "ta-IN"
    }
    res = client.post("/api/confirm-field", json=payload_confirm)
    assert res.status_code == 200
    assert res.json()["confirmed"] is True

    # Correct field with "இல்லை, என் பெயர் கார்த்திக்"
    payload_correct = {
        "field_name": "applicant_name",
        "current_value": "விக்னேஷ்",
        "user_response": "இல்லை, என் பெயர் கார்த்திக்",
        "language": "ta-IN"
    }
    res_corr = client.post("/api/confirm-field", json=payload_correct)
    assert res_corr.status_code == 200
    assert res_corr.json()["confirmed"] is False
    assert "கார்த்திக்" in res_corr.json()["updated_value"]

if __name__ == "__main__":
    pytest.main(["-v", __file__])

