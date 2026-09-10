import React from 'react';
import { Languages, Volume2 } from 'lucide-react';

export default function LanguageSelect({ currentLang, onSelectLang, onPlayPrompt }) {
  const languages = [
    { code: 'ta-IN', label: 'தமிழ் (Tamil)', sub: 'குரல் மூலம் கடன் விண்ணப்பம்' },
    { code: 'hi-IN', label: 'हिंदी (Hindi)', sub: 'बोलकर लोन भरें' },
    { code: 'mr-IN', label: 'मराठी (Marathi)', sub: 'बोलून कर्ज अर्ज भरा' },
  ];

  return (
    <div className="language-selector-bar">
      <div className="flex items-center gap-2 mb-2 justify-center">
        <Languages className="w-5 h-5 text-amber-500" />
        <span className="text-sm font-semibold tracking-wide uppercase text-slate-300">
          மொழி / भाषा / Language
        </span>
      </div>
      <div className="language-grid">
        {languages.map((lang) => {
          const isSelected = currentLang === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              className={`lang-btn ${isSelected ? 'active' : ''}`}
              onClick={() => {
                onSelectLang(lang.code);
                if (onPlayPrompt) onPlayPrompt(lang.code);
              }}
            >
              <div className="font-bold text-lg">{lang.label}</div>
              <div className="text-xs text-slate-400">{lang.sub}</div>
              {isSelected && <span className="lang-indicator-dot" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
