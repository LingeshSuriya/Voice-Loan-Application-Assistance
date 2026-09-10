import React, { useEffect } from 'react';
import {
  User,
  MapPin,
  IndianRupee,
  Briefcase,
  TrendingUp,
  Coins,
  ShieldCheck,
  Volume2,
  Send,
  RotateCcw,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { formatFieldValue, formatCurrency } from '../utils/formatters';

const FIELD_CONFIG = [
  { key: 'applicant_name', icon: User, labelTa: 'விண்ணப்பதாரர் பெயர்', labelHi: 'आवेदक का नाम', labelMr: 'अर्जदाराचे नाव', labelEn: 'Applicant Name' },
  { key: 'village_or_address', icon: MapPin, labelTa: 'ஊர் / முகவரி', labelHi: 'गाँव / पता', labelMr: 'गाव / पत्ता', labelEn: 'City / Address' },
  { key: 'loan_amount', icon: IndianRupee, labelTa: 'கடன் தொகை', labelHi: 'लोन राशि', labelMr: 'कर्ज रक्कम', labelEn: 'Loan Amount', isCurrency: true },
  { key: 'loan_purpose', icon: Briefcase, labelTa: 'கடன் நோக்கம்', labelHi: 'लोन का उद्देश्य', labelMr: 'कर्जाचे कारण', labelEn: 'Loan Purpose' },
  { key: 'monthly_income', icon: TrendingUp, labelTa: 'மாத வருமானம்', labelHi: 'मासिक कमाई', labelMr: 'मासिक उत्पन्न', labelEn: 'Monthly Income', isCurrency: true },
  { key: 'income_source', icon: Coins, labelTa: 'வருமான ஆதாரம்', labelHi: 'कमाई का साधन', labelMr: 'उत्पन्नाचे साधन', labelEn: 'Source of Income' },
  { key: 'aadhaar_last4', icon: ShieldCheck, labelTa: 'ஆதார் கடைசி 4 எண்கள்', labelHi: 'आधार अंतिम 4 अंक', labelMr: 'आधार शेवटचे 4 अंक', labelEn: 'Aadhaar Last 4 Digits', isAadhaar: true },
];

export default function ApplicationSummary({
  formData = {},
  language = 'en-IN',
  onSubmit,
  isSubmitting,
  onPlaySummary,
  onEditField,
  isSpeaking
}) {
  const isTamil = language === 'ta-IN';
  const isHindi = language === 'hi-IN';
  const isEnglish = language === 'en-IN';

  const nameVal = formatFieldValue(formData.applicant_name);
  const addrVal = formatFieldValue(formData.village_or_address);
  const amtVal = formatCurrency(formData.loan_amount, language);
  const purpVal = formatFieldValue(formData.loan_purpose);
  const incVal = formatCurrency(formData.monthly_income, language);

  // Construct complete spoken summary
  const summaryText = isEnglish
    ? `Your loan application is ready. Name: ${nameVal || 'Not provided'}, Address: ${addrVal || 'Not provided'}, Loan Amount: ${amtVal || 'Not provided'}, Purpose: ${purpVal || 'Not provided'}, Monthly Income: ${incVal || 'Not provided'}. Shall I submit this application to the bank?`
    : isTamil
    ? `உங்கள் கடன் விண்ணப்பம் தயாராக உள்ளது. பெயர்: ${nameVal || 'குறிப்பிடப்படவில்லை'}, ஊர்: ${addrVal || 'குறிப்பிடப்படவில்லை'}, கடன் தொகை: ${amtVal || 'குறிப்பிடப்படவில்லை'}, நோக்கம்: ${purpVal || 'குறிப்பிடப்படவில்லை'}, மாத வருமானம்: ${incVal || 'குறிப்பிடப்படவில்லை'}. இதை வங்கியில் சமர்ப்பிக்கலாமா?`
    : isHindi
    ? `आपका आवेदन तैयार है। नाम: ${nameVal || 'अज्ञात'}, गाँव: ${addrVal || 'अज्ञात'}, लोन राशि: ${amtVal || 'अज्ञात'}, उद्देश्य: ${purpVal || 'अज्ञात'}, मासिक कमाई: ${incVal || 'अज्ञात'}। क्या मैं इसे जमा कर दूँ?`
    : `तुमचा अर्ज तयार आहे. नाव: ${nameVal || 'अज्ञात'}, गाव: ${addrVal || 'अज्ञात'}, कर्ज रक्कम: ${amtVal || 'अज्ञात'}, कारण: ${purpVal || 'अज्ञात'}, मासिक उत्पन्न: ${incVal || 'अज्ञात'}। मी हा अर्ज जमा करू का?`;

  useEffect(() => {
    if (onPlaySummary) {
      onPlaySummary(summaryText);
    }
  }, []);

  return (
    <div className="summary-container">
      <div className="summary-header">
        <div className="flex items-center gap-2 justify-center mb-1">
          <FileText className="w-6 h-6 text-emerald-400" />
          <h2 className="text-xl font-bold text-white">
            {isEnglish ? "Application Summary" : isTamil ? "விண்ணப்ப சுருக்கம்" : isHindi ? "आवेदन सारांश" : "अर्ज सारांश"}
          </h2>
        </div>
        <p className="text-xs text-slate-300 text-center">
          {isEnglish
            ? "Please review all your details and submit to bank"
            : isTamil
            ? "தயவுசெய்து உங்கள் விவரங்களை சரிபார்த்து சமர்ப்பிக்கவும்"
            : isHindi
            ? "कृपया अपने सभी विवरण जांच लें और जमा करें"
            : "कृपया तुमचे सर्व तपशील तपासा आणि जमा करा"}
        </p>

        {/* Listen Again Button */}
        <button
          type="button"
          className={`btn-listen-summary ${isSpeaking ? 'pulse-border' : ''}`}
          onClick={() => onPlaySummary && onPlaySummary(summaryText)}
        >
          <Volume2 className="w-5 h-5 text-amber-400" />
          <span>
            {isEnglish
              ? "Listen to Full Application"
              : isTamil
              ? "முழு விண்ணப்பத்தையும் கேட்க"
              : isHindi
              ? "पूरा आवेदन बोलकर सुनें"
              : "पूर्ण अर्ज ऐका"}
          </span>
        </button>
      </div>

      {/* Summary Items Grid */}
      <div className="summary-fields-list">
        {FIELD_CONFIG.map((field) => {
          const Icon = field.icon;
          const val = formData[field.key];
          let displayVal = formatFieldValue(val) || (isEnglish ? "Not provided" : isTamil ? "இல்லை" : isHindi ? "अनुपलब्ध" : "उपलब्ध नाही");
          if (field.isCurrency && val) {
            displayVal = formatCurrency(val, language);
          } else if (field.isAadhaar && val) {
            displayVal = `XXXX-XXXX-${val}`;
          }

          return (
            <div key={field.key} className="summary-field-row">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-800 text-blue-400">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-400">
                    {isEnglish ? field.labelEn : isTamil ? field.labelTa : isHindi ? field.labelHi : field.labelMr}
                  </div>
                  <div className="text-base font-bold text-white">
                    {displayVal}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="btn-edit-small"
                onClick={() => onEditField && onEditField(field.key)}
                title={isEnglish ? "Edit" : "Edit"}
              >
                <RotateCcw className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Submission CTA */}
      <div className="summary-submit-box mt-6">
        <button
          type="button"
          className="btn-submit-app"
          onClick={onSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <div className="spinner-small" />
              <span>
                {isEnglish
                  ? "Submitting Application..."
                  : isTamil
                  ? "சமர்ப்பிக்கப்படுகிறது..."
                  : isHindi
                  ? "जमा किया जा रहा है..."
                  : "जमा होत आहे..."}
              </span>
            </span>
          ) : (
            <span className="flex items-center justify-center gap-3">
              <CheckCircle2 className="w-7 h-7 text-white" />
              <span className="text-lg font-bold">
                {isEnglish
                  ? "Submit Loan Application"
                  : isTamil
                  ? "கடன் விண்ணப்பத்தை சமர்ப்பிக்கவும்"
                  : isHindi
                  ? "आवेदन जमा करें"
                  : "अर्ज जमा करा"}
              </span>
            </span>
          )}
        </button>

        <p className="disclaimer-text">
          {isEnglish
            ? "This is a secure bank loan application. Verification is performed prior to disbursal."
            : isTamil
            ? "இது ஒரு பாதுகாப்பான விண்ணப்பம். கடன் தொகை வழங்குவதற்கு முன் முறையான சரிபார்ப்பு செய்யப்படும்."
            : isHindi
            ? "यह एक सुरक्षित बैंक आवेदन है। किसी भी भुगतान से पहले वास्तविक सत्यापन किया जाएगा।"
            : "हा एक सुरक्षित बँक अर्ज आहे. वितरणापूर्वी प्रत्यक्ष पडताळणी केली जाईल."}
        </p>
      </div>
    </div>
  );
}
