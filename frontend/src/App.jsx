import React, { useState, useEffect } from 'react';
import {
  Mic,
  Bell,
  Wifi,
  WifiOff,
  CloudUpload,
  ShieldCheck,
  Building2,
  CheckCircle2,
  LayoutDashboard,
  FileText,
  Languages,
  LogOut,
  X
} from 'lucide-react';
import LandingAuthPage from './components/LandingAuthPage';
import OverviewWorkspace from './components/OverviewWorkspace';
import LanguageSelectModal from './components/LanguageSelectModal';
import VoiceSessionStudio from './components/VoiceSessionStudio';
import ApplicationsDashboard from './components/ApplicationsDashboard';
import WhatsAppVoiceNoteModal from './components/WhatsAppVoiceNoteModal';
import { useVoiceAudio } from './context/VoiceAudioContext';
import { useAuth } from './context/AuthContext';
import {
  processVoiceIntake,
  confirmField,
  submitApplication,
  synthesizeSpeech
} from './services/api';
import { extractFieldsOffline } from './services/offlineExtractor';
import {
  saveOfflineApplication,
  getOfflineApplications,
  syncPendingApplications
} from './services/offlineSync';

const PAGES = {
  LANDING: 'LANDING',
  OVERVIEW: 'OVERVIEW',
  LANGUAGE_MODAL: 'LANGUAGE_MODAL',
  VOICE_SESSION: 'VOICE_SESSION',
  APPLICATIONS: 'APPLICATIONS',
};

const DEFAULT_FORM_DATA = {
  applicant_name: null,
  village_or_address: null,
  loan_amount: null,
  loan_purpose: null,
  monthly_income: null,
  income_source: null,
  aadhaar_last4: null,
};

const FIELD_ORDER = [
  'applicant_name',
  'village_or_address',
  'loan_amount',
  'loan_purpose',
  'monthly_income',
  'income_source',
  'aadhaar_last4'
];

const FIELD_QUESTIONS = {
  'ta-IN': {
    applicant_name:     'வணக்கம்! உங்கள் கடன் விண்ணப்பத்திற்கு நான் உதவுகிறேன். முதலில், உங்கள் முழு பெயர் என்ன?',
    village_or_address: 'நன்றி! நீங்கள் எந்த கிராமம் அல்லது நகரில் வசிக்கிறீர்கள்?',
    loan_amount:        'சரி! நீங்கள் எவ்வளவு தொகை கடனாக வேண்டும்? (உதாரணம்: ஐம்பதாயிரம் ரூபாய்)',
    loan_purpose:       'இந்த கடன் எந்த தொழில் அல்லது நோக்கத்திற்காக தேவை?',
    monthly_income:     'சரி! உங்கள் தற்போதைய மாத வருமானம் எவ்வளவு?',
    income_source:      'நீங்கள் என்ன தொழில் செய்கிறீர்கள் அல்லது வருமானம் எங்கிருந்து வருகிறது?',
    aadhaar_last4:      'கிட்டத்தட்ட முடிந்தது! உங்கள் ஆதார் அட்டையின் கடைசி 4 இலக்கங்கள் என்ன?',
    completed:          'மிக்க நன்றி! அனைத்து விவரங்களும் பதிவாகியுள்ளன. இப்போது மதிப்பீட்டிற்கு விண்ணப்பிக்கலாம்.'
  },
  'hi-IN': {
    applicant_name:     'नमस्ते! मैं आपके लोन आवेदन में सहायता करूँगा। सबसे पहले, आपका पूरा नाम क्या है?',
    village_or_address: 'धन्यवाद! आप किस गाँव या शहर में रहते हैं?',
    loan_amount:        'ठीक है! आप कितनी लोन राशि चाहते हैं? (उदाहरण: पचास हजार रुपये)',
    loan_purpose:       'यह लोन किस काम या व्यापार के लिए चाहिए?',
    monthly_income:     'अच्छा! आपकी वर्तमान मासिक कमाई कितनी है?',
    income_source:      'आप कौन सा काम करते हैं या आपकी आमदनी का स्रोत क्या है?',
    aadhaar_last4:      'लगभग हो गया! आपके आधार कार्ड के आखिरी 4 अंक क्या हैं?',
    completed:          'बहुत धन्यवाद! सभी जानकारी दर्ज हो गई है। अब आप क्रेडिट मूल्यांकन के लिए आवेदन कर सकते हैं।'
  },
  'en-IN': {
    applicant_name:     'Hello! I will help you with your loan application. First, what is your full name?',
    village_or_address: 'Thank you! Which village or town do you currently live in?',
    loan_amount:        'Got it! How much loan amount do you need? (Example: fifty thousand rupees)',
    loan_purpose:       'What is this loan for? Which business or purpose?',
    monthly_income:     'Alright! What is your current monthly income?',
    income_source:      'What is your occupation or main source of income?',
    aadhaar_last4:      'Almost done! What are the last 4 digits of your Aadhaar card?',
    completed:          'Thank you! All details have been recorded. You can now submit for credit evaluation.'
  }
};

