import type {
  FinanceTransaction,
  PaymentProfile,
  SavingsGoal,
  VideoProject
} from '../types';

export const DEFAULT_SHEET_ID = '1nmhdo7NDpIb6Ocx5RcQoh0lbzKTkAaG4Lc4KtebXDPI';

export interface CloudSyncConfig {
  sheetId: string;
  scriptUrl: string;
  autoSync: boolean;
  lastSyncedAt?: string;
}

export interface CloudPayload {
  updatedAt: string;
  projects: VideoProject[];
  clientsList: string[];
  transactions: FinanceTransaction[];
  savingsGoals: SavingsGoal[];
  paymentProfile: PaymentProfile;
}

const SYNC_CONFIG_KEY = 'alwi_tracker_cloud_config_v1';

export function loadCloudSyncConfig(): CloudSyncConfig {
  try {
    const raw = localStorage.getItem(SYNC_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        sheetId: parsed.sheetId || DEFAULT_SHEET_ID,
        scriptUrl: parsed.scriptUrl || '',
        autoSync: parsed.autoSync !== false,
        lastSyncedAt: parsed.lastSyncedAt
      };
    }
  } catch {
    // ignore
  }
  return {
    sheetId: DEFAULT_SHEET_ID,
    scriptUrl: '',
    autoSync: true
  };
}

export function saveCloudSyncConfig(config: CloudSyncConfig): void {
  try {
    localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify(config));
  } catch {
    // ignore
  }
}

/**
 * Push full app state to Google Sheets via Google Apps Script Web App
 */
