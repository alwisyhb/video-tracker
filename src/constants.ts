import type { DueStatusInfo, EditingStage, PaymentProfile, PaymentStatus, PriorityLevel, ProjectStatus, VideoProject } from './types';

export const DEFAULT_CLIENTS: string[] = [
  'Jasaedit',
  'Melek Ngedit',
  'Rehnvim',
  'MUI Prov. Jabar',
  "Ponpes Syamsul Ma'arif",
  'Mang Eky',
  'ABCERP',
  'Rumah Kepemimpinan',
  'Naraya Creative',
  'Umum / Lainnya'
];

export const PLATFORMS: string[] = [
  'TikTok / Reels (9:16)',
  'YouTube (16:9)',
  'IG Feed (1:1 / 4:5)',
  'Iklan / Commercial',
  'Kursus / Webinar',
  'Videotron'
];

export const EDITING_STAGES: EditingStage[] = [
  '1. Ingest & Assembly',
  '2. Rough Cut',
  '3. Fine Cut & Pacing',
  '4. Color & Audio',
  '5. VFX & Motion',
  '6. Final Export'
];

export const PROJECT_STATUSES: ProjectStatus[] = [
  'Belum Mulai',
  'Dalam Proses',
  'Revisi',
  'Selesai'
];

export const PRIORITIES: PriorityLevel[] = [
  'Tinggi',
  'Sedang',
  'Rendah'
];

export const VIDEO_TYPES: string[] = [
  'Shorts / Reels / TikTok',
  'Vlog / Sinematik',
  'Tutorial / Edukasi',
  'Tugas Kuliah',
  'Review / Unboxing',
  'Iklan / Komersial',
  'Podcast / Talkshow',
  'Bumper',
  'Wedding'
];

export const PAYMENT_STATUSES: PaymentStatus[] = [
  'Sudah Diterima',
  'DP / Termin',
  'Belum Diterima'
];

export const DEFAULT_PAYMENT_PROFILE: PaymentProfile = {
  editorName: 'Alwi Sihabudin',
  bankName: 'Wondr By BNI',
  accountNumber: '2036164645',
  accountHolder: 'Alwi Sihabudin'
};

export interface RoadmapPhase {
  phase: number;
  title: string;
  subtitle: string;
  status: 'Aktif & Siap Dipakai' | 'Terintegrasi';
  features: string[];
}

export const APP_ROADMAP: RoadmapPhase[] = [
  {
    phase: 1,
    title: 'Tahap 1: Core Tracker, UI/UX Dinamis & Dashboard',
    subtitle: 'Fondasi Aplikasi Mobile, 39 Data Proyek & Pipeline 6 Tahap Editing',
    status: 'Aktif & Siap Dipakai',
    features: [
      'Migrasi 100% (39 proyek) beserta rumus otomatis Sisa Hari & Status Tenggat dari Spreadsheet.',
      'Dashboard visual interaktif: KPI Real-time, Progress Pipeline 6 Tahapan Editing & Performa per Klien.',
      'Manajemen Proyek lengkap: List & Kanban Pipeline 6 Tahap, Pencarian, Filter Cepat, dan Quick Input Modal.'
    ]
  },
  {
    phase: 2,
    title: 'Tahap 2: Kalender Produksi & Timeline Harian',
    subtitle: 'Visualisasi Jadwal Mulai, Tenggat Waktu & Jam Deadline',
    status: 'Aktif & Siap Dipakai',
    features: [
      'Kalender bulanan interaktif dengan indikator kepadatan deadline per hari.',
      'Detail agenda harian lengkap dengan catatan jam tenggat (misal jam 7 pagi, 20.00, 08.30).',
      'Navigasi cepat antar bulan dan filter jadwal proyek yang belum selesai.'
    ]
  },
  {
    phase: 3,
    title: 'Tahap 3: Pengingat Cerdas & Notifikasi HP',
    subtitle: 'Alert Center & Push/Local Notification Android',
    status: 'Aktif & Siap Dipakai',
    features: [
      'Deteksi otomatis proyek Terlambat, Sangat Dekat (≤ 2 hari), dan Mendekati (≤ 5 hari).',
      'Integrasi Capacitor Local Notifications & Web Notification untuk mengirim pengingat ke layar HP.',
      'Tombol Test Notifikasi Instan & saklar pengingat per proyek.'
    ]
  },
  {
    phase: 4,
    title: 'Tahap 4: Manajemen Keuangan & Generator Invoice (Sheet 2)',
    subtitle: 'Pelacakan Fee, Piutang Klien, Pengeluaran & Cetak Tagihan',
    status: 'Aktif & Siap Dipakai',
    features: [
      'Rekap Fee Sudah Diterima vs Belum Diterima (Piutang) & aksi 1-klik "Tandai Lunas".',
      'Pencatatan pengeluaran operasional editor (Langganan software, SFX, kuota/listrik) untuk hitung Laba Bersih.',
      'Generator Invoice Otomatis sesuai format Sheet 2 (Wondr By BNI 2036164645 a/n Alwi Sihabudin) siap Cetak PDF / Salin WA.'
    ]
  },
  {
    phase: 5,
    title: 'Tahap 5: Mandiri Offline, Export/Import Excel & Paket .APK',
    subtitle: 'Penyimpanan Lokal Mandiri & Build Aplikasi Android',
    status: 'Aktif & Siap Dipakai',
    features: [
      'Penyimpanan lokal mandiri di HP (tanpa tergantung koneksi Google Sheets).',
      'Fitur Export ke CSV/Excel & Backup JSON, serta Import data kapan saja.',
      'Konfigurasi penuh Capacitor Android untuk instalasi file .APK di HP.'
    ]
  }
];

