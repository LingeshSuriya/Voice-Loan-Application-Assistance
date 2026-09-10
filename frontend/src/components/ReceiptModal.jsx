import React, { useEffect } from 'react';
import {
  CheckCircle,
  Clock,
  Volume2,
  Copy,
  PlusCircle,
  Shield,
  FileCheck
} from 'lucide-react';

export default function ReceiptModal({
  receiptData,
  language = 'hi-IN',
  onNewApplication,
  onPlayReceipt,
  isSpeaking
}) {
  const isTamil = language === 'ta-IN';
  const isHindi = language === 'hi-IN';

  useEffect(() => {
    if (receiptData?.voice_receipt_text && onPlayReceipt) {
      onPlayReceipt(receiptData.voice_receipt_text, receiptData.audio_base64);
    }
  }, [receiptData]);

  return (
    <div className="receipt-card">
      {/* Header Success Animation */}
      <div className="receipt-icon-wrapper">
        <div className="success-pulse-ring" />
        <CheckCircle className="w-16 h-16 text-emerald-400" />
      </div>

      <h2 className="receipt-title">
        {isTamil
          ? "விண்ணப்பம் வெற்றிகரமாக சமர்ப்பிக்கப்பட்டது!"
          : isHindi
          ? "आवेदन सफलतापूर्वक जमा हुआ!"
          : "अर्ज यशस्वीरित्या जमा झाला!"}
      </h2>

      {/* Reference Number Badge */}
      <div className="ref-number-pill">
        <span className="text-xs uppercase text-slate-400">
          {isTamil ? "குறிப்பு எண் / Reference No" : isHindi ? "संदर्भ संख्या / Reference No" : "संदर्भ क्रमांक"}
        </span>
        <div className="text-2xl font-black text-amber-300 tracking-wider">
          {receiptData.reference_no}
        </div>
      </div>

      {/* Status Badge - Explicitly "pending verification" */}
      <div className="status-badge-container">
        <div className="status-pill pending">
          <Clock className="w-5 h-5 text-amber-400" />
          <span className="font-bold">
            {isTamil
              ? "சரிபார்ப்பில் உள்ளது (Pending Verification)"
              : isHindi
              ? "सत्यापन लंबित (Pending Verification)"
              : "पडताळणी प्रलंबित (Pending Verification)"}
          </span>
        </div>
      </div>

      {/* Spoken Receipt Voice Audio Replay */}
      <div className="receipt-speech-box">
        <button
          type="button"
          className={`btn-receipt-voice ${isSpeaking ? 'pulse-border' : ''}`}
          onClick={() => onPlayReceipt && onPlayReceipt(receiptData.voice_receipt_text, receiptData.audio_base64)}
        >
          <Volume2 className="w-6 h-6 text-blue-400 shrink-0" />
          <span className="text-xs text-slate-200">
            "{receiptData.voice_receipt_text}"
          </span>
        </button>
      </div>

      {/* Downstream KYC Disclaimer (Scope requirement) */}
      <div className="kyc-disclaimer-box">
        <Shield className="w-5 h-5 text-slate-400 shrink-0" />
        <p className="text-xs text-slate-300">
          {receiptData.disclaimer || "Identity verification happens downstream via the lender's existing KYC pipeline before any disbursal."}
        </p>
      </div>

      {/* Action to start new application */}
      <div className="mt-6 flex flex-col gap-2">
        <button
          type="button"
          className="btn-new-app"
          onClick={onNewApplication}
        >
          <PlusCircle className="w-5 h-5" />
          <span>
            {isTamil
              ? "புதிய விண்ணப்பத்தை தொடங்க"
              : isHindi
              ? "नया आवेदन शुरू करें"
              : "नवीन अर्ज सुरू करा"}
          </span>
        </button>
      </div>
    </div>
  );
}
