import React, { useEffect } from 'react';
import {
  CheckCircle,
  Clock,
  Volume2,
  Copy,
  PlusCircle,
  Shield,
  FileCheck,
  CloudUpload,
  WifiOff
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
  const isEnglish = language === 'en-IN';
  const isOffline = receiptData?.is_offline || receiptData?.status === 'saved_offline';

  useEffect(() => {
    if (receiptData?.voice_receipt_text && onPlayReceipt) {
      onPlayReceipt(receiptData.voice_receipt_text, receiptData.audio_base64);
    }
  }, [receiptData]);

  return (
    <div className="receipt-card">
      {/* Header Success Animation */}
      <div className="receipt-icon-wrapper">
        <div className={`success-pulse-ring ${isOffline ? 'bg-amber-500/20' : ''}`} />
        {isOffline ? (
          <CloudUpload className="w-16 h-16 text-amber-400" />
        ) : (
          <CheckCircle className="w-16 h-16 text-emerald-400" />
        )}
      </div>

      <h2 className="receipt-title">
        {isOffline
          ? (isEnglish
              ? "Application Saved Offline Securely!"
              : isTamil
              ? "விண்ணப்பம் ஆஃப்லைனில் பாதுகாக்கப்பட்டது!"
              : isHindi
              ? "आवेदन ऑफ़लाइन सुरक्षित सहेज लिया गया!"
              : "अर्ज ऑफलाइन सुरक्षित जतन झाला!")
          : (isEnglish
              ? "Application Submitted Successfully!"
              : isTamil
              ? "விண்ணப்பம் வெற்றிகரமாக சமர்ப்பிக்கப்பட்டது!"
              : isHindi
              ? "आवेदन सफलतापूर्वक जमा हुआ!"
              : "अर्ज यशस्वीरित्या जमा झाला!")}
      </h2>

      {/* Reference Number Badge */}
      <div className="ref-number-pill">
        <span className="text-xs uppercase text-slate-400">
          {isEnglish ? "Reference Number" : isTamil ? "குறிப்பு எண்" : isHindi ? "संदर्भ संख्या" : "संदर्भ क्रमांक"}
        </span>
        <div className="text-2xl font-black text-amber-300 tracking-wider">
          {receiptData.reference_no}
        </div>
      </div>

      {/* Status Badge */}
      <div className="status-badge-container">
        {isOffline ? (
          <div className="status-pill offline flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-950/70 border border-amber-500/50 text-amber-300 text-xs font-bold">
            <WifiOff className="w-4 h-4 text-amber-400" />
            <span>
              {isEnglish
                ? "Offline Mode: Will automatically sync to bank server when connected"
                : isTamil
                ? "ஆஃப்லைன்: இணையம் வந்ததும் தானாகவே வங்கிக்கு அனுப்பப்படும்"
                : isHindi
                ? "ऑफ़लाइन: इंटरनेट आने पर बैंक में सिंक होगा"
                : "ऑफलाइन: इंटरनेट आल्यावर बँकेत सिंक होईल"}
            </span>
          </div>
        ) : (
          <div className="status-pill pending">
            <Clock className="w-5 h-5 text-amber-400" />
            <span className="font-bold">
              {isEnglish
                ? "Pending Verification"
                : isTamil
                ? "சரிபார்ப்பில் உள்ளது"
                : isHindi
                ? "सत्यापन लंबित"
                : "पडताळणी प्रलंबित"}
            </span>
          </div>
        )}
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
            {isEnglish
              ? "Start New Application"
              : isTamil
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
