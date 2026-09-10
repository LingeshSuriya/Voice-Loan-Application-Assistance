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
  FileCheck,
  Printer,
  FileText
} from 'lucide-react';

export default function WhatsAppVoiceNoteModal({
  isOpen,
  onClose,
  application,
  onPlayAudio,
  isSpeaking,
  onStopAudio
}) {
  const [activeTab, setActiveTab] = useState('whatsapp'); // 'whatsapp' | 'regional_receipt' | 'bank_letter'
  const [isPlayingNote, setIsPlayingNote] = useState(false);

  useEffect(() => {
    if (!isSpeaking) {
      setIsPlayingNote(false);
    }
  }, [isSpeaking]);

  if (!isOpen || !application) return null;

  const applicantName = application.applicant_name || 'Applicant';
  const refNo = application.reference_no || 'AGR-2026';
  const amount = application.sanctioned_amount || application.loan_amount || 40000;
  const emi = application.monthly_emi || Math.round((amount * 0.088) / 1);
  const tenure = application.tenure_months || 12;
  const risk = application.risk_tier || 'LOW';
  const address = application.village_or_address || 'Rural Center';
  const purpose = application.loan_purpose || 'Agriculture & Enterprise';
  const lang = application.language || 'ta-IN';
  const aadhaarLast4 = application.aadhaar_last4 || '3210';
  const phone = application.user_phone ? `+91 ${application.user_phone}` : '+91 98765 43210';

  const voiceText = application.whatsapp_voice_text || (
    lang === 'ta-IN'
      ? `வணக்கம் ${applicantName}. உங்களுடைய ரூபாய் ${Number(amount).toLocaleString('en-IN')} கடன் அனுமதிக்கப்பட்டது. மாத தவணை ரூபாய் ${Number(emi).toLocaleString('en-IN')}. 24 மணிநேரத்தில் வங்கி கணக்கில் வரவு வைக்கப்படும்.`
      : (lang === 'hi-IN'
          ? `नमस्ते ${applicantName}। आपका रुपये ${Number(amount).toLocaleString('en-IN')} का लोन स्वीकृत किया गया है। मासिक किस्त रुपये ${Number(emi).toLocaleString('en-IN')} होगी।`
          : `Hello ${applicantName}. Your loan of ${Number(amount).toLocaleString('en-IN')} rupees is approved! Monthly EMI will be ${Number(emi).toLocaleString('en-IN')} rupees.`)
  );

  const handleToggleVoiceNote = () => {
    if (isSpeaking || isPlayingNote) {
      if (onStopAudio) onStopAudio();
      setIsPlayingNote(false);
    } else {
      setIsPlayingNote(true);
      if (onPlayAudio) {
        onPlayAudio(voiceText, lang);
      }
    }
  };

  const handleTriggerPrint = () => {
    window.print();
  };

  return (
    <div className="whatsapp-modal-backdrop animate-fadeIn">
      <div className="whatsapp-modal-window">
        {/* Navigation & Mode Switcher (Hidden in Print) */}
        <div className="whatsapp-top-bar no-print">
          <div className="flex items-center gap-3">
            <div className="whatsapp-avatar-badge">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="whatsapp-bot-name">VoiceLoan Microfinance</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-white fill-emerald-500" />
              </div>
              <span className="whatsapp-online-sub">Digital Lending & Document Center</span>
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

        {/* Tab Toggle Bar (Hidden in Print) */}
        <div className="doc-tabs-bar no-print">
          <button
            type="button"
            className={`doc-tab-pill ${activeTab === 'whatsapp' ? 'active' : ''}`}
            onClick={() => setActiveTab('whatsapp')}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>WhatsApp Voice Card</span>
          </button>

          <button
            type="button"
            className={`doc-tab-pill ${activeTab === 'regional_receipt' ? 'active' : ''}`}
            onClick={() => setActiveTab('regional_receipt')}
          >
            <FileCheck className="w-3.5 h-3.5" />
            <span>Borrower Receipt ({lang === 'ta-IN' ? 'தமிழ்' : lang === 'hi-IN' ? 'हिन्दी' : 'Regional'})</span>
          </button>

          <button
            type="button"
            className={`doc-tab-pill ${activeTab === 'bank_letter' ? 'active' : ''}`}
            onClick={() => setActiveTab('bank_letter')}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Official Bank Sanction (English)</span>
          </button>
        </div>

        {/* TAB 1: WhatsApp Voice Note View */}
        {activeTab === 'whatsapp' && (
          <div className="whatsapp-chat-body no-print animate-fadeIn">
            <div className="whatsapp-timestamp-pill">TODAY</div>

            {/* Chat Bubble with Sanction Card */}
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
                    {risk} RISK • Verified
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
                      {isSpeaking ? 'Playing Voice Note (Sarvam AI)...' : 'Regional Voice Note Alert'}
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
        )}

        {/* TAB 2: Regional Language Borrower Receipt (Printable) */}
        {activeTab === 'regional_receipt' && (
          <div className="printable-document-pane animate-fadeIn">
            <div className="receipt-paper-box">
              <div className="receipt-header-strip">
                <div>
                  <div className="receipt-bank-title">VOICELOAN MICROFINANCE SERVICES</div>
                  <div className="receipt-doc-title">
                    {lang === 'ta-IN' ? 'கடன் ஒப்புதல் ஒப்புகை ரசீது' : (lang === 'hi-IN' ? 'ऋण स्वीकृति पावती रसीद' : 'Borrower Sanction Acknowledgement')}
                  </div>
                </div>
                <div className="text-right">
                  <div className="receipt-ref-code">{refNo}</div>
                  <div className="receipt-date-text">DATE: {new Date().toLocaleDateString('en-IN')}</div>
                </div>
              </div>

              <div className="receipt-info-grid">
                <div className="receipt-info-item">
                  <span className="receipt-label">{lang === 'ta-IN' ? 'விண்ணப்பதாரர் பெயர்' : 'Applicant Name'}</span>
                  <span className="receipt-value font-bold">{applicantName}</span>
                </div>
                <div className="receipt-info-item">
                  <span className="receipt-label">{lang === 'ta-IN' ? 'கிராமம் / முகவரி' : 'Village / Address'}</span>
                  <span className="receipt-value">{address}</span>
                </div>
                <div className="receipt-info-item">
                  <span className="receipt-label">{lang === 'ta-IN' ? 'தொலைபேசி' : 'Phone'}</span>
                  <span className="receipt-value font-mono">{phone}</span>
                </div>
                <div className="receipt-info-item">
                  <span className="receipt-label">{lang === 'ta-IN' ? 'ஆதார் கடைசி 4' : 'Aadhaar (Last 4)'}</span>
                  <span className="receipt-value font-mono">•••• {aadhaarLast4}</span>
                </div>
              </div>

              <div className="receipt-highlight-banner">
                <div className="receipt-col">
                  <div className="receipt-sm-label">{lang === 'ta-IN' ? 'ஒப்புதல் அளிக்கப்பட்ட கடன்' : 'Sanctioned Amount'}</div>
                  <div className="receipt-big-amount">₹{Number(amount).toLocaleString('en-IN')}</div>
                </div>
                <div className="receipt-col">
                  <div className="receipt-sm-label">{lang === 'ta-IN' ? 'மாதாந்திர தவணை (EMI)' : 'Monthly Installment'}</div>
                  <div className="receipt-big-emi">₹{Number(emi).toLocaleString('en-IN')} / மாதம்</div>
                </div>
                <div className="receipt-col">
                  <div className="receipt-sm-label">{lang === 'ta-IN' ? 'கால அளவு' : 'Tenure'}</div>
                  <div className="receipt-med-val">{tenure} {lang === 'ta-IN' ? 'மாதங்கள்' : 'Months'}</div>
                </div>
              </div>

              <div className="receipt-note-box">
                <strong>{lang === 'ta-IN' ? 'குறிப்பு:' : 'Note:'}</strong>{' '}
                {lang === 'ta-IN'
                  ? `இந்த கடன் ${purpose} தொழில் வளர்ச்சிக்காக வழங்கப்பட்டுள்ளது. தொகை 24 மணிநேரத்திற்குள் உங்கள் ஆதார் இணைக்கப்பட்ட வங்கிக் கணக்கில் நேரடியாக வரவு வைக்கப்படும்.`
                  : `This credit facility has been sanctioned for ${purpose}. Funds will be credited directly to your Aadhaar-linked bank account within 24 hours.`}
              </div>

              <div className="receipt-footer-signatures">
                <div className="receipt-sig-block">
                  <div className="sig-line" />
                  <span>{lang === 'ta-IN' ? 'விண்ணப்பதாரர் கையொப்பம்' : "Borrower's Signature"}</span>
                </div>
                <div className="receipt-sig-block text-right">
                  <div className="bank-seal-stamp">VOICELOAN MFI • VERIFIED</div>
                  <span>{lang === 'ta-IN' ? 'அங்கீகரிக்கப்பட்ட வங்கி அதிகாரி' : 'Authorized Bank Signatory'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Official Bank Loan Sanction Letter (English Formal) */}
        {activeTab === 'bank_letter' && (
          <div className="printable-document-pane animate-fadeIn">
            <div className="bank-letter-paper">
              {/* Bank Header Letterhead */}
              <div className="bank-letterhead">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-slate-900 text-white rounded-lg flex items-center justify-center font-extrabold text-xl">
                    VL
                  </div>
                  <div>
                    <h2 className="bank-legal-name">VOICELOAN MICROFINANCE BANK OF INDIA</h2>
                    <p className="bank-sub-dept">Rural Financial Inclusion & Digital Underwriting Division</p>
                    <p className="bank-sub-address">Registered Office: Bandra Kurla Complex, Mumbai / Regional Hub Chennai</p>
                  </div>
                </div>
                <div className="text-right font-mono text-xs">
                  <div><strong>REF:</strong> {refNo}</div>
                  <div><strong>DATE:</strong> {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                </div>
              </div>

              <hr className="bank-divider" />

              {/* Recipient */}
              <div className="bank-recipient-box">
                <div><strong>To:</strong></div>
                <div className="font-bold text-slate-900">{applicantName}</div>
                <div>{address}</div>
                <div>Contact: {phone} • Aadhaar Ref: XXXX-XXXX-{aadhaarLast4}</div>
              </div>

              {/* Subject */}
              <div className="bank-subject-line">
                <strong>SUBJECT: IN-PRINCIPLE SANCTION OF MICRO-ENTERPRISE CREDIT FACILITY</strong>
              </div>

              <p className="bank-body-intro">
                Dear {applicantName},<br />
                With reference to your digital voice application submitted under the VoiceLoan Rural In-Principle Lending Program, we are pleased to convey the sanction of credit facility subject to the terms and conditions outlined below:
              </p>

              {/* Loan Terms Table */}
              <table className="bank-terms-table">
                <tbody>
                  <tr>
                    <td className="term-name">Sanctioned Loan Amount</td>
                    <td className="term-val font-bold text-emerald-800">₹{Number(amount).toLocaleString('en-IN')} (Rupees {Number(amount).toLocaleString('en-IN')} Only)</td>
                  </tr>
                  <tr>
                    <td className="term-name">Purpose of Facility</td>
                    <td className="term-val">{purpose}</td>
                  </tr>
                  <tr>
                    <td className="term-name">Applicable Interest Rate</td>
                    <td className="term-val">8.50% p.a. (Reducing Balance Basis)</td>
                  </tr>
                  <tr>
                    <td className="term-name">Facility Tenure</td>
                    <td className="term-val">{tenure} Months</td>
                  </tr>
                  <tr>
                    <td className="term-name">Monthly Installment (EMI)</td>
                    <td className="term-val font-bold">₹{Number(emi).toLocaleString('en-IN')} / month</td>
                  </tr>
                  <tr>
                    <td className="term-name">Risk Classification</td>
                    <td className="term-val">{risk} RISK GRADE (Underwriting Clearance Code: DTI-OK)</td>
                  </tr>
                  <tr>
                    <td className="term-name">Disbursement Mode</td>
                    <td className="term-val">Direct Benefit Transfer (DBT) into Aadhaar Seeded Account within 24 Hours</td>
                  </tr>
                </tbody>
              </table>

              <div className="bank-conditions-box">
                <strong>Standard Disbursal Conditions:</strong>
                <ol className="list-decimal list-inside mt-1 space-y-1 text-slate-700">
                  <li>The borrower undertakes to utilize funds strictly for the specified productive enterprise.</li>
                  <li>Repayment must be honored monthly on or before the 5th of each calendar month.</li>
                  <li>This in-principle sanction is issued through our automated voice underwriting engine.</li>
                </ol>
              </div>

              {/* Signatures & Seal */}
              <div className="bank-letter-footer">
                <div className="sig-column">
                  <div className="sig-space" />
                  <div className="sig-title">Accepted By Borrower</div>
                  <div className="sig-subtitle">({applicantName})</div>
                </div>

                <div className="sig-column text-right">
                  <div className="digital-stamp">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 inline mr-1" />
                    DIGITALLY AUTHORIZED
                  </div>
                  <div className="sig-title">Authorized Officer</div>
                  <div className="sig-subtitle">Voice Underwriting Division, VoiceLoan Bank</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Bottom Action Buttons (Hidden in Print) */}
        <div className="whatsapp-modal-actions no-print">
          <div className="flex items-center gap-2">
            {activeTab === 'whatsapp' ? (
              <>
                <button
                  type="button"
                  className="btn-download-pdf-green"
                  onClick={() => setActiveTab('regional_receipt')}
                >
                  <FileCheck className="w-4 h-4" />
                  <span>Borrower Receipt</span>
                </button>
                <button
                  type="button"
                  className="btn-download-pdf-blue"
                  onClick={() => setActiveTab('bank_letter')}
                >
                  <Building2 className="w-4 h-4" />
                  <span>Bank Sanction Letter</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn-download-pdf-green"
                onClick={handleTriggerPrint}
              >
                <Printer className="w-4 h-4" />
                <span>Print / Save as PDF</span>
              </button>
            )}
          </div>

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
