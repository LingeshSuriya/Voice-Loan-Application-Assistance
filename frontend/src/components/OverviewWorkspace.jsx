import React from 'react';
import {
  Mic,
  Volume2,
  ChevronRight,
  Zap,
  CheckCircle2,
  Sparkles,
  FileText,
  ShieldCheck,
  Languages
} from 'lucide-react';

export default function OverviewWorkspace({
  user,
  onStartVoice,
  onViewApplications,
  language = 'ta-IN'
}) {
  const [showUnderwritingModal, setShowUnderwritingModal] = React.useState(false);
  const userName = user?.full_name?.toUpperCase() || 'MOHAMED';

  return (
    <div className="workspace-overview-container animate-fadeIn">
      {/* Top Greeting Header */}
      <div className="workspace-hero-header">
        <div>
          <div className="workspace-prelabel">YOUR VOICE WORKSPACE</div>
          <h1 className="workspace-greeting-title">
            Hello, {userName} <span className="wave-hand">👋</span>
          </h1>
          <p className="workspace-greeting-sub">
            Welcome to your regional voice lending portal. Speak naturally to apply or review your loan pipeline.
          </p>
        </div>

        <div className="workspace-lang-pill">
          <Languages className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-bold text-slate-700">
            {language === 'ta-IN' ? 'தமிழ் (Tamil)'
              : language === 'hi-IN' ? 'हिन्दी (Hindi)'
              : language === 'te-IN' ? 'తెలుగు (Telugu)'
              : language === 'ml-IN' ? 'മലയാളം (Malayalam)'
              : language === 'mr-IN' ? 'मराठी (Marathi)'
              : 'English'}
          </span>
        </div>
      </div>

      {/* Main Big Voice Hero Card */}
      <div className="workspace-voice-hero-card">
        <div className="hero-card-left">
          <div className="hero-status-pill">
            <span className="dot-green" />
            <span>VOICE PORTAL ACTIVE</span>
          </div>

          <h2 className="hero-callout-title">Start a New Voice Loan Application</h2>
          <p className="hero-callout-desc">
            Speak in your mother tongue. The intelligent agent asks key questions, fills your application, and runs instant automated underwriting.
          </p>

          <div className="hero-workflow-steps">
            <div className="workflow-step-pill">
              <span className="step-num">1</span>
              <span>Speak Details</span>
            </div>
            <span className="step-arrow">→</span>
            <div className="workflow-step-pill">
              <span className="step-num">2</span>
              <span>Verify Answers</span>
            </div>
            <span className="step-arrow">→</span>
            <div className="workflow-step-pill">
              <span className="step-num">3</span>
              <span>Instant Sanction</span>
            </div>
          </div>

          <button
            type="button"
            className="btn-start-voice-action"
            onClick={onStartVoice}
          >
            <Mic className="w-5 h-5 text-white animate-pulse" />
            <span>Start Voice Application</span>
            <ChevronRight className="w-4 h-4 text-emerald-200" />
          </button>
        </div>

        <div className="hero-card-right">
          <div className="hero-radar-orbital-wrap" onClick={onStartVoice} role="button">
            <div className="orbital-ring ring-3" />
            <div className="orbital-ring ring-2" />
            <div className="orbital-ring ring-1" />
            <div className="orbital-center-mic">
              <Mic className="w-9 h-9 text-emerald-400" />
            </div>
          </div>
          <div className="text-center text-xs text-emerald-200 font-medium mt-3">
            Click to start recording
          </div>
        </div>
      </div>

      {/* Bottom 2-Column Feature Cards */}
      <div className="workspace-feature-grid">
        <div
          className="workspace-card-item hover-clickable"
          onClick={onViewApplications}
          role="button"
        >
          <div className="card-item-icon-box bg-blue-50 text-blue-600">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="card-item-title">My Applications</h3>
            <p className="card-item-desc">Track real-time credit underwriting, risk tiers, and sanction receipts.</p>
          </div>
        </div>

        <div
          className="workspace-card-item hover-clickable"
          onClick={() => setShowUnderwritingModal(true)}
          role="button"
          title="Click to view transparent rural underwriting criteria"
        >
          <div className="card-item-icon-box bg-amber-50 text-amber-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="card-item-title flex items-center gap-2">
              <span>Responsible Underwriting</span>
              <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">Explore Criteria</span>
            </h3>
            <p className="card-item-desc">Alternative rural credit scoring with automatic WhatsApp voice alerts.</p>
          </div>
        </div>
      </div>

      {/* Responsible Underwriting Criteria Modal */}
      {showUnderwritingModal && (
        <div className="whatsapp-modal-backdrop animate-fadeIn">
          <div className="underwriting-info-modal animate-scaleUp">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Responsible Rural Underwriting Framework</h3>
                  <p className="text-xs text-slate-500">Transparent evaluation criteria for rural borrowers</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowUnderwritingModal(false)}
                className="text-slate-400 hover:text-slate-700 text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-4 text-xs text-slate-600">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                <div className="font-bold text-slate-800 text-sm mb-1 flex items-center justify-between">
                  <span>1. Debt-to-Income / FOIR (Fixed Obligation Ratio)</span>
                  <span className="text-emerald-700 font-mono font-bold">Target ≤ 40%</span>
                </div>
                <p>
                  Calculates <strong>Monthly EMI / Monthly Income</strong>. Borrowers with FOIR ≤ 35% receive maximum alternative points bonus (+95 pts) and qualify for immediate 100% loan disbursement.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                <div className="font-bold text-slate-800 text-sm mb-1 flex items-center justify-between">
                  <span>2. Alternative Credit Score Model</span>
                  <span className="text-blue-700 font-mono font-bold">300 - 850 Scale</span>
                </div>
                <p>
                  Rural applicants often lack traditional CIBIL bureau history (New-to-Credit / NTC). We score based on verifiable proxy signals:
                </p>
                <ul className="list-disc list-inside mt-1.5 space-y-1 text-slate-700">
                  <li><strong>Base Score:</strong> 620 points</li>
                  <li><strong>Self-Help Group (JLG) Peer Trust:</strong> +45 points</li>
                  <li><strong>Utility & Mobile Recharge Discipline:</strong> +30 points</li>
                  <li><strong>Aadhaar Authenticity Verification:</strong> +20 points</li>
                </ul>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                <div className="font-bold text-slate-800 text-sm mb-1">
                  <span>3. Sanction & Risk Tiering Rules</span>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2 text-center">
                  <div className="bg-emerald-50 border border-emerald-200 p-2 rounded-lg">
                    <div className="font-bold text-emerald-800">LOW RISK</div>
                    <div className="text-[11px] text-emerald-600 mt-0.5">FOIR ≤ 35% • Score ≥ 680</div>
                    <div className="text-[10px] text-emerald-700 font-semibold mt-1">100% Pre-Approved</div>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 p-2 rounded-lg">
                    <div className="font-bold text-amber-800">MEDIUM RISK</div>
                    <div className="text-[11px] text-amber-600 mt-0.5">FOIR ≤ 50% • Score ≥ 600</div>
                    <div className="text-[10px] text-amber-700 font-semibold mt-1">Approved with Peer Check</div>
                  </div>
                  <div className="bg-rose-50 border border-rose-200 p-2 rounded-lg">
                    <div className="font-bold text-rose-800">HIGH RISK</div>
                    <div className="text-[11px] text-rose-600 mt-0.5">FOIR &gt; 50%</div>
                    <div className="text-[10px] text-rose-700 font-semibold mt-1">75% Cap + Field Officer Review</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                className="btn-close-gray text-xs"
                onClick={() => setShowUnderwritingModal(false)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn-modal-primary-teal text-xs"
                onClick={() => {
                  setShowUnderwritingModal(false);
                  onViewApplications();
                }}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>View Applications & Risk Decisions</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
