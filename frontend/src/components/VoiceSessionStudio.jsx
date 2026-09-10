import React, { useState, useEffect } from 'react';
import {
  Mic,
  Volume2,
  CheckCircle2,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  Send,
  Lock,
  Wifi,
  Keyboard,
  Play,
  Check,
  Building2
} from 'lucide-react';

const LOCALIZED_COPY = {
  'ta-IN': {
    back: 'முகப்புக்குத் திரும்பு',
    subTag: 'புதிய விண்ணப்பம் - TAMIL',
    title: 'ஒரு உரையாடலைத் தொடங்கலாம்.',
    subtitle: 'இயல்பாகப் பேசுங்கள். உங்கள் தகவல்களைப் புரிந்து கொண்டு தேவையான கேள்விகளை மட்டும் கேட்போம்.',
    listening: 'கேட்கிறது',
    ready: 'தயார்',
    localEngine: 'உள்ளூர் குரல் இயந்திரம்',
    privacyBadge: 'ஒலி இந்த சாதனத்தை விட்டு வெளியே செல்லாது',
    initialPrompt: 'வணக்கம். உங்கள் கடன் விண்ணப்பத்திற்கு நான் உதவி செய்கிறேன். உங்கள் பெயர் என்ன?',
    liveText: 'நேரடி உரை',
    waitingVoice: 'குரலுக்காக காத்திருக்கிறது',
    placeholderAnswer: 'உங்கள் பதில் இங்கே தோன்றும்.',
    useDemo: 'டெமோவைப் பயன்படுத்துங்கள்',
    typeResponse: 'பதிலை எழுதுங்கள்',
    inputPlaceholder: 'ஒரு பதிலை எழுதி Enter அழுத்துங்கள்...',
    structuredApp: 'கட்டமைக்கப்பட்ட விண்ணப்பம்',
    recordedDetails: 'பதிவு செய்யப்பட்ட விவரங்கள்',
    confirmAction: 'உறுதிப்படுத்து',
    submitToBank: 'வங்கிக்கு விண்ணப்பிக்கவும் & கடன் மதிப்பீடு செய்க',
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
    localEngine: 'स्थानीय वॉयस इंजन',
    privacyBadge: 'ऑडियो डिवाइस पर ही सुरक्षित है',
    initialPrompt: 'नमस्ते। मैं आपके लोन आवेदन में मदद करूँगा। आपका नाम क्या है?',
    liveText: 'लाइव टेक्स्ट',
    waitingVoice: 'आवाज़ की प्रतीक्षा...',
    placeholderAnswer: 'आपका उत्तर यहाँ दिखाई देगा।',
    useDemo: 'डेमो प्रोफ़ाइल भरें',
    typeResponse: 'लिखकर जवाब दें',
    inputPlaceholder: 'यहाँ उत्तर लिखें और Enter दबाएँ...',
    structuredApp: 'संरचित आवेदन',
    recordedDetails: 'दर्ज विवरण',
    confirmAction: 'पुष्टि करें',
    submitToBank: 'बैंक में जमा करें और क्रेडिट जांचें',
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
    localEngine: 'Local Voice Engine',
    privacyBadge: 'Audio never leaves this device',
    initialPrompt: 'Hello. I will assist you with your loan application. What is your full name?',
    liveText: 'Live transcript',
    waitingVoice: 'Waiting for voice...',
    placeholderAnswer: 'Your spoken words will appear here.',
    useDemo: 'Fill Demo Profile',
    typeResponse: 'Type Response',
    inputPlaceholder: 'Type an answer and press Enter...',
    structuredApp: 'Structured Application',
    recordedDetails: 'Recorded Details',
    confirmAction: 'Confirm',
    submitToBank: 'Submit Application & Run Credit Check',
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

  const t = LOCALIZED_COPY[language] || LOCALIZED_COPY['en-IN'];

  useEffect(() => {
    setActivePrompt(t.initialPrompt);
    if (onPlayTTS) {
      onPlayTTS(t.initialPrompt, language);
    }
  }, [language]);

  // Calculate completion percentage based on filled fields
  const fieldKeys = [
    'applicant_name',
    'village_or_address',
    'loan_amount',
    'loan_purpose',
    'monthly_income',
    'income_source',
    'aadhaar_last4'
  ];
  const filledCount = fieldKeys.filter(k => Boolean(formData[k])).length;
  const progressPct = Math.round((filledCount / fieldKeys.length) * 100);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualText.trim()) return;

    // Simple heuristic parser for typed response
    const txt = manualText.trim();
    if (!formData.applicant_name) {
      onUpdateField('applicant_name', txt);
    } else if (!formData.loan_amount && /\d+/.test(txt)) {
      const match = txt.match(/\d+/);
      if (match) onUpdateField('loan_amount', parseFloat(match[0]));
    } else if (!formData.village_or_address) {
      onUpdateField('village_or_address', txt);
    } else if (!formData.monthly_income && /\d+/.test(txt)) {
      const match = txt.match(/\d+/);
      if (match) onUpdateField('monthly_income', parseFloat(match[0]));
    } else {
      onUpdateField('loan_purpose', txt);
    }
    setManualText('');
  };

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
          <span className="dot-green-pulse" />
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
          {/* Privacy & Engine Badges */}
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
                className={`console-mic-trigger ${isRecording ? 'recording' : ''}`}
                onClick={isRecording ? onStopRecord : onStartRecord}
                title={isRecording ? "Click to stop recording" : "Click to speak"}
              >
                <Mic className={`w-8 h-8 ${isRecording ? 'text-white animate-bounce' : 'text-emerald-400'}`} />
              </button>
            </div>

            {/* Soundwave Bars Visualizer */}
            <div className="console-waveform-strip">
              {(audioData && audioData.length > 0
                ? Array.from(audioData.slice(0, 16)).map((val, idx) => {
                    const heightPct = isRecording ? Math.max(20, Math.round((val / 255) * 100)) : 20;
                    return (
                      <div
                        key={idx}
                        className={`console-bar ${isRecording ? 'animate-soundwave' : ''}`}
                        style={{ height: `${heightPct}%` }}
                      />
                    );
                  })
                : [30, 60, 90, 45, 80, 100, 70, 40, 65, 85, 95, 55, 35, 75, 90, 45].map((val, idx) => (
                    <div
                      key={idx}
                      className={`console-bar ${isRecording ? 'animate-soundwave' : ''}`}
                      style={{ height: `${isRecording ? val : 20}%` }}
                    />
                  ))
              )}
            </div>

            <div className="console-prompt-instruction">
              {isRecording ? t.listening : `Tell me your ${t.fields.applicant_name}`}
            </div>
          </div>

          {/* Active Prompt Box */}
          <div className="console-prompt-card">
            <Volume2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-sm font-semibold text-slate-800">
              {activePrompt}
            </div>
            <button
              type="button"
              className={`btn-replay-prompt ${isSpeaking ? 'active' : ''}`}
              onClick={() => onPlayTTS && onPlayTTS(activePrompt, language)}
              title="Replay Audio"
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
            <div className={`text-xs min-h-[36px] ${liveTranscript ? 'text-slate-900 font-medium' : 'text-slate-500 italic'}`}>
              {liveTranscript || (isRecording ? `${t.listening}...` : t.placeholderAnswer)}
            </div>
          </div>

          {/* Fallback Action Buttons */}
          <div className="console-action-buttons">
            <button
              type="button"
              className="btn-console-tool"
              onClick={onFillDemoProfile}
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

          {/* Text Input Fallback Bar */}
          {showManualInput && (
            <form onSubmit={handleManualSubmit} className="console-manual-input-form animate-fadeIn">
              <input
                type="text"
                className="console-text-input"
                placeholder={t.inputPlaceholder}
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
              />
              <button type="submit" className="btn-send-manual">
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
                style={{ width: `${progressPct}%` }}
              />
            </div>

            {/* Field Stack */}
            <div className="checklist-fields-stack">
              {fieldKeys.map((key) => {
                const val = formData[key];
                const isFilled = Boolean(val);
                const fieldLabel = t.fields[key] || key;

                let displayVal = val;
                if (val && (key === 'loan_amount' || key === 'monthly_income')) {
                  displayVal = `₹${Number(val).toLocaleString('en-IN')}`;
                } else if (val && key.includes('last4')) {
                  displayVal = `•••• ${val}`;
                }

                const waitingPlaceholder = language === 'ta-IN'
                  ? 'குரல் பதிவுக்காக காத்திருக்கிறது'
                  : (language === 'hi-IN' ? 'आवाज़ की प्रतीक्षा...' : 'Waiting for voice response...');

                return (
                  <div key={key} className={`checklist-row-item ${isFilled ? 'filled' : 'waiting'}`}>
                    <div className="checklist-status-dot">
                      {isFilled ? (
                        <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                      ) : (
                        <span className="dot-hollow" />
                      )}
                    </div>

                    <div className="checklist-row-content">
                      <div className="checklist-row-label">{fieldLabel}</div>
                      <div className="checklist-row-value">
                        {isFilled ? displayVal : (
                          <span className="text-slate-400 font-normal">
                            {waitingPlaceholder}
                          </span>
                        )}
                      </div>
                    </div>

                    {isFilled && (
                      <button
                        type="button"
                        className="btn-checklist-confirm"
                        onClick={() => onConfirmField && onConfirmField(key)}
                      >
                        {t.confirmAction}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Submission CTA */}
            <button
              type="button"
              className="btn-submit-underwriting"
              onClick={onSubmitApplication}
              disabled={isSubmitting}
            >
              <Building2 className="w-5 h-5" />
              <span>{isSubmitting ? 'Evaluating Credit...' : t.submitToBank}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
