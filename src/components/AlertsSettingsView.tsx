import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  BellRing,
  CheckCircle2,
  Download,
  Flame,
  Monitor,
  Moon,
  RotateCcw,
  Smartphone,
  Sun,
  Upload
} from 'lucide-react';
import { calculateDueStatus, formatRupiah, formatShortDate } from '../constants';
import {
  exportFullBackupJSON,
  exportProjectsToCSV
} from '../services/exportService';
import {
  scheduleProjectReminders,
  triggerTestNotification
} from '../services/notificationService';
import type { ExpenseRecord, PaymentProfile, VideoProject } from '../types';

interface AlertsSettingsViewProps {
  projects: VideoProject[];
  expenses: ExpenseRecord[];
  paymentProfile: PaymentProfile;
  onEditProject: (project: VideoProject) => void;
  onToggleReminder: (id: string) => void;
  onImportBackup: (data: {
    projects?: VideoProject[];
    expenses?: ExpenseRecord[];
    profile?: PaymentProfile;
  }) => void;
  onResetToSeed: () => void;
}

type ColorSchemeOption = 'system' | 'light' | 'dark';

export const AlertsSettingsView: React.FC<AlertsSettingsViewProps> = ({
  projects,
  expenses,
  paymentProfile,
  onEditProject,
  onToggleReminder,
  onImportBackup,
  onResetToSeed
}) => {
  const [notifFeedback, setNotifFeedback] = useState<string>('');
  const [schemeMode, setSchemeMode] = useState<ColorSchemeOption>(() => {
    try {
      const saved = localStorage.getItem('color-scheme');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {
      // ignore
    }
    return 'system';
  });

  const [systemIsDark, setSystemIsDark] = useState<boolean>(() =>
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false
  );

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      setSystemIsDark(e.matches);
    };
    mql.addEventListener('change', handleMediaChange);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'color-scheme') {
        const val = e.newValue;
        const meta = document.querySelector('meta[name="color-scheme"]');
        if (meta) {
          meta.setAttribute('content', val ?? 'light dark');
        }
        if (val === 'light' || val === 'dark') {
          setSchemeMode(val);
        } else {
          setSchemeMode('system');
        }
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      mql.removeEventListener('change', handleMediaChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const applyColorScheme = (mode: ColorSchemeOption) => {
    setSchemeMode(mode);
    const meta = document.querySelector('meta[name="color-scheme"]');
    try {
      if (mode === 'system') {
        localStorage.removeItem('color-scheme');
        if (meta) meta.setAttribute('content', 'light dark');
      } else {
        localStorage.setItem('color-scheme', mode);
        if (meta) meta.setAttribute('content', mode);
      }
    } catch {
      if (meta) meta.setAttribute('content', mode === 'system' ? 'light dark' : mode);
    }
  };

  const activeProjects = projects.filter((p) => p.status !== 'Selesai');
  const overdueList = activeProjects.filter((p) => calculateDueStatus(p).daysLeft < 0);
  const urgentList = activeProjects.filter((p) => {
    const d = calculateDueStatus(p).daysLeft;
    return d >= 0 && d <= 2;
  });
  const soonList = activeProjects.filter((p) => {
    const d = calculateDueStatus(p).daysLeft;
    return d > 2 && d <= 5;
  });

  const unpaidTotal = projects
    .filter((p) => p.paymentStatus !== 'Sudah Diterima')
    .reduce((sum, p) => sum + (p.fee || 0), 0);

  const handleTestNotification = async () => {
    const sent = await triggerTestNotification(
      overdueList.length + urgentList.length,
      unpaidTotal
    );
    if (sent) {
      setNotifFeedback(
        '✅ Notifikasi pengingat berhasil dikirim ke perangkat! Cek bilah status / pusat notifikasi HP Anda.'
      );
    } else {
      setNotifFeedback(
        'ℹ️ Pengingat in-app aktif! Pastikan izin notifikasi diizinkan pada pengaturan aplikasi HP Anda.'
      );
    }
  };

  const handleScheduleAll = async () => {
    const count = await scheduleProjectReminders(projects);
    setNotifFeedback(
      `✅ Berhasil menjadwalkan ${count} notifikasi otomatis (6 jam sebelum DL, 2 jam sebelum DL, dan tepat saat jam DL)!`
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (parsed && Array.isArray(parsed.projects)) {
          onImportBackup(parsed);
          setNotifFeedback(
            `✅ Berhasil memulihkan ${parsed.projects.length} proyek dari file backup!`
          );
        }
      } catch {
        setNotifFeedback('⚠️ Format file backup tidak valid. Gunakan file JSON hasil backup.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="view-container">
      <div className="section-top-bar">
        <div>
          <h1 className="page-title">Pengingat, Notifikasi & Pengaturan Aplikasi</h1>
          <p className="page-subtitle">
            Kelola peringatan tenggat waktu proyek, tema tampilan, backup data mandiri, dan instalasi HP
          </p>
        </div>
        <div className="top-bar-actions">
          <button type="button" className="btn-secondary" onClick={handleScheduleAll}>
            <Bell size={16} aria-hidden="true" />
            <span>Sinkronkan Pengingat</span>
          </button>
          <button type="button" className="btn-primary" onClick={handleTestNotification}>
            <BellRing size={16} aria-hidden="true" />
            <span>Test Kirim Notifikasi HP</span>
          </button>
        </div>
      </div>

      {notifFeedback && <div className="feedback-toast">{notifFeedback}</div>}

      <div className="dashboard-two-col">
        {/* Alert Center */}
        <section className="panel-card">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">
                <BellRing size={18} aria-hidden="true" />
                <span>Pusat Peringatan Hari Deadline</span>
              </h2>
              <p className="panel-subtitle">
                Notifikasi HP otomatis dikirim pada: 6 jam sebelum DL, 2 jam sebelum DL, dan tepat saat memasuki jam DL
              </p>
            </div>
          </div>

          {activeProjects.length === 0 ? (
            <div className="empty-box">
              <CheckCircle2 size={28} aria-hidden="true" />
              <p>Semua proyek telah selesai! Tidak ada pengingat aktif saat ini.</p>
            </div>
          ) : (
            <div className="alerts-groups">
              {overdueList.length > 0 && (
                <div className="alert-group">
                  <h3 className="alert-group-title danger">
                    <AlertTriangle size={16} aria-hidden="true" />
                    <span>⚠️ Terlambat / Melewati Deadline ({overdueList.length})</span>
                  </h3>
                  {overdueList.map((p) => {
                    const due = calculateDueStatus(p);
                    return (
                      <div key={p.id} className="alert-card alert-overdue">
                        <div className="alert-card-main">
                          <div className="alert-card-header">
                            <span className="code-pill">{p.code}</span>
                            <strong onClick={() => onEditProject(p)} style={{ cursor: 'pointer' }}>
                              {p.name}
                            </strong>
                          </div>
                          <p className="alert-card-desc">
                            Klien: <strong>{p.client}</strong> • Tahap: {p.stage} • Deadline:{' '}
                            {formatShortDate(p.deadline)}{' '}
                            {p.deadlineTime ? `(${p.deadlineTime})` : ''} ({Math.abs(due.daysLeft)}{' '}
                            hari lalu)
                          </p>
                        </div>
                        <button
                          type="button"
                          className={`chip-btn ${p.reminderEnabled !== false ? 'active' : ''}`}
                          onClick={() => onToggleReminder(p.id)}
                        >
                          <Bell size={14} aria-hidden="true" />
                          <span>{p.reminderEnabled !== false ? 'Aktif' : 'Nonaktif'}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {urgentList.length > 0 && (
                <div className="alert-group">
                  <h3 className="alert-group-title warning">
                    <Flame size={16} aria-hidden="true" />
                    <span>🔥 Sangat Dekat ≤ 2 Hari ({urgentList.length})</span>
                  </h3>
                  {urgentList.map((p) => {
                    const due = calculateDueStatus(p);
                    return (
                      <div key={p.id} className="alert-card alert-urgent">
                        <div className="alert-card-main">
                          <div className="alert-card-header">
                            <span className="code-pill">{p.code}</span>
                            <strong onClick={() => onEditProject(p)} style={{ cursor: 'pointer' }}>
                              {p.name}
                            </strong>
                          </div>
                          <p className="alert-card-desc">
                            Klien: <strong>{p.client}</strong> • Sisa {due.daysLeft} hari (
                            {formatShortDate(p.deadline)}{' '}
                            {p.deadlineTime ? `• Jam ${p.deadlineTime}` : ''})
                          </p>
                        </div>
                        <button
                          type="button"
                          className={`chip-btn ${p.reminderEnabled !== false ? 'active' : ''}`}
                          onClick={() => onToggleReminder(p.id)}
                        >
                          <Bell size={14} aria-hidden="true" />
                          <span>{p.reminderEnabled !== false ? 'Aktif' : 'Nonaktif'}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {soonList.length > 0 && (
                <div className="alert-group">
                  <h3 className="alert-group-title info">
                    <span>⚡ Mendekati ≤ 5 Hari ({soonList.length})</span>
                  </h3>
                  {soonList.map((p) => (
                    <div key={p.id} className="alert-card">
                      <div className="alert-card-main">
                        <div className="alert-card-header">
                          <span className="code-pill">{p.code}</span>
                          <strong>{p.name}</strong>
                        </div>
                        <p className="alert-card-desc">
                          {p.client} • Deadline {formatShortDate(p.deadline)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Settings, Theme Override & Offline Data Backup */}
        <div className="dashboard-side-stack">
          <section className="panel-card">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">
                  <Sun size={18} aria-hidden="true" />
                  <span>Tema Tampilan (Mode Terang / Gelap)</span>
                </h2>
                <p className="panel-subtitle">
                  Sesuaikan kenyamanan visual saat mengedit di ruangan terang maupun gelap
                </p>
              </div>
            </div>

            <div className="theme-selector-grid" role="radiogroup" aria-label="Pilih skema warna">
              <button
                type="button"
                role="radio"
                aria-checked={schemeMode === 'system'}
                className={`theme-option-btn ${schemeMode === 'system' ? 'active' : ''}`}
                onClick={() => applyColorScheme('system')}
              >
                <Monitor size={18} aria-hidden="true" />
                <div>
                  <strong>Sistem</strong>
                  <span>Saat ini {systemIsDark ? 'Gelap' : 'Terang'}</span>
                </div>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={schemeMode === 'light'}
                className={`theme-option-btn ${schemeMode === 'light' ? 'active' : ''}`}
                onClick={() => applyColorScheme('light')}
              >
                <Sun size={18} aria-hidden="true" />
                <div>
                  <strong>Terang</strong>
                  <span>Selalu Mode Terang</span>
                </div>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={schemeMode === 'dark'}
                className={`theme-option-btn ${schemeMode === 'dark' ? 'active' : ''}`}
                onClick={() => applyColorScheme('dark')}
              >
                <Moon size={18} aria-hidden="true" />
                <div>
                  <strong>Gelap</strong>
                  <span>Selalu Mode Studio</span>
                </div>
              </button>
            </div>
          </section>

          <section className="panel-card">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">
                  <Smartphone size={18} aria-hidden="true" />
                  <span>Backup Mandiri & Export Excel (Tanpa Google Sheets)</span>
                </h2>
                <p className="panel-subtitle">
                  Seluruh data tersimpan otomatis di memori perangkat Anda dan bisa diekspor kapan saja
                </p>
              </div>
            </div>

            <div className="backup-actions-list">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => exportProjectsToCSV(projects)}
              >
                <Download size={16} aria-hidden="true" />
                <span>Download Tabel Proyek ke Excel (.CSV)</span>
              </button>

              <button
                type="button"
                className="btn-secondary"
                onClick={() => exportFullBackupJSON(projects, expenses, paymentProfile)}
              >
                <Download size={16} aria-hidden="true" />
                <span>Simpan Backup Lengkap (.JSON)</span>
              </button>

              <button
                type="button"
                className="btn-secondary"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={16} aria-hidden="true" />
                <span>Pulihkan / Import File Backup (.JSON)</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />

              <button
                type="button"
                className="btn-danger"
                onClick={onResetToSeed}
              >
                <RotateCcw size={16} aria-hidden="true" />
                <span>Reset ke 39 Data Awal Spreadsheet</span>
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
