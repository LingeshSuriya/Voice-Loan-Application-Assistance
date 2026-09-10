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

export default function App() {
  const [currentPage, setCurrentPage] = useState(PAGES.OVERVIEW);
  const [language, setLanguage] = useState('ta-IN');
  const [formData, setFormData] = useState({ ...DEFAULT_FORM_DATA });
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
    setFormData({
      applicant_name: language === 'ta-IN' ? 'முகமது இர்பான் (Mohamed Irfan)' : 'Mohamed Irfan',
      village_or_address: language === 'ta-IN' ? 'மதுரை (Madurai)' : 'Madurai, TN',
      loan_amount: 50000,
      loan_purpose: language === 'ta-IN' ? 'மளிகை கடை (Retail Store)' : 'Retail Grocery Store',
      monthly_income: 25000,
      income_source: language === 'ta-IN' ? 'வணிகம் (Retail Business)' : 'Small Business',
      aadhaar_last4: '7842'
    });
  };

  const handleUpdateField = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleConfirmField = (key) => {
    const val = formData[key];
    const confirmPrompt = language === 'ta-IN'
      ? `${key} உறுதிப்படுத்தப்பட்டது.`
      : `${key} confirmed.`;
    speakText(confirmPrompt, language);
  };

  // Voice recording handlers for Voice Session Studio
  const handleStartSessionRecord = async () => {
    try {
      await startRecording();
    } catch (err) {
      console.warn('Voice start record error:', err);
    }
  };

  const handleStopSessionRecord = async () => {
    try {
      const audioBlob = await stopRecording();
      if (audioBlob) {
        if (!isOnline) {
          const offlineExtracted = extractFieldsOffline(liveTranscript || '', language);
          setFormData(prev => ({ ...prev, ...offlineExtracted }));
        } else {
          try {
            const res = await processVoiceIntake(audioBlob, language);
            if (res && res.data) {
              setFormData(prev => ({
                applicant_name: res.data.applicant_name || prev.applicant_name,
                village_or_address: res.data.village_or_address || prev.village_or_address,
                loan_amount: res.data.loan_amount || prev.loan_amount,
                loan_purpose: res.data.loan_purpose || prev.loan_purpose,
                monthly_income: res.data.monthly_income || prev.monthly_income,
                income_source: res.data.income_source || prev.income_source,
                aadhaar_last4: res.data.aadhaar_last4 || prev.aadhaar_last4,
              }));
            }
          } catch (err) {
            console.warn('Online intake fallback to offline regex:', err);
            const offlineExtracted = extractFieldsOffline(liveTranscript || '', language);
            setFormData(prev => ({ ...prev, ...offlineExtracted }));
          }
        }
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
            onUpdateField={handleUpdateField}
            onConfirmField={handleConfirmField}
            onSubmitApplication={handleSubmitApplication}
            onBack={() => setCurrentPage(PAGES.OVERVIEW)}
            isRecording={isRecording}
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
