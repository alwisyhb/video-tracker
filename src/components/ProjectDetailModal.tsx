import React from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Edit3,
  Film,
  Layers,
  Trash2,
  User,
  Wallet
} from 'lucide-react';
import {
  EDITING_STAGES,
  calculateDueStatus,
  formatRupiah,
  formatShortDate,
  getStageProgressPercent
} from '../constants';
import type { VideoProject } from '../types';
import { LightDismissDialog } from './LightDismissDialog';

interface ProjectDetailModalProps {
  project: VideoProject | null;
  open: boolean;
  onClose: () => void;
  onEditProject: (project: VideoProject) => void;
  onQuickStatusChange: (id: string, newStatus: string) => void;
  onQuickStageSelect: (id: string, newStage: string) => void;
  onQuickPaymentToggle: (id: string) => void;
  onDeleteProject: (id: string) => void;
}

export const ProjectDetailModal: React.FC<ProjectDetailModalProps> = ({
  project,
  open,
  onClose,
  onEditProject,
  onQuickStatusChange,
  onQuickStageSelect,
  onQuickPaymentToggle,
  onDeleteProject
}) => {
  if (!project) return null;

  const due = calculateDueStatus(project);
  const progress = getStageProgressPercent(project.stage);
  const isPaid = project.paymentStatus === 'Sudah Diterima';

  return (
    <LightDismissDialog
      open={open}
      onClose={onClose}
      title={project.name}
      subtitle={`Kode Proyek: ${project.code} • Klien: ${project.client}`}
    >
      <div className="detail-modal-content">
        {/* Top Status Badges */}
        <div className="detail-badges-bar">
          <span className="code-pill">{project.code}</span>
          <span className={`due-badge due-${due.type}`}>
            {due.label}
            {project.status !== 'Selesai' ? ` (${due.daysLeft} hari)` : ''}
          </span>
          <span className={`prio-badge prio-${project.priority.toLowerCase()}`}>
            Prioritas {project.priority}
          </span>
          <button
            type="button"
            className={`pay-pill ${isPaid ? 'paid' : 'unpaid'}`}
            onClick={() => onQuickPaymentToggle(project.id)}
          >
            {isPaid ? '✅ Fee Sudah Diterima' : `⏳ ${project.paymentStatus}`}
          </button>
        </div>

        {/* Interactive 6-Stage Pipeline Selector */}
        <div className="detail-section-box">
          <div className="stage-progress-label" style={{ marginBottom: 6 }}>
            <span>
              <Layers size={14} aria-hidden="true" style={{ verticalAlign: 'middle' }} />{' '}
              Tahapan Editing: <strong>{project.stage}</strong>
            </span>
            <strong>{progress}%</strong>
          </div>
          <div className="progress-track" style={{ marginBottom: 10 }}>
            <div
              className={`progress-fill ${
                project.status === 'Selesai' ? 'progress-emerald' : ''
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="detail-stage-steps">
            {EDITING_STAGES.map((st) => {
              const active = project.stage === st;
              return (
                <button
                  key={st}
                  type="button"
                  className={`chip-btn ${active ? 'active' : ''}`}
                  onClick={() => onQuickStageSelect(project.id, st)}
                >
                  {st}
                </button>
              );
            })}
          </div>
        </div>

        {/* Info Grid */}
        <div className="detail-info-grid">
          <div className="detail-info-cell">
            <span className="detail-cell-label">
              <User size={13} aria-hidden="true" /> Klien / Saluran
            </span>
            <strong>{project.client}</strong>
          </div>

          <div className="detail-info-cell">
            <span className="detail-cell-label">
              <Wallet size={13} aria-hidden="true" /> Fee Proyek
            </span>
            <strong className="text-success">{formatRupiah(project.fee)}</strong>
          </div>

          <div className="detail-info-cell">
            <span className="detail-cell-label">
              <Film size={13} aria-hidden="true" /> Platform & Jenis
            </span>
            <strong>
              {project.platform} • {project.videoType || '-'}
            </strong>
          </div>

          <div className="detail-info-cell">
            <span className="detail-cell-label">
              <Clock size={13} aria-hidden="true" /> Estimasi Durasi & Status
            </span>
            <strong>
              {project.duration || '-'} • {project.status}
            </strong>
          </div>

          <div className="detail-info-cell">
            <span className="detail-cell-label">
              <Calendar size={13} aria-hidden="true" /> Tanggal Mulai Take
            </span>
            <strong>{formatShortDate(project.startDate)}</strong>
          </div>

          <div className="detail-info-cell">
            <span className="detail-cell-label">
              <Calendar size={13} aria-hidden="true" /> Deadline & Target Jam
            </span>
            <strong>
              {formatShortDate(project.deadline)}
              {project.deadlineTime ? ` (${project.deadlineTime})` : ''}
            </strong>
          </div>
        </div>

        {project.notes && (
          <div className="project-note-banner">
            <strong>📝 Catatan Produksi / Revisi:</strong> {project.notes}
          </div>
        )}

        {/* Modal Footer Actions */}
        <div className="dialog-actions">
          <button
            type="button"
            className="btn-danger"
            onClick={() => {
              onDeleteProject(project.id);
              onClose();
            }}
          >
            <Trash2 size={15} aria-hidden="true" />
            <span>Hapus</span>
          </button>

          <div className="dialog-actions-right">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                onClose();
                onEditProject(project);
              }}
            >
              <Edit3 size={15} aria-hidden="true" />
              <span>Edit Form</span>
            </button>

            {project.status !== 'Selesai' ? (
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  onQuickStatusChange(project.id, 'Selesai');
                  onClose();
                }}
              >
                <CheckCircle2 size={15} aria-hidden="true" />
                <span>Tandai Selesai</span>
              </button>
            ) : (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  onQuickStatusChange(project.id, 'Dalam Proses');
                  onClose();
                }}
              >
                <span>Buka Kembali</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </LightDismissDialog>
  );
};
