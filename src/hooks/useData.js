import { useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { HAS_CONVEX } from '../lib/db';
import { useLocalState, localMutations } from '../lib/localStore';
import { DEFAULT_TASK_CATEGORIES } from '../lib/constants';

/**
 * Layer dati unificato: ogni hook espone { data, isLoading, ...azioni }.
 * - Convex (realtime) quando VITE_CONVEX_URL è configurata
 * - Store locale reattivo altrimenti (modalità demo/offline)
 * Convenzione: data === undefined → caricamento in corso (come Convex).
 */

// ═══════════════════ TAB 1 — SCUOLA ═══════════════════

export function useTasksBetween(startKey, endKey) {
  if (HAS_CONVEX) {
    const data = useQuery(api.tasks.listBetween, { start: startKey, end: endKey });
    return { data, isLoading: data === undefined };
  }
  const state = useLocalState();
  const data = useMemo(() => state.tasks.filter((t) => t.date >= startKey && t.date <= endKey), [state.tasks, startKey, endKey]);
  return { data, isLoading: false };
}

export function useTasks(dateKey) {
  if (HAS_CONVEX) {
    const data = useQuery(api.tasks.listByDate, { date: dateKey });
    const create = useMutation(api.tasks.create);
    const update = useMutation(api.tasks.update);
    const remove = useMutation(api.tasks.remove);
    const toggle = useMutation(api.tasks.toggle);
    const moveToDate = useMutation(api.tasks.moveToDate);
    const addMinutes = useMutation(api.tasks.addActualMinutes);
    return {
      data,
      isLoading: data === undefined,
      createTask: (fields) => create({ completed: false, ...fields }),
      updateTask: (id, patch) => update({ id, ...patch }),
      removeTask: (id) => remove({ id }),
      toggleTask: (id) => toggle({ id }),
      moveTaskToDate: (id, date) => moveToDate({ id, date }),
      addTaskMinutes: (id, minutes) => addMinutes({ id, minutes }),
    };
  }

  const state = useLocalState();
  const data = useMemo(
    () =>
      state.tasks
        .filter((t) => t.date === dateKey)
        .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)),
    [state.tasks, dateKey]
  );
  return {
    data,
    isLoading: false,
    createTask: (fields) => localMutations.createTask({ completed: false, ...fields }),
    updateTask: (id, patch) => localMutations.updateTask({ id, ...patch }),
    removeTask: (id) => localMutations.removeTask({ id }),
    toggleTask: (id) => localMutations.toggleTask({ id }),
    moveTaskToDate: (id, date) => localMutations.moveTaskToDate({ id, date }),
    addTaskMinutes: (id, minutes) => localMutations.addTaskMinutes({ id, minutes }),
  };
}

export function useTaskCategories() {
  if (HAS_CONVEX) {
    const raw = useQuery(api.tasks.listCategories, {});
    const ensureDefaults = useMutation(api.tasks.ensureDefaultCategories);
    const seededRef = useRef(false);

    useEffect(() => {
      if (!seededRef.current && raw !== undefined && raw.length === 0) {
        seededRef.current = true;
        ensureDefaults({});
      }
    }, [raw, ensureDefaults]);

    const data = useMemo(() => {
      const base = raw ?? [];
      const custom = base.filter((c) => !DEFAULT_TASK_CATEGORIES.some((d) => d.name === c.name));
      const defaults = DEFAULT_TASK_CATEGORIES.map((d) => ({
        ...d,
        _id: d.name,
        ...base.find((c) => c.name === d.name),
      }));
      return [...defaults, ...custom].sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
    }, [raw]);

    const createCategoryMutation = useMutation(api.tasks.createCategory);
    return { data, isLoading: raw === undefined, createCategory: (name, color) => createCategoryMutation({ name, color, order: data.length }) };
  }

  const state = useLocalState();
  const data = useMemo(() => {
    const custom = state.taskCategories.filter(
      (c) => !DEFAULT_TASK_CATEGORIES.some((d) => d.name === c.name)
    );
    const defaults = DEFAULT_TASK_CATEGORIES.map((d, i) => ({
      ...d,
      _id: d.name,
      order: i,
    }));
    return [...defaults, ...custom].sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
  }, [state.taskCategories]);
  return { data, isLoading: false, createCategory: (name, color) => localMutations.createCategory({ name, color, order: data.length }) };
}

// ═══════════════════ TAB 2 — ROUTINE ═══════════════════

