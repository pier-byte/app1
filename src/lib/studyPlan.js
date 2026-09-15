import { addDays, toDateKey } from './dates';

/**
 * Logica pura del "Carico di Studio" (giornata di studio ≠ scadenza):
 * - `isAssignedToStudyDay`: un'attività appartiene al carico del giorno D se
 *   è pianificata esplicitamente lì (`studyDate === D`) oppure se scade in D
 *   e non è stata pianificata altrove (comportamento "auto");
 * - `collectStudyTasks`: estrae da una Map<dateKey, task[]> il carico di D
 *   (deduplicato, senza occorrenze virtuali legacy);
 * - `buildUpcomingGroups`: raggruppa le scadenze non completate da D a D+N
 *   per il selettore "Pianifica attività".
 */

export function isAssignedToStudyDay(task, dateKey) {
  if (!task) return false;
  return task.studyDate === dateKey || (!task.studyDate && task.date === dateKey);
}

export function collectStudyTasks(tasksByDate, dateKey) {
  const out = [];
  const seen = new Set();
  tasksByDate?.forEach?.((items) => {
    for (const t of items ?? []) {
      if (!t || t.virtual) continue; // le occorrenze legacy si materializzano all'uso
      if (!isAssignedToStudyDay(t, dateKey)) continue;
      const id = t.instanceId ?? t._id;
      if (seen.has(id)) continue;
      seen.add(id);
      out.push(t);
    }
  });
  return out.sort(
    (a, b) =>
      Number(a.completed) - Number(b.completed) ||
      String(a.startTime || '').localeCompare(String(b.startTime || ''))
  );
}

export function buildUpcomingGroups(tasksByDate, fromDate, days = 14) {
  const groups = [];
  const base = typeof fromDate === 'string' ? fromDate : toDateKey(fromDate);
  for (let i = 0; i <= days; i++) {
    const key = toDateKey(addDays(new Date(`${base}T12:00:00`), i));
    const items = [...(tasksByDate?.get?.(key) ?? [])]
      .filter((t) => t && !t.completed)
      .sort((a, b) => String(a.startTime || '').localeCompare(String(b.startTime || '')));
    if (items.length) groups.push({ key, items });
  }
  return groups;
}

/** Minuti stimati totali delle attività ancora aperte del carico. */
export function studyLoadMinutes(studyTasks = []) {
  return studyTasks.filter((t) => !t.completed).reduce((s, t) => s + (t.estimatedMinutes || 0), 0);
}
