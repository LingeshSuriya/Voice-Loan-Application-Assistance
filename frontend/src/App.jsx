import React, { useState, useEffect } from 'react';
import {
  Mic,
  Volume2,
  CheckCircle2,
  FileText,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Building2,
  ChevronRight,
  Info,
  Wifi,
  WifiOff,
  CloudUpload,
  Check,
  Languages
} from 'lucide-react';
import LanguageSelect from './components/LanguageSelect';
import ConsentBanner from './components/ConsentBanner';
import MicRecorder from './components/MicRecorder';
import FieldConfirmCard from './components/FieldConfirmCard';
import ApplicationSummary from './components/ApplicationSummary';
import ReceiptModal from './components/ReceiptModal';
import AuthModal from './components/AuthModal';
import { useVoiceAudio } from './context/VoiceAudioContext';
import { useAuth } from './context/AuthContext';
import {
  getHealth,
  getDemoProfiles,
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

const STEPS = {
  CONSENT: 'CONSENT',
  RECORD: 'RECORD',
  PROCESSING: 'PROCESSING',
  CONFIRM_LOOP: 'CONFIRM_LOOP',
  SUMMARY: 'SUMMARY',
  RECEIPT: 'RECEIPT',
};

const FIELD_KEYS = [
  'applicant_name',
  'village_or_address',
  'loan_amount',
  'loan_purpose',
  'monthly_income',
  'income_source',
  'aadhaar_last4',
];

const FIELD_SIDEBAR_LABELS = {
  'ta-IN': {
    applicant_name: 'பெயர்',
    village_or_address: 'ஊர் / முகவரி',
    loan_amount: 'கடன் தொகை',
    loan_purpose: 'கடன் நோக்கம்',
    monthly_income: 'மாத வருமானம்',
    income_source: 'வருமான ஆதாரம்',
    aadhaar_last4: 'ஆதார் எண்',
  },
  'hi-IN': {
    applicant_name: 'आवेदक नाम',
    village_or_address: 'गाँव / पता',
    loan_amount: 'लोन राशि',
    loan_purpose: 'लोन का उद्देश्य',
    monthly_income: 'मासिक कमाई',
    income_source: 'कमाई का साधन',
    aadhaar_last4: 'आधार अंतिम 4',
  },
  'mr-IN': {
    applicant_name: 'अर्जदाराचे नाव',
    village_or_address: 'गाव / पत्ता',
    loan_amount: 'कर्ज रक्कम',
    loan_purpose: 'कर्जाचे कारण',
    monthly_income: 'मासिक उत्पन्न',
    income_source: 'उत्पन्नाचे साधन',
    aadhaar_last4: 'आधार शेवटचे 4',
  },
  'en-IN': {
    applicant_name: 'Applicant Name',
    village_or_address: 'City / Address',
    loan_amount: 'Loan Amount',
    loan_purpose: 'Loan Purpose',
    monthly_income: 'Monthly Income',
    income_source: 'Source of Income',
    aadhaar_last4: 'Aadhaar Last 4',
  }
};

export default function App() {
  const [currentStep, setCurrentStep] = useState(STEPS.CONSENT);
  const [language, setLanguage] = useState('hi-IN');
  const [healthData, setHealthData] = useState(null);
  const [demoProfiles, setDemoProfiles] = useState([]);

  // Form Application State
  const [transcript, setTranscript] = useState('');
  const [formData, setFormData] = useState({
    applicant_name: null,
    village_or_address: null,
    loan_amount: null,
    loan_purpose: null,
    monthly_income: null,
    income_source: null,
    aadhaar_last4: null,
  });
  const [explanations, setExplanations] = useState({});

  // Confirmation Loop Pointer
  const [currentFieldIndex, setCurrentFieldIndex] = useState(0);
  const [isRecordingCorrection, setIsRecordingCorrection] = useState(false);

  // Submission Receipt
  const [receiptData, setReceiptData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

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

  const { user, token, logout, isAuthenticated } = useAuth();

  // Offline & Network State
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [syncNotice, setSyncNotice] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Network status listener & automatic background sync
  useEffect(() => {
    const handleStatusChange = () => {
      const online = navigator.onLine;
      setIsOnline(online);
      if (online) {
        handleAutoSync();
      }
    };

    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);

    // Initial check of local pending sync drafts
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
        const msg = language === 'ta-IN'
          ? `${synced.length} ஆஃப்லைன் விண்ணப்பங்கள் வங்கிக்கு வெற்றிகரமாக அனுப்பப்பட்டன!`
          : language === 'mr-IN'
          ? `${synced.length} ऑफलाइन अर्ज बँकेत सिंक झाले!`
          : `${synced.length} ऑफ़लाइन आवेदन बैंक में सफलतापूर्वक सिंक हो गए!`;
        setSyncNotice(msg);
        speakText(msg, language);
        setTimeout(() => setSyncNotice(null), 6000);
      }
    } catch (err) {
      console.warn('Sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Keep document html lang and notranslate attributes in sync with selected language
  useEffect(() => {
    const langCode = language.split('-')[0] || 'hi';
    document.documentElement.lang = langCode;
    document.documentElement.setAttribute('translate', 'no');
    document.documentElement.classList.add('notranslate');
  }, [language]);

  // Load health & demo profiles on mount
  useEffect(() => {
    getHealth().then(setHealthData).catch(console.warn);
    getDemoProfiles()
      .then((res) => {
        setDemoProfiles(res.profiles || []);
      })
      .catch(console.warn);
  }, []);

  /**
   * Helper to play speech via backend TTS or fallback (Bypasses network if offline)
   */
  const handleSpeak = async (text, overrideAudioBase64 = null) => {
    if (overrideAudioBase64) {
      speakText(text, language, overrideAudioBase64);
      return;
    }
    // If device is offline, play local device speech directly without network delay
    if (!navigator.onLine) {
      speakText(text, language, null);
      return;
    }
    try {
      const res = await synthesizeSpeech(text, language);
      speakText(text, language, res.audio_base64);
    } catch {
      speakText(text, language, null);
    }
  };

  /**
   * Consent accepted: proceed to voice intake
   */
  const handleAcceptConsent = () => {
    stopSpeaking();
    setCurrentStep(STEPS.RECORD);
  };

  /**
   * User starts initial voice intake
   */
  const handleStartInitialRecord = async () => {
    await startRecording(language);
  };

  /**
   * User finishes voice intake: send audio and live browser transcript to backend (or offline extractor)
   */
  const handleStopInitialRecord = async () => {
    const audioBlob = await stopRecording();
    const liveText = (audioBlob.transcript || liveTranscript || '').trim();
    setCurrentStep(STEPS.PROCESSING);
    setIsProcessingVoice(true);

    // 1. If device is offline, run 100% in-browser offline entity extractor immediately
    if (!navigator.onLine) {
      console.log('Offline mode active: extracting fields locally in browser');
      const offlineResult = extractFieldsOffline(liveText, language);
      setTranscript(liveText || (language === 'ta-IN' ? 'ஆஃப்லைன் குரல் பதிவு' : 'ऑफ़लाइन वॉयस इनपुट'));
      setFormData(offlineResult.data || {});
      setExplanations(offlineResult.explanations || {});
      setCurrentFieldIndex(0);
      setCurrentStep(STEPS.CONFIRM_LOOP);
      setIsProcessingVoice(false);
      return;
    }

    // 2. Online: Send audio to backend API for transcription & extraction
    try {
      const res = await processVoiceIntake(audioBlob, language, liveText);
      setTranscript(res.transcript || liveText);
      setFormData(res.data || {});
      setExplanations(res.explanations || {});
      setCurrentFieldIndex(0);
      setCurrentStep(STEPS.CONFIRM_LOOP);
    } catch (err) {
      console.warn('Backend intake failed, switching to local offline extractor:', err);
      const offlineResult = extractFieldsOffline(liveText, language);
      setTranscript(liveText || 'Voice intake');
      setFormData(offlineResult.data || {});
      setExplanations(offlineResult.explanations || {});
      setCurrentFieldIndex(0);
      setCurrentStep(STEPS.CONFIRM_LOOP);
    } finally {
      setIsProcessingVoice(false);
    }
  };

  /**
   * Load demo scenario instantly (for judge or testing)
   */
  const loadDemoProfile = (profile) => {
    stopSpeaking();
    setLanguage(profile.language || 'hi-IN');
    setTranscript(profile.transcript);
    setFormData(profile.data);
    setExplanations(profile.explanations);
    setCurrentFieldIndex(0);
    setCurrentStep(STEPS.CONFIRM_LOOP);
  };

  /**
   * Confirm current field (User said "हाँ" / tapped Yes)
   */
  const handleConfirmField = (fieldKey, confirmedValue) => {
    stopSpeaking();
    setFormData((prev) => ({ ...prev, [fieldKey]: confirmedValue }));

    // Proceed to next field or summary
    if (currentFieldIndex < FIELD_KEYS.length - 1) {
      setCurrentFieldIndex((prev) => prev + 1);
    } else {
      setCurrentStep(STEPS.SUMMARY);
    }
  };

  /**
   * User clicked "नहीं" / wants to correct current field via voice
   * Captures actual spoken correction and sends to backend
   */
  const handleToggleCorrectionVoice = async () => {
    const currentFieldKey = FIELD_KEYS[currentFieldIndex];

    if (!isRecordingCorrection) {
      // Start recording correction with live speech recognition
      setIsRecordingCorrection(true);
      await startRecording(language);
    } else {
      // Stop recording correction and get actual spoken text
      const audioBlob = await stopRecording();
      setIsRecordingCorrection(false);

      const spokenCorrection = (audioBlob.transcript || liveTranscript || '').trim();
      console.log('Spoken correction captured:', spokenCorrection);

      try {
        // Send real spoken correction to backend (use localized fallback only if completely silent)
        const silentFallback = language === 'ta-IN' ? 'இல்லை' : language === 'mr-IN' ? 'नाही' : 'नहीं';
        const res = await confirmField({
          fieldName: currentFieldKey,
          currentValue: formData[currentFieldKey],
          userResponse: spokenCorrection || silentFallback,
          language,
        });

        if (res.updated_value !== undefined && res.updated_value !== null) {
          setFormData((prev) => ({ ...prev, [currentFieldKey]: res.updated_value }));
        }
        if (res.explanation) {
          setExplanations((prev) => ({ ...prev, [currentFieldKey]: res.explanation }));
        }

        // Play feedback
        handleSpeak(res.tts_prompt, res.audio_base64);
      } catch (err) {
        console.warn('Field correction failed:', err);
      }
    }
  };

  /**
   * Final Submission (Online or Local Offline Queue)
   */
  const handleSubmitApplication = async () => {
    stopSpeaking();
    setIsSubmitting(true);

    const payload = {
      ...formData,
      language,
      transcript,
      user_phone: user?.phone_number || null,
    };

    // 1. If device is currently offline, queue application locally
    if (!navigator.onLine) {
      console.log('Saving application to offline local queue...');
      const draft = saveOfflineApplication(payload);
      setPendingSyncCount(getOfflineApplications().length);
      const offlineRef = draft?.offline_ref || `OFFLINE-LN-${Math.floor(10000 + Math.random() * 90000)}`;

      const offlineVoice = language === 'en-IN'
        ? `Your application has been safely saved offline on your device. Reference number is ${offlineRef}. It will sync automatically to the bank when online.`
        : language === 'ta-IN'
        ? `விண்ணப்பம் உங்கள் சாதனத்தில் பாதுகாப்பாக சேமிக்கப்பட்டது. குறிப்பு எண் ${offlineRef}. இணையம் வந்ததும் தானாகவே வங்கிக்கு அனுப்பப்படும்.`
        : language === 'mr-IN'
        ? `अर्ज डिव्हाइसमध्ये सुरक्षित जतन झाला आहे. संदर्भ क्रमांक ${offlineRef}. इंटरनेट आल्यावर बँकेत सिंक होईल.`
        : `आवेदन डिवाइस में सुरक्षित सहेज लिया गया है। संदर्भ नंबर ${offlineRef} है। इंटरनेट आते ही बैंक में सिंक हो जाएगा।`;

      setReceiptData({
        reference_no: offlineRef,
        status: 'saved_offline',
        voice_receipt_text: offlineVoice,
        disclaimer: language === 'en-IN'
          ? 'Offline mode: Device will securely sync to bank server once internet connectivity is restored.'
          : language === 'ta-IN'
          ? 'ஆஃப்லைன் முறை: சாதனம் இணையத்துடன் இணையும் போது தானாகவே வங்கிக்கு பதிவேற்றப்படும்.'
          : 'ऑफ़लाइन मोड: डिवाइस इंटरनेट से जुड़ते ही बैंक सर्वर पर सुरक्षित सिंक हो जाएगा।',
        is_offline: true,
      });
      setCurrentStep(STEPS.RECEIPT);
      setIsSubmitting(false);
      return;
    }

    // 2. Online submission to bank backend API
    try {
      const res = await submitApplication(payload, token);
      setReceiptData(res);
      setCurrentStep(STEPS.RECEIPT);
    } catch (err) {
      console.warn('Network submission failed, queueing offline:', err);
      const draft = saveOfflineApplication(payload);
      setPendingSyncCount(getOfflineApplications().length);
      const offlineRef = draft?.offline_ref || `OFFLINE-LN-${Math.floor(10000 + Math.random() * 90000)}`;

      const offlineVoice = language === 'en-IN'
        ? `Your application has been saved on this device. It will automatically upload to the bank when internet is available.`
        : language === 'ta-IN'
        ? `விண்ணப்பம் உங்கள் சாதனத்தில் பாதுகாப்பாக சேமிக்கப்பட்டது. இணைய இணைப்பு வந்தவுடன் வங்கிக்கு அனுப்பப்படும்.`
        : `आवेदन ऑफ़लाइन सुरक्षित सहेजा गया। इंटरनेट आते ही बैंक में सिंक हो जाएगा।`;

      setReceiptData({
        reference_no: offlineRef,
        status: 'saved_offline',
        voice_receipt_text: offlineVoice,
        disclaimer: language === 'en-IN'
          ? 'Saved locally in offline queue. Will sync automatically once online.'
          : 'Saved locally in offline queue. Will sync automatically once online.',
        is_offline: true,
      });
      setCurrentStep(STEPS.RECEIPT);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Reset application to start over
   */
  const handleReset = () => {
    stopSpeaking();
    setFormData({
      applicant_name: null,
      village_or_address: null,
      loan_amount: null,
      loan_purpose: null,
      monthly_income: null,
      income_source: null,
      aadhaar_last4: null,
    });
    setTranscript('');
    setExplanations({});
    setCurrentFieldIndex(0);
    setReceiptData(null);
    setCurrentStep(STEPS.CONSENT);
  };

  const currentFieldKey = FIELD_KEYS[currentFieldIndex];
  const isTamil = language === 'ta-IN';
  const isHindi = language === 'hi-IN';
  const isEnglish = language === 'en-IN';

  return (
    <div className="app-shell">
      {/* Main Full-Width Header */}
      <header className="app-header">
        <div className="app-header-inner">
          <div className="brand-badge">
            <Building2 className="w-7 h-7 text-blue-400 shrink-0" />
            <div>
              <h1 className="brand-title">
                {isEnglish ? "Voice Loan Assistant" : isTamil ? "குரல் கடன் வழிகாட்டி" : isHindi ? "आवाज़ लोन साथी" : "आवाज कर्ज साथी"}
              </h1>
              <p className="brand-subtitle">Rural Voice-Assisted Finance Portal</p>
            </div>
          </div>

          <div className="header-actions-group">
            {/* Quick Language Switcher Bar in Header */}
            <div className="nav-lang-bar">
              {[
                { code: 'ta-IN', label: 'தமிழ்' },
                { code: 'hi-IN', label: 'हिंदी' },
                { code: 'mr-IN', label: 'मराठी' },
                { code: 'en-IN', label: 'English' },
              ].map((item) => (
                <button
                  key={item.code}
                  type="button"
                  className={`nav-lang-chip ${language === item.code ? 'active' : ''}`}
                  onClick={() => setLanguage(item.code)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Network Status Badge */}
            <div className="network-status-badge">
              {isOnline ? (
                <div className="online-pill" title="Connected to bank server">
                  <span className="online-dot" />
                  <Wifi className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-semibold">
                    {isEnglish ? 'Online' : isTamil ? 'ஆன்லைன்' : 'ऑनलाइन'}
                  </span>
                </div>
              ) : (
                <div className="offline-pill" title="Working 100% locally on device">
                  <WifiOff className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-bold">
                    {isEnglish ? 'Offline' : isTamil ? 'ஆஃப்லைன்' : 'ऑफलाइन'}
                  </span>
                </div>
              )}
            </div>

            {/* Pending Sync Button (Only visible if offline drafts exist) */}
            {pendingSyncCount > 0 && (
              <button
                type="button"
                className="btn-sync-pill"
                onClick={handleAutoSync}
                disabled={isSyncing || !isOnline}
                title={isOnline ? "Sync pending offline applications" : "Connect to internet to sync"}
              >
                <CloudUpload className={`w-3.5 h-3.5 text-amber-400 ${isSyncing ? 'animate-spin' : ''}`} />
                <span className="text-[11px] font-bold text-amber-300">
                  {pendingSyncCount} {isEnglish ? 'Sync' : isTamil ? 'ஒத்திசை' : 'सिंक'}
                </span>
              </button>
            )}

            {isAuthenticated ? (
              <div className="auth-user-pill">
                <span className="dot-green" />
                <span className="text-xs font-semibold text-slate-200">
                  +91 {user?.phone_number?.slice(-4)} ({user?.role === 'agent' ? (isEnglish ? 'Agent' : isTamil ? 'கள முகவர்' : 'एजेंट') : (isEnglish ? 'Borrower' : isTamil ? 'வாடிக்கையாளர்' : 'ग्राहक')})
                </span>
                <button
                  type="button"
                  className="text-xs text-rose-400 hover:text-rose-300 ml-1 font-bold"
                  onClick={logout}
                  title="Logout"
                >
                  {isEnglish ? 'Logout' : isTamil ? 'வெளியேறு' : 'लॉगआउट'}
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn-header-login"
                onClick={() => setIsAuthModalOpen(true)}
              >
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>{isEnglish ? 'Sign In' : isTamil ? 'உள்நுழைக' : isHindi ? 'लॉगिन' : 'लॉगिन'}</span>
              </button>
            )}

            {currentStep !== STEPS.CONSENT && currentStep !== STEPS.RECEIPT && (
              <button
                type="button"
                className="btn-header-reset"
                onClick={handleReset}
                title="Start Over"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="text-xs">
                  {isEnglish ? 'Restart' : isTamil ? 'மீண்டும் தொடங்க' : isHindi ? 'पुनः आरंभ' : 'पुन्हा सुरू'}
                </span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Auto-Sync Toast Notification */}
      {syncNotice && (
        <div className="sync-notice-banner animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold text-emerald-200">{syncNotice}</span>
        </div>
      )}

      {/* Main Web Flow Container */}
      <main className="main-content">
        {/* Step 1: Consent & Language (Responsive 2-Column Web Hero Grid) */}
        {currentStep === STEPS.CONSENT && (
          <div className="consent-desktop-grid animate-fadeIn">
            <div className="hero-welcome-card">
              <div className="hero-badge">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>
                  {isEnglish
                    ? "Voice-Assisted Rural Lending"
                    : isTamil
                    ? "குரல் வழி கடன் உதவி"
                    : "स्वर-सहायित ग्रामीण ऋण"}
                </span>
              </div>
              <h2 className="hero-headline">
                {isEnglish
                  ? "Apply for your loan by simply speaking."
                  : isTamil
                  ? "உங்கள் சொந்த மொழியில் பேசியே கடன் பெறுங்கள்."
                  : isHindi
                  ? "अपनी भाषा में बोलकर आसानी से लोन आवेदन भरें।"
                  : "बोलून सहजतेने कर्ज अर्ज पूर्ण करा."}
              </h2>
              <p className="hero-subtext">
                {isEnglish
                  ? "Zero writing required. Speak naturally in your regional language. Our voice assistant extracts each detail and confirms it back with you before final submission."
                  : isTamil
                  ? "எழுத்துப் படிவங்கள் ஏதுமில்லை. உங்கள் சொந்த மொழியில் பேசுங்கள். ஒவ்வொரு விவரமும் உங்கள் ஒப்புதலுடன் வங்கிக்கு அனுப்பப்படும்."
                  : isHindi
                  ? "कुछ लिखने की जरूरत नहीं। अपनी भाषा में बोलें और हर जानकारी आवाज़ से सुन कर पुष्टि करें।"
                  : "काहीही लिहिण्याची गरज नाही. आपल्या भाषेत बोला आणि खात्री करून अर्ज पूर्ण करा."}
              </p>

              <div className="hero-features-row">
                <div className="hero-feat-chip">
                  <Mic className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>{isEnglish ? "100% Voice Operated" : isTamil ? "100% குரல் வழி" : "100% बोलकर"}</span>
                </div>
                <div className="hero-feat-chip">
                  <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{isEnglish ? "Works Offline" : isTamil ? "ஆஃப்லைனிலும் இயங்கும்" : "ऑफ़लाइन सक्षम"}</span>
                </div>
                <div className="hero-feat-chip">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{isEnglish ? "Bank-Grade Privacy" : isTamil ? "பாதுகாப்பானது" : "सुरक्षित"}</span>
                </div>
              </div>

              <div className="hero-lang-selector-wrapper">
                <LanguageSelect
                  currentLang={language}
                  onSelectLang={setLanguage}
                  onPlayPrompt={(lang) => {
                    const txt = lang === 'en-IN'
                      ? "Hello! I will assist you in filling out your loan application using your voice."
                      : lang === 'ta-IN'
                      ? "வணக்கம்! உங்கள் கடன் விண்ணப்பத்தை குரல் வழியாக நிரப்ப நான் உங்களுக்கு உதவுவேன்."
                      : lang === 'hi-IN'
                      ? "नमस्ते! मैं आपका लोन आवेदन बोलकर भरने में मदद करूँगा।"
                      : "नमस्कार! मी तुमचा कर्ज अर्ज बोलून भरण्यास मदत करेन.";
                    handleSpeak(txt);
                  }}
                />
              </div>
            </div>

            <div className="consent-card-column">
              <ConsentBanner
                language={language}
                onAccept={handleAcceptConsent}
                onPlayConsent={() => {
                  const txt = language === 'en-IN'
                    ? "Hello! I will assist you in filling out your loan application using your voice. May I record your voice to begin?"
                    : language === 'ta-IN'
                    ? "வணக்கம்! உங்கள் கடன் விண்ணப்பத்தை குரல் வழியாக நிரப்ப நான் உங்களுக்கு உதவுவேன். உங்கள் குரலை பதிவு செய்யலாமா?"
                    : language === 'hi-IN'
                    ? "नमस्ते! मैं आपका लोन आवेदन बोलकर भरने में मदद करूँगा। मैं आपकी आवाज़ रिकॉर्ड करूँगा, क्या हम शुरू करें?"
                    : "नमस्कार! मी तुमचा कर्ज अर्ज बोलून भरण्यास मदत करेन. मी तुमचा आवाज रेकॉर्ड करेन, आपण सुरू करूया का?";
                  handleSpeak(txt);
                }}
                isSpeaking={isSpeaking}
              />
            </div>
          </div>
        )}

        {/* Step 2: Voice Intake Recording (Expansive Web Studio Layout) */}
        {currentStep === STEPS.RECORD && (
          <div className="record-desktop-container animate-fadeIn">
            <div className="record-header-strip">
              <div className="record-step-indicator">
                <span className="record-step-pill">
                  {isEnglish ? "Step 1 of 3: Voice Intake" : isTamil ? "படி 1 / 3: குரல் பதிவு" : isHindi ? "चरण 1 / 3: आवाज़ रिकॉर्डिंग" : "पायरी 1 / 3: व्हॉइस रेकॉर्डिंग"}
                </span>
                <h2 className="record-prompt-title">
                  {isEnglish
                    ? "Tell us about yourself and your loan need"
                    : isTamil
                    ? "உங்கள் விவரங்கள் மற்றும் கடன் தேவையை கூறுங்கள்"
                    : isHindi
                    ? "अपने बारे में और लोन की ज़रूरत बताएं"
                    : "तुमच्याबद्दल आणि कर्जाच्या गरजेबद्दल सांगा"}
                </h2>
              </div>
              <div className="record-fields-badge-list">
                {[
                  { key: 'name', label: isEnglish ? 'Name' : isTamil ? 'பெயர்' : 'नाम' },
                  { key: 'village', label: isEnglish ? 'City/Address' : isTamil ? 'ஊர்' : 'गाँव/पता' },
                  { key: 'amount', label: isEnglish ? 'Loan Amount' : isTamil ? 'கடன் தொகை' : 'लोन राशि' },
                  { key: 'purpose', label: isEnglish ? 'Purpose' : isTamil ? 'நோக்கம்' : 'उद्देश्य' },
                  { key: 'income', label: isEnglish ? 'Income' : isTamil ? 'வருமானம்' : 'कमाई' },
                  { key: 'source', label: isEnglish ? 'Source' : isTamil ? 'ஆதாரம்' : 'साधन' },
                  { key: 'aadhaar', label: isEnglish ? 'Aadhaar Last 4' : isTamil ? 'ஆதார் 4 எண்கள்' : 'आधार 4 अंक' },
                ].map((item) => (
                  <span key={item.key} className="expected-field-chip">
                    {item.label}
                  </span>
                ))}
              </div>
            </div>

            <MicRecorder
              isRecording={isRecording}
              isProcessing={isProcessingVoice}
              onStartRecord={handleStartInitialRecord}
              onStopRecord={handleStopInitialRecord}
              audioData={audioData}
              language={language}
              onPlayPrompt={(txt) => handleSpeak(txt)}
            />
          </div>
        )}

        {/* Step 3: Processing */}
        {currentStep === STEPS.PROCESSING && (
          <div className="processing-desktop-container text-center py-16 animate-pulse">
            <div className="processing-hero">
              <Sparkles className="w-16 h-16 text-amber-400 mx-auto animate-bounce" />
              <h2 className="text-2xl font-bold text-white mt-4">
                {isEnglish
                  ? "Processing and understanding your voice..."
                  : isTamil
                  ? "உங்கள் குரலை புரிந்து கொள்கிறோம்..."
                  : isHindi
                  ? "आपकी आवाज़ समझ रहे हैं..."
                  : "तुमचा आवाज समजून घेत आहे..."}
              </h2>
              <p className="text-base text-slate-300 mt-2">
                {isEnglish
                  ? "Extracting loan fields for interactive confirmation"
                  : isTamil
                  ? "விண்ணப்பப் படிவம் தயாராகிறது..."
                  : isHindi
                  ? "आवेदन पत्र तैयार किया जा रहा है"
                  : "कर्ज अर्ज तयार होत आहे"}
              </p>
            </div>
          </div>
        )}

        {/* Step 4: Field-by-Field Interactive Confirmation Loop (2-Column Desktop Grid with 7-Field Sidebar) */}
        {currentStep === STEPS.CONFIRM_LOOP && (
          <div className="confirm-desktop-grid animate-fadeIn">
            {/* Left Sidebar Checklist */}
            <aside className="progress-checklist-sidebar">
              <div className="checklist-header">
                <div className="flex items-center justify-between mb-2">
                  <span className="checklist-title">
                    {isEnglish ? "Application Checklist" : isTamil ? "விண்ணப்ப விவரங்கள்" : isHindi ? "आवेदन चेकलिस्ट" : "अर्ज चेकलिस्ट"}
                  </span>
                  <span className="checklist-badge">
                    {currentFieldIndex + 1} / {FIELD_KEYS.length}
                  </span>
                </div>
                <div className="checklist-progress-bar">
                  <div
                    className="checklist-progress-fill"
                    style={{ width: `${((currentFieldIndex) / FIELD_KEYS.length) * 100}%` }}
                  />
                </div>
              </div>

              <div className="checklist-items-stack">
                {FIELD_KEYS.map((key, idx) => {
                  const isDone = idx < currentFieldIndex;
                  const isCurrent = idx === currentFieldIndex;
                  const val = formData[key];
                  const labels = FIELD_SIDEBAR_LABELS[language] || FIELD_SIDEBAR_LABELS['en-IN'];
                  const label = labels[key] || key;

                  let formattedVal = val;
                  if (val && (key.includes('amount') || key.includes('income'))) {
                    formattedVal = `₹${Number(val).toLocaleString('en-IN')}`;
                  } else if (val && key.includes('last4')) {
                    formattedVal = `•••• ${val}`;
                  }

                  return (
                    <div
                      key={key}
                      className={`checklist-item ${isCurrent ? 'active' : ''} ${isDone ? 'completed' : 'pending'}`}
                      onClick={() => {
                        if (isDone) setCurrentFieldIndex(idx);
                      }}
                      role={isDone ? "button" : undefined}
                      title={isDone ? (isEnglish ? "Click to review" : "மீண்டும் சரிபார்க்க") : undefined}
                    >
                      <div className="checklist-status-icon">
                        {isDone ? (
                          <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                        ) : isCurrent ? (
                          <div className="active-pulse-dot" />
                        ) : (
                          <span className="pending-num">{idx + 1}</span>
                        )}
                      </div>
                      <div className="checklist-content">
                        <div className="checklist-field-name">{label}</div>
                        <div className="checklist-field-val">
                          {isDone ? (formattedVal || "—") : isCurrent ? (isEnglish ? "Confirming now" : isTamil ? "சரிபார்க்கப்படுகிறது" : "सत्यापित हो रहा") : (isEnglish ? "Upcoming" : isTamil ? "அடுத்தது" : "प्रलंबित")}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </aside>

            {/* Right Main Focus Area */}
            <div className="confirm-main-card">
              <FieldConfirmCard
                fieldKey={currentFieldKey}
                fieldIndex={currentFieldIndex}
                totalFields={FIELD_KEYS.length}
                value={formData[currentFieldKey]}
                explanation={explanations[currentFieldKey]}
                language={language}
                onConfirmField={handleConfirmField}
                onPlayTTS={(txt) => handleSpeak(txt)}
                isSpeaking={isSpeaking}
                onRecordCorrection={handleToggleCorrectionVoice}
                isRecordingCorrection={isRecordingCorrection}
                audioData={audioData}
              />
            </div>
          </div>
        )}

        {/* Step 5: Application Summary (Wide 2-Column Grid) */}
        {currentStep === STEPS.SUMMARY && (
          <div className="summary-desktop-container animate-fadeIn">
            <ApplicationSummary
              formData={formData}
              language={language}
              onSubmit={handleSubmitApplication}
              isSubmitting={isSubmitting}
              onPlaySummary={(txt) => handleSpeak(txt)}
              onEditField={(fieldKey) => {
                const idx = FIELD_KEYS.indexOf(fieldKey);
                if (idx !== -1) {
                  setCurrentFieldIndex(idx);
                  setCurrentStep(STEPS.CONFIRM_LOOP);
                }
              }}
              isSpeaking={isSpeaking}
            />
          </div>
        )}

        {/* Step 6: Voice Receipt & Verification Status */}
        {currentStep === STEPS.RECEIPT && receiptData && (
          <div className="receipt-desktop-container animate-fadeIn">
            <ReceiptModal
              receiptData={receiptData}
              language={language}
              onNewApplication={handleReset}
              onPlayReceipt={(txt, b64) => handleSpeak(txt, b64)}
              isSpeaking={isSpeaking}
            />
          </div>
        )}
      </main>

      {/* Footer Accessibility Notice */}
      <footer className="app-footer">
        <div className="app-footer-inner">
          <p className="text-xs text-slate-400 text-center">
            {isEnglish
              ? "Voice-Only Rural Lending Platform • Built for accessible, icon-heavy financial inclusion"
              : isTamil
              ? "கிராமப்புற இந்தியாவின் குரல் வழி தொழில்நுட்பம் • 100% Voice & Icon Operated"
              : "ग्रामीण भारत के लिए स्वर-सक्षम तकनीक • 100% Voice & Icon Operated"}
          </p>
        </div>
      </footer>

      {/* Genuine Authentication Modal (JWT based) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        language={language}
      />
    </div>
  );
}
