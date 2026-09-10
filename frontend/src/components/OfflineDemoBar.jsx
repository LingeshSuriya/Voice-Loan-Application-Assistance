import React from 'react';
import { Sparkles, CheckCircle, Wifi, Cpu, Layers } from 'lucide-react';

export default function OfflineDemoBar({
  healthData,
  onSelectPreset,
  demoProfiles = []
}) {
  return (
    <div className="demo-top-bar">
      <div className="demo-header-row">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
            Judge / Demo Presets
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="status-pill-small">
            <span className="dot-green" />
            <span>STT: {healthData?.providers?.sarvam_ai === 'active' ? 'Sarvam AI' : 'Fallback/Mock'}</span>
          </div>
          <div className="status-pill-small">
            <span className="dot-green" />
            <span>LLM: {healthData?.providers?.gemini_llm === 'active' ? 'Gemini' : 'Rule NLU'}</span>
          </div>
        </div>
      </div>

      <div className="demo-presets-scroller">
        <span className="text-xs text-slate-400 shrink-0 self-center">
          1-Click Presets:
        </span>
        {demoProfiles.map((p) => (
          <button
            key={p.id}
            type="button"
            className="btn-demo-preset"
            onClick={() => onSelectPreset(p)}
            title={p.transcript}
          >
            {p.title}
          </button>
        ))}
      </div>
    </div>
  );
}
