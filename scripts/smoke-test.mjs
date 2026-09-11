/**
 * Smoke test di rendering: monta l'intero albero React (PIN gate → App shell →
 * 4 pagine) con react-dom/server tramite ssrLoadModule di Vite.
 * Intercetta errori runtime (import sbagliati, hook violations, undefined).
 */
import { createServer } from 'vite';
import React from 'react';
import { renderToString } from 'react-dom/server';

// Polyfill minimi per l'ambiente Node (nel browser esistono nativamente)
const memStore = new Map();
if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = {
    getItem: (k) => (memStore.has(k) ? memStore.get(k) : null),
    setItem: (k, v) => memStore.set(k, String(v)),
    removeItem: (k) => memStore.delete(k),
  };
}

const vite = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
});

const results = [];

// 1) App completa (in SSR il gate mostra lo spinner: useEffect non gira;
//    nel browser passa poi al PIN screen)
try {
  const { default: App } = await vite.ssrLoadModule('/src/App.jsx');
  const html = renderToString(React.createElement(App));
  if (html.length < 100) throw new Error('output troppo corto');
  if (!html.includes('bg-canvas')) throw new Error('shell non renderizzata');
  results.push(['App (shell + gate SSR)', true, `${html.length} bytes`]);
} catch (err) {
  results.push(['App (shell + gate SSR)', false, err.message]);
}

// 2) Ogni pagina singolarmente (bypass del gate)
const noop = () => {};
const pages = [
  ['SchoolPage', { selectedDate: new Date(), weekDates: [new Date()], weekLabel: 'test', goToPrevWeek: noop, goToNextWeek: noop, goToToday: noop, onSelectDate: noop }],
  ['CalendarPage', { selectedDate: new Date(), selectDate: noop, mode: 'month', setMode: noop, goPrev: noop, goNext: noop, goToToday: noop, weekDates: [new Date()], weekLabel: 'test', goToPrevWeek: noop, goToNextWeek: noop, onOpenTasks: noop }],
  ['RoutinePage', { selectedDate: new Date() }],
  ['NutritionPage', { selectedDate: new Date() }],
  ['NotesPage', {}],
  ['WalletPage', { selectedDate: new Date(), weekDates: [] }],
];

for (const [name, props] of pages) {
  try {
    const mod = await vite.ssrLoadModule(`/src/pages/${name}.jsx`);
    const html = renderToString(React.createElement(mod.default, props));
    if (html.length < 100) throw new Error('output troppo corto');
    results.push([name, true, `${html.length} bytes`]);
  } catch (err) {
    results.push([name, false, err.message]);
  }
}

// 3) Componenti chiave isolati
const units = [
  ['WeekStrip', '/src/components/layout/WeekStrip.jsx', { weekDates: [new Date()], selectedDate: new Date(), weekLabel: 'test', onSelectDate: () => {}, onPrevWeek: () => {}, onNextWeek: () => {}, onToday: () => {} }],
  ['BottomNav', '/src/components/layout/BottomNav.jsx', { activeTab: 'scuola', onTabChange: () => {} }],
  ['StudyTimerCard', '/src/components/school/StudyTimerCard.jsx', { selectedDate: new Date(), tasks: [], onAssignMinutes: () => {} }],
  ['TaskFormSheet (chiuso)', '/src/components/school/TaskFormSheet.jsx', { isOpen: false, onClose: () => {}, onSave: () => {}, defaultDate: '2026-09-04', categories: [{ _id: 'a', name: 'Studiare', color: '#30d158' }] }],
  ['NoteEditorSheet (chiuso)', '/src/components/notes/NoteEditorSheet.jsx', { isOpen: false, onClose: () => {}, onSave: () => {}, onDelete: null }],
  ['GoalPlannerDialog (chiuso)', '/src/components/nutrition/GoalPlannerDialog.jsx', { isOpen: false, onClose: () => {}, onApply: () => {}, initial: null }],
  ['WeeklyPlanTable', '/src/components/nutrition/WeeklyPlanTable.jsx', { plan: [{ day: 'Lunedì', colazione: 'a', pranzo: 'b', cena: 'c' }], onUpdatePlan: () => {} }],
  ['MetricsCharts', '/src/components/nutrition/MetricsCharts.jsx', { metrics: [{ date: '2026-09-01', weightKg: 54, heightCm: 165 }], onAdd: () => {} }],
  ['ExpenseFormSheet (chiuso)', '/src/components/wallet/ExpenseFormSheet.jsx', { isOpen: false, onClose: () => {}, onSave: () => {}, defaultDate: '2026-09-04' }],
  ['MonthGrid', '/src/components/calendar/MonthGrid.jsx', { selectedDate: new Date(), onSelectDate: () => {} }],
  ['DaySheet (aperto)', '/src/components/calendar/DaySheet.jsx', { date: new Date(), onClose: () => {}, onEditFull: () => {}, categories: [{ name: 'Studiare', color: '#30d158' }] }],
  ['IconPicker', '/src/components/routine/IconPicker.jsx', { value: 'Dumbbell', onChange: () => {} }],
  ['RepeatPicker', '/src/components/school/RepeatPicker.jsx', { repeat: { frequency: 'weekly', weekdays: [2, 4, 5], endMode: 'after', endAfter: 4 }, onChange: () => {}, baseDate: '2026-09-07' }],
];

