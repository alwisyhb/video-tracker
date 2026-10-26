import React, { useState } from 'react';
import {
  Check,
  CloudDownload,
  CloudUpload,
  Copy,
  FileSpreadsheet,
  RefreshCw
} from 'lucide-react';
import {
  GOOGLE_APPS_SCRIPT_CODE,
  type CloudSyncConfig
} from '../services/googleSheetsSync';
import { LightDismissDialog } from './LightDismissDialog';

interface CloudSyncModalProps {
  open: boolean;
  onClose: () => void;
  config: CloudSyncConfig;
  onSaveConfig: (newConfig: CloudSyncConfig) => void;
  onTriggerPush: () => Promise<void>;
  onTriggerPull: () => Promise<void>;
  syncStatusMessage: string;
  isSyncing: boolean;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  open,
  onClose,
  config,
  onSaveConfig,
  onTriggerPush,
  onTriggerPull,
  syncStatusMessage,
  isSyncing
}) => {
  const [sheetId, setSheetId] = useState(config.sheetId);
  const [scriptUrl, setScriptUrl] = useState(config.scriptUrl);
  const [autoSync, setAutoSync] = useState(config.autoSync);
  const [copiedScript, setCopiedScript] = useState(false);
  const [showScriptCode, setShowScriptCode] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig({
      ...config,
      sheetId: sheetId.trim(),
      scriptUrl: scriptUrl.trim(),
      autoSync
    });
  };

  const handleCopyScript = async () => {
    try {
      await navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2500);
    } catch {
      // ignore
    }
  };

  return (
    <LightDismissDialog
      open={open}
      onClose={onClose}
      title="☁️ Auto-Sync Google Sheets + Cache Lokal HP"
      subtitle="Data tersimpan cepat di HP dan dicadangkan otomatis ke Google Sheets agar tidak hilang saat di-uninstall"
    >
      <div className="detail-modal-content">
        {syncStatusMessage && (
          <div className="feedback-toast">{syncStatusMessage}</div>
        )}

        {/* Quick Sync Actions */}
        <div className="form-grid-2">
          <button
            type="button"
            className="btn-primary"
            onClick={onTriggerPull}
            disabled={isSyncing}
          >
            <CloudDownload size={16} aria-hidden="true" />
            <span>{isSyncing ? 'Memproses...' : 'Tarik Data dari Google Sheets'}</span>
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={onTriggerPush}
            disabled={isSyncing}
          >
            <CloudUpload size={16} aria-hidden="true" />
            <span>{isSyncing ? 'Memproses...' : 'Simpan ke Google Sheets'}</span>
          </button>
        </div>

        <form onSubmit={handleSave} className="project-form">
          <div className="form-field">
            <label htmlFor="gs-sheet-id">
              ID Google Spreadsheet Anda (Sudah terisi otomatis dari link Anda)
            </label>
            <input
              id="gs-sheet-id"
              type="text"
              value={sheetId}
              onChange={(e) => setSheetId(e.target.value)}
              placeholder="1nmhdo7NDpIb6Ocx5RcQoh0lbzKTkAaG4Lc4KtebXDPI"
            />
          </div>

          <div className="form-field">
            <label htmlFor="gs-script-url">
              URL Web App Google Apps Script (Untuk Auto-Save 2 Arah dari HP ke Sheet)
            </label>
            <input
              id="gs-script-url"
              type="url"
              value={scriptUrl}
              onChange={(e) => setScriptUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/..../exec"
            />
          </div>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={autoSync}
              onChange={(e) => setAutoSync(e.target.checked)}
            />
            <span>
              Aktifkan Auto-Sync Otomatis setiap kali saya menambah/mengubah data proyek & keuangan
            </span>
          </label>

          <button type="submit" className="btn-primary" style={{ width: '100%' }}>
            <Check size={16} aria-hidden="true" />
            <span>Simpan Pengaturan Cloud Sync</span>
          </button>
        </form>

        {/* Cara Pasang Kode Google Apps Script */}
        <div className="detail-section-box">
          <div className="stage-bar-top" style={{ marginBottom: 8 }}>
            <strong>
              <FileSpreadsheet size={15} aria-hidden="true" style={{ verticalAlign: 'middle' }} />{' '}
              Cara Mengaktifkan Auto-Save ke Google Sheets (Cukup 1x):
            </strong>
            <button
              type="button"
              className="chip-btn"
              onClick={() => setShowScriptCode((v) => !v)}
            >
              {showScriptCode ? 'Sembunyikan Kode' : 'Lihat Kode'}
            </button>
          </div>

          <ol style={{ margin: '0 0 10px 0', paddingLeft: 18, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            <li>Buka Google Sheets Anda di browser, klik menu <strong>Ekstensi &rarr; Apps Script</strong>.</li>
            <li>Klik tombol <strong>Salin Kode Apps Script</strong> di bawah, lalu tempel (Paste) menggantikan kode di Apps Script dan simpan (Ctrl+S).</li>
            <li>Klik <strong>Terapkan (Deploy) &rarr; Deployment baru &rarr; Aplikasi Web</strong> (Akses: <em>Siapa saja / Anyone</em>).</li>
            <li>Salin <strong>URL Aplikasi Web</strong> yang muncul lalu tempel ke kolom di atas!</li>
          </ol>

          <button
            type="button"
            className="btn-secondary"
            style={{ width: '100%' }}
            onClick={handleCopyScript}
          >
            {copiedScript ? (
              <>
                <Check size={16} aria-hidden="true" />
                <span>Kode Apps Script Tersalin!</span>
              </>
            ) : (
              <>
                <Copy size={16} aria-hidden="true" />
                <span>Salin Kode Google Apps Script</span>
              </>
            )}
          </button>

          {showScriptCode && (
            <pre
              tabIndex={0}
              style={{
                marginTop: 10,
                padding: 10,
                borderRadius: 8,
                background: 'var(--bg-canvas)',
                fontSize: 11,
                maxHeight: 180,
                overflow: 'auto'
              }}
            >
              <code>{GOOGLE_APPS_SCRIPT_CODE}</code>
            </pre>
          )}
        </div>

        {config.lastSyncedAt && (
          <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', textAlign: 'center' }}>
            <RefreshCw size={12} aria-hidden="true" style={{ verticalAlign: 'middle' }} /> Terakhir
            disinkronkan: {new Date(config.lastSyncedAt).toLocaleString('id-ID')}
          </div>
        )}
      </div>
    </LightDismissDialog>
  );
};
