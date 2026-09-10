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
  CloudUpload
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

      const offlineVoice = language === 'ta-IN'
        ? `விண்ணப்பம் உங்கள் சாதனத்தில் பாதுகாப்பாக சேமிக்கப்பட்டது. குறிப்பு எண் ${offlineRef}. இணையம் வந்ததும் தானாகவே வங்கிக்கு அனுப்பப்படும்.`
        : language === 'mr-IN'
        ? `अर्ज डिव्हाइसमध्ये सुरक्षित जतन झाला आहे. संदर्भ क्रमांक ${offlineRef}. इंटरनेट आल्यावर बँकेत सिंक होईल.`
        : `आवेदन डिवाइस में सुरक्षित सहेज लिया गया है। संदर्भ नंबर ${offlineRef} है। इंटरनेट आते ही बैंक में सिंक हो जाएगा।`;

      setReceiptData({
        reference_no: offlineRef,
        status: 'saved_offline',
        voice_receipt_text: offlineVoice,
        disclaimer: language === 'ta-IN'
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

      const offlineVoice = language === 'ta-IN'
        ? `விண்ணப்பம் உங்கள் சாதனத்தில் பாதுகாப்பாக சேமிக்கப்பட்டது. இணைய இணைப்பு வந்தவுடன் வங்கிக்கு அனுப்பப்படும்.`
        : `आवेदन ऑफ़लाइन सुरक्षित सहेजा गया। इंटरनेट आते ही बैंक में सिंक हो जाएगा।`;

      setReceiptData({
        reference_no: offlineRef,
        status: 'saved_offline',
        voice_receipt_text: offlineVoice,
        disclaimer: 'Saved locally in offline queue. Will sync automatically once online.',
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

  return (
    <div className="app-shell">
      {/* Main Rural-First Header */}
      <header className="app-header">
        <div className="brand-badge">
          <Building2 className="w-6 h-6 text-blue-400" />
          <div>
            <h1 className="brand-title">
              {isTamil ? "குரல் கடன் வழிகாட்டி" : isHindi ? "आवाज़ लोन साथी" : "आवाज कर्ज साथी"}
            </h1>
            <p className="brand-subtitle">Voice-Only Rural Loan Assistant</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Network Status Badge */}
          <div className="network-status-badge">
            {isOnline ? (
              <div className="online-pill" title="Connected to bank server">
                <span className="online-dot" />
                <Wifi className="w-3.5 h-3.5" />
                <span className="text-[11px] font-semibold">{isTamil ? 'ஆன்லைன்' : isHindi ? 'ऑनलाइन' : 'ऑनलाइन'}</span>
              </div>
            ) : (
              <div className="offline-pill" title="Working 100% locally on device">
                <WifiOff className="w-3.5 h-3.5" />
                <span className="text-[11px] font-bold">{isTamil ? 'ஆஃப்லைன்' : isHindi ? 'ऑफ़लाइन' : 'ऑफलाइन'}</span>
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
                {pendingSyncCount} {isTamil ? 'ஒத்திசை' : isHindi ? 'सिंक' : 'सिंक'}
              </span>
            </button>
          )}

          {isAuthenticated ? (
            <div className="auth-user-pill">
              <span className="dot-green" />
              <span className="text-xs font-semibold text-slate-200">
                +91 {user?.phone_number?.slice(-4)} ({user?.role === 'agent' ? (isTamil ? 'கள முகவர்' : 'एजेंट') : (isTamil ? 'வாடிக்கையாளர்' : 'ग्राहक')})
              </span>
              <button
                type="button"
                className="text-xs text-rose-400 hover:text-rose-300 ml-1 font-bold"
                onClick={logout}
                title="Logout"
              >
                {isTamil ? 'வெளியேறு' : 'लॉगआउट'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="btn-header-login"
              onClick={() => setIsAuthModalOpen(true)}
            >
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>{isTamil ? 'உள்நுழைக' : isHindi ? 'लॉगिन' : 'लॉगिन'}</span>
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
                {isTamil ? 'மீண்டும் தொடங்க' : isHindi ? 'पुनः आरंभ' : 'पुन्हा सुरू'}
              </span>
            </button>
          )}
        </div>
      </header>

      {/* Auto-Sync Toast Notification */}
      {syncNotice && (
        <div className="sync-notice-banner animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold text-emerald-200">{syncNotice}</span>
        </div>
      )}

      {/* Main Flow Container */}
      <main className="main-content">
        {/* Step 1: Consent & Language */}
        {currentStep === STEPS.CONSENT && (
          <div className="step-wrapper animate-fadeIn">
            <LanguageSelect
              currentLang={language}
              onSelectLang={setLanguage}
              onPlayPrompt={(lang) => {
                const txt = lang === 'ta-IN'
                  ? "வணக்கம்! உங்கள் கடன் விண்ணப்பத்தை குரல் வழியாக நிரப்ப நான் உங்களுக்கு உதவுவேன்."
                  : lang === 'hi-IN'
                  ? "नमस्ते! मैं आपका लोन आवेदन बोलकर भरने में मदद करूँगा।"
                  : "नमस्कार! मी तुमचा कर्ज अर्ज बोलून भरण्यास मदत करेन.";
                handleSpeak(txt);
              }}
            />

            <ConsentBanner
              language={language}
              onAccept={handleAcceptConsent}
              onPlayConsent={() => {
                const txt = language === 'ta-IN'
                  ? "வணக்கம்! உங்கள் கடன் விண்ணப்பத்தை குரல் வழியாக நிரப்ப நான் உங்களுக்கு உதவுவேன். உங்கள் குரலை பதிவு செய்யலாமா?"
                  : language === 'hi-IN'
                  ? "नमस्ते! मैं आपका लोन आवेदन बोलकर भरने में मदद करूँगा। मैं आपकी आवाज़ रिकॉर्ड करूँगा, क्या हम शुरू करें?"
                  : "नमस्कार! मी तुमचा कर्ज अर्ज बोलून भरण्यास मदत करेन. मी तुमचा आवाज रेकॉर्ड करेन, आपण सुरू करूया का?";
                handleSpeak(txt);
              }}
              isSpeaking={isSpeaking}
            />
          </div>
        )}

        {/* Step 2: Voice Intake Recording */}
        {currentStep === STEPS.RECORD && (
          <div className="step-wrapper animate-fadeIn">
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
          <div className="step-wrapper text-center py-12 animate-pulse">
            <div className="processing-hero">
              <Sparkles className="w-16 h-16 text-amber-400 mx-auto animate-bounce" />
              <h2 className="text-xl font-bold text-white mt-4">
                {isTamil
                  ? "உங்கள் குரலை புரிந்து கொள்கிறோம்..."
                  : isHindi
                  ? "आपकी आवाज़ समझ रहे हैं..."
                  : "तुमचा आवाज समजून घेत आहे..."}
              </h2>
              <p className="text-sm text-slate-300 mt-2">
                {isTamil
                  ? "விண்ணப்பப் படிவம் தயாராகிறது..."
                  : isHindi
                  ? "आवेदन पत्र तैयार किया जा रहा है"
                  : "कर्ज अर्ज तयार होत आहे"}
              </p>
            </div>
          </div>
        )}

        {/* Step 4: Field-by-Field Interactive Confirmation Loop (CORE DIFFERENTIATOR) */}
        {currentStep === STEPS.CONFIRM_LOOP && (
          <div className="step-wrapper animate-fadeIn">
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
        )}

        {/* Step 5: Application Summary */}
        {currentStep === STEPS.SUMMARY && (
          <div className="step-wrapper animate-fadeIn">
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
          <div className="step-wrapper animate-fadeIn">
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
        <p className="text-[11px] text-slate-500 text-center">
          {isTamil
            ? "கிராமப்புற இந்தியாவின் குரல் வழி தொழில்நுட்பம் | 100% Voice & Icon Operated"
            : "ग्रामीण भारत के लिए स्वर-सक्षम तकनीक | 100% Voice & Icon Operated"}
        </p>
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