export function useRoutine(dateKey) {
  if (HAS_CONVEX) {
    const data = useQuery(api.routines.getByDate, { date: dateKey });
    const save = useMutation(api.routines.save);
    return { data: data ?? null, isLoading: data === undefined, saveRoutine: save };
  }

  const state = useLocalState();
  const data = useMemo(() => state.routines.find((r) => r.date === dateKey) ?? null, [state.routines, dateKey]);
  return { data, isLoading: false, saveRoutine: localMutations.saveRoutine };
}

// ═══════════════════ TAB 3 — NUTRIZIONE ═══════════════════

export function useMeals(dateKey) {
  if (HAS_CONVEX) {
    const data = useQuery(api.meals.listByDate, { date: dateKey });
    const add = useMutation(api.meals.add);
    const remove = useMutation(api.meals.remove);
    return {
      data,
      isLoading: data === undefined,
      addMeal: (fields) => add(fields),
      removeMeal: (id) => remove({ id }),
    };
  }

  const state = useLocalState();
  const data = useMemo(
    () => state.meals.filter((m) => m.date === dateKey).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)),
    [state.meals, dateKey]
  );
  return { data, isLoading: false, addMeal: localMutations.addMeal, removeMeal: (id) => localMutations.removeMeal({ id }) };
}

export function useMealPlan(weekStartKey) {
  if (HAS_CONVEX) {
    const data = useQuery(api.mealPlan.getByWeek, { weekStart: weekStartKey });
    const save = useMutation(api.mealPlan.save);
    return { data: data ?? null, isLoading: data === undefined, savePlan: (plan) => save({ weekStart: weekStartKey, plan }) };
  }

  const state = useLocalState();
  const data = useMemo(
    () => state.mealPlans.find((p) => p.weekStart === weekStartKey) ?? null,
    [state.mealPlans, weekStartKey]
  );
  return { data, isLoading: false, savePlan: (plan) => localMutations.saveMealPlan({ weekStart: weekStartKey, plan }) };
}

export function useBodyMetrics() {
  if (HAS_CONVEX) {
    const raw = useQuery(api.bodyMetrics.listAll, {});
    const add = useMutation(api.bodyMetrics.add);
    const remove = useMutation(api.bodyMetrics.remove);
    const data = useMemo(() => (raw ?? []).slice().sort((a, b) => a.date.localeCompare(b.date)), [raw]);
    return { data, isLoading: raw === undefined, addMetric: add, removeMetric: (id) => remove({ id }) };
  }

  const state = useLocalState();
  const data = useMemo(() => state.bodyMetrics.slice().sort((a, b) => a.date.localeCompare(b.date)), [state.bodyMetrics]);
  return { data, isLoading: false, addMetric: localMutations.addBodyMetric, removeMetric: (id) => localMutations.removeBodyMetric({ id }) };
}

// ═══════════════════ TAB 4 — WALLET ═══════════════════

export function useExpenses(startKey, endKey) {
  if (HAS_CONVEX) {
    const data = useQuery(api.wallet.listExpensesBetween, { start: startKey, end: endKey });
    const add = useMutation(api.wallet.addExpense);
    const remove = useMutation(api.wallet.removeExpense);
    return {
      data,
      isLoading: data === undefined,
      addExpense: (fields) => add(fields),
      removeExpense: (id) => remove({ id }),
    };
  }

  const state = useLocalState();
  const data = useMemo(
    () =>
      state.expenses
        .filter((e) => e.date >= startKey && e.date <= endKey)
        .sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || 0) - (a.createdAt || 0)),
    [state.expenses, startKey, endKey]
  );
  return { data, isLoading: false, addExpense: localMutations.addExpense, removeExpense: (id) => localMutations.removeExpense({ id }) };
}

export function useBudget(weekStartKey) {
  if (HAS_CONVEX) {
    const data = useQuery(api.wallet.getBudget, { weekStart: weekStartKey });
    const set = useMutation(api.wallet.setBudget);
    return { data: data ?? null, isLoading: data === undefined, setBudget: (amount) => set({ weekStart: weekStartKey, budgetAmount: amount }) };
  }

  const state = useLocalState();
  const data = useMemo(
    () => state.budgets.find((b) => b.weekStart === weekStartKey) ?? null,
    [state.budgets, weekStartKey]
  );
  return { data, isLoading: false, setBudget: (amount) => localMutations.setBudget({ weekStart: weekStartKey, budgetAmount: amount }) };
}
