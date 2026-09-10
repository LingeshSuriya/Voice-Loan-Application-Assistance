import React, { createContext, useContext, useState, useRef, useEffect } from 'react';

const VoiceAudioContext = createContext(null);

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

  // Cleanup speech and audio on unmount
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
    };
  }, []);

  /**
   * Helper to encode float32 audio chunks to standard 16kHz 16-bit Mono WAV
   */
  const encodeWAV = (chunks, inputSampleRate, targetSampleRate = 16000) => {
    let totalLength = 0;
    for (let i = 0; i < chunks.length; i++) {
      totalLength += chunks[i].length;
    }
    const merged = new Float32Array(totalLength);
    let offset = 0;
    for (let i = 0; i < chunks.length; i++) {
      merged.set(chunks[i], offset);
      offset += chunks[i].length;
    }

    // Downsample to 16000Hz for high-accuracy Sarvam AI STT
    let resampled;
    if (inputSampleRate === targetSampleRate) {
      resampled = merged;
    } else {
      const ratio = inputSampleRate / targetSampleRate;
      const newLength = Math.round(merged.length / ratio);
      resampled = new Float32Array(newLength);
      for (let i = 0; i < newLength; i++) {
        resampled[i] = merged[Math.min(Math.round(i * ratio), merged.length - 1)];
      }
    }

    // Build standard 44-byte WAV header + 16-bit PCM samples
    const numChannels = 1;
    const bitsPerSample = 16;
    const bytesPerSample = bitsPerSample / 8;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = targetSampleRate * blockAlign;
    const dataByteCount = resampled.length * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataByteCount);
    const view = new DataView(buffer);

    const writeString = (pos, str) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(pos + i, str.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataByteCount, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk size
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, numChannels, true);
    view.setUint32(24, targetSampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeString(36, 'data');
    view.setUint32(40, dataByteCount, true);

    let pcmOffset = 44;
    for (let i = 0; i < resampled.length; i++, pcmOffset += 2) {
      const s = Math.max(-1, Math.min(1, resampled[i]));
      view.setInt16(pcmOffset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }

    return new Blob([view], { type: 'audio/wav' });
  };

  /**
   * Start microphone recording, attach Web Audio analyser, and launch live speech recognition
   */
  const startRecording = async (language = 'ta-IN') => {
    try {
      // Cancel any ongoing speech
      stopSpeaking();
      setLiveTranscript('');
      liveTranscriptRef.current = '';
      pcmChunksRef.current = [];

      // 1. Launch in-browser SpeechRecognition (Chrome, Edge, Android)
      const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRec) {
        try {
          const rec = new SpeechRec();
          rec.continuous = true;
          rec.interimResults = true;
          rec.lang = language || 'ta-IN';
          
          rec.onresult = (event) => {
            let full = '';
            for (let i = 0; i < event.results.length; i++) {
              full += event.results[i][0].transcript + ' ';
            }
            const clean = full.trim();
            if (clean) {
              setLiveTranscript(clean);
              liveTranscriptRef.current = clean;
            }
          };

          rec.onerror = (e) => {
            console.warn('Live SpeechRecognition notice:', e.error);
          };

          rec.start();
          recognitionRef.current = rec;
        } catch (e) {
          console.warn('SpeechRecognition init error:', e);
        }
      }

      // 2. Stream audio through AudioContext, ScriptProcessor & Analyser
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioCtx();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      // Capture raw PCM for pristine 16kHz WAV generation
      const scriptProcessor = audioCtx.createScriptProcessor(4096, 1, 1);
      scriptProcessor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        pcmChunksRef.current.push(new Float32Array(input));
      };
      source.connect(scriptProcessor);
      scriptProcessor.connect(audioCtx.destination);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;
      scriptProcessorRef.current = scriptProcessor;

      // MediaRecorder as backup
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorder.start(100);

      setIsRecording(true);

      // Waveform polling loop
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
      console.warn('Microphone access failed:', err);
      setIsRecording(true);
    }
  };

  /**
   * Stop recording and return audio Blob with live transcript attached
   */
  const stopRecording = () => {
    return new Promise((resolve) => {
      // Stop speech recognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
        recognitionRef.current = null;
      }

      const capturedTranscript = liveTranscriptRef.current || '';

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      // Stop script processor
      if (scriptProcessorRef.current) {
        try { scriptProcessorRef.current.disconnect(); } catch (e) {}
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

      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        recorder.onstop = () => {
          const finalBlob = wavBlob || new Blob(audioChunksRef.current, { type: 'audio/wav' });
          finalBlob.transcript = capturedTranscript;
          setIsRecording(false);
          setAudioData(null);
          recorder.stream.getTracks().forEach((track) => track.stop());
          resolve(finalBlob);
        };
        recorder.stop();
      } else {
        setIsRecording(false);
        setAudioData(null);
        const finalBlob = wavBlob || new Blob([], { type: 'audio/wav' });
        finalBlob.transcript = capturedTranscript;
        resolve(finalBlob);
      }
    });
  };

  /**
   * Stop any active audio playback or synthesis
   */
  const stopSpeaking = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
    }
    setIsSpeaking(false);
  };

  /**
   * Speak text: plays server audioBase64 if available, or falls back to Web Speech API
   */
  const speakText = (text, language = 'hi-IN', audioBase64 = null) => {
    stopSpeaking();
    if (!text && !audioBase64) return;

    setIsSpeaking(true);

    // 1. If caller already provided Sarvam base64 audio, play directly
    if (audioBase64) {
      try {
        const audioSrc = `data:audio/wav;base64,${audioBase64}`;
        const audio = new Audio(audioSrc);
        audioElementRef.current = audio;
        
        audio.onended = () => {
          setIsSpeaking(false);
        };
        audio.onerror = (e) => {
          console.warn('Audio tag playback failed, falling back to Web Speech API', e);
          fallbackBrowserSpeech(text, language);
        };
        
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.warn('Audio play rejected (possible autoplay restriction), trying Web Speech API:', err);
            fallbackBrowserSpeech(text, language);
          });
        }
        return;
      } catch (err) {
        console.warn('Failed playing base64 audio:', err);
      }
    }

    // 2. Fetch live high-fidelity regional audio from backend Sarvam AI TTS (bulbul:v3)
    fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language })
    })
      .then((res) => {
        if (!res.ok) throw new Error(`TTS server returned ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (data && data.audio_base64) {
          const audioSrc = `data:audio/wav;base64,${data.audio_base64}`;
          const audio = new Audio(audioSrc);
          audioElementRef.current = audio;
          audio.onended = () => setIsSpeaking(false);
          audio.onerror = (e) => {
            console.warn('Sarvam audio playback failed:', e);
            fallbackBrowserSpeech(text, language);
          };
          audio.play().catch((err) => {
            console.warn('Audio play error (user interaction required):', err);
            fallbackBrowserSpeech(text, language);
          });
        } else {
          fallbackBrowserSpeech(text, language);
        }
      })
      .catch((err) => {
        console.warn('Sarvam TTS API unavailable, using browser speech fallback:', err);
        fallbackBrowserSpeech(text, language);
      });
  };

  const fallbackBrowserSpeech = (text, language) => {
    if (!('speechSynthesis' in window)) {
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = (text || '')
      .replace(/₹/g, language === 'ta-IN' ? 'ரூபாய் ' : 'रुपये ')
      .replace(/\*/g, '')
      .trim();

    if (!cleanText) {
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = language;
    utterance.rate = 0.95; // Slightly slower for low-literacy clarity
    utterance.pitch = 1.0;

    // Try finding natural Tamil / Hindi / Marathi voice if installed
    const voices = window.speechSynthesis.getVoices();
    const langPrefix = language.slice(0, 2);
    const targetVoice = voices.find((v) => {
      const vLang = (v.lang || '').toLowerCase();
      const vName = (v.name || '').toLowerCase();
      if (langPrefix === 'ta') {
        return vLang.includes('ta') || vName.includes('tamil');
      } else if (langPrefix === 'mr') {
        return vLang.includes('mr') || vName.includes('marathi') || vLang.includes('hi') || vName.includes('hindi');
      } else {
        return vLang.includes('hi') || vName.includes('hindi');
      }
    });
    if (targetVoice) {
      utterance.voice = targetVoice;
    }

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
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
  if (!ctx) {
    throw new Error('useVoiceAudio must be used within a VoiceAudioProvider');
  }
  return ctx;
}
