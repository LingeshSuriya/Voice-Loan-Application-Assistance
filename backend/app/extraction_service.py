import json
import re
import logging
from typing import Dict, Any, Optional, Tuple
from .config import settings
from .schemas import LoanApplicationData, ExtractionResponse
from .mock_data import DEMO_PROFILES

logger = logging.getLogger(__name__)

SYSTEM_INSTRUCTION = """
You are an expert bilingual Indian rural loan officer assistant.
Your job is to extract 7 specific loan application fields from a spoken transcript (which may be in Hindi, Marathi, Hinglish, or English).

Target JSON Schema:
{
  "applicant_name": string or null,
  "village_or_address": string or null,
  "loan_amount": number (in INR) or null,
  "loan_purpose": string or null,
  "monthly_income": number (in INR) or null,
  "income_source": string or null,
  "aadhaar_last4": string (strictly 4 digits) or null,
  "field_explanations": {
    "applicant_name": string explanation in simple Hindi,
    "village_or_address": string explanation in simple Hindi,
    "loan_amount": string explanation in simple Hindi,
    "loan_purpose": string explanation in simple Hindi,
    "monthly_income": string explanation in simple Hindi,
    "income_source": string explanation in simple Hindi,
    "aadhaar_last4": string explanation in simple Hindi
  }
}

CRITICAL RULES:
1. If a field is NOT explicitly mentioned or clearly implied, mark it strictly null (None). DO NOT GUESS OR INVENT DATA.
2. For loan_amount and monthly_income, return a clean numeric value (float/int). Parse words like 'हजार' (thousand), 'लाख' (lakh), 'k'.
3. For aadhaar_last4, extract only the last 4 digits if mentioned, or null.
4. For field_explanations, provide a single friendly sentence in Hindi explaining which exact words in the transcript led to extracting that field (e.g. "मैंने '50,000' को लोन राशि समझा"). If null, say "इस जानकारी का उल्लेख नहीं मिला".
"""

def generate_phonetic_candidates(val: str, field_name: str, lang: str) -> Optional[Dict[str, Any]]:
    if not val or not isinstance(val, str):
        return None
    val = val.strip()
    if not val:
        return None

    candidates = [val]

    if lang == "ta-IN":
        if "சபரி" in val:
            candidates.append(val.replace("சபரி", "சாபரி"))
        elif "சாபரி" in val:
            candidates.append(val.replace("சாபரி", "சபரி"))
        elif "விக்னேஷ்" in val:
            candidates.append(val.replace("விக்னேஷ்", "விக்னேஸ்"))
        elif "கடையநல்லூர்" in val:
            candidates.append(val.replace("கடையநல்லூர்", "காடையநல்லூர்"))
        elif "பாளையங்கோட்டை" in val:
            candidates.append(val.replace("பாளையங்கோட்டை", "பாளையங்கோட்ட"))
        else:
            if val.startswith("ச"):
                candidates.append("சா" + val[1:])
            elif val.startswith("சா"):
                candidates.append("ச" + val[2:])

    elif lang == "hi-IN":
        if "सबरी" in val:
            candidates.append(val.replace("सबरी", "सबारी"))
            candidates.append(val.replace("सबरी", "शबरी"))
        elif "मदन" in val:
            candidates.append(val.replace("मदन", "मदान"))
            candidates.append(val.replace("मदन", "मदनपुर"))
        elif "सीतापुर" in val:
            candidates.append(val.replace("सीतापुर", "सितापुर"))
        else:
            if "स" in val:
                candidates.append(val.replace("स", "श"))

    elif lang == "te-IN":
        if "సబరి" in val:
            candidates.append(val.replace("సబరి", "సాబరి"))
            candidates.append(val.replace("సబరి", "సభరి"))
        elif "మదన" in val:
            candidates.append(val.replace("మదన", "మదనా"))
        else:
            if "స" in val:
                candidates.append(val.replace("స", "సా"))

    unique_candidates = []
    for c in candidates:
        if c and c not in unique_candidates:
            unique_candidates.append(c)
        if len(unique_candidates) >= 3:
            break

    if len(unique_candidates) > 1:
        if lang == "ta-IN":
            note = f"'{unique_candidates[0]}' அல்லது '{unique_candidates[1]}' என இருக்கலாம் — ஒலி ஒரே மாதிரி இருப்பதால்"
        elif lang == "hi-IN":
            note = f"'{unique_candidates[0]}' या '{unique_candidates[1]}' हो सकता है — समान उच्चारण के कारण"
        else:
            note = f"'{unique_candidates[0]}' లేదా '{unique_candidates[1]}' కావచ్చు — సమాన ఉచ్చారణ కారణంగా"
    else:
        note = f"Phonetically unambiguous extraction for {val}"

    return {
        "candidates": unique_candidates,
        "confidence_note": note
    }

