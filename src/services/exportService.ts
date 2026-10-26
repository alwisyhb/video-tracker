import { calculateDueStatus, formatRupiah, formatShortDate } from '../constants';
import type { ExpenseRecord, PaymentProfile, VideoProject } from '../types';

export function exportProjectsToCSV(projects: VideoProject[]): void {
  const headers = [
    'Kode Proyek',
    'Nama Proyek Video',
    'Klien / Saluran',
    'Platform',
    'Tahapan Editing',
    'Tgl Mulai',
    'Deadline',
    'Jam Deadline',
    'Status',
    'Prioritas',
    'Est. Durasi (m)',
    'Sisa Hari',
    'Status Tenggat',
    'Fee Proyek (Rp)',
    'Jenis Video',
    'Status Pembayaran',
    'Catatan'
  ];

  const escapeCell = (val: string | number) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = projects.map((p) => {
    const due = calculateDueStatus(p);
    return [
      p.code,
      p.name,
      p.client,
      p.platform,
      p.stage,
      p.startDate,
      p.deadline,
      p.deadlineTime,
      p.status,
      p.priority,
      p.duration,
      due.daysLeft,
      due.label,
      p.fee,
      p.videoType,
      p.paymentStatus,
      p.notes
    ].map(escapeCell);
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Timeline_Tracker_Alwi_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportFullBackupJSON(
  projects: VideoProject[],
  expenses: ExpenseRecord[],
  profile: PaymentProfile
): void {
  const payload = {
    exportedAt: new Date().toISOString(),
    version: '1.0',
    profile,
    projects,
    expenses
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Backup_Alwi_Tracker_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function generateWhatsAppInvoiceText(
  clientName: string,
  projects: VideoProject[],
  profile: PaymentProfile
): string {
  const totalFee = projects.reduce((acc, p) => acc + (p.fee || 0), 0);
  const lines = [
    `*DAFTAR PEMBAYARAN EDITAN (${clientName.toUpperCase()})*`,
    `Editor: *${profile.editorName}*`,
    `Tanggal Rekap: ${formatShortDate(new Date().toISOString().slice(0, 10))}`,
    `----------------------------------------`
  ];

  projects.forEach((p, idx) => {
    lines.push(
      `${idx + 1}. *[${p.code}]* ${p.name}\n   • Tgl Take: ${p.startDate || '-'} | Status: ${p.status === 'Selesai' ? 'Done ✅' : p.status} | Fee: *${formatRupiah(p.fee)}*`
    );
  });

  lines.push(`----------------------------------------`);
  lines.push(`*TOTAL FEE: ${formatRupiah(totalFee)}*`);
  lines.push(``);
  lines.push(`*Informasi Pembayaran:*`);
  lines.push(`🏦 Bank/E-Wallet: *${profile.bankName}*`);
  lines.push(`💳 No. Rekening: *${profile.accountNumber}*`);
  lines.push(`👤 A/n: *${profile.accountHolder}*`);

  return lines.join('\n');
}

export function printClientInvoicePDF(
  clientName: string,
  projects: VideoProject[],
  profile: PaymentProfile
): void {
  const totalFee = projects.reduce((acc, p) => acc + (p.fee || 0), 0);
  const win = window.open('', '_blank', 'width=840,height=900');
  if (!win) return;

  const rowsHtml = projects
    .map(
      (p, i) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:center;">${i + 1}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;">${p.startDate || '-'}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-weight:700;">${p.code}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;">${p.name}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;">${p.status === 'Selesai' ? 'Done' : p.status}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;">${formatRupiah(p.fee)}</td>
      </tr>`
    )
    .join('');

  win.document.write(`<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>Invoice Pembayaran Editan - ${clientName} - ${profile.editorName}</title>
  <style>
    body { font-family: 'Segoe UI', system-ui, sans-serif; color: #0f172a; margin: 32px; background: #fff; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #4f46e5; padding-bottom: 16px; margin-bottom: 24px; }
    .title { font-size: 22px; font-weight: 800; color: #1e1b4b; margin: 0 0 4px 0; }
    .subtitle { font-size: 14px; color: #475569; margin: 0; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px; }
    th { background: #1e1b4b; color: #fff; padding: 11px 12px; text-align: left; }
    .total-row td { background: #eef2ff; font-weight: 800; font-size: 16px; padding: 14px 12px; border-top: 2px solid #4f46e5; }
    .bank-box { background: #f8fafc; border: 1px solid #cbd5e1; border-left: 5px solid #4f46e5; border-radius: 8px; padding: 16px; max-width: 460px; }
    @media print { .no-print { display: none; } body { margin: 12px; } }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom:20px;text-align:right;">
    <button onclick="window.print()" style="background:#4f46e5;color:#fff;border:none;padding:10px 18px;border-radius:8px;font-weight:700;cursor:pointer;">🖨️ Cetak / Simpan sebagai PDF</button>
  </div>
  <div class="header">
    <div>
      <h1 class="title">Daftar Pembayaran Editan (${clientName})</h1>
      <p class="subtitle">Editor: <strong>${profile.editorName}</strong></p>
    </div>
    <div style="text-align:right;font-size:13px;color:#475569;">
      <div>Tanggal Cetak: <strong>${formatShortDate(new Date().toISOString().slice(0, 10))}</strong></div>
      <div>Total Item: <strong>${projects.length} Video</strong></div>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width:45px;text-align:center;">No</th>
        <th>Tgl Take</th>
        <th>Kode</th>
        <th>Nama Proyek</th>
        <th>Status</th>
        <th style="text-align:right;">Fee (Rp)</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
      <tr class="total-row">
        <td colspan="5">Total Fee</td>
        <td style="text-align:right;color:#4f46e5;">${formatRupiah(totalFee)}</td>
      </tr>
    </tbody>
  </table>
  <div class="bank-box">
    <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:#64748b;font-weight:700;margin-bottom:6px;">Tujuan Transfer Pembayaran</div>
    <div style="font-size:16px;font-weight:800;color:#0f172a;">Rekening: ${profile.accountNumber} (${profile.bankName})</div>
    <div style="font-size:14px;color:#334155;margin-top:4px;">a/n: <strong>${profile.accountHolder}</strong></div>
  </div>
</body>
</html>`);
  win.document.close();
}
