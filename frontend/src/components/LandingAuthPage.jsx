import React, { useState } from 'react';
import { API_BASE } from '../services/api';
import {
  Mic,
  ShieldCheck,
  Headphones,
  Lock,
  ArrowRight,
  Sparkles,
  Eye,
  EyeOff
} from 'lucide-react';

export default function LandingAuthPage({ onLoginSuccess, onGetStarted }) {
  const [mode, setMode] = useState('login'); // 'login' or 'signup'
  const [phoneNumber, setPhoneNumber] = useState('9876543210');
  const [pin, setPin] = useState('1234');
  const [fullName, setFullName] = useState('MOHAMED IRFAN');
  const [role, setRole] = useState('borrower');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const endpoint = mode === 'login' ? `${API_BASE}/auth/login` : `${API_BASE}/auth/register`;
      const payload = mode === 'login'
        ? { phone_number: phoneNumber, pin }
        : { phone_number: phoneNumber, pin, full_name: fullName, role };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Authentication failed');
      }

      if (onLoginSuccess) {
        onLoginSuccess(data);
      }
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="landing-auth-grid">
      {/* Left Column: Brand & Value Highlights */}
      <div className="landing-left-pane">
        <div className="brand-header">
          <div className="brand-logo-wrap">
            <div className="brand-mic-square">
              <Mic className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="brand-name-text">VoiceLoan</span>
          </div>
          <div className="brand-sub-badge-row">
            <span className="brand-chip-teal">VOICE-FIRST FINANCIAL INCLUSION</span>
            <span className="brand-chip-dark">EMPOWERING RURAL INDIA</span>
          </div>
        </div>

        <div className="landing-hero-copy">
          <h1 className="landing-big-title">
            Apply for a loan.<br />
            <span className="title-teal-highlight">Just by speaking.</span>
          </h1>
          <p className="landing-lead-desc">
            A trusted voice assistant that turns natural speech into a verified
            loan application for people who cannot read or type forms.
          </p>

          <button
            type="button"
            className="btn-get-started-cta"
            onClick={onGetStarted}
          >
            <span>Get started</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* 3 Value Pillars */}
        <div className="landing-feature-pillars">
          <div className="feature-pill-card">
            <div className="feature-pill-icon">
              <Mic className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="feature-pill-content">
              <div className="feature-pill-title">Speak naturally</div>
              <div className="feature-pill-desc">Hindi, Tamil and regional-language ready.</div>
            </div>
          </div>

          <div className="feature-pill-card">
            <div className="feature-pill-icon">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="feature-pill-content">
              <div className="feature-pill-title">Confirm every detail</div>
              <div className="feature-pill-desc">Critical information is read back before submission.</div>
            </div>
          </div>

          <div className="feature-pill-card">
            <div className="feature-pill-icon">
              <Headphones className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="feature-pill-content">
              <div className="feature-pill-title">Button-phone compatible</div>
              <div className="feature-pill-desc">The same engine can connect to IVR and CSC devices.</div>
            </div>
          </div>
        </div>

        {/* Footer Statistics */}
        <div className="landing-footer-meta">
          <div className="footer-prototype-tag">Offline-first prototype • Built for INF-26-010</div>
          <div className="footer-stats-strip">
            <span>+ 10K+ rural users</span>
            <span>•</span>
            <span>+ 250+ CSC centers</span>
            <span>•</span>
            <span>+ 50+ partner institutions</span>
          </div>
        </div>
      </div>

      {/* Right Column: Clean White Authentication Card */}
      <div className="landing-right-pane">
        <div className="auth-clean-card">
          <div className="auth-clean-header">
            <div className="auth-pre-label">WELCOME BACK</div>
            <h2 className="auth-main-heading">
              {mode === 'login' ? 'Sign in to continue' : 'Create new account'}
            </h2>
            <p className="auth-subtext">
              Access applications, verification and voice sessions.
            </p>
          </div>

          {/* Sign In / Sign Up Tabs */}
          <div className="auth-clean-tabs">
            <button
              type="button"
              className={`auth-clean-tab ${mode === 'login' ? 'active' : ''}`}
              onClick={() => { setMode('login'); setError(null); }}
            >
              Sign in
            </button>
            <button
              type="button"
              className={`auth-clean-tab ${mode === 'signup' ? 'active' : ''}`}
              onClick={() => { setMode('signup'); setError(null); }}
            >
              Sign up
            </button>
          </div>

          {error && (
            <div className="auth-clean-error">
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-clean-form">
            {mode === 'signup' && (
              <div className="input-field-group">
                <label className="input-clean-label">Full Name</label>
                <input
                  type="text"
                  className="input-clean-box"
                  placeholder="e.g. Mohamed Irfan"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="input-field-group">
              <label className="input-clean-label">Mobile Number (or Email)</label>
              <input
                type="tel"
                className="input-clean-box"
                placeholder="9876543210"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
              />
            </div>

            <div className="input-field-group">
              <div className="flex justify-between items-center mb-1">
                <label className="input-clean-label">4-Digit Security PIN</label>
                <button
                  type="button"
                  className="text-xs text-slate-500 hover:text-emerald-600 flex items-center gap-1 font-semibold"
                  onClick={() => setShowPin(!showPin)}
                >
                  {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showPin ? 'Hide' : 'Show'}</span>
                </button>
              </div>
              <input
                type={showPin ? 'text' : 'password'}
                className="input-clean-box"
                placeholder="••••"
                maxLength={8}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                required
              />
            </div>

            {mode === 'signup' && (
              <div className="input-field-group">
                <label className="input-clean-label">Account Role</label>
                <div className="role-pick-row">
                  <button
                    type="button"
                    className={`role-pick-pill ${role === 'borrower' ? 'active' : ''}`}
                    onClick={() => setRole('borrower')}
                  >
                    User / Applicant
                  </button>
                  <button
                    type="button"
                    className={`role-pick-pill ${role === 'agent' ? 'active' : ''}`}
                    onClick={() => setRole('agent')}
                  >
                    Field Agent
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              className="btn-auth-submit-green"
              disabled={loading}
            >
              <span>{loading ? 'Authenticating...' : mode === 'login' ? 'Sign in →' : 'Create Account →'}</span>
            </button>
          </form>

          <div className="auth-security-footnote">
            <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Your credentials are securely hashed before storage.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
