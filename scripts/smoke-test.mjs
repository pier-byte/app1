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
const pages = [
  ['SchoolPage', { selectedDate: new Date(), weekDates: [new Date()], weekLabel: 'test', goToPrevWeek: () => {}, goToNextWeek: () => {}, goToToday: () => {}, onSelectDate: () => {} }],
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

await vite.close();

console.log('\n═══ SMOKE TEST DI RENDERING ═══');
let failed = 0;
for (const [name, ok, info] of results) {
  console.log(`${ok ? '✅' : '❌'} ${name}${info ? ` — ${info}` : ''}`);
  if (!ok) failed++;
}
console.log(failed === 0 ? `\n🎉 ${results.length}/${results.length} test passati` : `\n💥 ${failed} test falliti`);
process.exit(failed === 0 ? 0 : 1);
