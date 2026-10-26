import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { calculateDueStatus, formatRupiah } from '../constants';
import type { VideoProject } from '../types';

const FIRED_DL_ALERTS_KEY = 'myfinejob_fired_dl_alerts_v1';

/**
 * Parse project deadline (YYYY-MM-DD) and deadlineTime (e.g. "20.00", "08:30", "jam 8 malam", "18/20")
 * into an exact Date object on the deadline day. Defaults to 20:00 if no time is specified.
 */
export function parseProjectDeadlineDateTime(project: Pick<VideoProject, 'deadline' | 'deadlineTime'>): {
  date: Date;
  timeLabel: string;
} | null {
  if (!project.deadline) return null;
  const parts = project.deadline.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;

  const [year, month, day] = parts;
  let hour = 20;
  let minute = 0;

  const raw = (project.deadlineTime || '').trim().toLowerCase();
  if (raw) {
    // Match HH:mm or HH.mm (e.g., "08.30", "20:00", "08.00")
    const hhmm = raw.match(/(\d{1,2})[:.](\d{2})/);
    if (hhmm) {
      hour = parseInt(hhmm[1], 10);
      minute = parseInt(hhmm[2], 10);
    } else {
      // Match "18/20" or "jam 8 malam" or "jam 11 pagi" or "jam 4 sore"
      const numMatch = raw.match(/(\d{1,2})/);
      if (numMatch) {
        let h = parseInt(numMatch[1], 10);
        if ((raw.includes('sore') || raw.includes('malam')) && h < 12) {
          h += 12;
        } else if (raw.includes('pagi') && h === 12) {
          h = 0;
        }
        if (h >= 0 && h <= 23) {
          hour = h;
          minute = 0;
        }
      }
    }
  }

  hour = Math.max(0, Math.min(23, hour));
  minute = Math.max(0, Math.min(59, minute));

  const date = new Date(year, month - 1, day, hour, minute, 0, 0);
  const timeLabel = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  return { date, timeLabel };
}