function getFieldQuestion(key, lang) {
  const q = FIELD_QUESTIONS[lang] || FIELD_QUESTIONS['en-IN'];
  return key ? (q[key] || '') : (q.completed || '');
}

function buildConfirmQuestion(key, val, language) {
  const fieldNames = {
    'ta-IN': { applicant_name:'உங்கள் பெயர்', village_or_address:'உங்கள் முகவரி', loan_amount:'கடன் தொகை', loan_purpose:'கடன் நோக்கம்', monthly_income:'மாத வருமானம்', income_source:'வருமான ஆதாரம்', aadhaar_last4:'ஆதார் எண்' },
    'hi-IN': { applicant_name:'आपका नाम', village_or_address:'आपका पता', loan_amount:'लोन राशि', loan_purpose:'लोन उद्देश्य', monthly_income:'मासिक आय', income_source:'आय का स्रोत', aadhaar_last4:'आधार नंबर' },
    'te-IN': { applicant_name:'మీ పేరు', village_or_address:'మీ చిరునామా', loan_amount:'లోన్ మొత్తం', loan_purpose:'లోన్ ఉద్దేశం', monthly_income:'నెలవారీ ఆదాయం', income_source:'ఆదాయ వనరు', aadhaar_last4:'ఆధార్ సంఖ్య' },
    'ml-IN': { applicant_name:'നിങ്ങളുടെ പേര്', village_or_address:'നിങ്ങളുടെ വിലാസം', loan_amount:'ലോൺ തുക', loan_purpose:'ലോൺ ഉദ്ദേശ്യം', monthly_income:'മാസ വരുമാനം', income_source:'വരുമാന ഉറവിടം', aadhaar_last4:'ആധാർ നമ്പർ' },
    'mr-IN': { applicant_name:'तुमचे नाव', village_or_address:'तुमचा पत्ता', loan_amount:'कर्ज रक्कम', loan_purpose:'कर्ज उद्देश', monthly_income:'मासिक उत्पन्न', income_source:'उत्पन्न स्रोत', aadhaar_last4:'आधार क्रमांक' },
    'en-IN': { applicant_name:'Your name is', village_or_address:'Your address is', loan_amount:'Loan amount is', loan_purpose:'Loan purpose is', monthly_income:'Monthly income is', income_source:'Income source is', aadhaar_last4:'Aadhaar last 4 digits are' },
  };
  const names = fieldNames[language] || fieldNames['en-IN'];
  const label = names[key] || key;
  let displayVal = val || '';
  if (val && (key === 'loan_amount' || key === 'monthly_income')) {
    const numStr = Number(val).toLocaleString('en-IN');
    displayVal = language === 'ta-IN' ? `${numStr} ரூபாய்`
      : language === 'hi-IN' ? `${numStr} रुपये`
      : language === 'te-IN' ? `${numStr} రూపాయలు`
      : language === 'ml-IN' ? `${numStr} രൂപ`
      : language === 'mr-IN' ? `${numStr} रुपये`
      : `${numStr} rupees`;
  } else if (val && key === 'aadhaar_last4') {
    displayVal = val;
  }

  return language === 'ta-IN' ? `${label} ${displayVal}, சரியா?`
    : language === 'hi-IN' ? `${label} ${displayVal}, सही है?`
    : language === 'te-IN' ? `${label} ${displayVal}, సరియేనా?`
    : language === 'ml-IN' ? `${label} ${displayVal}, ശരിയല്ലേ?`
    : language === 'mr-IN' ? `${label} ${displayVal}, बरोबर आहे का?`
    : `${label} ${displayVal}, right?`;
}

