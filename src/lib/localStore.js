import { useSyncExternalStore } from 'react';
import { toDateKey, addDays, getMonday } from './dates';
import { DEFAULT_TASK_CATEGORIES, DEFAULT_ROUTINE_STEPS, DEFAULT_WEEK_PLAN } from './constants';

/**
 * Store locale reattivo (localStorage) che replica le shape dei documenti Convex.
 * Usato quando VITE_CONVEX_URL non è configurato: l'app resta pienamente
 * funzionante in modalità demo/offline, con la stessa API degli hook.
 */

const STORAGE_KEY = 'app1_db_v1';
const SEED_FLAG = 'app1_seeded_v1';

export function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// ── Seed dati demo (solo primo avvio, modalità locale) ──

function buildSeed() {
  const today = new Date();
  const t = toDateKey(today);
  const tomorrow = toDateKey(addDays(today, 1));
  const yesterday = toDateKey(addDays(today, -1));
  const weekStart = toDateKey(getMonday(today));

  const plan = DEFAULT_WEEK_PLAN.map((d) => ({ ...d, spuntino: 'Frutta o yogurt' }));

  const metrics = [];
  for (let i = 9; i >= 0; i--) {
    const d = toDateKey(addDays(today, -i * 7));
    metrics.push({
      _id: uid(),
      date: d,
      weightKg: Math.round((54.6 - (9 - i) * 0.17 + Math.random() * 0.2) * 10) / 10,
      heightCm: 165,
    });
  }

  return {
    tasks: [
      { _id: uid(), title: 'Verifica di Chimica — cap. 4 e 5', description: 'Ripassare legami chimici e stechiometria', category: 'Verifica/interrogazione', categoryColor: '#ff375f', date: tomorrow, completed: false, estimatedMinutes: 90, actualMinutes: 0, priority: 1, createdAt: 1 },
      { _id: uid(), title: 'Matematica — es. 1–12 pag. 142', description: '', category: 'Esercizi', categoryColor: '#ffd60a', date: t, completed: false, estimatedMinutes: 45, actualMinutes: 0, priority: 0, createdAt: 2 },
      { _id: uid(), title: 'Storia — studia capitolo "Risorgimento"', description: 'Sintesi + mappe concettuali', category: 'Studiare', categoryColor: '#30d158', date: t, completed: false, estimatedMinutes: 75, actualMinutes: 0, priority: 0, createdAt: 3 },
      { _id: uid(), title: 'Inglese — leggi "The Great Gatsby" cap. 3', description: '', category: 'Leggere', categoryColor: '#66d4cf', date: t, completed: true, estimatedMinutes: 30, actualMinutes: 34, priority: 0, createdAt: 4 },
      { _id: uid(), title: 'Fisica — esercizi su forze e piani inclinati', description: '', category: 'Esercizi', categoryColor: '#ffd60a', date: yesterday, completed: true, estimatedMinutes: 40, actualMinutes: 52, priority: 0, createdAt: 5 },
    ],
    taskCategories: DEFAULT_TASK_CATEGORIES.map((c, i) => ({ _id: uid(), ...c, order: i })),
    routines: [],
    meals: [
      { _id: uid(), date: t, mealType: 'Colazione', description: 'Latte con fiocchi d\'avena e banana', calories: 380, protein: 16, carbs: 62, fat: 8, parsedByAI: true, createdAt: 1 },
      { _id: uid(), date: t, mealType: 'Pranzo', description: '150g petto di pollo alla griglia con 80g riso basmati', calories: 520, protein: 48, carbs: 62, fat: 6, parsedByAI: true, createdAt: 2 },
      { _id: uid(), date: t, mealType: 'Spuntino', description: 'Una mela e una manciata di mandorle', calories: 210, protein: 5, carbs: 24, fat: 11, parsedByAI: false, createdAt: 3 },
    ],
    mealPlans: [{ _id: uid(), weekStart, plan }],
    bodyMetrics: metrics,
    expenses: [
      { _id: uid(), date: t, description: 'Mensa scolastica', amount: 5.5, category: 'Mensa', createdAt: 1 },
      { _id: uid(), date: t, description: 'Autobus', amount: 1.5, category: 'Trasporti', createdAt: 2 },
      { _id: uid(), date: toDateKey(addDays(today, -1)), description: 'Quaderno a righe', amount: 2.2, category: 'Scuola', createdAt: 3 },
      { _id: uid(), date: toDateKey(addDays(today, -2)), description: 'Cinema con amiche', amount: 8.5, category: 'Svago', createdAt: 4 },
    ],
    budgets: [{ _id: uid(), weekStart, budgetAmount: 35 }],
  };
}

// ── Stato ──

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn('[localStore] impossibile leggere lo stato:', err);
  }
  // Prima apertura: seed demo (solo se non mai inizializzato)
  const seeded = localStorage.getItem(SEED_FLAG);
  const state = seeded ? emptyState() : buildSeed();
  localStorage.setItem(SEED_FLAG, '1');
  persist(state);
  return state;
}

