import React, { useMemo, useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus
} from 'lucide-react';
import { calculateDueStatus, formatRupiah, formatShortDate } from '../constants';
import type { VideoProject } from '../types';

interface CalendarViewProps {
  projects: VideoProject[];
  onSelectProject: (project: VideoProject) => void;
  onOpenAddModal: () => void;
}

const DAY_NAMES = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember'
];

export const CalendarView: React.FC<CalendarViewProps> = ({
  projects,
  onSelectProject,
  onOpenAddModal
}) => {
  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    now.toISOString().slice(0, 10)
  );

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleGoToday = () => {
    const t = new Date();
    setCurrentYear(t.getFullYear());
    setCurrentMonth(t.getMonth());
    setSelectedDateStr(t.toISOString().slice(0, 10));
  };

  const calendarCells = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const startOffset = (firstDayOfMonth.getDay() + 6) % 7;

    const cells: Array<{
      dateStr: string | null;
      dayNum: number | null;
      dueProjects: VideoProject[];
      startProjects: VideoProject[];
    }> = [];

    for (let i = 0; i < startOffset; i++) {
      cells.push({ dateStr: null, dayNum: null, dueProjects: [], startProjects: [] });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const mm = String(currentMonth + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      const dateStr = `${currentYear}-${mm}-${dd}`;
      const dueProjects = projects.filter((p) => p.deadline === dateStr);
      const startProjects = projects.filter(
        (p) => p.startDate === dateStr && p.deadline !== dateStr
      );
      cells.push({ dateStr, dayNum: d, dueProjects, startProjects });
    }

    return cells;
  }, [currentYear, currentMonth, projects]);

  const selectedDayProjects = useMemo(() => {
    return projects.filter(
      (p) => p.deadline === selectedDateStr || p.startDate === selectedDateStr
    );
  }, [projects, selectedDateStr]);

  const monthSummary = useMemo(() => {
    const prefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const inMonth = projects.filter(
      (p) =>
        (p.deadline && p.deadline.startsWith(prefix)) ||
        (p.startDate && p.startDate.startsWith(prefix))
    );
    const activeInMonth = inMonth.filter((p) => p.status !== 'Selesai');
    const totalFeeMonth = inMonth.reduce((sum, p) => sum + (p.fee || 0), 0);
    return {
      total: inMonth.length,
      active: activeInMonth.length,
      fee: totalFeeMonth
    };
  }, [projects, currentYear, currentMonth]);

  return (
    <div className="view-container">
      <div className="section-top-bar">
        <div>
          <h1 className="page-title">📅 Kalender & Jadwal Deadline</h1>
          <p className="page-subtitle">
            {MONTH_NAMES[currentMonth]} {currentYear}: <strong>{monthSummary.total} proyek</strong> ({monthSummary.active} aktif) • Estimasi: <strong>{formatRupiah(monthSummary.fee)}</strong>
          </p>
        </div>

        <div className="top-bar-actions">
          <button type="button" className="btn-secondary" onClick={handleGoToday}>
            <CalendarIcon size={16} aria-hidden="true" />
            <span>Hari Ini</span>
          </button>
          <button type="button" className="btn-primary" onClick={onOpenAddModal}>
            <Plus size={16} aria-hidden="true" />
            <span>Jadwal Baru</span>
          </button>
        </div>
      </div>

      <div className="calendar-layout">
        <section className="panel-card calendar-card">
          <div className="calendar-nav-header">
            <button
              type="button"
              className="icon-btn"
              onClick={handlePrevMonth}
              aria-label="Bulan sebelumnya"
            >
              <ChevronLeft size={18} aria-hidden="true" />
              <span>Sebelumnya</span>
            </button>
            <h2 className="calendar-month-label">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </h2>
            <button
              type="button"
              className="icon-btn"
              onClick={handleNextMonth}
              aria-label="Bulan berikutnya"
            >
              <span>Berikutnya</span>
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>

          <div className="calendar-weekdays">
            {DAY_NAMES.map((d) => (
              <div key={d} className="weekday-cell">
                {d}
              </div>
            ))}
          </div>

          <div className="calendar-grid">
            {calendarCells.map((cell, idx) => {
              if (!cell.dateStr || !cell.dayNum) {
                return <div key={`empty-${idx}`} className="calendar-day empty" />;
              }

              const isSelected = cell.dateStr === selectedDateStr;
              const isToday = cell.dateStr === now.toISOString().slice(0, 10);
              const hasActiveDue = cell.dueProjects.some((p) => p.status !== 'Selesai');
              const totalEvents = cell.dueProjects.length + cell.startProjects.length;

              return (
                <button
                  key={cell.dateStr}
                  type="button"
                  onClick={() => setSelectedDateStr(cell.dateStr!)}
                  className={`calendar-day ${isSelected ? 'selected' : ''} ${
                    isToday ? 'today' : ''
                  } ${hasActiveDue ? 'has-urgent' : ''}`}
                >
                  <span className="day-number">{cell.dayNum}</span>
                  {totalEvents > 0 && (
                    <div className="day-badges">
                      {cell.dueProjects.length > 0 && (
                        <span
                          className={`day-pill ${
                            hasActiveDue ? 'day-pill-urgent' : 'day-pill-done'
                          }`}
                        >
                          {cell.dueProjects.length} dl
                        </span>
                      )}
                      {cell.startProjects.length > 0 && (
                        <span className="day-pill day-pill-start">
                          +{cell.startProjects.length}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="calendar-legend">
            <span>
              <i className="legend-dot urgent" /> Deadline Aktif
            </span>
            <span>
              <i className="legend-dot done" /> Deadline Selesai
            </span>
            <span>
              <i className="legend-dot start" /> Mulai Take
            </span>
          </div>
        </section>

        {/* Compact Agenda List (Click item to open ProjectDetailModal) */}
        <section className="panel-card agenda-card">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">
                <Clock size={18} aria-hidden="true" />
                <span>Agenda {formatShortDate(selectedDateStr)}</span>
              </h2>
              <p className="panel-subtitle">
                Ketuk item proyek untuk melihat rinciannya ({selectedDayProjects.length} jadwal)
              </p>
            </div>
          </div>

          {selectedDayProjects.length === 0 ? (
            <div className="empty-box">
              <CalendarIcon size={26} aria-hidden="true" />
              <p>Tidak ada jadwal pada tanggal ini.</p>
            </div>
          ) : (
            <div className="compact-nav-list">
              {selectedDayProjects.map((proj) => {
                const due = calculateDueStatus(proj);
                const isDeadlineToday = proj.deadline === selectedDateStr;
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
                          {isDeadlineToday ? '🎯 Deadline' : '🎬 Mulai'} • {proj.client}
                          {proj.deadlineTime ? ` • ⏰ ${proj.deadlineTime}` : ''}
                        </span>
                      </div>
                    </div>
                    <div className="compact-row-right">
                      <span className={`due-badge due-${due.type}`}>{due.label}</span>
                      <ChevronRight size={16} aria-hidden="true" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
