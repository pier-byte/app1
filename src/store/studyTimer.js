import { useSyncExternalStore } from 'react';
import { toDateKey, formatSeconds } from '../lib/dates';

/**
 * StudioTimer — store singleton del timer di studio flessibile e multi-sessione.
 * Supporta configurazione libera dell'orario di fine sessione (es. 17:30, 20:00).
 * Calcola sia il tempo trascorso dall'avvio della sessione corrente,
 * sia il tempo rimanente al raggiungimento dell'orario di fine.
 *
 * Stati: idle → running ⇄ paused → (stop) → idle
 */

const STORAGE_KEY = 'app1_study_timer_v2';

const pad = (n) => String(n).padStart(2, '0');

function defaultEndTimeStr() {
  const d = new Date(Date.now() + 90 * 60 * 1000); // default 1h30m da adesso
  // arrotonda ai 5 minuti successivi
  const rem = d.getMinutes() % 5;
  if (rem > 0) d.setMinutes(d.getMinutes() + (5 - rem));
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

let internal = {
  status: 'idle',
  baseSeconds: 0,
  segmentStart: null,
  dateKey: null,
  targetEndTime: defaultEndTimeStr(),
  sessionStart: null,
};

let snapshot = { ...internal, seconds: 0, remainingSeconds: 0 };
let interval = null;
const listeners = new Set();

function computeSeconds() {
  const live = internal.status === 'running' && internal.segmentStart
    ? Math.floor((Date.now() - internal.segmentStart) / 1000)
    : 0;
  return internal.baseSeconds + live;
}

function computeRemainingSeconds(targetTimeStr) {
  if (!targetTimeStr) return 0;
  const [h, m] = targetTimeStr.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;

  const targetDate = new Date();
  targetDate.setHours(h, m, 0, 0);

  // Se l'orario di fine è già passato rispetto alla mezzanotte/inizio ma siamo in sessione notturna
  const now = Date.now();
  let diffMs = targetDate.getTime() - now;
  if (diffMs < -12 * 60 * 60 * 1000) {
    // Probabilmente il target è domani
    targetDate.setDate(targetDate.getDate() + 1);
    diffMs = targetDate.getTime() - now;
  }

  return Math.max(0, Math.floor(diffMs / 1000));
}

function notify() {
  const secs = computeSeconds();
  const remSecs = computeRemainingSeconds(internal.targetEndTime);
  snapshot = {
    ...internal,
    seconds: secs,
    remainingSeconds: remSecs,
  };
  persist();
  listeners.forEach((l) => l());
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...internal, savedAt: Date.now() }));
  } catch { /* ignora */ }
}

function tick() {
  notify();
}

function ensureInterval() {
  if (!interval) interval = setInterval(tick, 500);
}

function clearIntervalIfNeeded() {
  if (interval && internal.status !== 'running') {
    clearInterval(interval);
    interval = null;
  }
}

// Ripristino dopo reload
try {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    const saved = JSON.parse(raw);
    if (saved.dateKey === toDateKey(new Date()) && saved.status !== 'idle') {
      let base = saved.baseSeconds || 0;
      if (saved.status === 'running' && saved.segmentStart) {
        base += Math.floor((Date.now() - saved.segmentStart) / 1000);
      }
      internal = {
        status: 'paused',
        baseSeconds: base,
        segmentStart: null,
        dateKey: saved.dateKey,
        targetEndTime: saved.targetEndTime || defaultEndTimeStr(),
        sessionStart: saved.sessionStart || null,
      };
    } else if (saved.targetEndTime) {
      internal.targetEndTime = saved.targetEndTime;
    }
  }
} catch { /* ignora */ }
notify();

export const studyTimer = {
  start(dateKey, customEndTime) {
    const now = Date.now();
    const end = customEndTime || internal.targetEndTime || defaultEndTimeStr();
    internal = {
      status: 'running',
      baseSeconds: 0,
      segmentStart: now,
      dateKey: dateKey || toDateKey(new Date()),
      targetEndTime: end,
      sessionStart: now,
    };
    ensureInterval();
    notify();
  },
  pause() {
    if (internal.status !== 'running') return;
    internal.baseSeconds = computeSeconds();
    internal.segmentStart = null;
    internal.status = 'paused';
    clearIntervalIfNeeded();
    notify();
  },
  resume() {
    if (internal.status !== 'paused') return;
    internal.segmentStart = Date.now();
    internal.status = 'running';
    ensureInterval();
    notify();
  },
  setTargetEndTime(timeStr) {
    if (!timeStr) return;
    internal.targetEndTime = timeStr;
    notify();
  },
  extendMinutes(minutes) {
    const [h, m] = (internal.targetEndTime || defaultEndTimeStr()).split(':').map(Number);
    const d = new Date();
    d.setHours(h, m + minutes, 0, 0);
    internal.targetEndTime = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    notify();
  },
  stop() {
    const total = computeSeconds();
    internal = {
      status: 'idle',
      baseSeconds: 0,
      segmentStart: null,
      dateKey: null,
      targetEndTime: internal.targetEndTime,
      sessionStart: null,
    };
    clearIntervalIfNeeded();
    notify();
    return total;
  },
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot() {
    return snapshot;
  },
};

export function useStudyTimer() {
  return useSyncExternalStore(studyTimer.subscribe, studyTimer.getSnapshot, studyTimer.getSnapshot);
}

export { formatSeconds };
