/**
 * Frontend API client for Voice-Only Loan Assistant backend.
 */

const API_BASE = '/api';

export async function getHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}

export async function getDemoProfiles() {
  const res = await fetch(`${API_BASE}/demo-profiles`);
  if (!res.ok) throw new Error('Failed to fetch demo profiles');
  return res.json();
}

export async function transcribeAudio(audioBlob, language = 'hi-IN') {
  const formData = new FormData();
  formData.append('file', audioBlob, 'recording.wav');
  formData.append('language', language);

  const res = await fetch(`${API_BASE}/stt`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Speech-to-text transcription failed');
  return res.json();
}

export async function extractFields(transcript, language = 'hi-IN') {
  const res = await fetch(`${API_BASE}/extract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript, language }),
  });
  if (!res.ok) throw new Error('Field extraction failed');
  return res.json();
}

export async function processVoiceIntake(audioBlob, language = 'hi-IN', clientTranscript = '') {
  const formData = new FormData();
  formData.append('file', audioBlob, 'intake.wav');
  formData.append('language', language);
  if (clientTranscript) {
    formData.append('client_transcript', clientTranscript);
  }

  const res = await fetch(`${API_BASE}/process-voice`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Voice processing failed');
  return res.json();
}

export async function synthesizeSpeech(text, language = 'hi-IN') {
  const res = await fetch(`${API_BASE}/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, language }),
  });
  if (!res.ok) throw new Error('Speech synthesis failed');
  return res.json();
}

export async function confirmField({ fieldName, currentValue, userResponse, language = 'hi-IN' }) {
  const res = await fetch(`${API_BASE}/confirm-field`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      field_name: fieldName,
      current_value: currentValue,
      user_response: userResponse,
      language,
    }),
  });
  if (!res.ok) throw new Error('Field confirmation failed');
  return res.json();
}

export async function submitApplication(data, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}/submit`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Application submission failed');
  return res.json();
}

export async function getApplications(token = null) {
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}/applications`, { headers });
  if (!res.ok) throw new Error('Failed to fetch applications');
  return res.json();
}

export async function sendOTP(phoneNumber, language = 'hi-IN') {
  const res = await fetch(`${API_BASE}/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone_number: phoneNumber, language }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to send OTP' }));
    throw new Error(err.detail || 'Failed to send OTP');
  }
  return res.json();
}

export async function verifyOTP(phoneNumber, otp) {
  const res = await fetch(`${API_BASE}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone_number: phoneNumber, otp }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Invalid OTP' }));
    throw new Error(err.detail || 'Invalid OTP');
  }
  return res.json();
}

export async function getMe(token) {
  if (!token) return { authenticated: false };
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) return { authenticated: false };
  return res.json();
}

export async function loginUser(phoneNumber, pin) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone_number: phoneNumber, pin }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Login failed' }));
    throw new Error(err.detail || 'Login failed');
  }
  return res.json();
}

export async function registerUser({ phoneNumber, fullName, pin, role = 'borrower' }) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone_number: phoneNumber,
      full_name: fullName,
      pin,
      role,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Registration failed' }));
    throw new Error(err.detail || 'Registration failed');
  }
  return res.json();
}
