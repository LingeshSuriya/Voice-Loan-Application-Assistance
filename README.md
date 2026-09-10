# आवाज़ लोन साथी (Voice Loan Assistant)
### Voice-Only Loan Application Assistant for Rural India (Hackathon MVP)

A voice-first, icon-heavy Progressive Web App (PWA) tailored for non-literate and low-literacy rural borrowers. Users speak naturally in **Hindi** or **Marathi** (including code-mixed Hinglish) to complete a loan application, with each extracted field confirmed back to them via **interactive Text-to-Speech (TTS)** before mock submission.

---

## 🌟 Key Features & Hackathon Differentiators

1. **Interactive Field-by-Field Confirmation Loop (Core Differentiator)**:
   - For each extracted field, the assistant plays back: *"आपने कहा आपका नाम राम कुमार है, क्या यह सही है?"*
   - Explains its extraction reasoning: *"मैंने '50,000' को लोन राशि समझा"*.
   - User confirms with **"हाँ" / Green Checkmark** or rejects with **"नहीं" / Red Cross**.
   - On rejection or missing/null fields, the assistant actively prompts the user via voice and re-extracts the single correction.
2. **Rural-First, Low-Literacy UI**:
   - Giant touch targets (150px microphone, 110px Yes/No buttons).
   - Real-time animated audio waveform visualizer so users know the mic is active.
   - Minimal text, icon-driven interface operable entirely by listening + 1-tap.
3. **Resilient Dual-Mode Architecture (Offline / Live API)**:
   - Live integration with **Sarvam AI** (Indian language STT & TTS) and **Google Gemini** (structured JSON extraction).
   - Seamless offline fallback: browser Web Speech synthesis + intelligent rule-based Indian NLU parser. Zero crashes if internet is slow or API keys are missing.
   - **1-Click Judge Demo Presets** built into the top bar for instant testing.
4. **Mock Backend & PWA**:
   - Built with **FastAPI** + **SQLite (SQLAlchemy)** storing submissions with status `"pending verification"`.
   - Installable PWA with Service Worker and Web Manifest.

---

## 🏗️ Architecture & Tech Stack

```
+-------------------------------------------------------------+
|                React + Vite PWA (Frontend)                  |
|  - Web Audio API Recording & Dynamic Waveform               |
|  - Field-by-Field Voice Confirmation Loop                   |
|  - Web Speech API + Sarvam Base64 Audio Player              |
+------------------------------+------------------------------+
                               | HTTP JSON / Multipart Audio
                               v
+-------------------------------------------------------------+
|                     FastAPI Backend                         |
|  - /api/process-voice  (1-shot Audio -> STT -> Extraction)  |
|  - /api/confirm-field  (Single field voice update)          |
|  - /api/tts            (Text-to-speech synthesis)           |
|  - /api/submit         (SQLite store + Voice receipt)       |
+---------------+------------------------------+--------------+
                |                              |
                v                              v
+-------------------------------+ +---------------------------+
|       speech_service.py       | |   extraction_service.py   |
| - Sarvam AI STT & TTS         | | - Google Gemini API       |
| - Fallback Chime/Browser Sync | | - Intelligent Hindi NLU   |
+-------------------------------+ +---------------------------+
                                               |
                                               v
                                  +---------------------------+
                                  |    SQLite Database        |
                                  | Table: applications       |
                                  | Status: pending verif.    |
                                  +---------------------------+
```

---

## 🚀 Quick Setup & Running

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 1. Backend Setup

```bash
cd backend

# Create & activate virtual environment (if not already created)
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
# source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# (Optional) Configure API keys in .env
copy .env.example .env
# Open .env and add SARVAM_API_KEY or GEMINI_API_KEY if available.
# (If omitted, the app automatically runs in offline/mock mode!)

# Run automated tests
pytest -v test_api.py

# Start FastAPI server
uvicorn app.main:app --reload --port 8000
```

Backend will be available at: `http://localhost:8000` (API Docs: `http://localhost:8000/docs`).

### 2. Frontend Setup

In a separate terminal:

```bash
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```

Open your browser at: `http://localhost:5173`.

---

## 🎙️ Live Demo Presentation Script

Follow these steps during your live demo to showcase all core requirements:

### Step 1: Landing & Consent
1. Open the app on desktop or mobile browser.
2. Notice the automatic spoken consent:
   > *"नमस्ते! मैं आपका लोन आवेदन बोलकर भरने में मदद करूँगा। क्या हम शुरू करें?"*
3. Tap **हाँ, शुरू करें** (Yes, Start).

### Step 2: Live Voice Intake (or 1-Click Preset)
- **Option A (Live Voice)**: Tap the glowing blue microphone and speak:
  > *"मेरा नाम राम कुमार है, मैं भोजपुर से हूँ। मुझे अपनी किराना दुकान के लिए 50,000 रुपये का लोन चाहिए। मेरी महीने की कमाई 15,000 रुपये है दुकान से, और मेरा आधार नंबर 4321 है।"*
  Tap **हो गया (Done)** to stop recording.
