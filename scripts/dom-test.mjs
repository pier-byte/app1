/**
 * Test di interazione DOM (jsdom) per i flussi critici:
 * - Planner pasti (rotazione): rendering + modifica cella + swap giorni
 *   (verifica il fix del crash `plan.map`: useMealPlan ora espone l'array)
 * - Obiettivo nutrizione: "Applica" salva e CHIUDE → pagina aggiornata subito
 * - Dedup home: giorno con attività normale + duplicata → solo la normale
 * - Picker Liquid Glass: orario a tamburo, data mensile, mese/anno a tamburo
 * - Editing in-post: pasti e spese
 *
 * Uso: node scripts/dom-test.mjs
 */
import { createServer } from 'vite';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost/',
  pretendToBeVisual: true,
});
const { window } = dom;
for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'Event', 'MouseEvent', 'KeyboardEvent', 'CustomEvent', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame', 'MutationObserver', 'SVGElement']) {
  try { if (window[key] !== undefined) globalThis[key] = window[key]; } catch { /* read-only */ }
}
window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
globalThis.matchMedia = window.matchMedia;
const memStore = new Map();
globalThis.localStorage = {
  getItem: (k) => (memStore.has(k) ? memStore.get(k) : null),
  setItem: (k, v) => memStore.set(k, String(v)),
  removeItem: (k) => memStore.delete(k),
};
globalThis.IS_REACT_ACT_ENVIRONMENT = false;

