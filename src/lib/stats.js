/**
 * stats.js — Funzioni pure per la dashboard analytics del Profilo.
 * Nessuna dipendenza da React/Convex: facili da testare in isolamento
 * (dom-test). Tutti i documenti arrivano già filtrati sul periodo.
 */

/** Minutes → "1 h 05" / "45 min" */
export function formatDuration(totalMinutes) {
  const m = Math.max(0, Math.round(totalMinutes || 0));
  if (m === 0) return '0 min';
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (h === 0) return `${rest} min`;
  if (rest === 0) return `${h} h`;
  return `${h} h ${String(rest).padStart(2, '0')}`;
}

/** Minutes → "6,4" (ore con una decimale, virgola italiana) */
export function minutesToHoursLabel(totalMinutes) {
  return ((totalMinutes || 0) / 60).toFixed(1).replace('.', ',');
}

/**
 * Ripartizione delle ore di studio per tipologia di attività.
 * tasks: [{ category, categoryColor, actualMinutes }]
 * → { totalMinutes, rows: [{ name, color, minutes, pct }] } ordinate per minuti desc
 */
export function studyByCategory(tasks = []) {
  const map = new Map();
  for (const t of tasks) {
    const minutes = Math.max(0, Math.round(t.actualMinutes || 0));
    if (!minutes) continue;
    const name = t.category || 'Altro';
    const entry = map.get(name) || { name, color: t.categoryColor || '#2997ff', minutes: 0 };
    entry.minutes += minutes;
    if (!entry.colorCustom && t.categoryColor) entry.color = t.categoryColor;
    map.set(name, entry);
  }
  const totalMinutes = [...map.values()].reduce((s, r) => s + r.minutes, 0);
  const rows = [...map.values()]
    .sort((a, b) => b.minutes - a.minutes)
    .map((r) => ({ ...r, pct: totalMinutes > 0 ? Math.round((r.minutes / totalMinutes) * 100) : 0 }));
  return { totalMinutes, rows };
}

/**
 * Statistiche allenamenti (sessioni routine salvate) nel periodo.
 * routines: [{ steps:[{ targetMinutes, actualSeconds, completed }], completedAt }]
 * → { total, completed, totalMinutes, perWeek } (perWeek su `daysInPeriod`)
 */
export function workoutStats(routines = [], daysInPeriod = 7) {
  const completed = routines.filter((r) => !!r.completedAt || (r.steps || []).some((s) => s.completed));
  const totalMinutes = Math.round(
    completed.reduce(
      (sum, r) => sum + (r.steps || []).reduce((s, st) => s + (st.actualSeconds || (st.targetMinutes || 0) * 60), 0),
      0
    ) / 60
  );
  const weeks = Math.max(1, daysInPeriod / 7);
  return {
    total: routines.length,
    completed: completed.length,
    totalMinutes,
    perWeek: Math.round((completed.length / weeks) * 10) / 10,
  };
}

/**
 * Bilancio wallet nel periodo (il modulo Wallet registra solo uscite;
 * il "bilancio" è il budget settimanale meno le uscite).
 * → { spent, movements, budgetAmount, remaining, usedPct }
 */
export function walletSummary(expenses = [], budgetAmount = 0) {
  const spent = Math.round(expenses.reduce((s, e) => s + (e.amount || 0), 0) * 100) / 100;
  const remaining = Math.round((budgetAmount - spent) * 100) / 100;
  const usedPct = budgetAmount > 0 ? Math.min(100, Math.round((spent / budgetAmount) * 100)) : 0;
  return { spent, movements: expenses.length, budgetAmount, remaining, usedPct };
}

/**
 * Aderenza alimentare: giorno "on target" se le kcal registrate raggiungono
 * almeno il 95% dell'obiettivo (criterio permissivo, senza pH millimetrico).
 * meals: [{ date, calories }] —qualsiasi pasto registrato rende il giorno tracciato.
 * → { daysTracked, daysOnTarget, pct, days: [{ date, kcal, ok }] } ordinate per data
 */
export const ADHERENCE_THRESHOLD = 0.95;

export function nutritionAdherence(meals = [], targetKcal = 0) {
  const byDay = new Map();
  for (const m of meals) {
    if (!m.date) continue;
    byDay.set(m.date, (byDay.get(m.date) || 0) + (m.calories || 0));
  }
  const days = [...byDay.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, kcal]) => ({
      date,
      kcal: Math.round(kcal),
      ok: targetKcal > 0 && kcal >= targetKcal * ADHERENCE_THRESHOLD,
    }));
  const daysTracked = days.length;
  const daysOnTarget = days.filter((d) => d.ok).length;
  return {
    daysTracked,
    daysOnTarget,
    pct: daysTracked > 0 ? Math.round((daysOnTarget / daysTracked) * 100) : 0,
    days,
  };
}