- **Option B (Instant Judge Preset)**: Tap the **राम कुमार (50,000)** button in the top bar.

### Step 3: Field-by-Field Confirmation Loop (Key Differentiator!)
1. **Field 1: Name (`applicant_name`)**
   - The assistant asks: *"आपने कहा आपका नाम राम कुमार है, क्या यह सही है?"*
   - Explains: *"मैंने 'राम कुमार' को आपका नाम समझा"*.
   - Tap **हाँ, सही है** (Green Checkmark).
2. **Field 3: Loan Amount (`loan_amount`) — Testing Voice Correction!**
   - Assistant asks: *"आपने लोन राशि 50,000 रुपये बताई है, क्या यह सही है?"*
   - Tap **नहीं, गलत है** (Red Cross).
   - Mic opens for correction. Speak: *"नहीं, अस्सी हज़ार चाहिए"* (or type `80000`).
   - The assistant updates the amount to **₹80,000** and re-prompts!
3. **Missing Field Scenario (Active Voice Prompting)**:
   - Click the **मनोज यादव (अधूरा आवेदन)** preset from the top bar.
   - When the assistant arrives at **मासिक कमाई (Monthly Income)**, it detects that the field was missing and actively asks:
     > *"कृपया बताएं, आपकी हर महीने की कमाई लगभग कितनी है?"*
   - Tap **बोलकर बताएं** to provide the missing value!

### Step 4: Final Summary & Voice Submission
1. Once all 7 fields are confirmed, the full application card is displayed.
2. Tap **पूरा आवेदन बोलकर सुनें** to hear the consolidated application.
3. Tap **आवेदन जमा करें (Submit Application)**.
4. The assistant speaks the closing voice receipt:
   > *"बधाई हो! आपका लोन आवेदन सफलतापूर्वक जमा हो गया है। आपका संदर्भ नंबर LN-2026-XXXX है। वर्तमान स्थिति: सत्यापन के लिए लंबित है।"*
5. Notice the clear status badge: **Pending Verification** (explicitly not approved) and the downstream KYC disclaimer:
   > *"Identity verification happens downstream via the lender's existing KYC pipeline before any disbursal."*

## 🔐 Authentication (Rural-Friendly Phone OTP)

The application includes a specialized authentication layer for rural borrowers and Field Agents:
- **Zero Complex Passwords**: Log in with any 10-digit mobile number + 4-digit OTP.
- **Voice OTP Readout**: The assistant reads the OTP aloud (*"आपका ओटीपी 1 2 3 4 है"*).
- **1-Click Demo Login**: Tap **"1-क्लिक डेमो लॉगिन"** to instantly authenticate as an Agent with test phone `9999999999` and OTP `1234`.
- **Linked Records**: All submitted loan applications are tagged with the borrower's authenticated phone number in SQLite.

---

## 🧪 Comprehensive Test Inputs Library

Copy and paste or speak these exact phrases to test various edge cases:

### Profile 1: Custom Name & General Store (Pure Hindi)
- **Spoken Input**:
  > *"मेरा नाम विग्नेश शर्मा है, मैं पुणे से हूँ। मुझे अपनी परचून की दुकान के लिए 60,000 रुपये का लोन चाहिए। मेरी हर महीने की कमाई 18,000 रुपये है और आधार का आखिरी चार अंक 5544 है।"*
- **Expected Extraction**:
  - `applicant_name`: "विग्नेश शर्मा"
  - `village_or_address`: "पुणे"
  - `loan_amount`: 60000.0
  - `loan_purpose`: "छोटा व्यापार (business)"
  - `monthly_income`: 18000.0
  - `income_source`: "दुकान"
  - `aadhaar_last4`: "5544"

### Profile 2: Dairy & Buffalo Loan (Rural Hindi)
- **Spoken Input**:
  > *"मेरा नाम राजकुमार है, मैं सीतापुर गाँव से हूँ। मुझे दो नई भैंस खरीदने के लिए 75,000 रुपये का कर्ज चाहिए। हम दूध बेचकर और खेती से महीने में 25,000 रुपये कमाते हैं, आधार नंबर 8821 है।"*
- **Expected Extraction**:
  - `applicant_name`: "राजकुमार"
  - `village_or_address`: "सीतापुर"
  - `loan_amount`: 75000.0
  - `loan_purpose`: "डेयरी और पशुपालन (agriculture)"
  - `monthly_income`: 25000.0
  - `income_source`: "खेती और दूध बिक्री (farming/dairy)"
  - `aadhaar_last4`: "8821"

### Profile 3: Code-Mixed Hinglish (Youth Entrepreneur)
- **Spoken Input**:
  > *"Mera naam Amit Verma hai, main Lucknow se hoon. Mujhe medical shop start karne ke liye 1 lakh ka loan chahiye. Monthly income around 20,000 hai, Aadhaar last four digits 9012."*
- **Expected Extraction**:
  - `applicant_name`: "Amit Verma"
  - `village_or_address`: "Lucknow"
  - `loan_amount`: 100000.0
  - `loan_purpose`: "चिकित्सा और इलाज (medical)"
  - `monthly_income`: 20000.0
  - `aadhaar_last4`: "9012"

