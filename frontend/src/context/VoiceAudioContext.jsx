import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { API_BASE } from '../services/api';

const VoiceAudioContext = createContext(null);

// Language → BCP-47 tag for Web Speech API + speechSynthesis
const LANG_CONFIG = {
  'ta-IN': { bcp47: 'ta-IN', voiceName: 'tamil', rupeeWord: 'ரூபாய் ' },
  'hi-IN': { bcp47: 'hi-IN', voiceName: 'hindi',  rupeeWord: 'रुपये '  },
  'te-IN': { bcp47: 'te-IN', voiceName: 'telugu', rupeeWord: 'రూపాయలు ' },
  'ml-IN': { bcp47: 'ml-IN', voiceName: 'malayalam', rupeeWord: 'രൂപ ' },
  'mr-IN': { bcp47: 'mr-IN', voiceName: 'marathi', rupeeWord: 'रुपये ' },
  'en-IN': { bcp47: 'en-IN', voiceName: 'english', rupeeWord: 'rupees ' },
};

export function VoiceAudioProvider({ children }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioData, setAudioData] = useState(null);
  const [liveTranscript, setLiveTranscript] = useState('');

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const audioElementRef = useRef(new Audio());
  const recognitionRef = useRef(null);
  const liveTranscriptRef = useRef('');
  const scriptProcessorRef = useRef(null);
  const pcmChunksRef = useRef([]);
  const recordingLanguageRef = useRef('ta-IN');
  const isRecordingRef = useRef(false);   // used inside SpeechRecognition callbacks

  useEffect(() => {
    return () => {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      if (audioElementRef.current) audioElementRef.current.pause();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      stopRecognition();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Helper: stop Web Speech recognition safely ───────────────────────────
  const stopRecognition = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }
  };

  // ─── PCM → WAV encoder (16kHz mono for Sarvam STT) ───────────────────────
  const encodeWAV = (chunks, inputSampleRate, targetSampleRate = 16000) => {
    let totalLength = 0;
    for (const chunk of chunks) totalLength += chunk.length;
    const merged = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.length; }

    let resampled;
    if (inputSampleRate === targetSampleRate) {
      resampled = merged;
    } else {
      const ratio = inputSampleRate / targetSampleRate;
      const newLen = Math.round(merged.length / ratio);
      resampled = new Float32Array(newLen);
      for (let i = 0; i < newLen; i++) {
        resampled[i] = merged[Math.min(Math.round(i * ratio), merged.length - 1)];
      }
    }

    const numCh = 1, bps = 16, bytesPer = bps / 8;
    const blockAlign = numCh * bytesPer;
    const byteRate = targetSampleRate * blockAlign;
    const dataBytes = resampled.length * bytesPer;
    const buf = new ArrayBuffer(44 + dataBytes);
    const v = new DataView(buf);
    const ws = (pos, s) => { for (let i = 0; i < s.length; i++) v.setUint8(pos + i, s.charCodeAt(i)); };

    ws(0, 'RIFF'); v.setUint32(4, 36 + dataBytes, true); ws(8, 'WAVE');
    ws(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
    v.setUint16(22, numCh, true); v.setUint32(24, targetSampleRate, true);
    v.setUint32(28, byteRate, true); v.setUint16(32, blockAlign, true);
    v.setUint16(34, bps, true); ws(36, 'data'); v.setUint32(40, dataBytes, true);

    let p = 44;
    for (let i = 0; i < resampled.length; i++, p += 2) {
      const s = Math.max(-1, Math.min(1, resampled[i]));
      v.setInt16(p, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return new Blob([v], { type: 'audio/wav' });
  };

  // ─── Launch Web Speech API recognition (auto-restart on end) ─────────────
  const launchSpeechRecognition = (language) => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      console.warn('Web Speech API not supported in this browser. Use Chrome or Edge.');
      return;
    }

    stopRecognition();

    const rec = new SpeechRec();
    rec.continuous = false;        // false = more reliable per Chrome policy
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.lang = LANG_CONFIG[language]?.bcp47 || language;

    rec.onresult = (event) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t + ' ';
        else interim += t;
      }
      // Accumulate final results, show interim live
      if (final) {
        liveTranscriptRef.current = (liveTranscriptRef.current + ' ' + final).trim();
      }
      const display = (liveTranscriptRef.current + ' ' + interim).trim();
      if (display) {
        setLiveTranscript(display);
      }
    };

    rec.onerror = (e) => {
      // 'no-speech' and 'aborted' are non-fatal — restart
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      console.warn('SpeechRecognition error:', e.error);
    };

    rec.onend = () => {
      // Auto-restart while the user is still recording
      if (isRecordingRef.current && recognitionRef.current === rec) {
        try {
          rec.start();
        } catch {}
      }
    };

    try {
      rec.start();
      recognitionRef.current = rec;
    } catch (e) {
      console.warn('SpeechRecognition start failed:', e);
    }
  };

  // ─── START RECORDING ──────────────────────────────────────────────────────
  const startRecording = async (language = 'ta-IN') => {
    try {
      stopSpeaking();
      setLiveTranscript('');
      liveTranscriptRef.current = '';
      pcmChunksRef.current = [];
      recordingLanguageRef.current = language;
      isRecordingRef.current = true;

      // 1. Web Speech API for live transcript (primary STT path — free, offline-capable in Chrome)
      launchSpeechRecognition(language);

      // 2. Set up AudioContext for waveform visualization + PCM capture for Sarvam fallback
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioCtx();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      // ScriptProcessor for PCM capture (Sarvam backup)
      const scriptProcessor = audioCtx.createScriptProcessor(4096, 1, 1);
      scriptProcessor.onaudioprocess = (e) => {
        if (isRecordingRef.current) {
          pcmChunksRef.current.push(new Float32Array(e.inputBuffer.getChannelData(0)));
        }
      };
      source.connect(scriptProcessor);
      scriptProcessor.connect(audioCtx.destination);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;
      scriptProcessorRef.current = scriptProcessor;

      // MediaRecorder (backup blob)
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorder.start(100);

      setIsRecording(true);

      // Waveform animation loop
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      const updateWaveform = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          setAudioData(new Uint8Array(dataArray));
          animationFrameRef.current = requestAnimationFrame(updateWaveform);
        }
      };
      updateWaveform();

    } catch (err) {
      console.error('Microphone access error:', err);
      // Still set recording so UI reflects state
      isRecordingRef.current = true;
      setIsRecording(true);
    }
  };

  // ─── STOP RECORDING ───────────────────────────────────────────────────────
  const stopRecording = () => {
    return new Promise((resolve) => {
      isRecordingRef.current = false;

      // Capture transcript before stopping recognition
      const capturedTranscript = liveTranscriptRef.current.trim();
      stopRecognition();

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      if (scriptProcessorRef.current) {
        try { scriptProcessorRef.current.disconnect(); } catch {}
        scriptProcessorRef.current = null;
      }

      const audioCtx = audioContextRef.current;
      const sampleRate = audioCtx ? audioCtx.sampleRate : 44100;
      let wavBlob = null;

      if (pcmChunksRef.current.length > 0) {
        try {
          wavBlob = encodeWAV(pcmChunksRef.current, sampleRate, 16000);
        } catch (err) {
          console.warn('WAV encode error:', err);
        }
      }

      if (audioCtx) {
        audioCtx.close().catch(() => {});
        audioContextRef.current = null;
      }

      const finalize = (blob) => {
        blob.transcript = capturedTranscript;
        setIsRecording(false);
        setAudioData(null);
        // Keep liveTranscript visible after stop so user can see what was captured
        resolve(blob);
      };

      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        recorder.onstop = () => {
          recorder.stream.getTracks().forEach((t) => t.stop());
          finalize(wavBlob || new Blob(audioChunksRef.current, { type: 'audio/wav' }));
        };
        recorder.stop();
      } else {
        finalize(wavBlob || new Blob([], { type: 'audio/wav' }));
      }
    });
  };

  // ─── STOP SPEAKING ────────────────────────────────────────────────────────
  const stopSpeaking = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
    }
    setIsSpeaking(false);
  };

  // ─── SPEAK TEXT (Sarvam cloud → Browser speechSynthesis fallback) ─────────
  const speakText = (text, language = 'ta-IN', audioBase64 = null) => {
    stopSpeaking();
    if (!text && !audioBase64) return;
    setIsSpeaking(true);

    // Path A: caller already provided pre-fetched base64
    if (audioBase64) {
      playBase64Audio(audioBase64, text, language);
      return;
    }

    // Path B: fetch from Sarvam TTS backend
    fetch(`${API_BASE}/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`TTS ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (data?.audio_base64) {
          playBase64Audio(data.audio_base64, text, language);
        } else {
          fallbackBrowserSpeech(text, language);
        }
      })
      .catch((err) => {
        console.warn('Sarvam TTS unavailable — using browser voice:', err.message);
        fallbackBrowserSpeech(text, language);
      });
  };

  const playBase64Audio = (base64, fallbackText, language) => {
    try {
      const audio = new Audio(`data:audio/wav;base64,${base64}`);
      audioElementRef.current = audio;
      audio.onended = () => setIsSpeaking(false);
      audio.onerror = () => fallbackBrowserSpeech(fallbackText, language);
      audio.play().catch(() => fallbackBrowserSpeech(fallbackText, language));
    } catch {
      fallbackBrowserSpeech(fallbackText, language);
    }
  };

  // ─── Browser SpeechSynthesis fallback (works offline) ────────────────────
  const fallbackBrowserSpeech = (text, language) => {
    if (!('speechSynthesis' in window)) { setIsSpeaking(false); return; }

    window.speechSynthesis.cancel();

    const cfg = LANG_CONFIG[language] || LANG_CONFIG['en-IN'];
    const cleanText = (text || '')
      .replace(/₹/g, cfg.rupeeWord)
      .replace(/\*/g, '')
      .trim();

    if (!cleanText) { setIsSpeaking(false); return; }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = cfg.bcp47;
    utterance.rate = 0.92;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Try to pick the best matching installed OS voice
    const voices = window.speechSynthesis.getVoices();
    const voiceName = cfg.voiceName;
    const matchedVoice = voices.find((v) => {
      const vl = (v.lang || '').toLowerCase();
      const vn = (v.name || '').toLowerCase();
      return vl.startsWith(language.slice(0, 2)) || vl === cfg.bcp47.toLowerCase() || vn.includes(voiceName);
    });
    if (matchedVoice) utterance.voice = matchedVoice;

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    // Chrome bug: voices list loads asynchronously — retry after 100ms if empty
    if (voices.length === 0) {
      setTimeout(() => {
        const retryVoices = window.speechSynthesis.getVoices();
        const rv = retryVoices.find((v) => {
          const vl = (v.lang || '').toLowerCase();
          return vl.startsWith(language.slice(0, 2));
        });
        if (rv) utterance.voice = rv;
        window.speechSynthesis.speak(utterance);
      }, 150);
    } else {
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <VoiceAudioContext.Provider
      value={{
        isRecording,
        isSpeaking,
        audioData,
        liveTranscript,
        startRecording,
        stopRecording,
        speakText,
        stopSpeaking,
      }}
    >
      {children}
    </VoiceAudioContext.Provider>
  );
}

export function useVoiceAudio() {
  const ctx = useContext(VoiceAudioContext);
  if (!ctx) throw new Error('useVoiceAudio must be used within a VoiceAudioProvider');
  return ctx;
}
