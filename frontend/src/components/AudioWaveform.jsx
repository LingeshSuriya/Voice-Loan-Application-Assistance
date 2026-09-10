import React, { useEffect, useRef } from 'react';

/**
 * Animated Audio Waveform component.
 * Reacts to microphone audio data or displays an energetic rhythmic wave when active.
 */
export default function AudioWaveform({ isRecording, isSpeaking, audioData }) {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let phase = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;
      const barCount = 24;
      const barWidth = 6;
      const gap = (width - barCount * barWidth) / (barCount + 1);

      for (let i = 0; i < barCount; i++) {
        let barHeight = 8;

        if (isRecording) {
          if (audioData && audioData.length > 0) {
            const dataIndex = Math.floor((i / barCount) * audioData.length);
            const rawVal = audioData[dataIndex] || 0;
            barHeight = Math.max(8, (rawVal / 255) * (height * 0.85));
          } else {
            // Harmonic wave simulation if raw audio array not connected
            const wave = Math.sin(phase + (i * 0.4)) * 0.5 + 0.5;
            barHeight = 12 + wave * (height * 0.65);
          }
        } else if (isSpeaking) {
          const wave = Math.sin(phase * 1.5 + (i * 0.3)) * 0.5 + 0.5;
          barHeight = 10 + wave * (height * 0.55);
        }

        const x = gap + i * (barWidth + gap);
        const y = centerY - barHeight / 2;
        const radius = barWidth / 2;

        // Gradient coloring
        const grad = ctx.createLinearGradient(0, y, 0, y + barHeight);
        if (isRecording) {
          grad.addColorStop(0, '#ef4444'); // Vibrant Red for Recording
          grad.addColorStop(1, '#f97316');
        } else if (isSpeaking) {
          grad.addColorStop(0, '#3b82f6'); // Royal Blue for Speaking
          grad.addColorStop(1, '#10b981');
        } else {
          grad.addColorStop(0, '#64748b'); // Subtle Slate for Idle
          grad.addColorStop(1, '#94a3b8');
        }

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, radius);
        ctx.fill();
      }

      phase += 0.08;
      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isRecording, isSpeaking, audioData]);

  return (
    <div className="waveform-container" style={{ width: '100%', maxWidth: '340px', margin: '0 auto' }}>
      <canvas
        ref={canvasRef}
        width={340}
        height={70}
        style={{ width: '100%', height: '70px', display: 'block' }}
      />
    </div>
  );
}