### Profile 4: Regional Language (Marathi)
- **Select Language**: `मराठी (Marathi)`
- **Spoken Input**:
  > *"माझे नाव विठ्ठल जाधव आहे, मी बारामती गावात राहतो. मला शेतीसाठी ठिबक सिंचन लावायला 50,000 रुपयांचे कर्ज हवे आहे. दरमहा उत्पन्न 16,000 रुपये आहे आणि आधार 3311 आहे."*
- **Expected Extraction**:
  - `applicant_name`: "विठ्ठल जाधव"
  - `village_or_address`: "बारामती"
  - `loan_amount`: 50000.0
  - `loan_purpose`: "शेती (agriculture)"
  - `monthly_income`: 16000.0
  - `aadhaar_last4`: "3311"

### Profile 5: Testing Voice Correction (Saying "नहीं")
1. During confirmation, on the **Name** or **Amount** card, tap **"नहीं, गलत है"** (Red Cross).
2. The mic opens for correction. Speak any of:
   - *"नहीं, मेरा नाम विग्नेश है"* -> updates name to **विग्नेश**.
   - *"नहीं, पचास नहीं अस्सी हज़ार"* -> updates loan amount to **₹80,000**.
   - *"नहीं, मेरा गाँव पटना है"* -> updates address to **पटना**.

### Profile 6: Testing Missing/Null Fields (Active Voice Prompting)
- **Spoken Input** (intentionally omit income and Aadhaar):
  > *"मेरा नाम सोहन लाल है, मैं भोजपुर से हूँ। मुझे ट्रैक्टर की मरम्मत के लिए 35,000 का लोन चाहिए।"*
- **Behavior**:
  - Name, Village, Amount, Purpose are extracted.
  - When reaching **मासिक कमाई (Monthly Income)**, the assistant detects `null` and actively speaks:
    *"कृपया बताएं, आपकी हर महीने की कमाई लगभग कितनी है?"*
  - Tap **बोलकर बताएं** and speak: *"पंद्रह हज़ार रुपये"* -> updates to ₹15,000!

---

## 📱 Step-by-Step Instructions for Mobile-App Testing

The PWA is built to run on Android and iOS mobile devices. Follow these steps to test on a physical smartphone:

### Step 1: Connect Phone & Computer to the Same Wi-Fi Network
Ensure your phone and development PC are connected to the same local Wi-Fi router or phone mobile hotspot.

### Step 2: Find Your PC's Local IP Address
On your Windows development PC:
```powershell
ipconfig
```
Look for **IPv4 Address** under your Wi-Fi adapter (for example: `192.168.1.15`).

### Step 3: Start Backend & Frontend with Host Binding
Vite and FastAPI are already configured to listen on all interfaces (`0.0.0.0`):
```bash
# Terminal 1 (Backend):
cd backend
.venv\Scripts\activate
uvicorn app.main:app --host 0.0.0.0 --port 8000

# Terminal 2 (Frontend):
cd frontend
npm run dev -- --host
```

### Step 4: Open on Mobile Browser
1. On your Android phone (Google Chrome) or iPhone (Safari), open:
   ```
   http://<YOUR_PC_IP>:5173
   ```
   *(Example: `http://192.168.1.15:5173`)*
2. The responsive mobile interface will load immediately with large touch targets.

### Step 5: Enable Microphone Access for Local HTTP Testing
> [!NOTE]
> Modern mobile browsers restrict microphone access (`getUserMedia`) on plain `http://` unless it's localhost or an explicit test origin.
> - **On Android Chrome**:
>   1. In Chrome, go to: `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
>   2. Enable the flag and add your PC URL: `http://<YOUR_PC_IP>:5173`
>   3. Tap **Relaunch**.
>   4. Return to the app and grant microphone permissions when prompted.
> - **On Desktop / Laptop**:
>   Simply visit `http://localhost:5173` — full microphone and Web Speech Recognition work instantly without any flag changes.

### Step 6: Install as a Progressive Web App (PWA)
1. On Android Chrome:
   - Tap the 3-dots menu icon (⋮) in the top right.
   - Tap **"Add to Home screen"** or **"Install app"**.
   - Confirm by tapping **Install**.
2. An icon named **आवाज़ लोन** will appear on your phone's home screen.
3. Open the app from your home screen: it will launch in standalone full-screen mode without any browser URL bars, exactly like a native Android APK!

### Step 7: Remote Debugging (Optional)
If you want to view mobile console logs on your PC:
1. Connect Android phone to PC via USB.
2. Open Chrome on PC and navigate to: `chrome://inspect/#devices`.
3. You can inspect network requests, audio streams, and console logs live from your phone.

---

## 🔒 Scope Boundaries & Disclaimers
- **No real Aadhaar / UIDAI validation**: Collects 4-digit placeholder string only.
- **No real bank disbursements / payments**: Mock submission to SQLite.
- **Identity verification**: Standard downstream KYC pipeline message.
- **Languages supported**: Hindi (`hi-IN`) and Marathi (`mr-IN`).

