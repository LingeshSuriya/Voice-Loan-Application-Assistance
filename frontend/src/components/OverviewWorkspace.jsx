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
            No forms. No typing. Your next application can start with a conversation.
          </p>
        </div>

        <div className="workspace-status-badge">
          <span className="dot-green-pulse" />
          <span className="text-xs font-bold text-emerald-600">Session ready</span>
        </div>
      </div>

      {/* Main Teal Radar Voice Hero Banner */}
      <div className="workspace-voice-hero-card">
        <div className="hero-radar-orbital-wrap">
          <div className="orbital-ring ring-3" />
          <div className="orbital-ring ring-2" />
          <div className="orbital-ring ring-1" />
          <div className="orbital-center-mic-btn" onClick={onStartVoice} role="button">
            <Mic className="w-9 h-9 text-emerald-600" />
          </div>
          <div className="satellite-orbit-dot dot-1" />
          <div className="satellite-orbit-dot dot-2" />
          <div className="satellite-orbit-dot dot-3" />
        </div>

        <div className="hero-voice-text-content">
          <div className="hero-voice-tag">VOICE APPLICATION</div>
          <h2 className="hero-voice-headline">Tell us what you need.</h2>
          <p className="hero-voice-subcopy">
            Speak in Hindi, Tamil or English. We will listen, structure your details and
            read everything back to you.
          </p>

          <button
            type="button"
            className="btn-start-voice-action"
            onClick={onStartVoice}
          >
            <span>Start with voice</span>
            <Mic className="w-4 h-4" />
          </button>

          {/* Workflow Stepper Line */}
          <div className="hero-workflow-steps">
            <div className="workflow-step-chip">
              <Mic className="w-3.5 h-3.5 text-emerald-400" />
              <span>Speak</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-emerald-300 opacity-60" />
            <div className="workflow-step-chip">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Understand</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-emerald-300 opacity-60" />
            <div className="workflow-step-chip">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Confirm</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Feature Cards */}
      <div className="workspace-feature-grid">
        <div
          className="workspace-card-item hover-clickable"
          onClick={onStartVoice}
          role="button"
        >
          <div className="card-item-icon-box bg-emerald-50 text-emerald-600">
            <Languages className="w-5 h-5" />
          </div>
          <div>
            <h3 className="card-item-title">Regional Dialects</h3>
            <p className="card-item-desc">Native voice synthesis in Tamil, Hindi, Marathi, and English.</p>
          </div>
        </div>

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

        <div className="workspace-card-item">
          <div className="card-item-icon-box bg-amber-50 text-amber-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="card-item-title">Responsible Underwriting</h3>
            <p className="card-item-desc">Alternative rural credit scoring with automatic WhatsApp voice alerts.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
