import React, { useState } from 'react';
import {
  Phone,
  KeyRound,
  ShieldCheck,
  X,
  User,
  CheckCircle2,
  AlertCircle,
  LogIn,
  UserPlus
} from 'lucide-react';
import { loginUser, registerUser } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useVoiceAudio } from '../context/VoiceAudioContext';

export default function AuthModal({ isOpen, onClose, language = 'hi-IN' }) {
  const [activeTab, setActiveTab] = useState('LOGIN'); // 'LOGIN' or 'REGISTER'
  
  // Login State
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPin, setLoginPin] = useState('');

  // Register State
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPin, setRegPin] = useState('');
  const [regRole, setRegRole] = useState('borrower');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { login } = useAuth();
  const { speakText } = useVoiceAudio();

  if (!isOpen) return null;

  const isTamil = language === 'ta-IN';
  const isHindi = language === 'hi-IN';

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanPhone = loginPhone.replace(/\D/g, '').trim();
    const cleanPin = loginPin.trim();

    if (cleanPhone.length < 10) {
      setErrorMsg(
        isTamil
          ? '10 இலக்க மொபைல் எண்ணை உள்ளிடவும்'
          : isHindi
          ? 'कृपया 10 अंकों का वैध मोबाइल नंबर दर्ज करें'
          : 'कृपया 10 अंकी मोबाइल नंबर टाका'
      );
      return;
    }

    if (cleanPin.length !== 4) {
      setErrorMsg(
        isTamil
          ? '4 இலக்க பாதுகாப்பு பின்னை உள்ளிடவும்'
          : isHindi
          ? 'कृपया 4 अंकों का सुरक्षा पिन दर्ज करें'
          : 'कृपया 4 अंकी सुरक्षा पिन प्रविष्ट करा'
      );
      return;
    }

    setIsLoading(true);
    try {
      const res = await loginUser(cleanPhone, cleanPin);
      login(res.access_token, {
        phone_number: res.phone_number,
        full_name: res.full_name,
        role: res.role,
      });

      const welcomeText = isTamil
        ? `வணக்கம் ${res.full_name || ''}! உள்நுழைவு வெற்றிகரமாக முடிந்தது.`
        : isHindi
        ? `नमस्ते ${res.full_name || ''}! लॉगिन सफल हुआ।`
        : `नमस्कार! लॉगिन यशस्वी झाले.`;
      speakText(welcomeText, language);

      onClose();
    } catch (err) {
      setErrorMsg(err.message || (isTamil ? 'உள்நுழைவு தோல்வியடைந்தது' : 'लॉगिन विफल हुआ'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanName = regName.trim();
    const cleanPhone = regPhone.replace(/\D/g, '').trim();
    const cleanPin = regPin.trim();

    if (!cleanName) {
      setErrorMsg(
        isTamil
          ? 'உங்கள் முழு பெயரை உள்ளிடவும்'
          : isHindi
          ? 'कृपया अपना पूरा नाम दर्ज करें'
          : 'कृपया तुमचे पूर्ण नाव प्रविष्ट करा'
      );
      return;
    }

    if (cleanPhone.length < 10) {
      setErrorMsg(
        isTamil
          ? '10 இலக்க மொபைல் எண்ணை உள்ளிடவும்'
          : isHindi
          ? 'कृपया 10 अंकों का वैध मोबाइल नंबर दर्ज करें'
          : 'कृपया 10 अंकी मोबाइल नंबर टाका'
      );
      return;
    }

    if (cleanPin.length !== 4) {
      setErrorMsg(
        isTamil
          ? '4 இலக்க பாதுகாப்பு பின்னை அமைக்கவும்'
          : isHindi
          ? 'कृपया 4 अंकों का पिन बनाएं'
          : 'कृपया 4 अंकी पिन तयार करा'
      );
      return;
    }

    setIsLoading(true);
    try {
      const res = await registerUser({
        phoneNumber: cleanPhone,
        fullName: cleanName,
        pin: cleanPin,
        role: regRole,
      });

      login(res.access_token, {
        phone_number: res.phone_number,
        full_name: res.full_name,
        role: res.role,
      });

      const welcomeText = isTamil
        ? `பதிவு வெற்றிகரமாக முடிந்தது! வரவேற்கிறோம் ${res.full_name || ''}.`
        : isHindi
        ? `पंजीकरण सफल हुआ! स्वागत है ${res.full_name || ''}।`
        : `नोंदणी यशस्वी झाली!`;
      speakText(welcomeText, language);

      onClose();
    } catch (err) {
      setErrorMsg(err.message || (isTamil ? 'பதிவு தோல்வியடைந்தது' : 'पंजीकरण विफल हुआ'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-modal-overlay animate-fadeIn" onClick={onClose}>
      <div className="auth-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button
          type="button"
          className="auth-close-btn"
          onClick={onClose}
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="auth-header">
          <div className="auth-icon-circle">
            <ShieldCheck className="w-7 h-7 text-white stroke-[2.5]" />
          </div>
          <h2 className="auth-title">
            {isTamil ? 'பாதுகாப்பான உள்நுழைவு' : isHindi ? 'सुरक्षित प्रमाणीकरण' : 'सुरक्षित लॉगिन'}
          </h2>
          <div className="auth-badge-sub">
            <span className="auth-badge-dot" />
            <span>
              {isTamil
                ? 'JWT நேரடி அங்கீகாரம்'
                : isHindi
                ? 'JWT आधारित सुरक्षित लॉगिन'
                : 'JWT आधारित सुरक्षित खाते'}
            </span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="auth-tab-bar">
          <button
            type="button"
            className={`auth-tab-btn ${activeTab === 'LOGIN' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('LOGIN');
              setErrorMsg('');
            }}
          >
            <LogIn className="w-4 h-4" />
            <span>{isTamil ? 'உள்நுழை (Login)' : isHindi ? 'लॉगिन' : 'लॉगिन'}</span>
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${activeTab === 'REGISTER' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('REGISTER');
              setErrorMsg('');
            }}
          >
            <UserPlus className="w-4 h-4" />
            <span>{isTamil ? 'பதிவு செய் (Register)' : isHindi ? 'नया खाता' : 'नवीन नोंदणी'}</span>
          </button>
        </div>

        {/* Error Alert Box */}
        {errorMsg && (
          <div className="auth-error-badge">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="flex-1">{errorMsg}</span>
          </div>
        )}

        {/* Tab 1: Genuine Login Form */}
        {activeTab === 'LOGIN' && (
          <form onSubmit={handleLoginSubmit} className="auth-form-body">
            <div className="auth-field-group">
              <label className="auth-label">
                {isTamil ? 'மொபைல் எண் (10 இலக்கங்கள்)' : isHindi ? 'मोबाइल नंबर (10 अंक)' : 'मोबाइल नंबर'}
              </label>
              <div className="phone-input-wrapper">
                <span className="phone-prefix">+91</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  className="auth-phone-input"
                  value={loginPhone}
                  onChange={(e) => setLoginPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="9876543210"
                  autoFocus
                  required
                />
              </div>
            </div>

            <div className="auth-field-group">
              <label className="auth-label">
                {isTamil ? '4 இலக்க பாதுகாப்பு பின் (PIN)' : isHindi ? '4 अंकों का सुरक्षा पिन (PIN)' : '4 अंकी सुरक्षा पिन'}
              </label>
              <div className="pin-input-wrapper">
                <KeyRound className="pin-input-icon" />
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  className="auth-pin-input"
                  value={loginPin}
                  onChange={(e) => setLoginPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-auth-primary login-variant"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="spinner-small mr-1" />
              ) : (
                <CheckCircle2 className="w-5 h-5 mr-1" />
              )}
              <span>
                {isLoading
                  ? isTamil
                    ? 'சரிபார்க்கிறது...'
                    : 'जांच रहे हैं...'
                  : isTamil
                  ? 'உள்நுழைக (Sign In)'
                  : 'लॉगिन करें'}
              </span>
            </button>
          </form>
        )}

        {/* Tab 2: Genuine Register Form */}
        {activeTab === 'REGISTER' && (
          <form onSubmit={handleRegisterSubmit} className="auth-form-body">
            <div className="auth-field-group">
              <label className="auth-label">
                {isTamil ? 'முழு பெயர்' : isHindi ? 'पूरा नाम' : 'पूर्ण नाव'}
              </label>
              <div className="text-input-wrapper">
                <User className="pin-input-icon" />
                <input
                  type="text"
                  className="auth-text-input"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder={isTamil ? 'உதா: விக்னேஷ்' : 'उदा: राम कुमार'}
                  required
                />
              </div>
            </div>

            <div className="auth-field-group">
              <label className="auth-label">
                {isTamil ? 'மொபைல் எண் (10 இலக்கங்கள்)' : isHindi ? 'मोबाइल नंबर (10 अंक)' : 'मोबाइल नंबर'}
              </label>
              <div className="phone-input-wrapper">
                <span className="phone-prefix">+91</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  className="auth-phone-input"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="9876543210"
                  required
                />
              </div>
            </div>

            <div className="auth-field-group">
              <label className="auth-label">
                {isTamil ? 'புதிய 4 இலக்க பின் (PIN)' : isHindi ? 'नया 4 अंकों का पिन' : 'नवीन 4 अंकी पिन'}
              </label>
              <div className="pin-input-wrapper">
                <KeyRound className="pin-input-icon" />
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  className="auth-pin-input"
                  value={regPin}
                  onChange={(e) => setRegPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  required
                />
              </div>
            </div>

            <div className="auth-field-group">
              <label className="auth-label">
                {isTamil ? 'பயனர் வகை' : isHindi ? 'उपयोगकर्ता प्रकार' : 'वापरकर्ता प्रकार'}
              </label>
              <div className="role-selector-grid">
                <button
                  type="button"
                  className={`role-choice-pill ${regRole === 'borrower' ? 'active' : ''}`}
                  onClick={() => setRegRole('borrower')}
                >
                  <span className="role-pill-dot" />
                  <span>{isTamil ? 'வாடிக்கையாளர்' : 'ग्राहक (Borrower)'}</span>
                </button>
                <button
                  type="button"
                  className={`role-choice-pill ${regRole === 'agent' ? 'active' : ''}`}
                  onClick={() => setRegRole('agent')}
                >
                  <span className="role-pill-dot" />
                  <span>{isTamil ? 'கள முகவர்' : 'एजेंट (Agent)'}</span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn-auth-primary register-variant"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="spinner-small mr-1" />
              ) : (
                <UserPlus className="w-5 h-5 mr-1" />
              )}
              <span>
                {isLoading
                  ? isTamil
                    ? 'பதிவாகிறது...'
                    : 'पंजीकरण हो रहा है...'
                  : isTamil
                  ? 'புதிய கணக்கை உருவாக்கு'
                  : 'खाता बनाएं'}
              </span>
            </button>
          </form>
        )}

        {/* Security Footnote */}
        <div className="auth-security-footer">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>
            {isTamil
              ? '256-பிட் பாதுகாப்பான அமர்வு • ரகசிய பின் அங்கீகாரம்'
              : isHindi
              ? '256-बिट सुरक्षित सत्र • सुरक्षित बैंक ग्रेड सुरक्षा'
              : '256-बिट सुरक्षित सत्र • सुरक्षित बँक दर्जाची सुरक्षा'}
          </span>
        </div>
      </div>
    </div>
  );
}