for (const [name, path, props] of units) {
  try {
    const mod = await vite.ssrLoadModule(path);
    const Comp = mod.default ?? mod.Dialog;
    const html = renderToString(React.createElement(Comp, props));
    results.push([name, true, `${html.length} bytes`]);
  } catch (err) {
    results.push([name, false, err.message]);
  }
}

// 4) Gemini module (senza API key: non deve crashare)
try {
  const g = await vite.ssrLoadModule('/src/lib/gemini.js');
  const est = await g.estimateStudyTime('Verifica matematica', 'Verifica');
  const food = await g.parseFoodInput('150g pollo');
  if (est !== null || food !== null) throw new Error('dovrebbe restituire null senza API key');
  results.push(['gemini.js graceful-degradation', true, 'null senza key ✓']);
} catch (err) {
  results.push(['gemini.js graceful-degradation', false, err.message]);
}

// 5) Logica ripetizioni: calcolo occorrenze + spostamento promemoria
try {
  const r = await vite.ssrLoadModule('/src/lib/repeat.js');
  const assert = (cond, msg) => { if (!cond) throw new Error(msg); };
  // Settimanale Mar/Gio/Ven, 4 volte da lun 07-09 → base + 08/10/11
  const weekly = r.computeOccurrenceDates('2026-09-07', { frequency: 'weekly', weekdays: [2, 4, 5], endMode: 'after', endAfter: 4 });
  assert(JSON.stringify(weekly) === JSON.stringify(['2026-09-07', '2026-09-08', '2026-09-10', '2026-09-11']), `weekly errato: ${weekly}`);
  // Giornaliera con data di fine
  const daily = r.computeOccurrenceDates('2026-09-01', { frequency: 'daily', endMode: 'on', endDate: '2026-09-03' });
  assert(JSON.stringify(daily) === JSON.stringify(['2026-09-01', '2026-09-02', '2026-09-03']), `daily errato: ${daily}`);
  // Mensile senza deriva (31 gen → 28 feb → 31 mar)
  const monthly = r.computeOccurrenceDates('2026-01-31', { frequency: 'monthly', endMode: 'after', endAfter: 3 });
  assert(JSON.stringify(monthly) === JSON.stringify(['2026-01-31', '2026-02-28', '2026-03-31']), `monthly errato: ${monthly}`);
  // Senza fine → finestra di 365 giorni
  const never = r.computeOccurrenceDates('2026-09-07', { frequency: 'daily', endMode: 'never' });
  assert(never.length === 365 && never[0] === '2026-09-07', `never errato: ${never.length}`);
  // Senza regola → solo la base
  assert(JSON.stringify(r.computeOccurrenceDates('2026-09-07', { frequency: 'none' })) === '["2026-09-07"]', 'none errato');
  // Promemoria spostati di data (stessa ora locale, notified azzerato)
  const at = new Date(2026, 8, 7, 9, 0, 0).toISOString();
  const shifted = r.shiftRemindersForDate([{ at, label: 'x', notified: true }], '2026-09-08');
  const sd = new Date(shifted[0].at);
  assert(sd.getDate() === 8 && sd.getHours() === 9 && shifted[0].notified === false, 'shift promemoria errato');
  // Range: legacy si espande, materializzato no
  const legacy = { _id: 'l1', date: '2026-08-01', repeat: { frequency: 'weekly', weekdays: [2], endMode: 'never' } };
  const mat = { _id: 'm1', date: '2026-09-07', materialized: true, repeat: { frequency: 'daily', endMode: 'never' } };
  const map = r.expandEventsForRange([legacy, mat], '2026-09-07', '2026-09-09');
  assert((map.get('2026-09-08') || []).some((t) => t._id === 'l1'), 'legacy non espanso');
  assert(!(map.get('2026-09-08') || []).some((t) => t._id === 'm1'), 'materializzato espanso per errore');
  results.push(['repeat.js (occorrenze + range)', true, 'weekly/daily/monthly/never/shift ✓']);
} catch (err) {
  results.push(['repeat.js (occorrenze + range)', false, err.message]);
}

