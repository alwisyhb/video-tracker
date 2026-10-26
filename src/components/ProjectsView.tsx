import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  Filter,
  FolderKanban,
  Layers,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  UserPlus,
  Users
} from 'lucide-react';
import {
  EDITING_STAGES,
  calculateDueStatus,
  formatRupiah
} from '../constants';
import { exportProjectsToCSV } from '../services/exportService';
import type { VideoProject } from '../types';
import { LightDismissDialog } from './LightDismissDialog';

interface ProjectsViewProps {
  projects: VideoProject[];
  clientsList: string[];
  onAddNewClient: (clientName: string) => void;
  onRemoveClient: (clientName: string) => void;
  onOpenAddModal: () => void;
  onSelectProject: (project: VideoProject) => void;
  onQuickAdvanceStage: (project: VideoProject) => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  clientsList,
  onAddNewClient,
  onRemoveClient,
  onOpenAddModal,
  onSelectProject,
  onQuickAdvanceStage
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [clientFilter, setClientFilter] = useState<string>('ALL');

  // Sub-modals inside Dashboard Proyek (Progressive Disclosure)
  const [showPipelineModal, setShowPipelineModal] = useState(false);
  const [showClientsModal, setShowClientsModal] = useState(false);
  const [newClientInput, setNewClientInput] = useState('');

  const inProgressCount = projects.filter((p) => p.status === 'Dalam Proses').length;
  const inRevisionCount = projects.filter((p) => p.status === 'Revisi').length;
  const notStartedCount = projects.filter((p) => p.status === 'Belum Mulai').length;
  const completedCount = projects.filter((p) => p.status === 'Selesai').length;

