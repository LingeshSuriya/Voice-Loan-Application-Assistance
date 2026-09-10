import React from 'react';
import { Volume2, ArrowRight, ArrowLeft, ShieldCheck } from 'lucide-react';

const LANGUAGES = [
  {
    code: 'en-IN',
    name: 'English',
    sample: 'What is your name?',
    voicePrompt: 'Hello! I will assist you in filling out your loan application using your voice.'
  },
  {
    code: 'hi-IN',
    name: 'Hindi',
    sample: 'आपका नाम क्या है?',
    voicePrompt: 'नमस्ते! मैं आपका लोन आवेदन बोलकर भरने में मदद करूँगा।'
  },
  {
    code: 'ta-IN',
    name: 'Tamil',
    sample: 'உங்கள் பெயர் என்ன?',
    voicePrompt: 'வணக்கம்! உங்கள் கடன் விண்ணப்பத்தை குரல் வழியாக நிரப்ப நான் உங்களுக்கு உதவுவேன்.'
  },
  {
    code: 'te-IN',
    name: 'Telugu',
    sample: 'మీ పేరు ఏమిటి?',
    voicePrompt: 'నమస్కారం! మీ వాయిస్ ద్వారా లోన్ దరఖాస్తును పూర్తి చేయడానికి నేను మీకు సహాయం చేస్తాను.'
  },
  {
    code: 'ml-IN',
    name: 'Malayalam',
    sample: 'നിങ്ങളുടെ പേര് എന്താണ്?',
    voicePrompt: 'നമസ്കാരം! നിങ്ങളുടെ ശബ്ദം ഉപയോഗിച്ച് ലോൺ അപേക്ഷ പൂരിപ്പിക്കാൻ ഞാൻ സഹായിക്കാം.'
  },
  {
    code: 'mr-IN',
    name: 'Marathi',
    sample: 'तुमचे नाव काय आहे?',
    voicePrompt: 'नमस्कार! मी तुमचा कर्ज अर्ज बोलून भरण्यास मदत करेन.'
  }
];

export default function LanguageSelectModal({
  currentLang = 'ta-IN',
  onSelectLanguage,
  onBack,
  onPlayPrompt
}) {
  return (
    <div className="language-modal-page animate-fadeIn">
      {/* Back to Overview Link */}
      <button
        type="button"
        className="btn-back-nav"
        onClick={onBack}
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to overview</span>
      </button>

      {/* Centered Modal Card */}
      <div className="language-card-container">
        <div className="language-card-box">
          <div className="lang-modal-icon-badge">
            <Volume2 className="w-7 h-7 text-emerald-600" />
          </div>

          <div className="lang-modal-tag">VOICE APPLICATION</div>
          <h2 className="lang-modal-title">Choose your language</h2>
          <p className="lang-modal-desc">
            The assistant will speak prompts and listen for your answers in the selected language.
          </p>

          <div className="lang-options-grid">
            {LANGUAGES.map((item) => {
              const isSelected = currentLang === item.code;
              return (
                <div
                  key={item.code}
                  className={`lang-select-tile ${isSelected ? 'active' : ''}`}
                  onClick={() => {
                    onSelectLanguage(item.code);
                    if (onPlayPrompt) {
                      onPlayPrompt(item.voicePrompt, item.code);
                    }
                  }}
                  role="button"
                >
                  <div className="lang-tile-content">
                    <div className="lang-tile-name">{item.name}</div>
                    <div className="lang-tile-sample">{item.sample}</div>
                  </div>
                  <div className="lang-tile-arrow">
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600" />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="lang-modal-footer-note">
            <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0" />
            <span>You can change language before submitting.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