export async function pushToGoogleSheets(
  config: CloudSyncConfig,
  payload: CloudPayload
): Promise<{ ok: boolean; message: string }> {
  if (!config.scriptUrl.trim()) {
    return {
      ok: false,
      message: 'URL Web App Google Apps Script belum diisi.'
    };
  }

  try {
    const response = await fetch(config.scriptUrl.trim(), {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify({
        action: 'SAVE_ALL',
        ...payload
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json().catch(() => ({ status: 'ok' }));
    if (result && (result.status === 'ok' || result.ok)) {
      return {
        ok: true,
        message: 'Data berhasil disimpan ke Google Sheets Cloud!'
      };
    }
    return {
      ok: true,
      message: 'Sinkronisasi ke Google Sheets terkirim.'
    };
  } catch (err) {
    console.warn('Push to Google Sheets error:', err);
    return {
      ok: false,
      message: 'Gagal terhubung ke Google Sheets. Pastikan koneksi internet aktif & URL Script benar.'
    };
  }
}

/**
 * Pull full app state from Google Apps Script Web App, OR fallback to direct Google Sheets CSV pull
 */
export async function pullFromGoogleSheets(
  config: CloudSyncConfig
): Promise<{
  ok: boolean;
  source: 'apps_script' | 'direct_csv';
  data?: Partial<CloudPayload>;
  message: string;
}> {
  // 1. Try pulling full JSON backup from Google Apps Script if configured
  if (config.scriptUrl.trim()) {
    try {
      const url = `${config.scriptUrl.trim()}${
        config.scriptUrl.includes('?') ? '&' : '?'
      }action=LOAD_ALL&t=${Date.now()}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json && Array.isArray(json.projects) && json.projects.length > 0) {
          return {
            ok: true,
            source: 'apps_script',
            data: json,
            message: `Berhasil memulihkan ${json.projects.length} proyek & data keuangan dari Google Sheets Cloud!`
          };
        }
      }
    } catch (err) {
      console.warn('Apps Script pull failed, trying direct CSV fallback:', err);
    }
  }

  // 2. Fallback: Pull directly from public Google Sheet CSV export
  const sheetId = config.sheetId.trim() || DEFAULT_SHEET_ID;
  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=0`;

  try {
    const res = await fetch(csvUrl);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const csvText = await res.text();
    const parsedProjects = parseGoogleSheetCSV(csvText);

    if (parsedProjects.length > 0) {
      return {
        ok: true,
        source: 'direct_csv',
        data: { projects: parsedProjects },
        message: `Berhasil menarik ${parsedProjects.length} proyek langsung dari tabel Google Sheets Anda!`
      };
    }
    return {
      ok: false,
      source: 'direct_csv',
      message: 'Tabel Google Sheets ditemukan tetapi tidak ada baris proyek yang terbaca.'
    };
  } catch (err) {
    console.warn('Direct CSV pull failed:', err);
    return {
      ok: false,
      source: 'direct_csv',
      message: 'Tidak dapat menarik data dari Google Sheets. Periksa koneksi internet Anda.'
    };
  }
}

/**
 * Simple CSV parser for Sheet1 of Timeline Tracker_alwi
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

export function parseGoogleSheetCSV(csvText: string): VideoProject[] {
  const lines = csvText.split(/\r?\n/);
  const headerIdx = lines.findIndex((l) => l.includes('Kode Proyek') && l.includes('Nama Proyek'));
  if (headerIdx === -1) return [];

  const projects: VideoProject[] = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < 4) continue;
    const code = (cols[1] || '').trim();
    const name = (cols[2] || '').trim();
    if (!code && !name) continue;

    const feeDigits = (cols[13] || '0').replace(/[^0-9]/g, '');
    const fee = feeDigits ? parseInt(feeDigits, 10) : 0;
    const extraParts = [cols[16], cols[17], cols[18]]
      .map((s) => (s || '').trim())
      .filter(Boolean);

    projects.push({
      id: `proj-gs-${i}`,
      code: code || `PRJ${i}`,
      name: name || 'Proyek Video',
      client: (cols[3] || '').trim() || 'Umum / Lainnya',
      platform: (cols[4] || '').trim() || 'TikTok / Reels (9:16)',
      stage: (cols[5] || '').trim() || '1. Ingest & Assembly',
      startDate: (cols[6] || '').trim() || '',
      deadline: (cols[7] || '').trim() || '',
      deadlineTime: extraParts[0] || '',
      status: (cols[8] || '').trim() || 'Belum Mulai',
      priority: (cols[9] || '').trim() || 'Sedang',
      duration: (cols[10] || '').trim() || '-',
      fee,
      videoType: (cols[14] || '').trim() || 'Shorts / Reels / TikTok',
      paymentStatus: (cols[15] || '').trim() || 'Belum Diterima',
      notes: extraParts.slice(1).join(' | '),
      reminderEnabled: (cols[8] || '').trim() !== 'Selesai'
    });
  }
  return projects;
}

export const GOOGLE_APPS_SCRIPT_CODE = `// ============================================================================
// KODE GOOGLE APPS SCRIPT UNTUK AUTO-SYNC 2 ARAH (ALWI STUDIO & FINANCE)
// Cara Pasang di Google Sheets Anda:
// 1. Buka Google Sheets Anda -> Klik menu "Ekstensi" (Extensions) -> "Apps Script"
// 2. Hapus kode yang ada, lalu Paste seluruh kode ini & tekan Ctrl+S (Simpan)
// 3. Klik tombol "Terapkan" (Deploy) -> "Deployment baru" (New deployment)
// 4. Pilih jenis: "Aplikasi Web" (Web app)
// 5. Jalankan sebagai: "Saya" (Me) | Siapa yang memiliki akses: "Siapa saja" (Anyone)
// 6. Klik "Terapkan" (Deploy), salin URL Web App, dan tempelkan di Aplikasi HP Anda!
// ============================================================================

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var storeSheet = ss.getSheetByName('App_Cloud_Backup');
  if (!storeSheet) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'empty', projects: [] }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  var jsonStr = storeSheet.getRange('A2').getValue();
  if (!jsonStr) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'empty', projects: [] }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput(jsonStr)
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 1. Simpan snapshot JSON penuh di sheet App_Cloud_Backup (agar 100% pulih saat install ulang)
    var storeSheet = ss.getSheetByName('App_Cloud_Backup');
    if (!storeSheet) {
      storeSheet = ss.insertSheet('App_Cloud_Backup');
    }
    storeSheet.getRange('A1').setValue('LAST_UPDATED: ' + new Date().toISOString());
    storeSheet.getRange('A2').setValue(JSON.stringify(payload));
    
    // 2. Simpan juga tabel rapi di sheet App_Projects_Sync
    var projSheet = ss.getSheetByName('App_Projects_Sync');
    if (!projSheet) {
      projSheet = ss.insertSheet('App_Projects_Sync');
    }
    projSheet.clearContents();
    projSheet.appendRow([
      'Kode Proyek', 'Nama Proyek', 'Klien', 'Platform', 'Tahapan Editing',
      'Tgl Mulai', 'Deadline', 'Jam Deadline', 'Status', 'Prioritas',
      'Durasi', 'Fee Proyek', 'Jenis Video', 'Status Pembayaran', 'Catatan'
    ]);
    if (payload.projects && payload.projects.length) {
      var rows = payload.projects.map(function(p) {
        return [
          p.code, p.name, p.client, p.platform, p.stage,
          p.startDate, p.deadline, p.deadlineTime || '', p.status, p.priority,
          p.duration, p.fee, p.videoType, p.paymentStatus, p.notes || ''
        ];
      });
      projSheet.getRange(2, 1, rows.length, 15).setValues(rows);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'ok', updatedAt: new Date().toISOString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
`;