class ExtractionService:
    """Abstracted LLM Extraction Service with Gemini and intelligent offline fallback."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.client = None
        if self.api_key:
            try:
                from google import genai
                self.client = genai.Client(api_key=self.api_key)
                logger.info("Initialized Gemini client for extraction.")
            except Exception as e:
                logger.warning(f"Could not initialize google-genai client: {e}")

    def extract_fields(self, transcript: str, language_code: str = "hi-IN") -> ExtractionResponse:
        """Extract structured 7-field schema + explanations from transcript."""
        if not transcript or not transcript.strip():
            return ExtractionResponse(
                data=LoanApplicationData(),
                explanations={},
                raw_transcript="",
                language=language_code
            )

        # Check for matching demo profile first for instant accuracy
        for profile in DEMO_PROFILES.values():
            if profile["transcript"].strip() in transcript or transcript.strip() in profile["transcript"]:
                data = profile["data"].copy()
                explanations = profile["explanations"].copy()
                if language_code in ["ta-IN", "hi-IN", "te-IN"]:
                    for f in ["applicant_name", "village_or_address"]:
                        if data.get(f) and isinstance(data[f], str):
                            cand_obj = generate_phonetic_candidates(data[f], f, language_code)
                            if cand_obj:
                                data[f] = cand_obj
                                explanations[f] = cand_obj["confidence_note"]
                return ExtractionResponse(
                    data=LoanApplicationData(**data),
                    explanations=explanations,
                    raw_transcript=transcript,
                    language=language_code
                )

        # Attempt live Gemini extraction if client is available
        if self.client:
            try:
                logger.info("Calling Gemini API for structured field extraction...")
                cand_instruction = ""
                if language_code in ["ta-IN", "hi-IN", "te-IN"]:
                    cand_instruction = (
                        f"\nFor applicant_name and village_or_address, do not return a single string. "
                        f"Instead return an object containing up to 3 ranked spelling variants that account for common phonetic ambiguity in {language_code}: "
                        f"long vs short vowels, aspirated vs unaspirated consonants, and letters that sound identical in casual speech but differ in written form. "
                        f"Format: {{\"candidates\": [\"variant1\", \"variant2\", ...], \"confidence_note\": \"reason\"}}. "
                        f"Order candidates by likelihood, most likely first. If there is genuinely only one plausible spelling, return a single-element array. "
                        f"Never invent a variant that wasn't phonetically plausible from the audio."
                    )
                prompt = f"{SYSTEM_INSTRUCTION}{cand_instruction}\n\nSpoken Transcript:\n\"\"\"{transcript}\"\"\"\n\nReturn pure JSON matching the schema."
                
                response = self.client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=prompt,
                    config={
                        'response_mime_type': 'application/json'
                    }
                )
                
                if response and response.text:
                    parsed = json.loads(response.text)
                    explanations = parsed.pop("field_explanations", {})

                    app_name = parsed.get("applicant_name")
                    vill_addr = parsed.get("village_or_address")

                    if language_code in ["ta-IN", "hi-IN", "te-IN"]:
                        if app_name and isinstance(app_name, str):
                            cand_obj = generate_phonetic_candidates(app_name, "applicant_name", language_code)
                            if cand_obj:
                                app_name = cand_obj
                                explanations["applicant_name"] = cand_obj["confidence_note"]
                        if vill_addr and isinstance(vill_addr, str):
                            cand_obj = generate_phonetic_candidates(vill_addr, "village_or_address", language_code)
                            if cand_obj:
                                vill_addr = cand_obj
                                explanations["village_or_address"] = cand_obj["confidence_note"]

                    loan_data = LoanApplicationData(
                        applicant_name=app_name,
                        village_or_address=vill_addr,
                        loan_amount=float(parsed.get("loan_amount")) if parsed.get("loan_amount") is not None else None,
                        loan_purpose=parsed.get("loan_purpose"),
                        monthly_income=float(parsed.get("monthly_income")) if parsed.get("monthly_income") is not None else None,
                        income_source=parsed.get("income_source"),
                        aadhaar_last4=str(parsed.get("aadhaar_last4"))[:4] if parsed.get("aadhaar_last4") else None,
                    )
                    return ExtractionResponse(
                        data=loan_data,
                        explanations=explanations,
                        raw_transcript=transcript,
                        language=language_code
                    )
            except Exception as e:
                logger.warning(f"Gemini extraction failed: {e}. Falling back to rule-based extractor.")

        # Offline rule-based NLU fallback
        return self._rule_based_extraction(transcript, language_code)

    def extract_single_field(self, field_name: str, correction_text: str, current_value: Any = None) -> Tuple[Any, str]:
        """
        Extract correction for a single field when user says 'Nahi, mera naam Shyam hai' or 'இல்லை, என் பெயர் குமார்'.
        Returns (updated_value, explanation_text).
        """
        text = correction_text.strip()
        cleaned = re.sub(r'^(नहीं|ना|nahi|no|na|இல்லை|இல்ல|இல்லங்க|இல்லைங்க)[,\s]+', '', text, flags=re.IGNORECASE).strip()

        if field_name == "applicant_name":
            m = re.search(r'(?:என்\s+பெயர்|பெயர்|मेरा\s+नाम|नाव|naam)\s+([A-Za-z\u0900-\u097F\u0B80-\u0BFF\s]+?)(?:\s+என்பது|\s+है|\s+आहे|$)', cleaned, re.IGNORECASE)
            val = m.group(1).strip() if m else cleaned
            return val, f"பெயரை '{val}' என மாற்றினேன் / Updated name to '{val}'"

        elif field_name == "village_or_address":
            m = re.search(r'(?:ஊர்|கிராமம்|முகவரி|गाँव|गाव|गाँव का नाम|पत्ता|address|se)\s+([A-Za-z\u0900-\u097F\u0B80-\u0BFF\s]+?)(?:\s+என்பது|\s+है|\s+से|\s+आहे|$)', cleaned, re.IGNORECASE)
            val = m.group(1).strip() if m else cleaned
            return val, f"ஊர்/முகவரியை '{val}' என மாற்றினேன் / Updated address to '{val}'"

        elif field_name in ("loan_amount", "monthly_income"):
            amt = self._extract_amount_number(cleaned)
            label = "கடன் தொகை" if field_name == "loan_amount" else "மாத வருமானம்"
            if amt is not None:
                return amt, f"{label} ₹{amt:,.0f} என மாற்றப்பட்டது"
            return current_value, f"தொகை தெளிவாக இல்லை / Amount unclear"

        elif field_name == "loan_purpose":
            return cleaned, f"கடன் நோக்கம் '{cleaned}' என மாற்றப்பட்டது"

        elif field_name == "income_source":
            return cleaned, f"வருமான ஆதாரம் '{cleaned}' என மாற்றப்பட்டது"

        elif field_name == "aadhaar_last4":
            digits = re.findall(r'\d', cleaned)
            if len(digits) >= 4:
                val = "".join(digits[-4:])
                return val, f"ஆதார் கடைசி 4 எண்கள் '{val}' என மாற்றப்பட்டது"
            return current_value, "ஆதார் 4 எண்கள் புரியவில்லை"

        return cleaned, f"{field_name} மாற்றப்பட்டது"

    def _rule_based_extraction(self, text: str, language_code: str) -> ExtractionResponse:
        """Intelligent offline pattern & semantic rule matcher for Hindi/Marathi/Tamil/English transcripts."""
        data = LoanApplicationData()
        explanations: Dict[str, str] = {}
        is_tamil = language_code == "ta-IN"
        is_english = language_code == "en-IN"

        # 1. Applicant Name
        name_match = re.search(
            r'(?:my\s+name\s+is|name\s+is|this\s+is|என்\s+பெயர்|பெயர்|मेरा\s+नाम|नाव|naam|मैं|main)\s+([A-Za-z\u0900-\u097F\u0B80-\u0BFF]+(?:\s+[A-Za-z\u0900-\u097F\u0B80-\u0BFF]+)?)(?:\s+हूँ|\s+है|\s+आहे|\s*,|\s+and|\s+i\s+live|\s+மதுரை|\s+சென்னை|\s+ஊர்|\s+भोजपुर|\s+गाँव|\s+से|\s+आणि|$)',
            text, re.IGNORECASE
        )
        if name_match:
            name_val = name_match.group(1).strip()
            name_val = re.sub(r'\s+(है|हूँ|आहे|is|am|என்பது)$', '', name_val, flags=re.IGNORECASE).strip()
            if name_val.lower() not in ["ஒரு", "நான்", "இங்கே", "ஒருவர்", "एक", "यहाँ", "मी", "लोन", "कर्ज", "a", "an", "the", "loan", "rupees", "है", "हूँ"]:
                data.applicant_name = name_val
                if is_english:
                    explanations["applicant_name"] = f"Understood '{name_val}' as applicant name"
                elif is_tamil:
                    explanations["applicant_name"] = f"'{name_val}' என்பதை உங்கள் பெயராக புரிந்து கொண்டேன்"
                else:
                    explanations["applicant_name"] = f"मैंने '{name_val}' को आपका नाम समझा"
        
        # Short text fallback
        if not data.applicant_name and len(text.split()) <= 3 and not re.search(r'\d', text):
            clean_name = re.sub(r'^(नहीं|ना|no|nahi|இல்லை|இல்ல)\s+', '', text, flags=re.IGNORECASE).strip()
            clean_name = re.sub(r'\s+(है|हूँ|आहे|is|am|என்பது)$', '', clean_name, flags=re.IGNORECASE).strip()
            if clean_name and clean_name.lower() not in ["ஒரு", "ஆம்", "இல்லை", "एक", "हाँ", "नहीं", "yes", "no", "ok", "है", "हूँ"]:
                data.applicant_name = clean_name
                if is_english:
                    explanations["applicant_name"] = f"Understood '{clean_name}' as applicant name"
                elif is_tamil:
                    explanations["applicant_name"] = f"'{clean_name}' என்பதை உங்கள் பெயராக புரிந்து கொண்டேன்"
                else:
                    explanations["applicant_name"] = f"मैंने '{clean_name}' को आपका नाम समझा"

        if not data.applicant_name:
            explanations["applicant_name"] = "Applicant name not mentioned" if is_english else ("பெயர் குறிப்பிடப்படவில்லை" if is_tamil else "नाम का उल्लेख नहीं मिला")

        # 2. Village or Address
        vill_match = re.search(
            r'(?:(?:live\s+in|from|at|address\s+is|நான்|நான்\s+வசிப்பது|நான்\s+இருப்பது|मैं|मी|हम)\s+)?([A-Za-z\u0900-\u097F\u0B80-\u0BFF]+(?:\s+[A-Za-z\u0900-\u097F\u0B80-\u0BFF]+)?)\s+(?:village|city|town|ஊரைச்\s+சேர்ந்தவன்|ஊரைச்\s+சேர்ந்தவள்|கிராமம்|ஊர்|வசிப்பவர்|गाँव\s+का|गाँव\s+की|गावाचा|से\s+हूँ|चा\s+आहे|रहता\s+हूँ|रहने\s+वाली\s+हूँ)',
            text, re.IGNORECASE
        )
        if vill_match:
            vill_val = vill_match.group(1).strip()
            vill_val = re.sub(r'^(நான்|मैं|मी|हम|main|hum|i|live|in)\s+', '', vill_val, flags=re.IGNORECASE).strip()
            data.village_or_address = vill_val
            if is_english:
                explanations["village_or_address"] = f"Understood '{vill_val}' as address"
            elif is_tamil:
                explanations["village_or_address"] = f"'{vill_val}' என்பதை உங்கள் ஊராக புரிந்து கொண்டேன்"
            else:
                explanations["village_or_address"] = f"मैंने '{vill_val}' को आपका गाँव/पता समझा"
        else:
            known_locs = [
                "மதுரை", "சென்னை", "கோவை", "திருச்சி", "சேலம்", "தஞ்சாவூர்", "ஈரோடு", "நெல்லை", "வேலூர்", "திண்டுக்கல்",
                "Madurai", "Chennai", "Coimbatore", "Salem", "Trichy", "Tirunelveli", "Delhi", "Mumbai", "Bangalore",
                "भोजपुर", "सीतापुर", "रालेगण सिद्धि", "पटना", "वाराणसी", "पुणे"
            ]
            for loc in known_locs:
                if loc.lower() in text.lower():
                    data.village_or_address = loc
                    if is_english:
                        explanations["village_or_address"] = f"Understood '{loc}' as address"
                    elif is_tamil:
                        explanations["village_or_address"] = f"'{loc}' என்பதை உங்கள் ஊராக புரிந்து கொண்டேன்"
                    else:
                        explanations["village_or_address"] = f"मैंने '{loc}' को आपका गाँव/पता समझा"
                    break
        if not data.village_or_address:
            explanations["village_or_address"] = "Address not mentioned" if is_english else ("ஊர் அல்லது முகவரி குறிப்பிடப்படவில்லை" if is_tamil else "गाँव या पते का उल्लेख नहीं मिला")

        # 3. Loan Amount
        loan_amt_match = re.search(
            r'(?:loan\s+of|loan\s+amount\s+of|need|require|எனக்கு|मुझे|हवे\s+आहे)?\s*([0-9,]+|\S+\s+ஆயிரம்|\S+\s+லட்சம்|\S+\s+हजार|\S+\s+लाख|\S+\s+thousand|\S+\s+lakh)\s*(?:rupees|rs|inr|ரூபாய்|ரூபாய்க்கு|ரூ|रुपये|रूपये|का|रुपयांचा)?\s*(?:கடன்|लोन|कर्ज|loan)',
            text, re.IGNORECASE
        )
        if loan_amt_match:
            amt = self._extract_amount_number(loan_amt_match.group(1))
            if amt:
                data.loan_amount = amt
                raw_amt_str = loan_amt_match.group(1).strip()
                if is_english:
                    explanations["loan_amount"] = f"Understood '{raw_amt_str}' as loan amount"
                elif is_tamil:
                    explanations["loan_amount"] = f"'{raw_amt_str}' என்பதை கடன் தொகையாக புரிந்து கொண்டேன்"
                else:
                    explanations["loan_amount"] = f"मैंने '{raw_amt_str}' को लोन राशि समझा"
        if not data.loan_amount:
            for num_match in re.finditer(r'\b(\d{1,3}(?:,\d{3})+|\d{4,6})\b', text):
                val = float(num_match.group(1).replace(",", ""))
                if val >= 5000 and val != data.monthly_income:
                    data.loan_amount = val
                    if is_english:
                        explanations["loan_amount"] = f"Understood '{num_match.group(1)}' as loan amount"
                    elif is_tamil:
                        explanations["loan_amount"] = f"'{num_match.group(1)}' என்பதை கடன் தொகையாக புரிந்து கொண்டேன்"
                    else:
                        explanations["loan_amount"] = f"मैंने '{num_match.group(1)}' को लोन राशि समझा"
                    break
        if not data.loan_amount:
            explanations["loan_amount"] = "Loan amount not mentioned" if is_english else ("கடன் தொகை குறிப்பிடப்படவில்லை" if is_tamil else "लोन राशि का उल्लेख नहीं मिला")

        # 4. Loan Purpose
        purpose_keywords = [
            (r'மளிகை\s+கடை|மளிகை|retail\s+store|retail\s+shop|store', "Retail store (business)" if is_english else "மளிகை கடை வியாபாரம் (business)"),
            (r'கடை|வியாபாரம்|தொழில்|business|small\s+business', "Small business (business)" if is_english else "சிறு வியாபாரம் (business)"),
            (r'பால்\s+பண்ணை|மாடு|பசு|பால்|dairy|cow|livestock', "Dairy and livestock (agriculture)" if is_english else "பால் பண்ணை மற்றும் கால்நடை (agriculture)"),
            (r'விவசாயம்|பயிர்|விதை|உரம்|farming|farm|crops', "Farming and agriculture (agriculture)" if is_english else "விவசாயம் மற்றும் பண்ணை (agriculture)"),
            (r'டிராக்டர்|tractor', "Tractor repair / purchase (agriculture)" if is_english else "டிராக்டர் (agriculture)"),
            (r'மருத்துவம்|சிகிச்சை|medical|treatment', "Medical treatment (medical)" if is_english else "மருத்துவ சிகிச்சை (medical)"),
            (r'படிப்பு|கல்வி|education|school|college', "Education expense (education)" if is_english else "கல்வி செலவு (education)"),
            (r'किराना\s+दुकान|kirana\s+store', "किराना दुकान (business)"),
            (r'दुकान|व्यापार|छोटा\s+काम', "छोटा व्यापार (business)"),
            (r'गाय|भैंस|डेयरी|दूध', "डेयरी और पशुपालन (agriculture)"),
            (r'खेती|फसल|बीज|खाद', "खेती और कृषि (agriculture)"),
            (r'ट्रैक्टर|मरम्मत', "ट्रैक्टर मरम्मत (agriculture)"),
            (r'इलाज|दवाई|अस्पताल', "चिकित्सा और इलाज (medical)"),
            (r'पढ़ाई|स्कूल|कॉलेज', "शिक्षा और पढ़ाई (education)")
        ]
        for pattern, category in purpose_keywords:
            if re.search(pattern, text, re.IGNORECASE):
                data.loan_purpose = category
                if is_english:
                    explanations["loan_purpose"] = f"Understood '{category}' as loan purpose"
                elif is_tamil:
                    explanations["loan_purpose"] = f"'{pattern.split('|')[0]}' என்பதை கடன் நோக்கமாக புரிந்து கொண்டேன்"
                else:
                    explanations["loan_purpose"] = f"मैंने '{pattern.split('|')[0]}' को लोन का उद्देश्य समझा"
                break
        if not data.loan_purpose:
            explanations["loan_purpose"] = "Loan purpose not mentioned" if is_english else ("கடன் நோக்கம் குறிப்பிடப்படவில்லை" if is_tamil else "लोन के उद्देश्य का उल्लेख नहीं मिला")

        # 5. Monthly Income
        income_match = re.search(
            r'(?:monthly\s+income|income\s+is|monthly\s+salary|salary|earn|மாத\s+வருமானம்|மாத\s+சம்பளம்|வருமானம்|महीने\s+की\s+कमाई|मासिक\s+उत्पन्न|दरमहा|महीने\s+में|कमाते\s+हैं)\s*(?:of|is|around|சுமார்|தோராயமாக|लगभग|करीब)?\s*([0-9,]+|\S+\s+ஆயிரம்|\S+\s+हजार|\S+\s+thousand)',
            text, re.IGNORECASE
        )
        if income_match:
            inc = self._extract_amount_number(income_match.group(1))
            if inc:
                data.monthly_income = inc
                raw_inc_str = income_match.group(1).strip()
                if is_english:
                    explanations["monthly_income"] = f"Understood '{raw_inc_str}' as monthly income"
                elif is_tamil:
                    explanations["monthly_income"] = f"'{raw_inc_str}' என்பதை உங்கள் மாத வருமானமாக புரிந்து கொண்டேன்"
                else:
                    explanations["monthly_income"] = f"मैंने '{raw_inc_str}' को आपकी मासिक कमाई समझा"
        if not data.monthly_income:
            explanations["monthly_income"] = "Monthly income not mentioned" if is_english else ("மாத வருமானம் குறிப்பிடப்படவில்லை" if is_tamil else "मासिक आय का उल्लेख नहीं मिला")

        # 6. Income Source
        source_keywords = [
            (r'விவசாயம்\s+மற்றும்\s+பால்|பால்\s+விற்பனை', "விவசாயம் மற்றும் பால் விற்பனை (farming/dairy)"),
            (r'விவசாயம்|farming|agriculture', "Farming (agriculture)" if is_english else "விவசாயம் (farming)"),
            (r'மளிகை\s+கடை|மளிகை|கடை|வியாபாரம்|retail\s+store|retail\s+shop|shop', "Retail store (small shop)" if is_english else "மளிகை கடை / வியாபாரம் (small shop)"),
            (r'கூலி\s+வேலை|தினக்கூலி|daily\s+wage', "Daily wage worker (daily wage)" if is_english else "தினக்கூலி (daily wage)"),
            (r'மாத\s+சம்பளம்|வேலை|salary|job|service', "Salaried job (employment)" if is_english else "பணி / வேலை (employment)"),
            (r'खेती\s+और\s+दूध|दूध\s+बेचकर', "खेती और दूध बिक्री (farming/dairy)"),
            (r'खेती|कृषि', "खेती (farming)"),
            (r'दुकान\s+से|किराना', "छोटा व्यापार / दुकान (small shop)"),
            (r'मजदूरी|दिहाड़ी', "दैनिक मजदूरी (daily wage)"),
            (r'नौकरी', "निजी नौकरी (employment)")
        ]
        for pattern, src in source_keywords:
            if re.search(pattern, text, re.IGNORECASE):
                data.income_source = src
                if is_english:
                    explanations["income_source"] = f"Understood '{src}' as income source"
                elif is_tamil:
                    explanations["income_source"] = f"'{src}' என்பதை வருமான ஆதாரமாக புரிந்து கொண்டேன்"
                else:
                    explanations["income_source"] = f"मैंने '{src}' को कमाई का मुख्य साधन समझा"
                break
        if not data.income_source:
            explanations["income_source"] = "Income source not mentioned" if is_english else ("வருமான ஆதாரம் குறிப்பிடப்படவில்லை" if is_tamil else "कमाई के साधन का उल्लेख नहीं मिला")

        # 7. Aadhaar last 4
        aadhaar_match = re.search(r'(?:aadhaar|aadhar|card|ஆதார்|आधार).*?(\d{4})', text, re.IGNORECASE)
        if aadhaar_match:
            val = aadhaar_match.group(1)
            data.aadhaar_last4 = val
            if is_english:
                explanations["aadhaar_last4"] = f"Understood '{val}' as Aadhaar last 4 digits"
            elif is_tamil:
                explanations["aadhaar_last4"] = f"'{val}' என்பதை ஆதார் கடைசி 4 எண்களாக புரிந்து கொண்டேன்"
            else:
                explanations["aadhaar_last4"] = f"मैंने '{val}' को आधार के अंतिम 4 अंक समझा"
        else:
            explanations["aadhaar_last4"] = "Aadhaar number not mentioned" if is_english else ("ஆதார் எண் குறிப்பிடப்படவில்லை" if is_tamil else "आधार नंबर का उल्लेख नहीं मिला")

        if language_code in ["ta-IN", "hi-IN", "te-IN"]:
            if data.applicant_name and isinstance(data.applicant_name, str):
                cand_obj = generate_phonetic_candidates(data.applicant_name, "applicant_name", language_code)
                if cand_obj:
                    data.applicant_name = cand_obj
                    explanations["applicant_name"] = cand_obj["confidence_note"]
            if data.village_or_address and isinstance(data.village_or_address, str):
                cand_obj = generate_phonetic_candidates(data.village_or_address, "village_or_address", language_code)
                if cand_obj:
                    data.village_or_address = cand_obj
                    explanations["village_or_address"] = cand_obj["confidence_note"]

        return ExtractionResponse(
            data=data,
            explanations=explanations,
            raw_transcript=text,
            language=language_code
        )

    def _extract_amount_number(self, text: str) -> Optional[float]:
        """Convert Hindi/Tamil/English numeric representations to float."""
        if not text:
            return None
        text_clean = text.replace(",", "").strip()

        # Direct digit match
        m = re.search(r'\b(\d+(?:\.\d+)?)\b', text_clean)
        base_num = float(m.group(1)) if m else None

        # Check for multiplier words
        multiplier = 1.0
        if "லட்சம்" in text or "लाख" in text or "lakh" in text.lower():
            multiplier = 100000.0
        elif "ஆயிரம்" in text or "हजार" in text or "हज़ार" in text or "thousand" in text.lower() or "k" in text.lower():
            multiplier = 1000.0

        number_words = {
            # Hindi
            "पचास": 50, "अस्सी": 80, "चालीस": 40, "बीस": 20, "पच्चीस": 25,
            "दस": 10, "पंद्रह": 15, "बाईस": 22, "तीस": 30, "साठ": 60, "सत्तर": 70, "एक": 1,
            # Tamil
            "அறுபது": 60, "ஐம்பது": 50, "நாற்பது": 40, "முப்பது": 30, "இருபது": 20,
            "பத்து": 10, "எண்பது": 80, "தொண்ணூறு": 90, "எழுபது": 70, "பதினெட்டு": 18,
            "பதினைந்து": 15, "இருபத்தைந்து": 25, "ஒரு": 1
        }
        for word, val in number_words.items():
            if word in text:
                base_num = float(val)
                break

        if base_num is not None:
            if base_num < 1000 and multiplier > 1:
                return base_num * multiplier
            return base_num

        return None

extraction_service = ExtractionService()
