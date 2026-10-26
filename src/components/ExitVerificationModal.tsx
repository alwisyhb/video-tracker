import React, { useEffect, useState } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, CloudUpload, LogOut, ShieldAlert } from 'lucide-react';
import { LightDismissDialog } from './LightDismissDialog';

interface ExitVerificationModalProps {
  open: boolean;
  onClose: () => void;
  onConfirmExit: () => void;
  onSyncAndExit: () => Promise<void>;
  hasCloudUrl: boolean;
}

export const ExitVerificationModal: React.FC<ExitVerificationModalProps> = ({
  open,
  onClose,
  onConfirmExit,
  onSyncAndExit,
  hasCloudUrl
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (open) {
      setStep(1);
      setIsSyncing(false);
    }
  }, [open]);

  const handleSyncExit = async () => {
    setIsSyncing(true);
    await onSyncAndExit();
    setIsSyncing(false);
    onConfirmExit();
  };

  return (
    <LightDismissDialog
      open={open}
      onClose={onClose}
      title={
        step === 1
          ? '🛡️ Verifikasi Keluar (Langkah 1 dari 2)'
          : '🚪 Konfirmasi Akhir (Langkah 2 dari 2)'
      }
      subtitle="Pengaman 2 langkah agar Anda tidak keluar aplikasi secara tidak sengaja"
    >
      {step === 1 ? (
        <div className="detail-modal-content">
          <div className="exit-step-indicator">
            <span className="exit-step-pill active">1. Pengecekan Aktivitas</span>
            <span className="exit-step-pill">2. Konfirmasi Keluar</span>
          </div>

          <div className="detail-section-box" style={{ textAlign: 'center', padding: '18px' }}>
            <AlertTriangle
              size={34}
              className="text-warning"
              style={{ marginBottom: 8 }}
              aria-hidden="true"
            />
            <h3 style={{ margin: '0 0 6px 0', fontSize: 16 }}>
              Ingin menutup Alwi Studio & Finance?
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
              Langkah 1/2: Pastikan tidak ada input pekerjaan atau catatan keuangan yang sedang setengah jalan.
            </p>
          </div>

          <div className="dialog-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Batal, Tetap di Aplikasi
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => setStep(2)}
            >
              <span>Lanjut Langkah 2</span>
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : (
        <div className="detail-modal-content">
          <div className="exit-step-indicator">
            <span className="exit-step-pill done">✅ 1. Terverifikasi</span>
            <span className="exit-step-pill active">2. Konfirmasi Akhir</span>
          </div>

          <div className="detail-section-box" style={{ textAlign: 'center', padding: '18px' }}>
            <ShieldAlert
              size={34}
              className="text-danger"
              style={{ marginBottom: 8 }}
              aria-hidden="true"
            />
            <h3 style={{ margin: '0 0 6px 0', fontSize: 16 }}>
              Langkah 2/2: Konfirmasi Keluar Aplikasi
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
              Seluruh perubahan sudah tersimpan di memori perangkat Anda. Ketuk tombol di bawah untuk benar-benar keluar.
            </p>
          </div>

          {hasCloudUrl && (
            <button
              type="button"
              className="btn-secondary"
              style={{ width: '100%' }}
              onClick={handleSyncExit}
              disabled={isSyncing}
            >
              <CloudUpload size={16} aria-hidden="true" />
              <span>
                {isSyncing
                  ? 'Menyinkronkan ke Google Sheets...'
                  : '☁️ Sinkronkan ke Google Sheets Lalu Keluar'}
              </span>
            </button>
          )}

          <div className="dialog-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              <CheckCircle2 size={15} aria-hidden="true" />
              <span>Batal Keluar</span>
            </button>
            <button type="button" className="btn-danger" onClick={onConfirmExit}>
              <LogOut size={16} aria-hidden="true" />
              <span>Ya, Keluar Sekarang</span>
            </button>
          </div>
        </div>
      )}
    </LightDismissDialog>
  );
};
