import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  Volume2,
  CheckCircle2,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  Send,
  Lock,
  Keyboard,
  Play,
  Check,
  Building2,
  ChevronRight
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// FIELD ORDER - the conversation progresses through these in sequence
// ─────────────────────────────────────────────────────────────────────────────
const FIELD_KEYS = [
  'applicant_name',
  'village_or_address',
  'loan_amount',
  'loan_purpose',
  'monthly_income',
  'income_source',
  'aadhaar_last4'
];

// ─────────────────────────────────────────────────────────────────────────────
// Per-language question prompts for every field step
// ─────────────────────────────────────────────────────────────────────────────
const FIELD_QUESTIONS = {
  'ta-IN': {
    applicant_name:     'வணக்கம்! உங்கள் கடன் விண்ணப்பத்திற்கு நான் உதவுகிறேன். முதலில், உங்கள் முழு பெயர் என்ன?',
    village_or_address: 'நன்றி! நீங்கள் எந்த கிராமம் அல்லது நகரில் வசிக்கிறீர்கள்?',
    loan_amount:        'சரி! நீங்கள் எவ்வளவு தொகை கடனாக வேண்டும்? (உதாரணம்: ஐம்பதாயிரம் ரூபாய்)',
    loan_purpose:       'இந்த கடன் எந்த தொழில் அல்லது நோக்கத்திற்காக தேவை?',
    monthly_income:     'சரி! உங்கள் தற்போதைய மாத வருமானம் எவ்வளவு?',
    income_source:      'நீங்கள் என்ன தொழில் செய்கிறீர்கள் அல்லது வருமானம் எங்கிருந்து வருகிறது?',
    aadhaar_last4:      'கிட்டத்தட்ட முடிந்தது! உங்கள் ஆதார் அட்டையின் கடைசி 4 இலக்கங்கள் என்ன?',
    completed:          'மிக்க நன்றி! அனைத்து விவரங்களும் பதிவாகியுள்ளன. இப்போது மதிப்பீட்டிற்கு விண்ணப்பிக்கலாம்.'
  },
  'hi-IN': {
    applicant_name:     'नमस्ते! मैं आपके लोन आवेदन में सहायता करूँगा। सबसे पहले, आपका पूरा नाम क्या है?',
    village_or_address: 'धन्यवाद! आप किस गाँव या शहर में रहते हैं?',
    loan_amount:        'ठीक है! आप कितनी लोन राशि चाहते हैं? (उदाहरण: पचास हजार रुपये)',
    loan_purpose:       'यह लोन किस काम या व्यापार के लिए चाहिए?',
    monthly_income:     'अच्छा! आपकी वर्तमान मासिक कमाई कितनी है?',
    income_source:      'आप कौन सा काम करते हैं या आपकी आमदनी का स्रोत क्या है?',
    aadhaar_last4:      'लगभग हो गया! आपके आधार कार्ड के आखिरी 4 अंक क्या हैं?',
    completed:          'बहुत धन्यवाद! सभी जानकारी दर्ज हो गई है। अब आप क्रेडिट मूल्यांकन के लिए आवेदन कर सकते हैं।'
  },
  'en-IN': {
    applicant_name:     'Hello! I will help you with your loan application. First, what is your full name?',
    village_or_address: 'Thank you! Which village or town do you currently live in?',
    loan_amount:        'Got it! How much loan amount do you need? (Example: fifty thousand rupees)',
    loan_purpose:       'What is this loan for? Which business or purpose?',
    monthly_income:     'Alright! What is your current monthly income?',
    income_source:      'What is your occupation or main source of income?',
    aadhaar_last4:      'Almost done! What are the last 4 digits of your Aadhaar card?',
    completed:          'Thank you! All details have been recorded. You can now submit for credit evaluation.'
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// UI copy per language
// ─────────────────────────────────────────────────────────────────────────────
const LOCALIZED_COPY = {
  'ta-IN': {
    back: 'முகப்புக்குத் திரும்பு',
    subTag: 'புதிய விண்ணப்பம் - TAMIL',
    title: 'ஒரு உரையாடலைத் தொடங்கலாம்.',
    subtitle: 'இயல்பாகப் பேசுங்கள். உங்கள் தகவல்களைப் புரிந்து கொண்டு தேவையான கேள்விகளை மட்டும் கேட்போம்.',
    listening: 'கேட்கிறது',
    ready: 'தயார்',
    localEngine: 'Sarvam AI குரல் இயந்திரம்',
    privacyBadge: 'ஒலி பாதுகாப்பாக செயலாக்கப்படுகிறது',
    liveText: 'நேரடி உரை',
    waitingVoice: 'குரலுக்காக காத்திருக்கிறது',
    placeholderAnswer: 'நீங்கள் பேசும்போது உங்கள் வார்த்தைகள் இங்கே தோன்றும்.',
    useDemo: 'டெமோவைப் பயன்படுத்துங்கள்',
    typeResponse: 'பதிலை எழுதுங்கள்',
    inputPlaceholder: 'ஒரு பதிலை எழுதி Enter அழுத்துங்கள்...',
    structuredApp: 'கட்டமைக்கப்பட்ட விண்ணப்பம்',
    recordedDetails: 'பதிவு செய்யப்பட்ட விவரங்கள்',
    submitToBank: 'வங்கிக்கு விண்ணப்பிக்கவும் & கடன் மதிப்பீடு செய்க',
    completedAll: 'அனைத்தும் நிறைவடைந்தது! விண்ணப்பிக்க தயார்.',
    fields: {
      applicant_name: 'முழு பெயர்',
      village_or_address: 'கிராமம் / முகவரி',
      loan_amount: 'கடன் தொகை',
      loan_purpose: 'தொழில் / நோக்கம்',
      monthly_income: 'மாத வருமானம்',
      income_source: 'வருமான ஆதாரம்',
      aadhaar_last4: 'ஆதார் கடைசி 4 எண்கள்'
    }
  },
  'hi-IN': {
    back: 'मुख्य पृष्ठ पर वापस जाएँ',
    subTag: 'नया आवेदन - HINDI',
    title: 'आइए बातचीत शुरू करें।',
    subtitle: 'स्वाभाविक रूप से बोलें। हम आपकी जानकारी समझकर केवल जरूरी सवाल पूछेंगे।',
    listening: 'सुन रहा है',
    ready: 'तैयार',
    localEngine: 'Sarvam AI वॉयस इंजन',
    privacyBadge: 'ऑडियो सुरक्षित रूप से प्रोसेस किया जाता है',
    liveText: 'लाइव टेक्स्ट',
    waitingVoice: 'आवाज़ की प्रतीक्षा...',
    placeholderAnswer: 'बोलने पर आपके शब्द यहाँ दिखाई देंगे।',
    useDemo: 'डेमो प्रोफ़ाइल भरें',
    typeResponse: 'लिखकर जवाब दें',
    inputPlaceholder: 'यहाँ उत्तर लिखें और Enter दबाएँ...',
    structuredApp: 'संरचित आवेदन',
    recordedDetails: 'दर्ज विवरण',
    submitToBank: 'बैंक में जमा करें और क्रेडिट जांचें',
    completedAll: 'सब पूरा! जमा करने के लिए तैयार।',
    fields: {
      applicant_name: 'पूरा नाम',
      village_or_address: 'गाँव / पता',
      loan_amount: 'लोन राशि',
      loan_purpose: 'लोन का उद्देश्य',
      monthly_income: 'मासिक कमाई',
      income_source: 'कमाई का साधन',
      aadhaar_last4: 'आधार अंतिम 4 अंक'
    }
  },
  'en-IN': {
    back: 'Back to overview',
    subTag: 'NEW APPLICATION - ENGLISH',
    title: "Let's start a conversation.",
    subtitle: "Speak naturally. We will understand your details and ask only necessary questions.",
    listening: 'Listening',
    ready: 'Ready',
    localEngine: 'Sarvam AI Voice Engine',
    privacyBadge: 'Audio processed securely',
    liveText: 'Live transcript',
    waitingVoice: 'Waiting for voice...',
    placeholderAnswer: 'Your spoken words will appear here.',
    useDemo: 'Fill Demo Profile',
    typeResponse: 'Type Response',
    inputPlaceholder: 'Type an answer and press Enter...',
    structuredApp: 'Structured Application',
    recordedDetails: 'Recorded Details',
    submitToBank: 'Submit Application & Run Credit Check',
    completedAll: 'All done! Ready to submit.',
    fields: {
      applicant_name: 'Full Name',
      village_or_address: 'Village / Address',
      loan_amount: 'Loan Amount',
      loan_purpose: 'Purpose / Business',
      monthly_income: 'Monthly Income',
      income_source: 'Source of Income',
      aadhaar_last4: 'Aadhaar Last 4'
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper: get the next unfilled field key
// ─────────────────────────────────────────────────────────────────────────────
function getNextUnfilledField(formData) {
  return FIELD_KEYS.find(k => !formData[k]) || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: get the question for the next field (or a completion message)
// ─────────────────────────────────────────────────────────────────────────────
function getQuestionForField(fieldKey, language) {
  const questions = FIELD_QUESTIONS[language] || FIELD_QUESTIONS['en-IN'];
  return fieldKey ? (questions[fieldKey] || '') : (questions.completed || '');
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: parse typed text into the correct field
// ─────────────────────────────────────────────────────────────────────────────
function parseTypedTextToField(txt, formData) {
  const nextField = getNextUnfilledField(formData);
  if (!nextField) return null;

  if (nextField === 'loan_amount' || nextField === 'monthly_income') {
    const numMatch = txt.match(/[\d,]+/);
    if (numMatch) {
      const num = parseFloat(numMatch[0].replace(/,/g, ''));
      if (!isNaN(num)) return { field: nextField, value: num };
    }
  }
  if (nextField === 'aadhaar_last4') {
    const digits = txt.replace(/\D/g, '').slice(0, 4);
    if (digits.length === 4) return { field: nextField, value: digits };
    if (txt.trim().length >= 4) return { field: nextField, value: txt.trim().slice(-4) };
  }
  return { field: nextField, value: txt.trim() };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function VoiceSessionStudio({
  language = 'ta-IN',
  formData,
  onUpdateField,
  onConfirmField,
  onSubmitApplication,
  onBack,
  isRecording,
  liveTranscript = '',
  audioData = null,
  onStartRecord,
  onStopRecord,
  isSpeaking,
  onPlayTTS,
  isSubmitting,
  onFillDemoProfile
}) {
  const [manualText, setManualText] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [activePrompt, setActivePrompt] = useState('');
  const prevNextFieldRef = useRef(null);
  const hasInitialized = useRef(false);

  const t = LOCALIZED_COPY[language] || LOCALIZED_COPY['en-IN'];

  const fieldKeys = FIELD_KEYS;
  const filledCount = fieldKeys.filter(k => Boolean(formData[k])).length;
  const progressPct = Math.round((filledCount / fieldKeys.length) * 100);
  const nextField = getNextUnfilledField(formData);
  const allFilled = nextField === null;

  // ─── Initial greeting: play the first unanswered field's question on mount ──
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = false; // reset on language change
    }
    const currentNext = getNextUnfilledField(formData);
    const question = getQuestionForField(currentNext, language);
    setActivePrompt(question);
    prevNextFieldRef.current = currentNext;

    // Small delay so TTS doesn't fire twice on initial render
    const timer = setTimeout(() => {
      if (onPlayTTS) onPlayTTS(question, language);
      hasInitialized.current = true;
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  // ─── When formData changes: detect newly filled field → ask the NEXT question ──
  useEffect(() => {
    if (!hasInitialized.current) return; // don't fire before initial greeting is done

    const currentNext = getNextUnfilledField(formData);

    // If the next unfilled field changed → a field was just filled
    if (currentNext !== prevNextFieldRef.current) {
      prevNextFieldRef.current = currentNext;
      const question = getQuestionForField(currentNext, language);
      setActivePrompt(question);

      // Small delay so TTS doesn't stack on the previous utterance
      const timer = setTimeout(() => {
        if (onPlayTTS) onPlayTTS(question, language);
      }, 600);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData]);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualText.trim()) return;

    const parsed = parseTypedTextToField(manualText.trim(), formData);
    if (parsed) {
      onUpdateField(parsed.field, parsed.value);
    }
    setManualText('');
    setShowManualInput(false);
  };

  const currentFieldLabel = nextField ? (t.fields[nextField] || '') : t.completedAll;

  return (
    <div className="voice-session-page animate-fadeIn">
      {/* Top Breadcrumb & Status Row */}
      <div className="session-top-meta">
        <button
          type="button"
          className="btn-back-nav"
          onClick={onBack}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t.back}</span>
        </button>

        <div className="session-live-pill">
          <span className={`dot-green-pulse ${isRecording ? 'recording' : ''}`} />
          <span className="text-xs font-bold text-emerald-600">
            {isRecording ? t.listening : t.ready}
          </span>
        </div>
      </div>

      <div className="session-headline-wrap">
        <div className="session-subtag">{t.subTag}</div>
        <h1 className="session-main-title">{t.title}</h1>
        <p className="session-main-desc">{t.subtitle}</p>
      </div>

      {/* Two Column Grid */}
      <div className="session-studio-grid">
        {/* Left Column: Voice Console */}
        <div className="session-console-pane">
          {/* Engine Badges */}
          <div className="console-engine-badges">
            <span className="badge-local-engine">
              <span className="dot-green-small" />
              {t.localEngine}
            </span>
            <span className="badge-privacy-lock">
              <Lock className="w-3 h-3 text-slate-400" />
              {t.privacyBadge}
            </span>
          </div>

          {/* Dark Teal Orbital Soundwave Console */}
          <div className="console-radar-card">
            <div className="console-orbit-wrap">
              <div className={`console-ring ring-c3 ${isRecording ? 'pulse-fast' : ''}`} />
              <div className={`console-ring ring-c2 ${isRecording ? 'pulse-med' : ''}`} />
              <div className="console-ring ring-c1" />

              <button
                type="button"
                className={`console-mic-trigger ${isRecording ? 'recording' : ''} ${isSpeaking ? 'speaking' : ''}`}
                onClick={isRecording ? onStopRecord : onStartRecord}
                title={isRecording ? 'Click to stop recording' : 'Click to speak'}
                disabled={isSpeaking}
              >
                {isSpeaking
                  ? <Volume2 className="w-8 h-8 text-amber-400 animate-pulse" />
                  : <Mic className={`w-8 h-8 ${isRecording ? 'text-white animate-bounce' : 'text-emerald-400'}`} />
                }
              </button>
            </div>

            {/* Soundwave Bars Visualizer - driven by real audioData */}
            <div className="console-waveform-strip">
              {(audioData && audioData.length > 0
                ? Array.from(audioData.slice(0, 16)).map((val, idx) => {
                    const heightPct = isRecording ? Math.max(18, Math.round((val / 255) * 100)) : 18;
                    return (
                      <div
                        key={idx}
                        className="console-bar animate-soundwave"
                        style={{ height: `${heightPct}%` }}
                      />
                    );
                  })
                : [30, 60, 90, 45, 80, 100, 70, 40, 65, 85, 95, 55, 35, 75, 90, 45].map((val, idx) => (
                    <div
                      key={idx}
                      className={`console-bar ${isRecording ? 'animate-soundwave' : ''}`}
                      style={{ height: `${isRecording ? val : 18}%` }}
                    />
                  ))
              )}
            </div>

            {/* Current step instruction */}
            <div className="console-prompt-instruction">
              {isRecording
                ? t.listening
                : (isSpeaking
                    ? (language === 'ta-IN' ? 'கேளுங்கள்...' : language === 'hi-IN' ? 'सुनिए...' : 'Listening to answer...')
                    : (allFilled
                        ? t.completedAll
                        : `${t.fields[nextField] || ''} ${language === 'ta-IN' ? 'சொல்லுங்கள்' : language === 'hi-IN' ? 'बताएं' : '- speak now'}`)
                  )
              }
            </div>
          </div>

          {/* Active Prompt Box */}
          <div className={`console-prompt-card ${isSpeaking ? 'speaking-glow' : ''}`}>
            <Volume2 className={`w-5 h-5 shrink-0 mt-0.5 ${isSpeaking ? 'text-amber-500 animate-pulse' : 'text-emerald-600'}`} />
            <div className="flex-1 text-sm font-semibold text-slate-800">
              {activePrompt}
            </div>
            <button
              type="button"
              className={`btn-replay-prompt ${isSpeaking ? 'active' : ''}`}
              onClick={() => onPlayTTS && onPlayTTS(activePrompt, language)}
              title="Replay this question"
              disabled={isSpeaking}
            >
              <RotateCcw className="w-4 h-4 text-slate-500 hover:text-emerald-600" />
            </button>
          </div>

          {/* Live Transcript Box */}
          <div className="console-transcript-card">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs font-bold text-slate-700">{t.liveText}</span>
              <span className={`text-[11px] font-semibold ${isRecording ? 'text-emerald-600 animate-pulse' : 'text-slate-400'}`}>
                {isRecording ? `${t.listening}...` : t.waitingVoice}
              </span>
            </div>
            <div className={`text-xs min-h-[36px] leading-relaxed ${liveTranscript ? 'text-slate-900 font-medium' : 'text-slate-500 italic'}`}>
              {liveTranscript || (isRecording ? `${t.listening}...` : t.placeholderAnswer)}
            </div>
          </div>

          {/* Fallback Action Buttons */}
          <div className="console-action-buttons">
            <button
              type="button"
              className="btn-console-tool"
              onClick={onFillDemoProfile}
              title="Auto-fill all fields with demo data"
            >
              <Play className="w-3.5 h-3.5 text-emerald-600" />
              <span>{t.useDemo}</span>
            </button>

            <button
              type="button"
              className="btn-console-tool"
              onClick={() => setShowManualInput(!showManualInput)}
            >
              <Keyboard className="w-3.5 h-3.5 text-blue-600" />
              <span>{t.typeResponse}</span>
            </button>
          </div>

          {/* Manual Text Input Fallback */}
          {showManualInput && (
            <form onSubmit={handleManualSubmit} className="console-manual-input-form animate-fadeIn">
              <div className="text-[10px] text-slate-500 mb-1 font-semibold">
                {nextField
                  ? `▶ ${language === 'ta-IN' ? 'இப்போது கேட்கப்படுவது' : language === 'hi-IN' ? 'अभी पूछा जा रहा है' : 'Currently asking'}: ${t.fields[nextField] || nextField}`
                  : (language === 'ta-IN' ? 'அனைத்தும் நிறைவடைந்தது!' : language === 'hi-IN' ? 'सब भर गया!' : 'All fields filled!')}
              </div>
              <input
                type="text"
                className="console-text-input"
                placeholder={nextField
                  ? (language === 'ta-IN' ? `${t.fields[nextField]} உள்ளிடவும்...`
                    : language === 'hi-IN' ? `${t.fields[nextField]} दर्ज करें...`
                    : `Enter ${t.fields[nextField]}...`)
                  : 'All done!'
                }
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                disabled={allFilled}
                autoFocus
              />
              <button type="submit" className="btn-send-manual" disabled={allFilled}>
                <Send className="w-4 h-4 text-white" />
              </button>
            </form>
          )}
        </div>

        {/* Right Column: Structured Application Checklist */}
        <div className="session-checklist-pane">
          <div className="checklist-card-box">
            <div className="flex justify-between items-center mb-2">
              <div>
                <div className="checklist-pretag">{t.structuredApp}</div>
                <h3 className="checklist-heading">{t.recordedDetails}</h3>
              </div>
              <div className="checklist-progress-text">{progressPct}% complete</div>
            </div>

            {/* Progress Bar */}
            <div className="checklist-progress-track">
              <div
                className="checklist-progress-fill-green"
                style={{ width: `${progressPct}%`, transition: 'width 0.5s ease' }}
              />
            </div>

            {/* Field Stack */}
            <div className="checklist-fields-stack">
              {fieldKeys.map((key) => {
                const val = formData[key];
                const isFilled = Boolean(val);
                const isCurrentField = !isFilled && key === nextField;
                const fieldLabel = t.fields[key] || key;

                let displayVal = val;
                if (val && (key === 'loan_amount' || key === 'monthly_income')) {
                  displayVal = `₹${Number(val).toLocaleString('en-IN')}`;
                } else if (val && key === 'aadhaar_last4') {
                  displayVal = `•••• ${val}`;
                }

                const waitingPlaceholder = isCurrentField
                  ? (language === 'ta-IN' ? '← இப்போது கேட்கிறோம்' : language === 'hi-IN' ? '← अभी पूछ रहे हैं' : '← Currently asking')
                  : (language === 'ta-IN' ? 'காத்திருக்கிறது' : language === 'hi-IN' ? 'प्रतीक्षा...' : 'Waiting...');

                return (
                  <div
                    key={key}
                    className={`checklist-row-item ${isFilled ? 'filled' : (isCurrentField ? 'current-field' : 'waiting')}`}
                  >
                    <div className="checklist-status-dot">
                      {isFilled ? (
                        <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                      ) : isCurrentField ? (
                        <span className="dot-current-pulse" />
                      ) : (
                        <span className="dot-hollow" />
                      )}
                    </div>

                    <div className="checklist-row-content">
                      <div className={`checklist-row-label ${isCurrentField ? 'text-emerald-700 font-bold' : ''}`}>
                        {fieldLabel}
                        {isCurrentField && <span className="ml-1 text-[10px] text-emerald-600 animate-pulse">▲ ASKING NOW</span>}
                      </div>
                      <div className="checklist-row-value">
                        {isFilled ? (
                          <span className="text-slate-900 font-semibold">{displayVal}</span>
                        ) : (
                          <span className={`font-normal ${isCurrentField ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                            {waitingPlaceholder}
                          </span>
                        )}
                      </div>
                    </div>

                    {isFilled && (
                      <button
                        type="button"
                        className="btn-checklist-confirm"
                        onClick={() => {
                          if (onConfirmField) onConfirmField(key);
                          // Play voice confirmation for the field
                          const lang = language;
                          const confirmMsg = lang === 'ta-IN'
                            ? `${fieldLabel} சரியாக பதிவாகியுள்ளது.`
                            : (lang === 'hi-IN' ? `${fieldLabel} सही दर्ज हो गया।` : `${fieldLabel} confirmed.`);
                          if (onPlayTTS) onPlayTTS(confirmMsg, lang);
                        }}
                        title="Confirm this field"
                      >
                        ✓
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Submission CTA */}
            <button
              type="button"
              className={`btn-submit-underwriting ${allFilled ? 'ready' : ''}`}
              onClick={onSubmitApplication}
              disabled={isSubmitting}
            >
              <Building2 className="w-5 h-5" />
              <span>
                {isSubmitting
                  ? (language === 'ta-IN' ? 'மதிப்பீடு செய்கிறது...' : language === 'hi-IN' ? 'मूल्यांकन हो रहा है...' : 'Evaluating Credit...')
                  : t.submitToBank}
              </span>
              {allFilled && !isSubmitting && <ChevronRight className="w-4 h-4 text-emerald-200" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