/**
 * Replicates the exact spreadsheet formula:
 * Sisa Hari: IF(H10="", "", IF(I10="Selesai", 0, H10-TODAY()))
 * Status Tenggat: IF(I10="Selesai", "✅ Selesai", IF(L10<0, "⚠️ Terlambat", IF(L10<=2, "🔥 Sangat Dekat", IF(L10<=5, "⚡ Mendekati", "⏳ Terjadwal"))))
 */
export function calculateDueStatus(project: Pick<VideoProject, 'deadline' | 'status'>, referenceDate?: Date): DueStatusInfo {
  if (project.status === 'Selesai') {
    return {
      daysLeft: 0,
      label: '✅ Selesai',
      type: 'done'
    };
  }

  if (!project.deadline) {
    return {
      daysLeft: 0,
      label: '⏳ Terjadwal',
      type: 'scheduled'
    };
  }

  const now = referenceDate ? new Date(referenceDate) : new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const parts = project.deadline.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    return {
      daysLeft: 0,
      label: '⏳ Terjadwal',
      type: 'scheduled'
    };
  }

  const dueMidnight = new Date(parts[0], parts[1] - 1, parts[2]);
  const diffMs = dueMidnight.getTime() - todayMidnight.getTime();
  const daysLeft = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) {
    return {
      daysLeft,
      label: '⚠️ Terlambat',
      type: 'overdue'
    };
  }
  if (daysLeft <= 2) {
    return {
      daysLeft,
      label: '🔥 Sangat Dekat',
      type: 'urgent'
    };
  }
  if (daysLeft <= 5) {
    return {
      daysLeft,
      label: '⚡ Mendekati',
      type: 'soon'
    };
  }
  return {
    daysLeft,
    label: '⏳ Terjadwal',
    type: 'scheduled'
  };
}

export function getStageProgressPercent(stage: string): number {
  const idx = EDITING_STAGES.findIndex((s) => s === stage);
  if (idx === -1) {
    const match = stage.match(/^(\d)/);
    if (match) {
      return Math.min(100, Math.round((Number(match[1]) / 6) * 100));
    }
    return 16;
  }
  return Math.round(((idx + 1) / EDITING_STAGES.length) * 100);
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount || 0);
}

export function formatShortDate(dateStr: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return dateStr;
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(date);
}

export function suggestProjectCode(client: string, existingProjects: VideoProject[]): string {
  const prefixMap: Record<string, string> = {
    'Jasaedit': 'JE',
    'Melek Ngedit': 'MN',
    'Rehnvim': 'RV',
    'MUI Prov. Jabar': 'MUI',
    'Rumah Kepemimpinan': 'RK',
    'Naraya Creative': 'NC'
  };
  const prefix = prefixMap[client] || (client ? client.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() : 'PRJ') || 'PRJ';
  const countForPrefix = existingProjects.filter((p) => p.code.toUpperCase().startsWith(prefix)).length;
  const nextNum = String(countForPrefix + 1).padStart(3, '0');
  return `${prefix}${nextNum}`;
}
