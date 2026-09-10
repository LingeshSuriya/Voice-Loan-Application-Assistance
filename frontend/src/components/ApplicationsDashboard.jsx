import React, { useState, useEffect } from 'react';
import {
  Search,
  RotateCcw,
  Download,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Volume2,
  MessageCircle,
  Clock,
  ArrowUpDown
} from 'lucide-react';
import WhatsAppVoiceNoteModal from './WhatsAppVoiceNoteModal';

export default function ApplicationsDashboard({
  onPlayVoiceNote,
  isSpeaking,
  onStopAudio,
  pendingSyncCount = 0
}) {
  const [applications, setApplications] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedAppForWhatsApp, setSelectedAppForWhatsApp] = useState(null);

  const fetchApplications = async (query = '') => {
    setLoading(true);
    try {
      const url = query
        ? `/api/applications?q=${encodeURIComponent(query)}`
        : '/api/applications';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setApplications(data);
      }
    } catch (err) {
      console.warn('Error fetching applications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchApplications(searchQuery);
  };

  const handleDownloadPDF = (app) => {
    setSelectedAppForWhatsApp(app);
  };

  return (
    <div className="applications-dashboard-container animate-fadeIn">
      {/* Top Header Section */}
      <div className="apps-header-row">
        <div>
          <div className="apps-prelabel">MY APPLICATIONS</div>
          <h1 className="apps-main-title">Applications</h1>
          <p className="apps-subtext">
            Track your voice applications and verification status.
          </p>
        </div>

        <div className="apps-sync-pill">
          <span className="dot-teal" />
          <span className="text-xs font-semibold text-slate-700">
            {pendingSyncCount} pending sync
          </span>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="apps-search-control-bar">
        <form onSubmit={handleSearchSubmit} className="apps-search-form">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            className="apps-search-input"
            placeholder="Search application, name or purpose"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>

        <button
          type="button"
          className="btn-refresh-queue"
          onClick={() => fetchApplications(searchQuery)}
          disabled={loading}
        >
          <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh queue</span>
        </button>
      </div>

      {/* Applications Data Table */}
      <div className="apps-table-container">
        <table className="apps-table">
          <thead>
            <tr>
              <th>APPLICATION</th>
              <th>APPLICANT</th>
              <th>REQUEST</th>
              <th>VERIFICATION</th>
              <th>RISK</th>
              <th>STATUS</th>
              <th>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {applications.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-500">
                  {loading ? 'Loading applications...' : 'No applications found.'}
                </td>
              </tr>
            ) : (
              applications.map((app) => {
                const langLabel = app.language === 'ta-IN' ? 'Tamil' : app.language === 'hi-IN' ? 'Hindi' : 'English';
                const risk = app.risk_tier || 'LOW';
                const isVerified = (app.verification_status || 'VERIFIED') === 'VERIFIED';
                const maskedPhone = app.user_phone ? `+91*****${app.user_phone.slice(-4)}` : '******3210';

                return (
                  <tr key={app.id}>
                    {/* Application Ref */}
                    <td>
                      <div className="font-bold text-slate-900">{app.reference_no}</div>
                      <div className="text-[11.5px] text-slate-400">
                        {langLabel} · voice captured
                      </div>
                    </td>

                    {/* Applicant */}
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="applicant-avatar-dot">
                          {(app.applicant_name || 'A')[0]}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-800 text-sm">
                            {app.applicant_name || 'Anonymous Applicant'}
                          </div>
                          <div className="text-xs text-slate-400 font-mono">
                            {maskedPhone}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Request */}
                    <td>
                      <div className="font-bold text-slate-900">
                        ₹{Number(app.loan_amount || 0).toLocaleString('en-IN')}
                      </div>
                      <div className="text-xs text-slate-500 capitalize">
                        {app.loan_purpose || 'Agriculture'}
                      </div>
                    </td>

                    {/* Verification */}
                    <td>
                      <span className={`pill-verification ${isVerified ? 'verified' : 'pending'}`}>
                        {isVerified ? 'VERIFIED' : 'PENDING'}
                      </span>
                    </td>

                    {/* Risk Tier */}
                    <td>
                      <span className={`pill-risk ${risk.toLowerCase()}`}>
                        {risk}
                      </span>
                    </td>

                    {/* Status */}
                    <td>
                      <span className="font-bold text-xs text-slate-700 tracking-wider">
                        {app.status === 'pending verification' ? 'LOAN_ACCEPTED' : app.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="btn-action-whatsapp"
                          onClick={() => setSelectedAppForWhatsApp(app)}
                          title="View WhatsApp Sanction Card & Listen to Voice Note"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Voice Note</span>
                        </button>

                        <button
                          type="button"
                          className="btn-action-download"
                          onClick={() => handleDownloadPDF(app)}
                          title="Download Sanction PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download PDF</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Responsible Screening Notice Footer Card */}
      <div className="responsible-screening-card">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div className="screening-content">
          <div className="screening-title">Responsible screening</div>
          <div className="screening-text">
            Risk signals help prioritize manual review. Missing records are marked
            "Verification Required", never automatically treated as fraud.
          </div>
        </div>
      </div>

      {/* WhatsApp Modal Dialog */}
      <WhatsAppVoiceNoteModal
        isOpen={Boolean(selectedAppForWhatsApp)}
        onClose={() => setSelectedAppForWhatsApp(null)}
        application={selectedAppForWhatsApp}
        onPlayAudio={onPlayVoiceNote}
        isSpeaking={isSpeaking}
        onStopAudio={onStopAudio}
      />
    </div>
  );
}