function emptyState() {
  return {
    tasks: [],
    taskCategories: [],
    routines: [],
    meals: [],
    mealPlans: [],
    bodyMetrics: [],
    expenses: [],
    budgets: [],
  };
}

function persist(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('[localStore] impossibile salvare lo stato:', err);
  }
}

let state = load();
let snapshot = state;
const listeners = new Set();

export function getState() {
  return snapshot;
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function commit(next) {
  state = next;
  persist(state);
  snapshot = state; // riferimento stabile per useSyncExternalStore
  listeners.forEach((l) => l());
}

function update(fn) {
  commit({ ...state, ...fn(state) });
}

/** Hook: sottoscrizione reattiva all'intero store locale. */
export function useLocalState() {
  return useSyncExternalStore(subscribe, getState, getState);
}

// ── Mutazioni locali (stessa firma delle mutation Convex) ──

export const localMutations = {
  // Tasks
  createTask(fields) {
    const doc = { ...fields, _id: uid(), createdAt: fields.createdAt ?? Date.now() };
    update((s) => ({ tasks: [...s.tasks, doc] }));
    return doc._id;
  },
  updateTask({ id, ...patch }) {
    update((s) => ({
      tasks: s.tasks.map((t) => (t._id === id ? { ...t, ...patch } : t)),
    }));
  },
  removeTask({ id }) {
    update((s) => ({ tasks: s.tasks.filter((t) => t._id !== id) }));
  },
  toggleTask({ id }) {
    update((s) => ({
      tasks: s.tasks.map((t) => (t._id === id ? { ...t, completed: !t.completed } : t)),
    }));
  },
  moveTaskToDate({ id, date }) {
    update((s) => ({ tasks: s.tasks.map((t) => (t._id === id ? { ...t, date } : t)) }));
  },
  addTaskMinutes({ id, minutes }) {
    update((s) => ({
      tasks: s.tasks.map((t) =>
        t._id === id ? { ...t, actualMinutes: Math.round((t.actualMinutes || 0) + minutes) } : t
      ),
    }));
  },
  createCategory(fields) {
    const doc = { ...fields, _id: uid() };
    update((s) => ({ taskCategories: [...s.taskCategories, doc] }));
    return doc;
  },
  // Routine
  saveRoutine({ date, steps, startedAt, completedAt }) {
    update((s) => {
      const existing = s.routines.find((r) => r.date === date);
      const patch = { steps, startedAt, completedAt };
      if (existing) {
        return { routines: s.routines.map((r) => (r.date === date ? { ...r, ...patch } : r)) };
      }
      return { routines: [...s.routines, { _id: uid(), date, ...patch }] };
    });
  },
  // Pasti
  addMeal(fields) {
    const doc = { ...fields, _id: uid(), createdAt: fields.createdAt ?? Date.now() };
    update((s) => ({ meals: [...s.meals, doc] }));
    return doc._id;
  },
  removeMeal({ id }) {
    update((s) => ({ meals: s.meals.filter((m) => m._id !== id) }));
  },
  // Piano pasti
  saveMealPlan({ weekStart, plan }) {
    update((s) => {
      const existing = s.mealPlans.find((p) => p.weekStart === weekStart);
      if (existing) {
        return { mealPlans: s.mealPlans.map((p) => (p.weekStart === weekStart ? { ...p, plan } : p)) };
      }
      return { mealPlans: [...s.mealPlans, { _id: uid(), weekStart, plan }] };
    });
  },
  // Metriche corpo
  addBodyMetric(fields) {
    update((s) => ({
      bodyMetrics: [...s.bodyMetrics, { ...fields, _id: uid() }].sort((a, b) =>
        a.date.localeCompare(b.date)
      ),
    }));
  },
  removeBodyMetric({ id }) {
    update((s) => ({ bodyMetrics: s.bodyMetrics.filter((m) => m._id !== id) }));
  },
  // Wallet
  addExpense(fields) {
    const doc = { ...fields, _id: uid(), createdAt: fields.createdAt ?? Date.now() };
    update((s) => ({ expenses: [...s.expenses, doc] }));
    return doc._id;
  },
  removeExpense({ id }) {
    update((s) => ({ expenses: s.expenses.filter((e) => e._id !== id) }));
  },
  setBudget({ weekStart, budgetAmount }) {
    update((s) => {
      const existing = s.budgets.find((b) => b.weekStart === weekStart);
      if (existing) {
        return { budgets: s.budgets.map((b) => (b.weekStart === weekStart ? { ...b, budgetAmount } : b)) };
      }
      return { budgets: [...s.budgets, { _id: uid(), weekStart, budgetAmount }] };
    });
  },
};