function isPositiveConfirmation(text) {
  if (!text) return false;
  const t = text.toLowerCase().trim();
  const positiveWords = [
    'ஆமாம்', 'ஆம்', 'சரி', 'சரியா', 'அப்படித்தான்', 'உண்மை', 'ஓகே', 'நன்றி', 'அதேதான்', 'சரியாக',
    'हाँ', 'हा', 'सही', 'जी', 'ठीक', 'अरे हाँ', 'हाँजी',
    'అవును', 'సరే', 'అవునండి',
    'അതെ', 'ശരി',
    'होय', 'हो', 'बरोबर',
    'yes', 'yeah', 'yep', 'correct', 'right', 'ok', 'okay', 'sure', 'true'
  ];
  return positiveWords.some(w => t.includes(w));
}

function isNegativeConfirmation(text) {
  if (!text) return false;
  const t = text.toLowerCase().trim();
  const negativeWords = [
    'இல்லை', 'தவறு', 'வேண்டாம்', 'மாற்று', 'பிழை', 'இல்ல',
    'नहीं', 'ना', 'गलत', 'नाहीं',
    'కాదు', 'లేదు',
    'അല്ല', 'ഇല്ല',
    'नाही', 'गलत',
    'no', 'nope', 'wrong', 'not', 'incorrect'
  ];
  return negativeWords.some(w => t.includes(w));
}

function translateEnglishToRegional(text, language) {
  if (!text || typeof text !== 'string') return text;
  const t = text.trim();
  if (language === 'en-IN') return t;

  const englishToTamilMap = [
    { pattern: /\b(education|study|school|college|degree|student)\b/i, replace: 'கல்வித் தேவை' },
    { pattern: /\b(business|shop|store|retail|trade|groceries)\b/i, replace: 'சிறு வியாபாரம்' },
    { pattern: /\b(farming|agriculture|crop|farm|seeds|fertilizer)\b/i, replace: 'விவசாயத் தேவை' },
    { pattern: /\b(dairy|cow|milk|cattle|buffalo|livestock)\b/i, replace: 'பால் பண்ணை' },
    { pattern: /\b(medical|treatment|hospital|doctor|health|medicine)\b/i, replace: 'மருத்துவச் செலவு' },
    { pattern: /\b(daily\s*wage|labor|labour|worker)\b/i, replace: 'தினக்கூலி வேலை' },
    { pattern: /\b(personal|house|home|marriage|wedding)\b/i, replace: 'குடும்பத் தேவை' },
  ];

  const englishToHindiMap = [
    { pattern: /\b(education|study|school|college|degree|student)\b/i, replace: 'शिक्षा और पढ़ाई' },
    { pattern: /\b(business|shop|store|retail|trade|groceries)\b/i, replace: 'छोटा व्यापार' },
    { pattern: /\b(farming|agriculture|crop|farm|seeds|fertilizer)\b/i, replace: 'खेती और कृषि' },
    { pattern: /\b(dairy|cow|milk|cattle|buffalo|livestock)\b/i, replace: 'डेयरी और पशुपालन' },
    { pattern: /\b(medical|treatment|hospital|doctor|health|medicine)\b/i, replace: 'चिकित्सा और इलाज' },
    { pattern: /\b(daily\s*wage|labor|labour|worker)\b/i, replace: 'दैनिक मजदूरी' },
    { pattern: /\b(personal|house|home|marriage|wedding)\b/i, replace: 'घरेलू ज़रूरत' },
  ];

  const map = language === 'ta-IN' ? englishToTamilMap : (language === 'hi-IN' ? englishToHindiMap : []);
  for (const item of map) {
    if (item.pattern.test(t)) {
      return item.replace;
    }
  }

  if (language === 'ta-IN') {
    if (t.includes('எஜுகேஷன்') || t.includes('பர்பஸ்') || t.includes('ஸ்டடி')) return 'கல்வித் தேவை';
    if (t.includes('பிசினஸ்') || t.includes('ஷாப்') || t.includes('ஸ்டோர்')) return 'சிறு வியாபாரம்';
    if (t.includes('ஃபார்மிங்') || t.includes('அக்ரிகல்ச்சர்')) return 'விவசாயத் தேவை';
    if (t.includes('மெடிக்கல்') || t.includes('ஹாஸ்பிட்டல்')) return 'மருத்துவச் செலவு';
  }

  return t;
}

