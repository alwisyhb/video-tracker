import React, { useEffect, useState } from 'react';
import { Clapperboard } from 'lucide-react';

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [progress, setProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const startTime = performance.now();
    const duration = 1600; // 1.6 seconds clean splash loading

    let frameId: number;
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);

      if (pct < 100) {
        frameId = requestAnimationFrame(tick);
      } else {
        setIsExiting(true);
        setTimeout(() => {
          onFinish();
        }, 320);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [onFinish]);

  return (
    <div
      className={`splash-overlay ${isExiting ? 'splash-exit' : ''}`}
      role="status"
      aria-live="polite"
      aria-label="Memuat aplikasi"
    >
      <div className="splash-ambient-glow glow-1" aria-hidden="true" />
      <div className="splash-ambient-glow glow-2" aria-hidden="true" />

      <div className="splash-card">
        <div className="splash-logo-wrap">
          <div className="splash-logo-ring" aria-hidden="true" />
          <div className="splash-logo-core">
            <Clapperboard size={38} aria-hidden="true" />
          </div>
        </div>

        <h1 className="splash-title">Alwi Tracker</h1>
        <p className="splash-subtitle">Memuat aplikasi...</p>

        <div className="splash-minimal-bar" aria-hidden="true">
          <div className="splash-minimal-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
};
