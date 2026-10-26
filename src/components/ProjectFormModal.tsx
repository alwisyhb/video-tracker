import React, { useEffect, useState } from 'react';
import { Check, Plus, Sparkles, Trash2, UserPlus } from 'lucide-react';
import {
  EDITING_STAGES,
  PAYMENT_STATUSES,
  PLATFORMS,
  PRIORITIES,
  PROJECT_STATUSES,
  VIDEO_TYPES,
  suggestProjectCode
} from '../constants';
import type { VideoProject } from '../types';
import { LightDismissDialog } from './LightDismissDialog';

interface ProjectFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (project: VideoProject) => void;
  onDelete?: (id: string) => void;
  initialProject?: VideoProject | null;
  existingProjects: VideoProject[];
  clientsList: string[];
  onAddNewClient: (clientName: string) => void;
}

const FEE_PRESETS = [25000, 35000, 40000, 50000, 70000, 90000, 150000];

export const ProjectFormModal: React.FC<ProjectFormModalProps> = ({
  open,
  onClose,
  onSave,
  onDelete,
  initialProject,
  existingProjects,
  clientsList,
  onAddNewClient
}) => {
  const todayStr = new Date().toISOString().slice(0, 10);
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [client, setClient] = useState(clientsList[0] || 'Jasaedit');
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [platform, setPlatform] = useState(PLATFORMS[0]);
  const [stage, setStage] = useState<string>(EDITING_STAGES[0]);
  const [startDate, setStartDate] = useState(todayStr);
  const [deadline, setDeadline] = useState(tomorrowStr);
  const [deadlineTime, setDeadlineTime] = useState('20.00');
  const [status, setStatus] = useState<string>('Dalam Proses');
  const [priority, setPriority] = useState<string>('Sedang');
  const [duration, setDuration] = useState('3 - 5 menit');
  const [fee, setFee] = useState<number>(50000);
  const [videoType, setVideoType] = useState(VIDEO_TYPES[0]);
  const [paymentStatus, setPaymentStatus] = useState<string>('Belum Diterima');
  const [notes, setNotes] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(true);

  useEffect(() => {
    setIsAddingClient(false);
    setNewClientName('');
    if (initialProject) {
      setCode(initialProject.code);
      setName(initialProject.name);
      setClient(initialProject.client || clientsList[0] || 'Jasaedit');
      setPlatform(initialProject.platform || PLATFORMS[0]);
      setStage(initialProject.stage || EDITING_STAGES[0]);
      setStartDate(initialProject.startDate || todayStr);
      setDeadline(initialProject.deadline || tomorrowStr);
      setDeadlineTime(initialProject.deadlineTime || '');
      setStatus(initialProject.status || 'Dalam Proses');
      setPriority(initialProject.priority || 'Sedang');
      setDuration(initialProject.duration || '');
      setFee(initialProject.fee ?? 50000);
      setVideoType(initialProject.videoType || VIDEO_TYPES[0]);
      setPaymentStatus(initialProject.paymentStatus || 'Belum Diterima');
      setNotes(initialProject.notes || '');
      setReminderEnabled(initialProject.reminderEnabled !== false);
    } else {
      const defaultClient = clientsList[0] || 'Jasaedit';
      setClient(defaultClient);
      setCode(suggestProjectCode(defaultClient, existingProjects));
      setName('');
      setPlatform(PLATFORMS[0]);
      setStage(EDITING_STAGES[0]);
      setStartDate(todayStr);
      setDeadline(tomorrowStr);
      setDeadlineTime('20.00');
      setStatus('Dalam Proses');
      setPriority('Sedang');
      setDuration('3 - 5 menit');
      setFee(50000);
      setVideoType(VIDEO_TYPES[0]);
      setPaymentStatus('Belum Diterima');
      setNotes('');
      setReminderEnabled(true);
    }
  }, [initialProject, open, existingProjects, clientsList, todayStr, tomorrowStr]);

  const handleClientChange = (val: string) => {
    if (val === '__ADD_NEW__') {
      setIsAddingClient(true);
      return;
    }
    setIsAddingClient(false);
    setClient(val);
    if (!initialProject) {
      setCode(suggestProjectCode(val, existingProjects));
    }
  };

  const handleConfirmAddClient = () => {
    const trimmed = newClientName.trim();
    if (!trimmed) return;
    onAddNewClient(trimmed);
    setClient(trimmed);
    if (!initialProject) {
      setCode(suggestProjectCode(trimmed, existingProjects));
    }
    setNewClientName('');
    setIsAddingClient(false);
  };

  const handleStageChange = (newStage: string) => {
    setStage(newStage);
    if (newStage === '6. Final Export' && status === 'Belum Mulai') {
      setStatus('Selesai');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let resolvedClient = client;
    if (isAddingClient && newClientName.trim()) {
      resolvedClient = newClientName.trim();
      onAddNewClient(resolvedClient);
    }

    const payload: VideoProject = {
      id: initialProject ? initialProject.id : `proj-${Date.now()}`,
      code: code.trim() || suggestProjectCode(resolvedClient, existingProjects),
      name: name.trim() || 'Proyek Video Baru',
      client: resolvedClient,
      platform,
      stage,
      startDate,
      deadline,
      deadlineTime: deadlineTime.trim(),
      status,
      priority,
      duration: duration.trim() || '-',
      fee: Number(fee) || 0,
      videoType,
      paymentStatus,
      notes: notes.trim(),
      reminderEnabled
    };

    onSave(payload);
    onClose();
  };

  return (
    <LightDismissDialog
      open={open}
      onClose={onClose}
      title={initialProject ? `Edit Proyek [${initialProject.code}]` : 'Tambah Pekerjaan Baru'}
      subtitle="Input data proyek video atau tambahkan klien baru ke daftar tetap"
    >
      <form onSubmit={handleSubmit} className="project-form">
        <div className="form-grid-2">
          <div className="form-field">
            <label htmlFor="proj-client">Klien / Saluran</label>
            <div className="input-with-action">
              <select
                id="proj-client"
                value={isAddingClient ? '__ADD_NEW__' : client}
                onChange={(e) => handleClientChange(e.target.value)}
              >
                {clientsList.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                <option value="__ADD_NEW__">➕ + Tambah Klien Baru...</option>
              </select>
              <button
                type="button"
                className="chip-btn"
                onClick={() => setIsAddingClient((v) => !v)}
                title="Tambah opsi klien baru"
              >
                <UserPlus size={14} aria-hidden="true" />
                <span>+ Klien</span>
              </button>
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="proj-code">Kode Proyek</label>
            <div className="input-with-action">
              <input
                id="proj-code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Mis. JE8500 / RV011"
                required
              />
              <button
                type="button"
                className="chip-btn"
                onClick={() =>
                  setCode(
                    suggestProjectCode(
                      isAddingClient && newClientName.trim() ? newClientName.trim() : client,
                      existingProjects
                    )
                  )
                }
                title="Buat kode otomatis"
              >
                <Sparkles size={14} aria-hidden="true" />
                <span>Auto</span>
              </button>
            </div>
          </div>
        </div>

        {/* Box Input Klien Baru jika tombol + Klien diklik */}
        {isAddingClient && (
          <div className="new-client-inline-box">
            <label htmlFor="proj-new-client">
              ✨ Masukkan Nama Klien Baru (Akan tersimpan permanen di pilihan Klien)
            </label>
            <div className="input-with-action">
              <input
                id="proj-new-client"
                type="text"
                value={newClientName}
                onChange={(e) => {
                  setNewClientName(e.target.value);
                  if (!initialProject && e.target.value.trim()) {
                    setCode(suggestProjectCode(e.target.value.trim(), existingProjects));
                  }
                }}
                placeholder="Contoh: Studio Kreatif / Nama Brand / Channel..."
                autoFocus
              />
              <button
                type="button"
                className="btn-primary"
                onClick={handleConfirmAddClient}
              >
                <Plus size={15} aria-hidden="true" />
                <span>Simpan Klien</span>
              </button>
            </div>
          </div>
        )}

        <div className="form-field">
          <label htmlFor="proj-name">Nama Proyek Video</label>
          <input
            id="proj-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Contoh: Vlog Ekstrakurikuler / Melek Ngonten Eps 11"
            required
          />
        </div>

        <div className="form-grid-2">
          <div className="form-field">
            <label htmlFor="proj-platform">Platform & Rasio</label>
            <select
              id="proj-platform"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
            >
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="proj-vtype">Jenis Video</label>
            <select
              id="proj-vtype"
              value={videoType}
              onChange={(e) => setVideoType(e.target.value)}
            >
              {VIDEO_TYPES.map((vt) => (
                <option key={vt} value={vt}>
                  {vt}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-grid-2">
          <div className="form-field">
            <label htmlFor="proj-stage">Tahapan Editing (1–6)</label>
            <select
              id="proj-stage"
              value={stage}
              onChange={(e) => handleStageChange(e.target.value)}
            >
              {EDITING_STAGES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="proj-status">Status Pengerjaan</label>
            <select
              id="proj-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {PROJECT_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-grid-3">
          <div className="form-field">
            <label htmlFor="proj-start">Tgl Mulai / Take</label>
            <input
              id="proj-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label htmlFor="proj-deadline">Tgl Deadline</label>
            <input
              id="proj-deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label htmlFor="proj-time">Target Jam Deadline</label>
            <input
              id="proj-time"
              type="text"
              value={deadlineTime}
              onChange={(e) => setDeadlineTime(e.target.value)}
              placeholder="Mis: 20.00 / jam 7"
            />
          </div>
        </div>

        <div className="form-grid-2">
          <div className="form-field">
            <label htmlFor="proj-priority">Prioritas</label>
            <select
              id="proj-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              {PRIORITIES.map((pr) => (
                <option key={pr} value={pr}>
                  {pr}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="proj-duration">Estimasi Durasi Video</label>
            <input
              id="proj-duration"
              type="text"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="Mis: 5 menit / 60 detik"
            />
          </div>
        </div>

        <div className="form-grid-2">
          <div className="form-field">
            <label htmlFor="proj-fee">Fee Proyek (Rp)</label>
            <input
              id="proj-fee"
              type="number"
              min={0}
              step={5000}
              value={fee}
              onChange={(e) => setFee(Number(e.target.value))}
            />
            <div className="preset-chips">
              {FEE_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={`chip-btn ${fee === preset ? 'active' : ''}`}
                  onClick={() => setFee(preset)}
                >
                  {preset / 1000}rb
                </button>
              ))}
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="proj-pay">Status Pembayaran</label>
            <select
              id="proj-pay"
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
            >
              {PAYMENT_STATUSES.map((ps) => (
                <option key={ps} value={ps}>
                  {ps}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-field">
          <label htmlFor="proj-notes">Catatan Produksi / Link Aset / Status Revisi</label>
          <input
            id="proj-notes"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Mis: udah download, sfx beres, tunggu voice over klien..."
          />
        </div>

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={reminderEnabled}
            onChange={(e) => setReminderEnabled(e.target.checked)}
          />
          <span>Aktifkan pengingat & notifikasi otomatis menjelang deadline</span>
        </label>

        <div className="dialog-actions">
          {initialProject && onDelete && (
            <button
              type="button"
              className="btn-danger"
              onClick={() => {
                onDelete(initialProject.id);
                onClose();
              }}
            >
              <Trash2 size={16} aria-hidden="true" />
              <span>Hapus</span>
            </button>
          )}
          <div className="dialog-actions-right">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Batal
            </button>
            <button type="submit" className="btn-primary">
              <Check size={16} aria-hidden="true" />
              <span>{initialProject ? 'Simpan Perubahan' : 'Simpan Pekerjaan'}</span>
            </button>
          </div>
        </div>
      </form>
    </LightDismissDialog>
  );
};