// 6) Materializzazione serie nello store locale (+ toggle bidirezionale)
try {
  const { localMutations, getState } = await vite.ssrLoadModule('/src/lib/localStore.js');
  const assert = (cond, msg) => { if (!cond) throw new Error(msg); };
  const before = getState().tasks.length;
  const fields = {
    title: 'Serie test',
    category: 'Studiare',
    categoryColor: '#30d158',
    date: '2026-09-07',
    completed: false,
    repeat: { frequency: 'weekly', weekdays: [2, 4, 5], endMode: 'after', endAfter: 4 },
    reminders: [{ at: new Date(2026, 8, 7, 9, 0, 0).toISOString(), label: 'test', notified: false }],
    attachments: [{ name: 'a.txt', type: 'text/plain' }],
  };
  const parentId = localMutations.createTask(fields);
  let tasks = getState().tasks;
  assert(tasks.length === before + 4, `create serie: attese +4, ottenute +${tasks.length - before}`);
  const series = tasks.filter((t) => t.seriesId === parentId);
  assert(series.length === 4, `istanze serie: ${series.length}`);
  const kids = series.filter((t) => t._id !== parentId);
  assert(JSON.stringify(kids.map((t) => t.date).sort()) === JSON.stringify(['2026-09-08', '2026-09-10', '2026-09-11']), 'date figlie errate');
  assert(kids.every((t) => t.materialized && (t.attachments || []).length === 0), 'figlie: flag/allegati errati');
  assert(kids.every((t) => t.reminders.length === 1 && t.reminders[0].notified === false && new Date(t.reminders[0].at).getDate() === Number(t.date.slice(8))), 'figlie: promemoria errati');
  // Toggle bidirezionale (check + uncheck)
  localMutations.toggleTask({ id: parentId });
  assert(getState().tasks.find((t) => t._id === parentId).completed === true, 'check fallito');
  localMutations.toggleTask({ id: parentId });
  assert(getState().tasks.find((t) => t._id === parentId).completed === false, 'uncheck fallito');
  // Rimozione regola dal parent → serie sciolta (resta 1 task)
  localMutations.updateTask({ id: parentId, repeat: { frequency: 'none' } });
  tasks = getState().tasks;
  assert(tasks.length === before + 1, `scioglimento: attese +1, ottenute +${tasks.length - before}`);
  assert(!tasks.find((t) => t._id === parentId).seriesId, 'metadati serie non rimossi');
  // Ricrea + elimina intera serie
  const pid2 = localMutations.createTask(fields);
  assert(getState().tasks.length === before + 5, 'ricreazione serie fallita');
  localMutations.removeSeries({ id: pid2 });
  assert(getState().tasks.length === before + 1, 'removeSeries fallito');
  localMutations.removeTask({ id: parentId });
  assert(getState().tasks.length === before, 'pulizia fallita');
  results.push(['localStore (materializzazione serie)', true, 'create/rigenera/removeSeries/uncheck ✓']);
} catch (err) {
  results.push(['localStore (materializzazione serie)', false, err.message]);
}

await vite.close();

console.log('\n═══ SMOKE TEST DI RENDERING ═══');
let failed = 0;
for (const [name, ok, info] of results) {
  console.log(`${ok ? '✅' : '❌'} ${name}${info ? ` — ${info}` : ''}`);
  if (!ok) failed++;
}
console.log(failed === 0 ? `\n🎉 ${results.length}/${results.length} test passati` : `\n💥 ${failed} test falliti`);
process.exit(failed === 0 ? 0 : 1);