function loadFiredAlerts(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(FIRED_DL_ALERTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return {};
}

function saveFiredAlerts(map: Record<string, boolean>): void {
  try {
    localStorage.setItem(FIRED_DL_ALERTS_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    if (Capacitor.isNativePlatform()) {
      const perm = await LocalNotifications.requestPermissions();
      return perm.display === 'granted';
    }
    if ('Notification' in window) {
      const result = await Notification.requestPermission();
      return result === 'granted';
    }
  } catch (err) {
    console.warn('Notification permission check failed:', err);
  }
  return false;
}

export async function triggerTestNotification(urgentCount: number, unpaidTotal: number): Promise<boolean> {
  const title = '🎬 Pengingat MyFineJob';
  const body =
    urgentCount > 0
      ? `Ada ${urgentCount} proyek butuh perhatian segera! Piutang belum dibayar: ${formatRupiah(unpaidTotal)}.`
      : `Semua jadwal terkendali! Piutang belum dibayar: ${formatRupiah(unpaidTotal)}.`;

  try {
    if (Capacitor.isNativePlatform()) {
      const granted = await requestNotificationPermission();
      if (!granted) return false;
      await LocalNotifications.schedule({
        notifications: [
          {
            id: Math.floor(Date.now() % 9000) + 1,
            title,
            body,
            schedule: { at: new Date(Date.now() + 1500), allowWhileIdle: true }
          }
        ]
      });
      return true;
    }

    if ('Notification' in window) {
      const granted = await requestNotificationPermission();
      if (granted) {
        new Notification(title, { body });
        return true;
      }
    }
  } catch (err) {
    console.warn('Failed to send notification:', err);
  }
  return false;
}

/**
 * Schedules the 3 mandatory deadline-day notifications for active projects:
 * 1) 6 hours before deadline (H - 6 jam)
 * 2) 2 hours before deadline (H - 2 jam)
 * 3) Exactly at deadline hour (Jam DL tiba)
 *
 * Also triggers an immediate notification if the project is on its deadline day today
 * and has just entered the 6h, 2h, or 0h window.
 */
export async function scheduleProjectReminders(projects: VideoProject[]): Promise<number> {
  const activeProjects = projects.filter(
    (p) => p.status !== 'Selesai' && p.reminderEnabled !== false && Boolean(p.deadline)
  );

  const nowMs = Date.now();
  const todayStr = new Date().toISOString().slice(0, 10);
  const firedMap = loadFiredAlerts();

  interface PendingNotif {
    id: number;
    title: string;
    body: string;
    at: Date;
  }

  const toSchedule: PendingNotif[] = [];
  let notifCounter = 10000;

  activeProjects.forEach((p) => {
    const parsed = parseProjectDeadlineDateTime(p);
    if (!parsed) return;

    const dlMs = parsed.date.getTime();
    const timeLabel = parsed.timeLabel;

    const milestones = [
      {
        key: `${p.id}_${p.deadline}_${timeLabel}_6h`,
        targetMs: dlMs - 6 * 60 * 60 * 1000,
        windowEndMs: dlMs - 2 * 60 * 60 * 1000,
        title: `⏰ 6 Jam Sebelum Deadline: [${p.code}] ${p.name}`,
        body: `Proyek "${p.name}" (${p.client}) harus selesai pukul ${timeLabel} (6 jam lagi). Tahap: ${p.stage}.`
      },
      {
        key: `${p.id}_${p.deadline}_${timeLabel}_2h`,
        targetMs: dlMs - 2 * 60 * 60 * 1000,
        windowEndMs: dlMs,
        title: `🔥 2 Jam Sebelum Deadline: [${p.code}] ${p.name}`,
        body: `Sisa waktu 2 jam lagi menuju deadline pukul ${timeLabel} untuk proyek [${p.code}] ${p.name} (${p.client})!`
      },
      {
        key: `${p.id}_${p.deadline}_${timeLabel}_0h`,
        targetMs: dlMs,
        windowEndMs: dlMs + 6 * 60 * 60 * 1000,
        title: `🚨 JAM DEADLINE TIBA: [${p.code}] ${p.name}`,
        body: `Sekarang sudah memasuki jam deadline (${timeLabel}) untuk editan "${p.name}" (${p.client})!`
      }
    ];

    milestones.forEach((m) => {
      if (m.targetMs > nowMs + 3000) {
        // Future milestone: schedule at the exact timestamp (H-6h, H-2h, or H-0h)
        toSchedule.push({
          id: notifCounter++,
          title: m.title,
          body: m.body,
          at: new Date(m.targetMs)
        });
      } else if (
        p.deadline === todayStr &&
        nowMs >= m.targetMs &&
        nowMs < m.windowEndMs &&
        !firedMap[m.key]
      ) {
        // Currently inside this deadline window today and hasn't fired yet -> notify immediately!
        firedMap[m.key] = true;
        toSchedule.push({
          id: notifCounter++,
          title: m.title,
          body: m.body,
          at: new Date(Date.now() + 2000 + (notifCounter % 10) * 800)
        });
      }
    });
  });

  saveFiredAlerts(firedMap);

  try {
    if (Capacitor.isNativePlatform()) {
      const granted = await requestNotificationPermission();
      if (!granted) return 0;

      // Cancel previously scheduled 10000..10200 deadline notifications before re-scheduling fresh ones
      try {
        const pending = await LocalNotifications.getPending();
        const oldIds = pending.notifications
          .filter((n) => n.id >= 10000 && n.id < 20000)
          .map((n) => ({ id: n.id }));
        if (oldIds.length > 0) {
          await LocalNotifications.cancel({ notifications: oldIds });
        }
      } catch {
        // ignore cancel error
      }

      if (toSchedule.length > 0) {
        await LocalNotifications.schedule({
          notifications: toSchedule.slice(0, 45).map((item) => ({
            id: item.id,
            title: item.title,
            body: item.body,
            schedule: { at: item.at, allowWhileIdle: true }
          }))
        });
      }
      return toSchedule.length;
    }

    // Web Notification fallback for immediate deadline-day alerts
    if ('Notification' in window && Notification.permission === 'granted') {
      toSchedule
        .filter((item) => item.at.getTime() <= Date.now() + 15000)
        .forEach((item) => {
          new Notification(item.title, { body: item.body });
        });
    }
  } catch (err) {
    console.warn('Failed scheduling native reminders:', err);
  }

  const urgentCount = activeProjects.filter((p) => calculateDueStatus(p).daysLeft <= 3).length;
  return Math.max(toSchedule.length, urgentCount);
}
