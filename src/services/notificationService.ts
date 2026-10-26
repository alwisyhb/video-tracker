import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { calculateDueStatus, formatRupiah } from '../constants';
import type { VideoProject } from '../types';

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
  const title = '🎬 Pengingat Alwi Video Tracker';
  const body =
    urgentCount > 0
      ? `Ada ${urgentCount} proyek butuh perhatian segera! Total piutang belum cair: ${formatRupiah(unpaidTotal)}.`
      : `Semua jadwal terkendali! Total fee menunggu pencairan: ${formatRupiah(unpaidTotal)}.`;

  try {
    if (Capacitor.isNativePlatform()) {
      const granted = await requestNotificationPermission();
      if (!granted) return false;
      await LocalNotifications.schedule({
        notifications: [
          {
            id: Math.floor(Date.now() % 100000),
            title,
            body,
            schedule: { at: new Date(Date.now() + 1500) }
          }
        ]
      });
      return true;
    }

    if ('Notification' in window) {
      const granted = await requestNotificationPermission();
      if (granted) {
        new Notification(title, {
          body
        });
        return true;
      }
    }
  } catch (err) {
    console.warn('Failed to send notification:', err);
  }
  return false;
}

export async function scheduleProjectReminders(projects: VideoProject[]): Promise<number> {
  const activeUrgent = projects.filter((p) => {
    if (p.status === 'Selesai' || p.reminderEnabled === false) return false;
    const due = calculateDueStatus(p);
    return due.daysLeft <= 3;
  });

  try {
    if (Capacitor.isNativePlatform()) {
      const granted = await requestNotificationPermission();
      if (!granted) return 0;

      const notifications = activeUrgent.slice(0, 10).map((p, idx) => {
        const due = calculateDueStatus(p);
        return {
          id: 1000 + idx,
          title: `${due.label}: [${p.code}] ${p.name}`,
          body: `Klien: ${p.client} • Tahap: ${p.stage} • Tenggat: ${p.deadline}${p.deadlineTime ? ` (${p.deadlineTime})` : ''}`,
          schedule: { at: new Date(Date.now() + (idx + 1) * 2500) }
        };
      });

      if (notifications.length > 0) {
        await LocalNotifications.schedule({ notifications });
      }
      return notifications.length;
    }
  } catch (err) {
    console.warn('Failed scheduling native reminders:', err);
  }

  return activeUrgent.length;
}