const results = [];
const report = (name, ok, info = '') => {
  results.push([name, ok]);
  console.log(`${ok ? '✅' : '❌'} ${name}${info ? ` — ${info}` : ''}`);
};

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const React = (await import('react')).default;
const { createRoot } = await import('react-dom/client');
const { flushSync } = await import('react-dom');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const $ = (sel) => window.document.querySelector(sel);
const $$ = (sel) => [...window.document.querySelectorAll(sel)];
const click = (el) => flushSync(() => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true })));
const setInput = (el, value) => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  flushSync(() => {
    setter.call(el, value);
    el.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
};

// ═══════════ PLANNER PASTI (rotazione) ═══════════
try {
  memStore.clear();
  const { localMutations } = await vite.ssrLoadModule('/src/lib/localStore.js');
  const { toDateKey, getMonday } = await vite.ssrLoadModule('/src/lib/dates.js');
  const { DEFAULT_WEEK_PLAN } = await vite.ssrLoadModule('/src/lib/constants.js');
  const { default: WeeklyPlanTable } = await vite.ssrLoadModule('/src/components/nutrition/WeeklyPlanTable.jsx');

  const weekStart = toDateKey(getMonday(new Date()));
  const plan = DEFAULT_WEEK_PLAN.map((d) => ({ ...d })); // ← ciò che useMealPlan espone DOPO il fix
  const container = window.document.createElement('div');
  window.document.body.appendChild(container);
  const root = createRoot(container);
  let saved = null;
  flushSync(() => root.render(React.createElement(WeeklyPlanTable, { plan, onUpdatePlan: (p) => { saved = p; } })));

  report('Planner: tabella rotazione renderizzata', container.textContent.includes('Rotazione pasti') && container.textContent.includes('Pasta al pomodoro'));

  // Modifica cella
  const cell = $$('button').find((b) => b.textContent.includes('Pasta al pomodoro'));
  click(cell);
  await sleep(50);
  const dialogInput = $('input[placeholder="es. Pasta al pomodoro"]');
  report('Planner: tap cella apre la modifica', !!dialogInput);
  setInput(dialogInput, 'Pasta al pesto');
  click($$('button').find((b) => b.textContent.replace(/\s+/g, ' ').includes('Salva')));
  await sleep(80);
  report('Planner: conferma modifica aggiorna il piano', saved?.[0]?.pranzo === 'Pasta al pesto', `pranzo lunedì = ${saved?.[0]?.pranzo}`);

  // Swap giorni (le righe dati contengono i pulsanti dei pasti; l'header no)
  const rowsBefore = saved.map((d) => d.pranzo).join('|');
  const swapBtn = $$('button').find((b) => b.textContent.includes('Scambia giorni'));
  click(swapBtn);
  await sleep(30);
  const rows = $$('div').filter((d) => typeof d.className === 'string' && d.className.includes('grid-cols-[64px') && d.querySelector('button'));
  click(rows[0]);
  click(rows[1]);
  await sleep(80);
  const rowsAfter = saved.map((d) => d.pranzo).join('|');
  report('Planner: swap giorni scambia i pasti', rowsBefore !== rowsAfter && saved[0].pranzo === 'Riso con tonno', `lunedì ora = ${saved[0].pranzo}`);
} catch (err) {
  report('Planner: flusso rotazione', false, err.message);
}

// ═══════════ OBIETTIVO NUTRIZIONE ═══════════
try {
  memStore.clear();
  const { default: NutritionPage } = await vite.ssrLoadModule('/src/pages/NutritionPage.jsx');
  const container = window.document.createElement('div');
  window.document.body.appendChild(container);
  const root = createRoot(container);
  flushSync(() => root.render(React.createElement(NutritionPage, { selectedDate: new Date() })));
  await sleep(80);

  click($$('button').find((b) => b.textContent.includes('Obiettivo')));
  await sleep(60);
  report('Obiettivo: dialog aperto', container.textContent.includes('Obiettivo nutrizione'));

  const numInputs = $$('input[type="number"]');
  const peso = numInputs.find((i) => i.closest('label')?.textContent.includes('Peso'));
  const altezza = numInputs.find((i) => i.closest('label')?.textContent.includes('Altezza'));
  if (peso) setInput(peso, '54');
  if (altezza) setInput(altezza, '165');
  await sleep(40);
  click($$('button').find((b) => b.textContent.trim() === 'Applica'));
  await sleep(150);
  const closed = !container.textContent.includes('Obiettivo nutrizione');
  const goalsSaved = JSON.parse(localStorage.getItem('app1_nutrition_goals_v2') || 'null');
  const kcal449 = goalsSaved && goalsSaved.calories === Math.round(goalsSaved.protein * 4 + goalsSaved.carbs * 4 + goalsSaved.fat * 9);
  report('Obiettivo: Applica CHIUDE il dialog (pagina subito visibile)', closed);
  report('Obiettivo: target salvati con kcal collegate 4-4-9', !!goalsSaved && kcal449, JSON.stringify(goalsSaved));
} catch (err) {
  report('Obiettivo: flusso', false, err.message);
}

// ═══════════ DEDUP HOME: normale vs duplicata ═══════════
try {
  memStore.clear();
  const { expandEventsForRange } = await vite.ssrLoadModule('/src/lib/repeat.js');
  const { toDateKey, addDays } = await vite.ssrLoadModule('/src/lib/dates.js');
  const today = toDateKey(new Date());
  const yesterday = toDateKey(addDays(new Date(), -1));

  // Caso misto: istanza concreta (normale) + occorrenza virtuale legacy con lo stesso titolo
  const normal = { _id: 'n1', title: 'Allenamento', category: 'Esercizi', date: today, materialized: false };
  const legacyRepeating = {
    _id: 'l1', title: 'allenamento ', category: 'Esercizi', date: yesterday, materialized: false,
    repeat: { frequency: 'daily', endMode: 'never' },
  };
  const map = expandEventsForRange([normal, legacyRepeating], today, today);
  const dayItems = map.get(today) ?? [];
  report('Home: giorno con normale + duplicata → solo la normale', dayItems.length === 1 && dayItems[0]._id === 'n1', `${dayItems.length} elementi`);

  // Caso legacy/serie materializzata mescolate: istanza concreta della serie vince
  const child = { _id: 'c1', title: 'Inglese', category: 'Studiare', date: today, seriesId: 'p1', materialized: true };
  const parentLegacy = { _id: 'p1', title: 'Inglese', category: 'Studiare', date: yesterday, materialized: false, repeat: { frequency: 'daily', endMode: 'never' } };
  const map2 = expandEventsForRange([child, parentLegacy], today, today);
  const items2 = map2.get(today) ?? [];
  report('Home: istanza materializzata vince sull’occorrenza espansa', items2.length === 1 && items2[0]._id === 'c1', `${items2.length} elementi`);

  // Senza duplicati: l'occorrenza espansa compare normalmente
  const map3 = expandEventsForRange([parentLegacy], today, today);
  report('Home: senza doppioni l’occorrenza ripetuta resta visibile', (map3.get(today) ?? []).length === 1);
} catch (err) {
  report('Home: dedup normale vs duplicata', false, err.message);
}

// ═══════════ PICKER LIQUID GLASS ═══════════
try {
  memStore.clear();
  const { default: TimePickerDialog } = await vite.ssrLoadModule('/src/components/school/TimePickerDialog.jsx');
  const { default: DatePickerDialog } = await vite.ssrLoadModule('/src/components/school/DatePickerDialog.jsx');
  const { default: MonthYearPickerDialog } = await vite.ssrLoadModule('/src/components/school/MonthYearPickerDialog.jsx');

  let confirmed = null;
  const c1 = window.document.createElement('div');
  window.document.body.appendChild(c1);
  const r1 = createRoot(c1);
  flushSync(() => r1.render(React.createElement(TimePickerDialog, { isOpen: true, value: '12:30', onConfirm: (v) => { confirmed = v; } })));
  report('Orario (tamburo): titolo + colonne ore/minuti renderizzate', c1.textContent.includes('Seleziona orario') && c1.textContent.includes(':'));
  const opt15 = [...c1.querySelectorAll('button')].find((b) => b.textContent.trim() === '+15 min');
  click(opt15);
  click([...c1.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Conferma'));
  report('Orario (tamburo): chip +15 min e Conferma → 12:45', confirmed === '12:45', `confermato: ${confirmed}`);

  const c2 = window.document.createElement('div');
  window.document.body.appendChild(c2);
  const r2 = createRoot(c2);
  flushSync(() => r2.render(React.createElement(DatePickerDialog, { isOpen: true, value: toDateKeySafe(new Date()), onConfirm: () => {} })));
  report('Data (mensile): header + griglia giorni + chip rapide', c2.textContent.includes('Seleziona data') && c2.textContent.includes('Lun') && c2.textContent.includes('Prossima settimana'));
  const monthBtn = [...c2.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === 'Scegli mese e anno');
  click(monthBtn);
  await sleep(50);
  report('Data: tap sul mese apre il tamburo mese/anno', !!c2.textContent.includes('Anno') || $$('div').some((d) => d.textContent?.includes('Gennaio')));

  const c3 = window.document.createElement('div');
  window.document.body.appendChild(c3);
  const r3 = createRoot(c3);
  flushSync(() => r3.render(React.createElement(MonthYearPickerDialog, { isOpen: true, value: new Date(2026, 9, 1), onConfirm: () => {} })));
  report('Mese/Anno (tamburo): colonne mesi e anni', c3.textContent.includes('Ottobre') && c3.textContent.includes('2026'));
} catch (err) {
  report('Picker Liquid Glass', false, err.message);
}

function toDateKeySafe(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// ═══════════ EDITING IN-POST: pasti ═══════════
try {
  memStore.clear();
  const { localMutations } = await vite.ssrLoadModule('/src/lib/localStore.js');
  const id = localMutations.addMeal({ date: toDateKeySafe(new Date()), mealType: 'Pranzo', description: '150g pollo', calories: 300, protein: 30, carbs: 10, fat: 10, parsedByAI: false });
  localMutations.updateMeal({ id, description: '160g pollo', protein: 35, calories: 340 });
  const st = JSON.parse(localStorage.getItem('app1_db_v1'));
  const meal = st.meals.find((m) => m._id === id);
  report('Pasti: modifica a posteriori (descrizione + grammature)', meal.description === '160g pollo' && meal.protein === 35);
} catch (err) {
  report('Pasti: editing in-post', false, err.message);
}

// ═══════════ EDITING IN-POST: spese ═══════════
try {
  memStore.clear();
  const { localMutations } = await vite.ssrLoadModule('/src/lib/localStore.js');
  const id = localMutations.addExpense({ date: toDateKeySafe(new Date()), description: 'Mensa', amount: 5.5, category: 'Mensa' });
  localMutations.updateExpense({ id, amount: 6.2, description: 'Mensa + snack' });
  const st = JSON.parse(localStorage.getItem('app1_db_v1'));
  const exp = st.expenses.find((e) => e._id === id);
  report('Spese: modifica a posteriori (importo + descrizione)', exp.amount === 6.2 && exp.description === 'Mensa + snack');
} catch (err) {
  report('Spese: editing in-post', false, err.message);
}

// ═══════════ TASK FORM + CATEGORY SHEET (aperti) ═══════════
try {
  memStore.clear();
  const { default: TaskFormSheet } = await vite.ssrLoadModule('/src/components/school/TaskFormSheet.jsx');
  const { DEFAULT_TASK_CATEGORIES } = await vite.ssrLoadModule('/src/lib/constants.js');
  const categories = DEFAULT_TASK_CATEGORIES.map((c, i) => ({ _id: `c${i}`, ...c }));

  const c4 = window.document.createElement('div');
  window.document.body.appendChild(c4);
  const r4 = createRoot(c4);
  flushSync(() => r4.render(React.createElement(TaskFormSheet, {
    isOpen: true,
    onClose: () => {},
    onSave: () => {},
    defaultDate: toDateKeySafe(new Date()),
    categories,
    onCreateCategory: () => {},
  })));
  report('Editor attività: campi principali presenti', c4.textContent.includes('Tutto il giorno') && c4.textContent.includes('Elenco attività') && c4.textContent.includes('Promemoria'));

  // Apri il selettore elenco attività (stile Liquid Glass)
  const listBtn = [...c4.querySelectorAll('button')].find((b) => b.textContent.includes('Elenco attività'));
  click(listBtn);
  await sleep(60);
  report('Elenco attività: sheet con radio colorate + "Predefinito" + Crea nuovo', c4.textContent.includes('Predefinito') && c4.textContent.includes('Crea nuovo') && c4.textContent.includes('SELEZIONA'));

  // Apri "Crea nuovo" (dialog nome + colori)
  const createBtn = [...c4.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Crea nuovo');
  click(createBtn);
  await sleep(60);
  report('Nuovo elenco: dialog nome (0/50) + griglia colori', c4.textContent.includes('Crea un nuovo elenco') && c4.textContent.includes('0/50') && c4.textContent.includes('Colore calendario'));
} catch (err) {
  report('Editor attività + elenco Liquid Glass', false, err.message);
}

const passed = results.filter((r) => r[1]).length;
console.log(`\n${passed}/${results.length} test passati`);
await vite.close();
process.exit(passed === results.length ? 0 : 1);
