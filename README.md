# 🎬 Alwi Studio & Finance Tracker

Aplikasi Mobile **Video Editor Project, Timeline, Calendar & Personal Finance Tracker** untuk **Alwi Sihabudin**, dibangun menggunakan **React + TypeScript + Vite + Capacitor Android**.

## ✨ Fitur Utama
- **🎬 Dashboard Utama & Navigasi Cepat:** Ringkasan proyek video aktif, saldo bersih keuangan, serta daftar pekerjaan mendesak.
- **📂 Dashboard Proyek & Alur 6 Tahap Editing:**
  - 39 data proyek terintegrasi dari Google Sheets beserta rumus otomatis *Sisa Hari* & *Status Tenggat*.
  - Popup detail proyek interaktif (`ProjectDetailModal`), Papan 6 Tahap Editing (`1. Ingest & Assembly` s/d `6. Final Export`), dan penambahan opsi **Klien Baru** secara permanen.
- **💰 Dashboard Keuanganku (Personal & Project Finance):**
  - Pencatatan **Pemasukan & Pengeluaran Pribadi/Operasional** di berbagai dompet (`Wondr By BNI`, `Cash / Tunai`, `E-Wallet`, `Tabungan`).
  - Pengaturan **Batas Anggaran Bulanan** dan **Target Tabungan (Savings Goals)**.
  - Pelacakan **Piutang Editan Klien** & **Generator Invoice Otomatis (Sheet 2)** siap cetak PDF / salin teks WhatsApp.
- **📅 Kalender Produksi & 🔔 Pengingat Notifikasi HP:**
  - Kalender bulanan interaktif dengan indikator deadline & jam tenggat harian.
  - Pengingat otomatis terintegrasi dengan `@capacitor/local-notifications`.

## 🚀 Cara Menjalankan di Lokal
```bash
npm install
npm run dev
```

## 📱 Cara Build File `.APK` Android
Jalankan skrip otomatis:
```bash
.\build-apk.bat
```
Atau buka di Android Studio:
```bash
npm run build
npx cap sync android
npx cap open android
```
