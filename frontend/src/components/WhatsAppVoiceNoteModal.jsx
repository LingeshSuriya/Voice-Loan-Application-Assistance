import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  Volume2,
  Play,
  Pause,
  Download,
  Share2,
  ShieldCheck,
  Building2,
  MessageCircle,
  FileCheck
} from 'lucide-react';

export default function WhatsAppVoiceNoteModal({
  isOpen,
  onClose,
  application,
  onPlayAudio,
  isSpeaking,
  onStopAudio
}) {
  const [isPlayingNote, setIsPlayingNote] = useState(false);

  if (!isOpen || !application) return null;

  const applicantName = application.applicant_name || 'Applicant';
  const refNo = application.reference_no || 'AGR-2026';
  const amount = application.sanctioned_amount || application.loan_amount || 40000;
  const emi = application.monthly_emi || Math.round((amount * 0.09) / 1);
  const tenure = application.tenure_months || 12;
  const risk = application.risk_tier || 'LOW';
  const voiceText = application.whatsapp_voice_text || (
    application.language === 'ta-IN'
      ? `வணக்கம் ${applicantName}, உங்களுடைய ₹${Number(amount).toLocaleString('en-IN')} கடன் அனுமதிக்கப்பட்டது. மாத தவணை ₹${Number(emi).toLocaleString('en-IN')}. 24 மணிநேரத்தில் வங்கி கணக்கில் வரவு வைக்கப்படும்.`
      : `नमस्ते ${applicantName}, आपका ₹${Number(amount).toLocaleString('en-IN')} का लोन स्वीकृत किया गया है। मासिक किस्त ₹${Number(emi).toLocaleString('en-IN')} होगी।`
  );

  const handleToggleVoiceNote = () => {
    if (isSpeaking || isPlayingNote) {
      if (onStopAudio) onStopAudio();
      setIsPlayingNote(false);
    } else {
      setIsPlayingNote(true);
      if (onPlayAudio) {
        onPlayAudio(voiceText, application.language);
      }
    }
  };

  const handleDownloadSanctionLetter = () => {
    window.print();
  };

  return (
    <div className="whatsapp-modal-backdrop animate-fadeIn">
      <div className="whatsapp-modal-window">
        {/* WhatsApp Top Header Bar */}
        <div className="whatsapp-top-bar">
          <div className="flex items-center gap-3">
            <div className="whatsapp-avatar-badge">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="whatsapp-bot-name">VoiceLoan MFI Assistant</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-white fill-emerald-500" />
              </div>
              <span className="whatsapp-online-sub">Official Lending Channel • Online</span>
            </div>
          </div>

          <button
            type="button"
            className="whatsapp-close-icon"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* WhatsApp Chat Body */}
        <div className="whatsapp-chat-body">
          <div className="whatsapp-timestamp-pill">TODAY</div>

          {/* Chat Bubble with Big Green Tick Sanction Card */}
          <div className="whatsapp-bubble-card">
            <div className="sanction-banner-strip">
              <div className="sanction-tick-circle">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 fill-emerald-100" />
              </div>
              <h3 className="sanction-header-title">LOAN SANCTION PRE-APPROVED</h3>
              <p className="sanction-header-subtitle">
                Application Ref: <strong className="text-emerald-900">{refNo}</strong>
              </p>
            </div>

            {/* Financial Parameters */}
            <div className="sanction-details-grid">
              <div className="sanction-param-row">
                <span className="param-label">Applicant Name</span>
                <span className="param-val font-bold">{applicantName}</span>
              </div>
              <div className="sanction-param-row">
                <span className="param-label">Sanctioned Amount</span>
                <span className="param-val text-emerald-700 font-extrabold text-lg">
                  ₹{Number(amount).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="sanction-param-row">
                <span className="param-label">Monthly EMI</span>
                <span className="param-val text-blue-700 font-bold">
                  ₹{Number(emi).toLocaleString('en-IN')} / month
                </span>
              </div>
              <div className="sanction-param-row">
                <span className="param-label">Loan Tenure</span>
                <span className="param-val">{tenure} Months</span>
              </div>
              <div className="sanction-param-row">
                <span className="param-label">Risk Evaluation</span>
                <span className={`risk-badge-pill ${risk.toLowerCase()}`}>
                  {risk} RISK • DTI Healthy
                </span>
              </div>
              <div className="sanction-param-row">
                <span className="param-label">Disbursal Target</span>
                <span className="param-val text-xs text-slate-700 font-medium">
                  Direct to Bank Account within 24 Hours
                </span>
              </div>
            </div>

            {/* Embedded WhatsApp Audio Voice Note */}
            <div className="whatsapp-voice-note-card">
              <button
                type="button"
                className={`btn-play-voicenote ${isSpeaking ? 'active' : ''}`}
                onClick={handleToggleVoiceNote}
                title="Play Audio Voice Note"
              >
                {isSpeaking ? (
                  <Pause className="w-5 h-5 text-white" />
                ) : (
                  <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                )}
              </button>

              <div className="voicenote-waveform-wrap">
                <div className="voicenote-bars">
                  {[40, 70, 90, 60, 100, 50, 80, 65, 45, 85, 95, 60, 40, 75, 90, 50].map((h, i) => (
                    <div
                      key={i}
                      className={`waveform-bar ${isSpeaking ? 'animate-pulse' : ''}`}
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-[11px] font-semibold text-slate-500">
                    {isSpeaking ? 'Playing Voice Note...' : 'Regional Audio Sanction Note'}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">0:14</span>
                </div>
              </div>

              <div className="whatsapp-mic-badge">
                <Volume2 className="w-4 h-4 text-emerald-600" />
              </div>
            </div>

            {/* Transcript Preview */}
            <div className="whatsapp-transcription-preview">
              <span className="font-semibold text-slate-700">Audio Message: </span>
              <span className="text-slate-600 italic">"{voiceText}"</span>
            </div>

            <div className="whatsapp-bubble-time">
              <span>Verified by Rural Underwriting Engine</span>
              <span>12:30 PM • ✓✓</span>
            </div>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="whatsapp-modal-actions">
          <button
            type="button"
            className="btn-download-pdf-green"
            onClick={handleDownloadSanctionLetter}
          >
            <Download className="w-4 h-4" />
            <span>Download Sanction Letter (PDF)</span>
          </button>
          <button
            type="button"
            className="btn-close-gray"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
