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
   * Start microphone recording, attach Web Audio analyser, and launch live speech recognition
   */
  const startRecording = async (language = 'hi-IN') => {
    try {
      // Cancel any ongoing speech
      stopSpeaking();
      setLiveTranscript('');
      liveTranscriptRef.current = '';

      // 1. Launch in-browser SpeechRecognition (Chrome, Edge, Android)
      const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRec) {
        try {
          const rec = new SpeechRec();
          rec.continuous = true;
          rec.interimResults = true;
          rec.lang = language || 'hi-IN';
          
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

      // 2. Stream audio through MediaRecorder & Web Audio Analyser
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioCtx();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
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

      if (!isRecording) {
        const emptyBlob = new Blob([], { type: 'audio/wav' });
        emptyBlob.transcript = capturedTranscript;
        resolve(emptyBlob);
        return;
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }

      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        recorder.onstop = () => {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          blob.transcript = capturedTranscript;
          setIsRecording(false);
          setAudioData(null);
          recorder.stream.getTracks().forEach((track) => track.stop());
          resolve(blob);
        };
        recorder.stop();
      } else {
        setIsRecording(false);
        setAudioData(null);
        const fallbackBlob = new Blob([], { type: 'audio/wav' });
        fallbackBlob.transcript = capturedTranscript;
        resolve(fallbackBlob);
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

    // If server provided Sarvam base64 audio, play directly
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

    // Fallback: Browser Web Speech API (Works natively on Chrome/Edge/Android)
    fallbackBrowserSpeech(text, language);
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
