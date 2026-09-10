import React, { useState, useEffect } from 'react';
import { Mic, Square, Volume2, Sparkles } from 'lucide-react';
import AudioWaveform from './AudioWaveform';

export default function MicRecorder({
  isRecording,
  isProcessing,
  onStartRecord,
  onStopRecord,
  audioData,
  language,
  onPlayPrompt,
  promptText
}) {
  const [timerSeconds, setTimerSeconds] = useState(0);

  useEffect(() => {
    let interval = null;
    if (isRecording) {
      setTimerSeconds(0);
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setTimerSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins}:${rem < 10 ? '0' : ''}${rem}`;
  };

  const isTamil = language === 'ta-IN';
  const isHindi = language === 'hi-IN';
  const isEnglish = language === 'en-IN';

  const defaultPrompt = isEnglish
    ? "Please speak: your name, city, loan amount required, and loan purpose."
    : isTamil
    ? "இப்போது பேசுங்கள்: உங்கள் பெயர், ஊர், எவ்வளவு கடன் வேண்டும் மற்றும் எதற்காக?"
    : isHindi
    ? "बोलिए: आपका नाम, गाँव, कितना लोन चाहिए और किस काम के लिए?"
    : "बोला: तुमचे नाव, गाव, किती कर्ज हवे आणि कशासाठी?";

  const actionDoneText = isEnglish
    ? "Done (Submit Voice)"
    : isTamil
    ? "முடிந்தது (சமர்ப்பி)"
    : isHindi
    ? "हो गया (समाप्त)"
    : "झाले (पूर्ण)";

  const tapToSpeakText = isEnglish
    ? "Tap Mic & Speak"
    : isTamil
    ? "மைக் அழுத்தி பேசவும்"
    : isHindi
    ? "माइक दबाएं और बोलें"
    : "माइक दाबा आणि बोला";

  const listeningText = isEnglish
    ? "Listening... Please speak"
    : isTamil
    ? "கேட்கிறேன்... பேசுங்கள்"
    : isHindi
    ? "सुन रहा हूँ... बोलिए"
    : "ऐकत आहे... बोला";

  const processingText = isEnglish
    ? "Understanding your voice..."
    : isTamil
    ? "புரிந்து கொள்கிறேன்..."
    : isHindi
    ? "समझ रहा हूँ..."
    : "समजून घेत आहे...";

  return (
    <div className="mic-recorder-card">
      {/* Visual Instruction & Audio Cue */}
      <div className="prompt-header">
        <button
          type="button"
          className="audio-cue-pill"
          onClick={() => onPlayPrompt && onPlayPrompt(promptText || defaultPrompt)}
          title="Play question"
        >
          <Volume2 className="w-5 h-5 text-amber-400 shrink-0" />
          <span className="text-sm font-medium text-slate-200">
            {promptText || defaultPrompt}
          </span>
        </button>
      </div>

      {/* Waveform Visualizer */}
      <div className="waveform-box my-4">
        <AudioWaveform
          isRecording={isRecording}
          isSpeaking={false}
          audioData={audioData}
        />
        {isRecording && (
          <div className="recording-status">
            <span className="record-red-dot animate-ping" />
            <span className="font-semibold text-rose-400">{listeningText}</span>
            <span className="timer-badge">{formatTime(timerSeconds)}</span>
          </div>
        )}
      </div>

      {/* Giant Central Tap Target */}
      <div className="mic-button-wrapper">
        {isProcessing ? (
          <div className="processing-indicator">
            <div className="spinner-ring" />
            <Sparkles className="w-10 h-10 text-amber-400 animate-spin" />
            <span className="mt-3 text-sm font-bold text-slate-300">
              {processingText}
            </span>
          </div>
        ) : isRecording ? (
          <button
            type="button"
            className="giant-mic-btn active-recording"
            onClick={onStopRecord}
            aria-label="Stop Recording"
          >
            <Square className="w-16 h-16 text-white fill-white" />
            <span className="mic-subtext">{actionDoneText}</span>
          </button>
        ) : (
          <button
            type="button"
            className="giant-mic-btn idle-ready"
            onClick={onStartRecord}
            aria-label="Start Recording"
          >
            <Mic className="w-16 h-16 text-white" />
            <span className="mic-subtext">{tapToSpeakText}</span>
          </button>
        )}
      </div>

      <div className="mic-hint-footer">
        <p className="text-xs text-slate-400">
          {isEnglish
            ? "Speak naturally in your voice. No typing or writing is required."
            : isTamil
            ? "உங்கள் சொந்த மொழியில் இயல்பாக பேசுங்கள். எழுத வேண்டிய அவசியமில்லை."
            : isHindi
            ? "अपनी भाषा में सामान्य तरीके से बोलें। कुछ लिखने की जरूरत नहीं है।"
            : "तुमच्या भाषेत सहज बोला. काहीही लिहिण्याची गरज नाही."}
        </p>
      </div>
    </div>
  );
}
