/**
 * Promemoria / notifiche per eventi e compiti (stile "Promemoria" iOS).
 *
 * Su web/PWA le notifiche locali programmate non esistono: quando l'app è
 * aperta un motore interno controlla ogni 30 secondi i promemoria scaduti e
 * mostra una notifica di sistema (se autorizzata) + un banner in-app.
 * Si chiede il permesso al primo utilizzo (necessario anche su iOS: l'app
 * deve essere installata in home per mostrare notifiche).
 */

export const REMINDER_OPTIONS = [
  { id: 'atTime', label: "All'ora dell'attività", offsetMinutes: 0 },
  { id: '5m', label: '5 min prima', offsetMinutes: 5 },
  { id: '15m', label: '15 min prima', offsetMinutes: 15 },
  { id: '30m', label: '30 min prima', offsetMinutes: 30 },
  { id: '1h', label: '1 ora prima', offsetMinutes: 60 },
  { id: '2h', label: '2 ore prima', offsetMinutes: 120 },
  { id: '9am', label: 'Il giorno del compito 09:00', offsetMinutes: null },
];

export function reminderLabel(reminder) {
  if (!reminder) return '';
  return reminder.label || REMINDER_OPTIONS.find((o) => o.id === reminder.offsetKey)?.label || '';
}

export function canNotify() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export async function requestNotificationPermission() {
  if (!canNotify()) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  try {
    return await Notification.requestPermission();
  } catch {
    return 'unsupported';
  }
}

export function notify({ title, body }) {
  if (!canNotify() || Notification.permission !== 'granted') return false;
  try {
    const n = new Notification(title, {
      body,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: `app1-${Date.now()}`,
      requireInteraction: false,
      silent: false,
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
    return true;
  } catch {
    return false;
  }
}

/** Evento custom interno per il banner in-app. */
export function showInAppToast(title, body) {
  window.dispatchEvent(new CustomEvent('app1-toast', { detail: { title, body, at: Date.now() } }));
}

/** Avvia il motore di controllo promemoria (intervallo in % 30 s). */
export function startReminderEngine(check) {
  const run = () => {
    try {
      check();
    } catch (err) {
      console.warn('[notifiche] errore check promemoria:', err);
    }
  };
  run();
  const id = setInterval(run, 30000);
  return () => clearInterval(id);
}

/**
 * Calcola la data/ora effettiva di un promemoria a partire da data e orario
 * dell'attività. `time` in "HH:mm" (opzionale, se all-day usa 09:00).
 */
export function reminderDateTime(dateKey, time, offsetMinutes) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const [hh, mm] = (time || '09:00').split(':').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1, hh || 9, mm || 0, 0, 0);
  if (offsetMinutes) dt.setMinutes(dt.getMinutes() - offsetMinutes);
  return dt;
}
