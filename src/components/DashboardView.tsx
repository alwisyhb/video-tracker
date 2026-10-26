import React, { useState } from 'react';
import {
  Bell,
  Calendar,
  ChevronRight,
  Flame,
  FolderKanban,
  Layers,
  Plus,
  Sparkles,
  Wallet
} from 'lucide-react';
import { APP_ROADMAP, calculateDueStatus, formatRupiah } from '../constants';
import type { FinanceTransaction, VideoProject } from '../types';
import { LightDismissDialog } from './LightDismissDialog';

interface DashboardViewProps {
  projects: VideoProject[];
  transactions: FinanceTransaction[];
  onOpenAddModal: () => void;
  onSelectProject: (project: VideoProject) => void;
  onNavigateTab: (tab: 'dashboard' | 'projects' | 'calendar' | 'finance' | 'alerts') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  projects,
  transactions,
  onOpenAddModal,
  onSelectProject,
  onNavigateTab
}) => {
  const [showRoadmapModal, setShowRoadmapModal] = useState(false);

  const activeProjectsCount = projects.filter((p) => p.status !== 'Selesai').length;
  const completedCount = projects.filter((p) => p.status === 'Selesai').length;

  const urgentProjects = projects
    .filter((p) => {
      if (p.status === 'Selesai') return false;
      return calculateDueStatus(p).daysLeft <= 3;
    })
    .sort((a, b) => calculateDueStatus(a).daysLeft - calculateDueStatus(b).daysLeft);

  const paidProjectFee = projects
    .filter((p) => p.paymentStatus === 'Sudah Diterima')
    .reduce((sum, p) => sum + (p.fee || 0), 0);
  const unpaidProjectFee = projects
    .filter((p) => p.paymentStatus !== 'Sudah Diterima')
    .reduce((sum, p) => sum + (p.fee || 0), 0);

  const otherIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalExpenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const netBalance = paidProjectFee + otherIncome - totalExpenses;

  return (
    <div className="view-container">
      {/* Compact Clean Hero */}
      <section className="hero-banner compact-hero">
        <div className="hero-content">
          <div className="hero-badge">
            <Sparkles size={13} aria-hidden="true" />
            <span>Menu Utama • Alwi Sihabudin</span>
          </div>
          <h1 className="hero-title">Halo, Alwi! 👋</h1>
          <p className="hero-subtitle">
            Pilih menu di bawah untuk membuka detail proyek, jadwal, atau mengatur keuanganmu.
          </p>
        </div>
        <div className="hero-actions">
          <button type="button" className="btn-hero-primary" onClick={onOpenAddModal}>
            <Plus size={17} aria-hidden="true" />
            <span>Tambah Pekerjaan</span>
          </button>
          <button
            type="button"
            className="btn-hero-secondary"
            onClick={() => setShowRoadmapModal(true)}
          >
            <Layers size={16} aria-hidden="true" />
            <span>Info 5 Tahap</span>
          </button>
        </div>
      </section>

      {/* 2 Main Overview Cards (Click to go to Sub-Dashboards) */}
      <section aria-label="Ringkasan Utama" className="overview-duo-grid">
        <button
          type="button"
          className="overview-summary-card indigo-accent"
          onClick={() => onNavigateTab('projects')}
        >
          <div className="overview-card-top">
            <div className="kpi-icon">
              <FolderKanban size={20} aria-hidden="true" />
            </div>
            <span className="overview-nav-hint">
              Buka Dashboard Proyek <ChevronRight size={15} aria-hidden="true" />
            </span>
          </div>
          <div className="overview-card-main">
            <span className="kpi-label">STATUS PROYEK VIDEO</span>
            <strong className="overview-big-val">{activeProjectsCount} Aktif</strong>
            <span className="kpi-caption">
              {completedCount} selesai dari total {projects.length} proyek
            </span>
          </div>
        </button>

        <button
          type="button"
          className="overview-summary-card emerald-accent"
          onClick={() => onNavigateTab('finance')}
        >
          <div className="overview-card-top">
            <div className="kpi-icon">
              <Wallet size={20} aria-hidden="true" />
            </div>
            <span className="overview-nav-hint">
              Buka Dashboard Keuangan <ChevronRight size={15} aria-hidden="true" />
            </span>
          </div>
          <div className="overview-card-main">
            <span className="kpi-label">SALDO BERSIH & KEUANGANKU</span>
            <strong className="overview-big-val">{formatRupiah(netBalance)}</strong>
            <span className="kpi-caption">
              Piutang klien belum cair: {formatRupiah(unpaidProjectFee)}
            </span>
          </div>
        </button>
      </section>

      {/* Clean Navigation Grid */}
      <section className="panel-card">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Navigasi Modul Utama</h2>
            <p className="panel-subtitle">Ketuk menu untuk membuka halaman terkait</p>
          </div>
        </div>

        <div className="nav-menu-grid">
          <button
            type="button"
            className="nav-menu-tile"
            onClick={() => onNavigateTab('projects')}
          >
            <div className="tile-icon indigo">
              <FolderKanban size={22} aria-hidden="true" />
            </div>
            <div className="tile-text">
              <strong>Dashboard Proyek</strong>
              <span>Daftar kerjaan, 6 tahap & klien</span>
            </div>
            <ChevronRight size={18} aria-hidden="true" className="tile-arrow" />
          </button>

          <button
            type="button"
            className="nav-menu-tile"
            onClick={() => onNavigateTab('finance')}
          >
            <div className="tile-icon emerald">
              <Wallet size={22} aria-hidden="true" />
            </div>
            <div className="tile-text">
              <strong>Dashboard Keuangan</strong>
              <span>Dompet, pemasukan, pengeluaran & invoice</span>
            </div>
            <ChevronRight size={18} aria-hidden="true" className="tile-arrow" />
          </button>

          <button
            type="button"
            className="nav-menu-tile"
            onClick={() => onNavigateTab('calendar')}
          >
            <div className="tile-icon blue">
              <Calendar size={22} aria-hidden="true" />
            </div>
            <div className="tile-text">
              <strong>Kalender & Jadwal</strong>
              <span>Tenggat waktu & target jam harian</span>
            </div>
            <ChevronRight size={18} aria-hidden="true" className="tile-arrow" />
          </button>

          <button
            type="button"
            className="nav-menu-tile"
            onClick={() => onNavigateTab('alerts')}
          >
            <div className="tile-icon rose">
              <Bell size={22} aria-hidden="true" />
            </div>
            <div className="tile-text">
              <strong>Pengingat & Backup</strong>
              <span>{urgentProjects.length} proyek mendesak • Notifikasi HP</span>
            </div>
            <ChevronRight size={18} aria-hidden="true" className="tile-arrow" />
          </button>
        </div>
      </section>

      {/* Compact Urgent Navigation List (Click row to view full details) */}
      <section className="panel-card">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">
              <Flame size={18} className="text-danger" aria-hidden="true" />
              <span>Perlu Perhatian Segera ({urgentProjects.length})</span>
            </h2>
            <p className="panel-subtitle">Ketuk baris proyek untuk melihat detail lengkapnya</p>
          </div>
          <button
            type="button"
            className="link-btn"
            onClick={() => onNavigateTab('projects')}
          >
            <span>Semua Proyek</span>
            <ChevronRight size={15} aria-hidden="true" />
          </button>
        </div>

        <div className="compact-nav-list">
          {urgentProjects.map((proj) => {
            const due = calculateDueStatus(proj);
            return (
              <button
                key={proj.id}
                type="button"
                className="compact-row-btn"
                onClick={() => onSelectProject(proj)}
              >
                <div className="compact-row-left">
                  <span className="code-pill">{proj.code}</span>
                  <div className="compact-row-titles">
                    <strong>{proj.name}</strong>
                    <span>
                      {proj.client} • {proj.stage}
                    </span>
                  </div>
                </div>
                <div className="compact-row-right">
                  <span className={`due-badge due-${due.type}`}>
                    {due.label} ({due.daysLeft} hr)
                  </span>
                  <ChevronRight size={16} aria-hidden="true" />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Modal 5 Tahap Pembangunan (hanya muncul ketika tombol Info 5 Tahap diklik) */}
      <LightDismissDialog
        open={showRoadmapModal}
        onClose={() => setShowRoadmapModal(false)}
        title="Peta Jalan 5 Tahap Pembangunan Aplikasi"
        subtitle="Seluruh tahapan sudah terintegrasi di dalam aplikasi Anda"
      >
        <div className="roadmap-grid">
          {APP_ROADMAP.map((item) => (
            <div key={item.phase} className="roadmap-card">
              <div className="roadmap-card-top">
                <span className="roadmap-phase-pill">TAHAP {item.phase}</span>
                <span className="roadmap-status-badge">✅ {item.status}</span>
              </div>
              <h3 className="roadmap-title">{item.title}</h3>
              <p className="roadmap-subtitle">{item.subtitle}</p>
              <ul className="roadmap-features">
                {item.features.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </LightDismissDialog>
    </div>
  );
};
