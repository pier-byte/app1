import { useSyncExternalStore } from 'react';

/**
 * RoutineSession — store singleton della sessione routine "a scorrimento".
 * Registra i tempi effettivi di ogni step e sopravvive ai cambi tab/reload.
 *
 * steps: [{ name, targetMinutes, actualSeconds, status: 'pending'|'active'|'done' }]
 */

const STORAGE_KEY = 'app1_routine_session_v1';

function blank() {
  return {
    dateKey: null,
    routineId: null,
    routineName: null,
    routineEmoji: null,
    routineIcon: null,
    steps: [],
    currentIndex: 0,
    status: 'idle', // idle | running | paused | done
    stepSeconds: 0,
    segmentStart: null,
    startedAt: null,
    completedAt: null,
  };
}

let internal = blank();
let snapshot = { ...internal };
let interval = null;
const listeners = new Set();

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(internal));
  } catch { /* ignora */ }
}

function notify() {
  snapshot = { ...internal };
  persist();
  listeners.forEach((l) => l());
}

function tick() {
  if (internal.status === 'running' && internal.segmentStart) {
    internal.stepSeconds = Math.floor((Date.now() - internal.segmentStart) / 1000);
    snapshot = { ...internal };
    listeners.forEach((l) => l());
  }
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
  if (raw && JSON.parse(raw).status !== 'idle') {
    const saved = JSON.parse(raw);
    internal = { ...saved, status: saved.status === 'running' ? 'paused' : saved.status, segmentStart: null };
  }
} catch { /* ignora */ }
notify();

export const routineSession = {
  /** Avvia una nuova sessione per la data indicata (template = scheda routine). */
  begin(dateKey, stepTemplates, meta = {}) {
    internal = {
      ...blank(),
      dateKey,
      routineId: meta.routineId ?? null,
      routineName: meta.routineName ?? null,
      routineEmoji: meta.routineEmoji ?? null,
      routineIcon: meta.routineIcon ?? null,
      startedAt: new Date().toISOString(),
      currentIndex: 0,
      status: 'running',
      segmentStart: Date.now(),
      stepSeconds: 0,
      steps: stepTemplates.map((s, i) => ({
        name: s.name,
        targetMinutes: s.targetMinutes,
        actualSeconds: 0,
        completed: false,
        status: i === 0 ? 'active' : 'pending',
      })),
    };
    ensureInterval();
    notify();
  },
  pause() {
    if (internal.status !== 'running') return;
    internal.status = 'paused';
    internal.segmentStart = null;
    clearIntervalIfNeeded();
    notify();
  },
  resume() {
    if (internal.status !== 'paused') return;
    internal.status = 'running';
    internal.segmentStart = Date.now();
    ensureInterval();
    notify();
  },
  goTo(index) {
    if (index < 0 || index >= internal.steps.length) return;
    // Chiudi lo step corrente senza completarlo (mantiene i secondi trascorsi)
    const current = internal.steps[internal.currentIndex];
    if (current && current.status === 'active') {
      current.actualSeconds = Math.max(current.actualSeconds, internal.stepSeconds);
      current.status = 'pending';
    }
    internal.currentIndex = index;
    internal.stepSeconds = 0;
    internal.segmentStart = internal.status === 'running' ? Date.now() : null;
    internal.steps[index].status = 'active';
    notify();
  },
  /** Completa lo step corrente e passa al successivo (auto-scroll del "timer a scorrimento"). */
  completeStep() {
    const step = internal.steps[internal.currentIndex];
    if (!step) return null;
    step.actualSeconds = Math.max(step.actualSeconds, internal.stepSeconds);
    step.status = 'done';
    step.completed = true;

    const nextIndex = internal.currentIndex + 1;
    if (nextIndex >= internal.steps.length) {
      internal.status = 'done';
      internal.completedAt = new Date().toISOString();
      clearIntervalIfNeeded();
      notify();
      return 'done';
    }
    internal.currentIndex = nextIndex;
    internal.stepSeconds = 0;
    internal.segmentStart = internal.status === 'running' ? Date.now() : null;
    internal.steps[nextIndex].status = 'active';
    notify();
    return nextIndex;
  },
  /**
   * "Concludi Routine": termina subito la sessione salvando i progressi.
   * Lo step in corso viene chiuso registrando i secondi effettivi e segnato
   * done; gli step mai avviati restano pending (quindi non completati).
   * Imposta status='done' + completedAt → la pagina salva su DB e mostra
   * il riepilogo con il flash "Routine salvata".
   */
  finishEarly() {
    if (internal.status === 'idle' || internal.status === 'done') return;
    const step = internal.steps[internal.currentIndex];
    if (step && step.status === 'active') {
      step.actualSeconds = Math.max(step.actualSeconds || 0, internal.stepSeconds || 0);
      step.status = 'done';
      step.completed = true;
    }
    internal.status = 'done';
    internal.completedAt = new Date().toISOString();
    internal.segmentStart = null;
    clearIntervalIfNeeded();
    notify();
  },
  /** Ripristina una sessione già completata (RIpeti). */
  reset() {
    internal = blank();
    clearIntervalIfNeeded();
    notify();
  },
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot() {
    return snapshot;
  },
};

/** Hook React: snapshot reattivo della sessione routine. */
export function useRoutineSession() {
  return useSyncExternalStore(routineSession.subscribe, routineSession.getSnapshot, routineSession.getSnapshot);
}
