import React, { useState, useEffect } from 'react';
import {
  User,
  MapPin,
  IndianRupee,
  Briefcase,
  TrendingUp,
  Coins,
  ShieldAlert,
  ShieldCheck,
  Check,
  X,
  Volume2,
  Mic,
  RotateCcw,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import AudioWaveform from './AudioWaveform';

const FIELD_ICONS = {
  applicant_name: User,
  village_or_address: MapPin,
  loan_amount: IndianRupee,
  loan_purpose: Briefcase,
  monthly_income: TrendingUp,
  income_source: Coins,
  aadhaar_last4: ShieldCheck,
};

const FIELD_META = {
  'ta-IN': {
    applicant_name: { label: 'விண்ணப்பதாரர் பெயர்', spoken: 'பெயர்' },
    village_or_address: { label: 'ஊர் / முகவரி', spoken: 'முகவரி' },
    loan_amount: { label: 'கடன் தொகை', spoken: 'கடன் தொகை' },
    loan_purpose: { label: 'கடன் நோக்கம்', spoken: 'கடன் நோக்கம்' },
    monthly_income: { label: 'மாத வருமானம்', spoken: 'மாத வருமானம்' },
    income_source: { label: 'வருமான ஆதாரம்', spoken: 'வருமான ஆதாரம்' },
    aadhaar_last4: { label: 'ஆதார் கடைசி 4 எண்கள்', spoken: 'ஆதார் எண்' },
  },
  'hi-IN': {
    applicant_name: { label: 'आवेदक का नाम', spoken: 'नाम' },
    village_or_address: { label: 'गाँव या पता', spoken: 'गाँव या पता' },
    loan_amount: { label: 'लोन राशि', spoken: 'लोन राशि' },
    loan_purpose: { label: 'लोन का उद्देश्य', spoken: 'लोन का उद्देश्य' },
    monthly_income: { label: 'मासिक कमाई', spoken: 'मासिक कमाई' },
    income_source: { label: 'कमाई का साधन', spoken: 'कमाई का साधन' },
    aadhaar_last4: { label: 'आधार अंतिम 4 अंक', spoken: 'आधार नंबर' },
  },
  'mr-IN': {
    applicant_name: { label: 'अर्जदाराचे नाव', spoken: 'नाव' },
    village_or_address: { label: 'गाव किंवा पत्ता', spoken: 'गाव किंवा पत्ता' },
    loan_amount: { label: 'कर्ज रक्कम', spoken: 'कर्ज रक्कम' },
    loan_purpose: { label: 'कर्जाचे कारण', spoken: 'कर्जाचे कारण' },
    monthly_income: { label: 'मासिक उत्पन्न', spoken: 'मासिक उत्पन्न' },
    income_source: { label: 'उत्पन्नाचे साधन', spoken: 'उत्पन्नाचे साधन' },
    aadhaar_last4: { label: 'आधार शेवटचे 4 अंक', spoken: 'आधार क्रमांक' },
  }
};

export default function FieldConfirmCard({
  fieldKey,
  fieldIndex,
  totalFields,
  value,
  explanation,
  language = 'hi-IN',
  onConfirmField,
  onRejectField,
  onPlayTTS,
  isSpeaking,
  onRecordCorrection,
  isRecordingCorrection,
  audioData
}) {
  const [isEditingManually, setIsEditingManually] = useState(false);
  const [editValue, setEditValue] = useState(value || '');

  useEffect(() => {
    setEditValue(value || '');
    setIsEditingManually(false);
  }, [fieldKey, value]);

  const isTamil = language === 'ta-IN';
  const isHindi = language === 'hi-IN';
  const langMeta = FIELD_META[language] || FIELD_META['hi-IN'];
  const fieldMeta = langMeta[fieldKey] || { label: fieldKey, spoken: fieldKey };
  const fieldLabel = fieldMeta.label;
  const spokenField = fieldMeta.spoken;
  const IconComponent = FIELD_ICONS[fieldKey] || User;

  const isMissing = value === null || value === undefined || value === '';

  // Standard confirmation question
  const formattedValue = fieldKey.includes('amount') || fieldKey.includes('income')
    ? (value ? `₹${Number(value).toLocaleString('en-IN')}` : '')
    : value;

  const confirmQuestion = isMissing
    ? (isTamil
        ? `தயவுசெய்து சொல்லுங்கள், உங்கள் ${spokenField} என்ன?`
        : isHindi
        ? `कृपया बोलकर बताएं, आपका ${spokenField} क्या है?`
        : `कृपया सांगा, तुमचे ${spokenField} काय आहे?`)
    : (isTamil
        ? `உங்கள் ${spokenField} "${formattedValue}" என்று சொன்னீர்கள், இது சரியா?`
        : isHindi
        ? `आपने कहा आपका ${spokenField} "${formattedValue}" है, क्या यह सही है?`
        : `तुम्ही सांगितले तुमचे ${spokenField} "${formattedValue}" आहे, हे बरोबर आहे का?`);

  // Auto-play question on mount/field change
  useEffect(() => {
    if (onPlayTTS) {
      onPlayTTS(confirmQuestion);
    }
  }, [fieldKey]);

  return (
    <div className="field-confirm-card">
      {/* Step Header */}
      <div className="field-step-header">
        <span className="step-tag">
          {isTamil
            ? `படி ${fieldIndex + 1} / ${totalFields}`
            : isHindi
            ? `फ़ील्ड ${fieldIndex + 1} / ${totalFields}`
            : `तपशील ${fieldIndex + 1} / ${totalFields}`}
        </span>
        <div className="step-progress-dots">
          {Array.from({ length: totalFields }).map((_, i) => (
            <div
              key={i}
              className={`progress-dot ${i === fieldIndex ? 'active' : i < fieldIndex ? 'completed' : ''}`}
            />
          ))}
        </div>
      </div>

      {/* Main Focus Card */}
      <div className={`field-display-box ${isMissing ? 'missing-state' : 'filled-state'}`}>
        <div className="field-icon-circle">
          <IconComponent className="w-10 h-10 text-white" />
        </div>

        <div className="field-label-text">{fieldLabel}</div>

        {isMissing ? (
          <div className="missing-value-badge">
            <AlertCircle className="w-6 h-6 text-amber-400" />
            <span>
              {isTamil
                ? "இந்த விவரம் இன்னும் கிடைக்கவில்லை"
                : isHindi
                ? "यह जानकारी अभी नहीं मिली"
                : "हा तपशील अद्याप मिळालेला नाही"}
            </span>
          </div>
        ) : (
          <div className="field-value-primary">
            {formattedValue}
          </div>
        )}

        {/* Spoken/Text Extraction Explanation */}
        {explanation && (
          <div className="explanation-pill">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-xs text-slate-300">{explanation}</span>
          </div>
        )}
      </div>

      {/* Spoken Question & Replay Button */}
      <div className="question-audio-strip">
        <button
          type="button"
          className={`btn-audio-replay ${isSpeaking ? 'pulse-border' : ''}`}
          onClick={() => onPlayTTS && onPlayTTS(confirmQuestion)}
          title="Replay Voice Prompt"
        >
          <Volume2 className="w-6 h-6 text-blue-400" />
          <span className="text-sm font-medium text-slate-200">
            {confirmQuestion}
          </span>
        </button>
      </div>

      {/* Waveform if recording correction */}
      {isRecordingCorrection && (
        <div className="correction-wave-box my-3">
          <p className="text-xs font-semibold text-rose-400 mb-1 animate-pulse text-center">
            {isTamil ? "சரியான தகவலை சொல்லுங்கள்..." : (isHindi ? "सही जानकारी बोलिए..." : "योग्य माहिती बोला...")}
          </p>
          <AudioWaveform isRecording={true} isSpeaking={false} audioData={audioData} />
        </div>
      )}

      {/* Interactive Actions */}
      <div className="field-actions-grid">
        {isMissing ? (
          // If field is missing, provide 1-tap voice input
          <button
            type="button"
            className={`btn-action-voice-fill ${isRecordingCorrection ? 'recording' : ''}`}
            onClick={onRecordCorrection}
          >
            <Mic className="w-8 h-8" />
            <span className="text-lg font-bold">
              {isRecordingCorrection
                ? (isTamil ? "பேசி முடிந்தது" : (isHindi ? "बोलना समाप्त करें" : "बोलणे पूर्ण करा"))
                : (isTamil ? "குரல் மூலம் கூறவும்" : (isHindi ? "बोलकर बताएं" : "बोलून सांगा"))}
            </span>
          </button>
        ) : (
          // Field is filled: Show Big Yes (Green) and Big No (Red)
          <>
            <button
              type="button"
              className="btn-choice-yes"
              onClick={() => onConfirmField(fieldKey, value)}
              disabled={isRecordingCorrection}
            >
              <div className="icon-circle bg-emerald-700">
                <Check className="w-10 h-10 text-white stroke-[3]" />
              </div>
              <span className="choice-label">
                {isTamil ? "ஆம், சரி" : (isHindi ? "हाँ, सही है" : "होय, बरोबर आहे")}
              </span>
            </button>

            <button
              type="button"
              className={`btn-choice-no ${isRecordingCorrection ? 'recording' : ''}`}
              onClick={onRecordCorrection}
            >
              <div className="icon-circle bg-rose-700">
                {isRecordingCorrection ? (
                  <Mic className="w-10 h-10 text-white animate-pulse" />
                ) : (
                  <X className="w-10 h-10 text-white stroke-[3]" />
                )}
              </div>
              <span className="choice-label">
                {isRecordingCorrection
                  ? (isTamil ? "பேசி முடிந்தது" : (isHindi ? "बोलना रोकें" : "थांबवा"))
                  : (isTamil ? "இல்லை, மாற்று" : (isHindi ? "नहीं, गलत है" : "नाही, चूक आहे"))}
              </span>
            </button>
          </>
        )}
      </div>

      {/* Manual fallback toggle for accessibility */}
      <div className="text-center mt-3">
        {!isEditingManually ? (
          <button
            type="button"
            className="text-xs text-slate-500 hover:text-slate-300 underline"
            onClick={() => setIsEditingManually(true)}
          >
            {isTamil ? "விசைப்பலகை மூலம் மாற்றவும் (விருப்பம்)" : (isHindi ? "कीबोर्ड से सुधारें (वैकल्पिक)" : "कीबोर्डने दुरुस्त करा (पर्यायी)")}
          </button>
        ) : (
          <div className="manual-edit-container flex gap-2 justify-center mt-2">
            <input
              type={fieldKey.includes('amount') || fieldKey.includes('income') || fieldKey.includes('last4') ? 'number' : 'text'}
              className="manual-input"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder="12345"
            />
            <button
              type="button"
              className="manual-save-btn"
              onClick={() => {
                const finalVal = fieldKey.includes('amount') || fieldKey.includes('income') ? parseFloat(editValue) : editValue;
                onConfirmField(fieldKey, finalVal);
                setIsEditingManually(false);
              }}
            >
              {isTamil ? "சேமிக்க" : (isHindi ? "सहेजें" : "जतन करा")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
