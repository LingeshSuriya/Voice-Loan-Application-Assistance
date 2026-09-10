import React, { useEffect } from 'react';
import { Volume2, CheckCircle2, Mic } from 'lucide-react';

export default function ConsentBanner({ language, onAccept, onPlayConsent, isSpeaking }) {
  const isTamil = language === 'ta-IN';
  const isHindi = language === 'hi-IN';

  const consentText = isTamil
    ? "வணக்கம்! உங்கள் கடன் விண்ணப்பத்தை குரல் வழியாக நிரப்ப நான் உங்களுக்கு உதவுவேன். உங்கள் குரலை பதிவு செய்யலாமா?"
    : isHindi
    ? "नमस्ते! मैं आपका लोन आवेदन बोलकर भरने में मदद करूँगा। मैं आपकी आवाज़ रिकॉर्ड करूँगा, क्या हम शुरू करें?"
    : "नमस्कार! मी तुमचा कर्ज अर्ज बोलून भरण्यास मदत करेन. मी तुमचा आवाज रेकॉर्ड करेन, आपण सुरू करूया का?";

  const consentAction = isTamil ? "ஆம், தொடங்கலாம்" : (isHindi ? "हाँ, शुरू करें" : "होय, सुरू करा");
  const listenAgain = isTamil ? "மீண்டும் கேட்க" : (isHindi ? "दोबारा सुनें" : "पुन्हा ऐका");

  useEffect(() => {
    // Automatically play voice consent on load
    if (onPlayConsent) {
      onPlayConsent();
    }
  }, [language]);

  return (
    <div className="consent-card">
      <div className="consent-icon-pulse">
        <Volume2 className={`w-12 h-12 text-blue-400 ${isSpeaking ? 'animate-bounce' : ''}`} />
      </div>

      <div className="consent-speech-bubble">
        <p className="consent-quote">"{consentText}"</p>
      </div>

      <div className="consent-actions">
        <button
          type="button"
          className="btn-replay-audio"
          onClick={() => onPlayConsent && onPlayConsent()}
          title="Replay Voice"
        >
          <Volume2 className="w-5 h-5" />
          <span>{listenAgain}</span>
        </button>

        <button
          type="button"
          className="btn-accept-consent"
          onClick={onAccept}
        >
          <CheckCircle2 className="w-7 h-7" />
          <span>{consentAction}</span>
        </button>
      </div>
    </div>
  );
}