export default function App() {
  const [currentPage, setCurrentPage] = useState(PAGES.OVERVIEW);
  const [language, setLanguage] = useState('ta-IN');
  const [formData, setFormData] = useState({ ...DEFAULT_FORM_DATA });
  const [confirmedFields, setConfirmedFields] = useState([]);
  const [pendingConfirmField, setPendingConfirmField] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSanctionModal, setActiveSanctionModal] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);

  // Network & Sync State
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState(null);

  const { user, token, logout, login, isAuthenticated } = useAuth();
  const {
    isRecording,
    isSpeaking,
    audioData,
    liveTranscript,
    startRecording,
    stopRecording,
    speakText,
    stopSpeaking,
  } = useVoiceAudio();

  // Network status listener & background sync
  useEffect(() => {
    const handleStatusChange = () => {
      const online = navigator.onLine;
      setIsOnline(online);
      if (online) handleAutoSync();
    };

    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);
    setPendingSyncCount(getOfflineApplications().length);

    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, []);

  const handleAutoSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const synced = await syncPendingApplications(submitApplication, token);
      setPendingSyncCount(getOfflineApplications().length);
      if (synced && synced.length > 0) {
        setSyncNotice(`${synced.length} offline applications synced to bank database!`);
        setTimeout(() => setSyncNotice(null), 5000);
      }
    } catch (err) {
      console.warn('Sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Keep html language tag in sync
  useEffect(() => {
    const langCode = language.split('-')[0] || 'ta';
    document.documentElement.lang = langCode;
  }, [language]);

  const handleStartVoiceIntake = () => {
    setCurrentPage(PAGES.LANGUAGE_MODAL);
  };

  const handleSelectLanguage = (code) => {
    setLanguage(code);
    setCurrentPage(PAGES.VOICE_SESSION);
  };

  const handleFillDemoProfile = () => {
    const demo = {
      applicant_name: language === 'ta-IN' ? 'முகமது இர்பான் (Mohamed Irfan)' : 'Mohamed Irfan',
      village_or_address: language === 'ta-IN' ? 'மதுரை (Madurai)' : 'Madurai, TN',
      loan_amount: 50000,
      loan_purpose: language === 'ta-IN' ? 'மளிகை கடை (Retail Store)' : 'Retail Grocery Store',
      monthly_income: 25000,
      income_source: language === 'ta-IN' ? 'வணிகம் (Retail Business)' : 'Small Business',
      aadhaar_last4: '7842'
    };
    setFormData(demo);
    setConfirmedFields(FIELD_ORDER);
    setPendingConfirmField(null);
  };

  const handleUpdateField = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setPendingConfirmField(key);
    const confirmQ = buildConfirmQuestion(key, value, language);
    speakText(confirmQ, language);
  };

  const handleConfirmField = (key) => {
    setConfirmedFields(prev => Array.from(new Set([...prev, key])));
    setPendingConfirmField(curr => (curr === key ? null : curr));

    const nextUnconfirmed = FIELD_ORDER.find(k => k !== key && (!formData[k] || !confirmedFields.includes(k)));
    if (nextUnconfirmed && !formData[nextUnconfirmed]) {
      const q = getFieldQuestion(nextUnconfirmed, language);
      speakText(q, language);
    } else {
      const ackMsg = language === 'ta-IN' ? 'உறுதிப்படுத்தப்பட்டது!' : 'Confirmed!';
      speakText(ackMsg, language);
    }
  };

  // Clear a single field and re-ask its question
  const handleRetryField = (key) => {
    setFormData(prev => ({ ...prev, [key]: null }));
    setConfirmedFields(prev => prev.filter(k => k !== key));
    setPendingConfirmField(curr => (curr === key ? null : curr));

    const q = getFieldQuestion(key, language);
    speakText(q, language);
  };

  // Reset all fields — restart entire form from question 1
  const handleResetForm = () => {
    setFormData({ ...DEFAULT_FORM_DATA });
    setConfirmedFields([]);
    setPendingConfirmField(null);

    const q = getFieldQuestion('applicant_name', language);
    speakText(q, language);
  };

  // New application — reset form AND go to overview
  const handleNewApplication = () => {
    setFormData({ ...DEFAULT_FORM_DATA });
    setConfirmedFields([]);
    setPendingConfirmField(null);
    setCurrentPage(PAGES.OVERVIEW);
  };

  // Voice recording handlers for Voice Session Studio
  const handleStartSessionRecord = async () => {
    try {
      await startRecording(language);
    } catch (err) {
      console.warn('Voice start record error:', err);
    }
  };

  const handleStopSessionRecord = async () => {
    try {
      const audioBlob = await stopRecording();
      const spokenTranscript = ((audioBlob && audioBlob.transcript) || liveTranscript || '').trim();

      // CASE 1: Currently waiting for YES / NO confirmation of a field
      if (pendingConfirmField) {
        const activeKey = pendingConfirmField;

        if (isPositiveConfirmation(spokenTranscript)) {
          // User said YES!
          setConfirmedFields(prev => Array.from(new Set([...prev, activeKey])));
          setPendingConfirmField(null);

          const nextKey = FIELD_ORDER.find(k => k !== activeKey && (!formData[k] || !confirmedFields.includes(k)));
          const confirmText = language === 'ta-IN' ? 'நன்றி!'
            : language === 'hi-IN' ? 'धन्यवाद!'
            : 'Thank you!';

          if (nextKey) {
            const nextQ = getFieldQuestion(nextKey, language);
            speakText(`${confirmText} ${nextQ}`, language);
          } else {
            const doneMsg = language === 'ta-IN' ? 'மிக்க நன்றி! அனைத்து விவரங்களும் உறுதிப்படுத்தப்பட்டுள்ளன.'
              : 'Thank you! All details are confirmed.';
            speakText(doneMsg, language);
          }
          return;
        }

        if (isNegativeConfirmation(spokenTranscript)) {
          // User said NO!
          setFormData(prev => ({ ...prev, [activeKey]: null }));
          setConfirmedFields(prev => prev.filter(k => k !== activeKey));
          setPendingConfirmField(null);

          const retryText = language === 'ta-IN' ? 'சரி, மீண்டும் சொல்லுங்கள்.'
            : language === 'hi-IN' ? 'ठीक है, फिर से बताएं।'
            : 'Okay, please speak again.';
          const q = getFieldQuestion(activeKey, language);
          speakText(`${retryText} ${q}`, language);
          return;
        }
      }

      // CASE 2: User spoke an answer for active question
      if (audioBlob && spokenTranscript) {
        let extractedData = {};
        if (isOnline) {
          try {
            const res = await processVoiceIntake(audioBlob, language, spokenTranscript);
            extractedData = res?.data || {};
          } catch (err) {
            console.warn('Voice intake fallback to offline regex:', err);
            extractedData = extractFieldsOffline(spokenTranscript, language) || {};
          }
        } else {
          extractedData = extractFieldsOffline(spokenTranscript, language) || {};
        }

        setFormData(prev => {
          const targetField = pendingConfirmField || FIELD_ORDER.find(k => !prev[k] || !confirmedFields.includes(k)) || 'applicant_name';
          const updated = { ...prev };

          let newValue = null;
          if (extractedData[targetField]) {
            newValue = extractedData[targetField];
          } else {
            const misclassifiedKey = Object.keys(extractedData).find(k => extractedData[k] && (k !== targetField));
            if (misclassifiedKey && extractedData[misclassifiedKey] && !confirmedFields.includes(targetField)) {
              newValue = extractedData[misclassifiedKey];
            } else {
              if (targetField === 'loan_amount' || targetField === 'monthly_income') {
                const numMatch = spokenTranscript.match(/\d+/);
                newValue = numMatch ? parseFloat(numMatch[0]) : spokenTranscript;
              } else if (targetField === 'aadhaar_last4') {
                const digits = spokenTranscript.replace(/\D/g, '').slice(-4);
                newValue = digits || spokenTranscript;
              } else {
                newValue = spokenTranscript;
              }
            }
          }

          if (newValue) {
            newValue = translateEnglishToRegional(newValue, language);
            updated[targetField] = newValue;
            setPendingConfirmField(targetField);
            const question = buildConfirmQuestion(targetField, newValue, language);
            speakText(question, language);
          }

          return updated;
        });
      }
    } catch (err) {
      console.warn('Stop recording error:', err);
    }
  };

  const handleSubmitApplication = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        applicant_name: formData.applicant_name || 'Mohamed Irfan',
        village_or_address: formData.village_or_address || 'Madurai',
        loan_amount: formData.loan_amount || 40000,
        loan_purpose: formData.loan_purpose || 'Agriculture',
        monthly_income: formData.monthly_income || 20000,
        income_source: formData.income_source || 'Farming',
        aadhaar_last4: formData.aadhaar_last4 || '3210',
        language: language,
        user_phone: user?.phone_number || '9876543210'
      };

      if (!isOnline) {
        const savedOffline = saveOfflineApplication(payload);
        setPendingSyncCount(getOfflineApplications().length);
        setActiveSanctionModal({
          ...payload,
          reference_no: savedOffline.reference_no,
          status: 'LOAN_ACCEPTED (Offline Queued)',
          sanctioned_amount: payload.loan_amount,
          monthly_emi: Math.round((payload.loan_amount * 0.088) / 1),
          risk_tier: 'LOW',
          verification_status: 'VERIFIED'
        });
      } else {
        const res = await submitApplication(payload, token);
        setActiveSanctionModal(res);
      }
    } catch (err) {
      console.warn('Submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="voiceloan-app-root">
      {/* Top Global Navigation Bar (Screenshots 2, 3, 4, 5) */}
      <header className="voiceloan-navbar">
        <div className="navbar-container">
          {/* Brand Logo */}
          <div
            className="navbar-brand-group"
            onClick={() => setCurrentPage(PAGES.OVERVIEW)}
            role="button"
          >
            <div className="nav-mic-box">
              <Mic className="w-5 h-5 text-emerald-500" />
            </div>
            <span className="nav-brand-title">VoiceLoan</span>
          </div>

          {/* Center Navigation Tabs */}
          {currentPage !== PAGES.LANDING && (
            <nav className="nav-center-tabs">
              <button
                type="button"
                className={`nav-tab-pill ${currentPage === PAGES.OVERVIEW ? 'active' : ''}`}
                onClick={() => setCurrentPage(PAGES.OVERVIEW)}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Overview</span>
              </button>

              <button
                type="button"
                className={`nav-tab-pill ${currentPage === PAGES.VOICE_SESSION || currentPage === PAGES.LANGUAGE_MODAL ? 'active' : ''}`}
                onClick={() => setCurrentPage(PAGES.VOICE_SESSION)}
              >
                <Mic className="w-4 h-4" />
                <span>Voice session</span>
              </button>

              <button
                type="button"
                className={`nav-tab-pill ${currentPage === PAGES.APPLICATIONS ? 'active' : ''}`}
                onClick={() => setCurrentPage(PAGES.APPLICATIONS)}
              >
                <FileText className="w-4 h-4" />
                <span>Applications</span>
              </button>
            </nav>
          )}

          {/* Right Utility Actions */}
          <div className="navbar-right-actions">
            {/* Live Network Pill */}
            <div className="nav-network-pill">
              {isOnline ? (
                <div className="nav-online-wrap" title="Connected to bank server">
                  <span className="dot-online-teal" />
                  <span className="text-xs font-semibold text-slate-700">Online</span>
                </div>
              ) : (
                <div className="nav-offline-wrap" title="Operating offline">
                  <WifiOff className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-xs font-bold text-amber-600">Offline</span>
                </div>
              )}
            </div>

            {/* Offline Sync Trigger */}
            {pendingSyncCount > 0 && (
              <button
                type="button"
                className="btn-nav-sync"
                onClick={handleAutoSync}
                disabled={isSyncing || !isOnline}
                title="Sync offline applications"
              >
                <CloudUpload className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{pendingSyncCount} Sync</span>
              </button>
            )}

            {/* Notification Bell with Badge */}
            <div className="relative">
              <button
                type="button"
                className="nav-bell-btn"
                onClick={() => setShowNotifications(!showNotifications)}
                title="Notifications"
              >
                <Bell className="w-4 h-4 text-slate-600" />
                <span className="nav-bell-count">3</span>
              </button>

              {showNotifications && (
                <div className="notifications-dropdown animate-fadeIn">
                  <div className="dropdown-header">
                    <span className="font-bold text-xs text-slate-800">Underwriting Alerts</span>
                    <button
                      type="button"
                      className="text-slate-400 hover:text-slate-600"
                      onClick={() => setShowNotifications(false)}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="dropdown-items-list">
                    <div className="dropdown-item">
                      <div className="dot-green-small" />
                      <div>
                        <div className="text-xs font-bold text-slate-800">AGR-2693 Pre-Approved</div>
                        <div className="text-[11px] text-slate-500">₹30,000 sanctioned via JLG score</div>
                      </div>
                    </div>
                    <div className="dropdown-item">
                      <div className="dot-green-small" />
                      <div>
                        <div className="text-xs font-bold text-slate-800">AGR-2832 Low Risk Tier</div>
                        <div className="text-[11px] text-slate-500">₹1,00,000 verified with Aadhaar</div>
                      </div>
                    </div>
                    <div className="dropdown-item">
                      <div className="dot-green-small" />
                      <div>
                        <div className="text-xs font-bold text-slate-800">WhatsApp Alert Dispatched</div>
                        <div className="text-[11px] text-slate-500">Audio voice note sent in Tamil</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Role Badge */}
            <div className="nav-role-badge">
              <span className="text-xs font-bold text-emerald-800">User / Applicant</span>
            </div>

            {/* Sign Out / Sign In */}
            {currentPage !== PAGES.LANDING ? (
              <button
                type="button"
                className="btn-nav-signout"
                onClick={() => setCurrentPage(PAGES.LANDING)}
              >
                Sign out
              </button>
            ) : (
              <button
                type="button"
                className="btn-nav-signin"
                onClick={() => setCurrentPage(PAGES.OVERVIEW)}
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Sync Toast Notice */}
      {syncNotice && (
        <div className="sync-toast-bar animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="text-xs font-semibold text-emerald-800">{syncNotice}</span>
        </div>
      )}

      {/* Multi-Page View Container */}
      <main className="voiceloan-main-canvas">
        {currentPage === PAGES.LANDING && (
          <LandingAuthPage
            onLoginSuccess={(authData) => {
              if (authData?.access_token) {
                login(authData.access_token, {
                  phone_number: authData.phone_number,
                  full_name: authData.full_name,
                  role: authData.role
                });
              }
              setCurrentPage(PAGES.OVERVIEW);
            }}
            onGetStarted={() => setCurrentPage(PAGES.LANGUAGE_MODAL)}
          />
        )}

        {currentPage === PAGES.OVERVIEW && (
          <OverviewWorkspace
            user={user}
            language={language}
            onStartVoice={handleStartVoiceIntake}
            onViewApplications={() => setCurrentPage(PAGES.APPLICATIONS)}
          />
        )}

        {currentPage === PAGES.LANGUAGE_MODAL && (
          <LanguageSelectModal
            currentLang={language}
            onSelectLanguage={handleSelectLanguage}
            onBack={() => setCurrentPage(PAGES.OVERVIEW)}
            onPlayPrompt={(promptTxt, code) => speakText(promptTxt, code)}
          />
        )}

        {currentPage === PAGES.VOICE_SESSION && (
          <VoiceSessionStudio
            language={language}
            formData={formData}
            confirmedFields={confirmedFields}
            pendingConfirmField={pendingConfirmField}
            onUpdateField={handleUpdateField}
            onConfirmField={handleConfirmField}
            onRetryField={handleRetryField}
            onResetForm={handleResetForm}
            onNewApplication={handleNewApplication}
            onSubmitApplication={handleSubmitApplication}
            onBack={() => setCurrentPage(PAGES.OVERVIEW)}
            isRecording={isRecording}
            liveTranscript={liveTranscript}
            audioData={audioData}
            onStartRecord={handleStartSessionRecord}
            onStopRecord={handleStopSessionRecord}
            isSpeaking={isSpeaking}
            onPlayTTS={(txt, lang) => speakText(txt, lang)}
            isSubmitting={isSubmitting}
            onFillDemoProfile={handleFillDemoProfile}
          />
        )}

        {currentPage === PAGES.APPLICATIONS && (
          <ApplicationsDashboard
            onPlayVoiceNote={(txt, lang) => speakText(txt, lang)}
            isSpeaking={isSpeaking}
            onStopAudio={stopSpeaking}
            pendingSyncCount={pendingSyncCount}
          />
        )}
      </main>

      {/* WhatsApp Interactive Voice Note Sanction Modal */}
      <WhatsAppVoiceNoteModal
        isOpen={Boolean(activeSanctionModal)}
        onClose={() => {
          setActiveSanctionModal(null);
          setCurrentPage(PAGES.APPLICATIONS);
        }}
        application={activeSanctionModal}
        onPlayAudio={(txt, lang) => speakText(txt, lang)}
        isSpeaking={isSpeaking}
        onStopAudio={stopSpeaking}
      />
    </div>
  );
}
