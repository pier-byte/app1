import { useSyncExternalStore } from 'react';
import { toDateKey, formatSeconds } from '../lib/dates';

/**
 * StudioTimer — store singleton del timer di studio.
 * Sopravvive ai cambi tab e al reload della pagina (localStorage),
 * conta in avanti dalla partenza (finestra 15:00–20:00).
 *
 * Stati: idle → running ⇄ paused → (stop) → idle
 */

const STORAGE_KEY = 'app1_study_timer_v1';

let internal = { status: 'idle', baseSeconds: 0, segmentStart: null, dateKey: null };
let snapshot = { ...internal, seconds: 0 };
let interval = null;
const listeners = new Set();

function computeSeconds() {
  const live = internal.status === 'running' && internal.segmentStart
    ? Math.floor((Date.now() - internal.segmentStart) / 1000)
    : 0;
  return internal.baseSeconds + live;
}

function notify() {
  snapshot = { ...internal, seconds: computeSeconds() };
  persist();
  listeners.forEach((l) => l());
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...internal, savedAt: Date.now() }));
  } catch { /* spazio esaurito: ignora */ }
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

// Ripristino dopo reload (solo se della giornata corrente)
try {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    const saved = JSON.parse(raw);
    if (saved.dateKey === toDateKey(new Date()) && saved.status !== 'idle') {
      // Riparte in pausa (non riprende da solo il conteggio)
      let base = saved.baseSeconds || 0;
      if (saved.status === 'running' && saved.segmentStart) {
        base += Math.floor((Date.now() - saved.segmentStart) / 1000);
      }
      internal = { status: 'paused', baseSeconds: base, segmentStart: null, dateKey: saved.dateKey };
    }
  }
} catch { /* ignora */ }
notify();

export const studyTimer = {
  start(dateKey) {
    internal = { status: 'running', baseSeconds: 0, segmentStart: Date.now(), dateKey };
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
  /** Termina la sessione e restituisce i secondi totali. */
  stop() {
    const total = computeSeconds();
    internal = { status: 'idle', baseSeconds: 0, segmentStart: null, dateKey: null };
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

/** Hook React: snapshot reattivo del timer di studio. */
export function useStudyTimer() {
  return useSyncExternalStore(studyTimer.subscribe, studyTimer.getSnapshot, studyTimer.getSnapshot);
}

export { formatSeconds };
