import React, { useEffect, useState } from 'react';
import { Clapperboard, Film, Sparkles, Wallet } from 'lucide-react';

interface SplashScreenProps {
  projectCount: number;
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  projectCount,
  onFinish
}) => {
  const [progress, setProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const startTime = performance.now();
    const duration = 2100; // 2.1 seconds total loading animation

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
        }, 380);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [onFinish]);

  const getStepMessage = () => {
    if (progress < 32) {
      return `Memuat ${projectCount} data proyek & timeline editing...`;
    }
    if (progress < 66) {
      return 'Menyiapkan kalender produksi & pengingat deadline...';
    }
    if (progress < 94) {
      return 'Menyinkronkan dompet, anggaran & invoice klien...';
    }
    return 'Siap digunakan! Selamat berkarya, Alwi ✨';
  };

  return (
    <div
      className={`splash-overlay ${isExiting ? 'splash-exit' : ''}`}
      role="status"
      aria-live="polite"
      aria-label="Memuat aplikasi Alwi Studio and Finance"
    >
      <div className="splash-ambient-glow glow-1" aria-hidden="true" />
      <div className="splash-ambient-glow glow-2" aria-hidden="true" />

      <div className="splash-card">
        {/* Animated Studio Logo */}
        <div className="splash-logo-wrap">
          <div className="splash-logo-ring" aria-hidden="true" />
          <div className="splash-logo-core">
            <Clapperboard size={38} aria-hidden="true" />
          </div>
        </div>

        <div className="splash-badge">
          <Sparkles size={13} aria-hidden="true" />
          <span>ALWI SIHABUDIN • STUDIO APP</span>
        </div>

        <h1 className="splash-title">Alwi Studio & Finance</h1>
        <p className="splash-subtitle">
          Video Editor Project • Timeline • Personal Finance Manager
        </p>

        {/* Feature Icons Row */}
        <div className="splash-pillars" aria-hidden="true">
          <div className={`splash-pillar ${progress >= 15 ? 'active' : ''}`}>
            <Film size={15} />
            <span>{projectCount} Proyek</span>
          </div>
          <div className={`splash-pillar ${progress >= 50 ? 'active' : ''}`}>
            <Clapperboard size={15} />
            <span>6 Tahap</span>
          </div>
          <div className={`splash-pillar ${progress >= 80 ? 'active' : ''}`}>
            <Wallet size={15} />
            <span>Keuanganku</span>
          </div>
        </div>

        {/* Progress Bar & Dynamic Step Status */}
        <div className="splash-progress-box">
          <div className="splash-progress-top">
            <span className="splash-step-text">{getStepMessage()}</span>
            <strong className="splash-pct">{progress}%</strong>
          </div>
          <div className="splash-track">
            <div className="splash-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <button
          type="button"
          className="splash-skip-btn"
          onClick={() => {
            setIsExiting(true);
            setTimeout(onFinish, 150);
          }}
        >
          Lewati Loading →
        </button>
      </div>
    </div>
  );
};