  const filteredProjects = useMemo(() => {
    return projects
      .filter((p) => {
        if (statusFilter === 'ACTIVE') {
          if (p.status === 'Selesai') return false;
        } else if (statusFilter !== 'ALL' && p.status !== statusFilter) {
          return false;
        }

        if (clientFilter !== 'ALL' && p.client !== clientFilter) {
          return false;
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const match =
            p.code.toLowerCase().includes(q) ||
            p.name.toLowerCase().includes(q) ||
            p.client.toLowerCase().includes(q) ||
            p.videoType.toLowerCase().includes(q);
          if (!match) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const aDone = a.status === 'Selesai' ? 1 : 0;
        const bDone = b.status === 'Selesai' ? 1 : 0;
        if (aDone !== bDone) return aDone - bDone;
        return (b.deadline || '').localeCompare(a.deadline || '');
      });
  }, [projects, searchQuery, statusFilter, clientFilter]);

  // Client stats for modal
  const clientStats = useMemo(() => {
    const map = new Map<string, { count: number; totalFee: number; activeCount: number }>();
    clientsList.forEach((c) => map.set(c, { count: 0, totalFee: 0, activeCount: 0 }));
    projects.forEach((p) => {
      const c = p.client || 'Lainnya';
      const cur = map.get(c) || { count: 0, totalFee: 0, activeCount: 0 };
      cur.count += 1;
      cur.totalFee += p.fee || 0;
      if (p.status !== 'Selesai') cur.activeCount += 1;
      map.set(c, cur);
    });
    return Array.from(map.entries())
      .map(([name, stat]) => ({ name, ...stat }))
      .sort((a, b) => b.count - a.count);
  }, [projects, clientsList]);

  const handleAddClientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientInput.trim()) return;
    onAddNewClient(newClientInput.trim());
    setNewClientInput('');
  };

  return (
    <div className="view-container">
      {/* Header Dashboard Proyek */}
      <div className="section-top-bar">
        <div>
          <h1 className="page-title">🎬 Dashboard Proyek</h1>
          <p className="page-subtitle">
            Ketuk kartu status untuk memfilter, atau ketuk nama proyek untuk membuka rinciannya
          </p>
        </div>

        <div className="top-bar-actions">
          <button type="button" className="btn-primary" onClick={onOpenAddModal}>
            <Plus size={16} aria-hidden="true" />
            <span>Tambah Pekerjaan</span>
          </button>
        </div>
      </div>

      {/* 4 Kartu Navigasi Status Proyek */}
      <section aria-label="Filter Status Proyek" className="kpi-grid">
        <button
          type="button"
          className={`kpi-card kpi-indigo ${statusFilter === 'ALL' ? 'selected-kpi' : ''}`}
          onClick={() => setStatusFilter('ALL')}
        >
          <div className="kpi-icon">
            <FolderKanban size={20} aria-hidden="true" />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">SEMUA PROYEK</span>
            <strong className="kpi-value">{projects.length}</strong>
            <span className="kpi-caption">{notStartedCount} belum mulai</span>
          </div>
        </button>

        <button
          type="button"
          className={`kpi-card kpi-blue ${statusFilter === 'Dalam Proses' ? 'selected-kpi' : ''}`}
          onClick={() =>
            setStatusFilter(statusFilter === 'Dalam Proses' ? 'ALL' : 'Dalam Proses')
          }
        >
          <div className="kpi-icon">
            <Clock size={20} aria-hidden="true" />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">DALAM PROSES</span>
            <strong className="kpi-value">{inProgressCount}</strong>
            <span className="kpi-caption">Ketuk untuk filter</span>
          </div>
        </button>

        <button
          type="button"
          className={`kpi-card kpi-amber ${statusFilter === 'Revisi' ? 'selected-kpi' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'Revisi' ? 'ALL' : 'Revisi')}
        >
          <div className="kpi-icon">
            <RefreshCcw size={20} aria-hidden="true" />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">DALAM REVISI</span>
            <strong className="kpi-value">{inRevisionCount}</strong>
            <span className="kpi-caption">Menunggu revisi</span>
          </div>
        </button>

        <button
          type="button"
          className={`kpi-card kpi-emerald ${statusFilter === 'Selesai' ? 'selected-kpi' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'Selesai' ? 'ALL' : 'Selesai')}
        >
          <div className="kpi-icon">
            <CheckCircle2 size={20} aria-hidden="true" />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">SELESAI</span>
            <strong className="kpi-value">{completedCount}</strong>
            <span className="kpi-caption">Siap tayang / deliver</span>
          </div>
        </button>
      </section>

      {/* Menu Sub-Fitur Proyek (Klik untuk buka detail popup) */}
      <div className="sub-feature-pills">
        <button
          type="button"
          className="sub-feature-btn"
          onClick={() => setShowPipelineModal(true)}
        >
          <Layers size={16} aria-hidden="true" />
          <span>Papan 6 Tahap Editing</span>
          <ChevronRight size={15} aria-hidden="true" />
        </button>

        <button
          type="button"
          className="sub-feature-btn"
          onClick={() => setShowClientsModal(true)}
        >
          <Users size={16} aria-hidden="true" />
          <span>Daftar & Tambah Klien ({clientsList.length})</span>
          <ChevronRight size={15} aria-hidden="true" />
        </button>

        <button
          type="button"
          className="sub-feature-btn"
          onClick={() => exportProjectsToCSV(filteredProjects)}
        >
          <Download size={16} aria-hidden="true" />
          <span>Export Excel (.CSV)</span>
        </button>
      </div>

      {/* Pencarian & Daftar Navigasi Proyek Ringkas */}
      <section className="panel-card">
        <search className="compact-search-bar">
          <div className="search-box">
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kode (JE7433), judul video, atau klien..."
              aria-label="Cari proyek video"
            />
          </div>

          <div className="mini-select-wrap">
            <Filter size={14} aria-hidden="true" />
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              aria-label="Filter Klien"
            >
              <option value="ALL">Semua Klien</option>
              {clientsList.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </search>

        <div className="compact-list-header">
          <span>Daftar Pekerjaan ({filteredProjects.length})</span>
          <span>Ketuk item untuk detail</span>
        </div>

        <div className="compact-nav-list">
          {filteredProjects.map((project) => {
            const due = calculateDueStatus(project);
            return (
              <button
                key={project.id}
                type="button"
                className="compact-row-btn"
                onClick={() => onSelectProject(project)}
              >
                <div className="compact-row-left">
                  <span className="code-pill">{project.code}</span>
                  <div className="compact-row-titles">
                    <strong>{project.name}</strong>
                    <span>
                      👤 {project.client} • 🎞️ {project.stage}
                    </span>
                  </div>
                </div>

                <div className="compact-row-right">
                  <span className={`due-badge due-${due.type}`}>
                    {due.label}
                    {project.status !== 'Selesai' ? ` (${due.daysLeft}h)` : ''}
                  </span>
                  <ChevronRight size={16} aria-hidden="true" />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* MODAL 1: Papan 6 Tahapan Editing */}
      <LightDismissDialog
        open={showPipelineModal}
        onClose={() => setShowPipelineModal(false)}
        title="Alur & Papan 6 Tahapan Editing"
        subtitle="Ketuk proyek untuk membuka detail atau geser tahap pengerjaan"
      >
        <div className="stage-bars">
          {EDITING_STAGES.map((stageName) => {
            const stageProjects = projects.filter((p) => p.stage === stageName);
            const activeInStage = stageProjects.filter((p) => p.status !== 'Selesai');
            return (
              <div key={stageName} className="pipeline-modal-group">
                <div className="stage-bar-top">
                  <strong>{stageName}</strong>
                  <span>
                    {stageProjects.length} total ({activeInStage.length} aktif)
                  </span>
                </div>
                {activeInStage.length > 0 && (
                  <div className="compact-nav-list" style={{ marginTop: 6 }}>
                    {activeInStage.map((proj) => (
                      <div key={proj.id} className="compact-row-btn">
                        <div
                          className="compact-row-left"
                          onClick={() => {
                            setShowPipelineModal(false);
                            onSelectProject(proj);
                          }}
                        >
                          <span className="code-pill">{proj.code}</span>
                          <div className="compact-row-titles">
                            <strong>{proj.name}</strong>
                            <span>{proj.client}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="chip-btn"
                          onClick={() => onQuickAdvanceStage(proj)}
                        >
                          Naik Tahap →
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </LightDismissDialog>

      {/* MODAL 2: Kelola Daftar Klien & Statistik Klien */}
      <LightDismissDialog
        open={showClientsModal}
        onClose={() => setShowClientsModal(false)}
        title="Daftar Klien & Tambah Klien Baru"
        subtitle="Tambahkan klien baru agar otomatis muncul saat input pekerjaan"
      >
        <form onSubmit={handleAddClientSubmit} className="new-client-inline-box" style={{ marginBottom: 14 }}>
          <label htmlFor="manage-new-client">Tambah Klien / Channel Baru</label>
          <div className="input-with-action">
            <input
              id="manage-new-client"
              type="text"
              value={newClientInput}
              onChange={(e) => setNewClientInput(e.target.value)}
              placeholder="Ketik nama klien baru..."
            />
            <button type="submit" className="btn-primary">
              <UserPlus size={15} aria-hidden="true" />
              <span>Tambah</span>
            </button>
          </div>
        </form>

        <div className="compact-nav-list">
          {clientStats.map((c) => (
            <div key={c.name} className="compact-row-btn">
              <div
                className="compact-row-left"
                onClick={() => {
                  setClientFilter(c.name);
                  setShowClientsModal(false);
                }}
              >
                <div className="compact-row-titles">
                  <strong>{c.name}</strong>
                  <span>
                    {c.count} proyek ({c.activeCount} aktif) • Total Fee: {formatRupiah(c.totalFee)}
                  </span>
                </div>
              </div>
              <div className="compact-row-right">
                <button
                  type="button"
                  className="chip-btn"
                  onClick={() => {
                    setClientFilter(c.name);
                    setShowClientsModal(false);
                  }}
                >
                  Filter
                </button>
                {c.count === 0 && (
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => onRemoveClient(c.name)}
                    aria-label={`Hapus klien ${c.name}`}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </LightDismissDialog>
    </div>
  );
};
