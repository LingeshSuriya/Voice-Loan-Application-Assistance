/**
 * Offline Sync Service.
 * Manages local queuing of loan applications when disconnected,
 * and automatically uploads them to the bank backend upon reconnection.
 */

const STORAGE_KEY = 'voice_loan_offline_drafts';

export function saveOfflineApplication(data) {
  try {
    const existing = getOfflineApplications();
    const offlineRef = 'OFFLINE-LN-' + Math.floor(10000 + Math.random() * 90000);
    const draft = {
      ...data,
      offline_ref: offlineRef,
      saved_at: new Date().toISOString(),
      status: 'pending_sync',
    };
    existing.push(draft);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    return draft;
  } catch (err) {
    console.warn('Failed saving offline application to localStorage:', err);
    return null;
  }
}

export function getOfflineApplications() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearSyncedDraft(offlineRef) {
  try {
    const existing = getOfflineApplications();
    const filtered = existing.filter((d) => d.offline_ref !== offlineRef);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.warn('Error removing synced draft:', err);
  }
}

export async function syncPendingApplications(submitFn, token = null) {
  const pending = getOfflineApplications();
  if (!pending || pending.length === 0) return [];

  const syncedResults = [];

  for (const draft of pending) {
    try {
      const payload = {
        applicant_name: draft.applicant_name,
        village_or_address: draft.village_or_address,
        loan_amount: draft.loan_amount,
        loan_purpose: draft.loan_purpose,
        monthly_income: draft.monthly_income,
        income_source: draft.income_source,
        aadhaar_last4: draft.aadhaar_last4,
        language: draft.language || 'hi-IN',
        transcript: draft.transcript || '',
        user_phone: draft.user_phone || null,
      };

      const res = await submitFn(payload, token);
      clearSyncedDraft(draft.offline_ref);
      syncedResults.push({
        offline_ref: draft.offline_ref,
        server_ref: res.reference_no,
        applicant_name: draft.applicant_name,
      });
    } catch (err) {
      console.warn('Failed syncing draft ' + draft.offline_ref, err);
    }
  }

  return syncedResults;
}
