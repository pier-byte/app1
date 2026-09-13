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

// ═══════════ OBIETTIVO NUTRIZIONE (dati automatici + override manuale) ═══════════
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
  report('Obiettivo: dati automatici (sola lettura, sesso M fisso)', container.textContent.includes('I tuoi dati') && container.textContent.includes('Sesso') && !container.textContent.includes('Peso (kg)'));

  // Override manuale: la kcal inserita ricalcola macro e calorie
  const manual = $$('input').find((i) => i.getAttribute('aria-label') === 'Obiettivo kcal manuale');
  report('Obiettivo: campo override manuale presente', !!manual);
  setInput(manual, '3000');
  await sleep(50);
  report('Obiettivo: override aggiorna macro al volo', container.textContent.includes('Override attivo') && container.textContent.includes('Target kcal'));
  const aplicaBtn2 = $$('button').find((b) => b.textContent.trim() === 'Applica');
  click(aplicaBtn2);
  await sleep(150);
  const goalsSaved2 = JSON.parse(localStorage.getItem('app1_nutrition_goals_v2') || 'null');
  report('Obiettivo: Applica salva kcal manuale + macro coerenti', goalsSaved2?.calories === 3000 && goalsSaved2.calories === Math.round(goalsSaved2.protein * 4 + goalsSaved2.carbs * 4 + goalsSaved2.fat * 9), JSON.stringify(goalsSaved2));
  report('Obiettivo: Applica chiude il dialog', !container.textContent.includes('Obiettivo nutrizione'));
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


// ═══════════ NOTE: TIPO IMMUTABILE + COLOR PICKER ═══════════
try {
  memStore.clear();
  const { default: NoteEditorSheet } = await vite.ssrLoadModule('/src/components/notes/NoteEditorSheet.jsx');
  const c5 = window.document.createElement('div');
  window.document.body.appendChild(c5);
  const r5 = createRoot(c5);
  const notaEsistente = { id: 'n1', type: 'text', title: 'Nota aperta', body: 'corpo', color: '#ff9f0a', pinned: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  flushSync(() => r5.render(React.createElement(NoteEditorSheet, { isOpen: true, onClose: () => {}, onSave: () => {}, note: notaEsistente })));
  await sleep(60);
  report('Nota esistente: tipo BLOCCATO (chip read-only, niente selettore Testo/Checklist)', c5.textContent.includes('Nota') && !c5.textContent.includes('Checklist'));
  report('Nota: color picker con pallini e check sul selezionato', [...c5.querySelectorAll('button[aria-pressed]')].length >= 6 && !!c5.querySelector('button[aria-pressed="true"] svg'));

  // Nuova nota → tipo scelgibile
  const c6 = window.document.createElement('div');
  window.document.body.appendChild(c6);
  const r6 = createRoot(c6);
  flushSync(() => r6.render(React.createElement(NoteEditorSheet, { isOpen: true, onClose: () => {}, onSave: () => {}, note: null })));
  await sleep(60);
  report('Nuova nota: selettore Testo/Checklist visibile', c6.textContent.includes('Checklist'));
} catch (err) {
  report('Note: tipo immutabile + color picker', false, err.message);
}

// ═══════════ ROUTINE: FINISHEARLY + CAROUSEL RENDER ═══════════
try {
  memStore.clear();
  localStorage.removeItem('app1_routine_session_v1');
  const { routineSession } = await vite.ssrLoadModule('/src/store/routineSession.js');
  const { default: RoutineCarousel } = await vite.ssrLoadModule('/src/components/routine/RoutineCarousel.jsx');

  const mkSteps = (n) => Array.from({ length: n }, (_, i) => ({ name: 'Task ' + (i + 1), targetMinutes: 1 }));
  routineSession.begin('2026-09-12', mkSteps(2), { routineName: 'Routine A' });
  routineSession.completeStep();
  routineSession.finishEarly();
  const snap = routineSession.getSnapshot();
  report('Routine: finishEarly → stato done + completedAt', snap.status === 'done' && snap.completedAt != null);

  const c7 = window.document.createElement('div');
  window.document.body.appendChild(c7);
  const r7 = createRoot(c7);
  let finished = false;
  routineSession.begin('2026-09-12', mkSteps(2), { routineName: 'Routine B' });
  flushSync(() => r7.render(React.createElement(RoutineCarousel, { session: routineSession.getSnapshot(), onFinish: () => { finished = true; routineSession.finishEarly(); }, onPause: () => {}, onResume: () => {}, onComplete: () => {} })));
  await sleep(60);
  const finBtn = [...c7.querySelectorAll('button')].find((b) => b.textContent.includes('Concludi Routine'));
  report('Carousel: bottone Concludi Routine renderizzato', !!finBtn);
  click(finBtn);
  await sleep(400);
  report('Carousel: click su Concludi → onFinish invocato', finished && routineSession.getSnapshot().status === 'done');
} catch (err) {
  report('Routine: finishEarly + carousel', false, err.message);
}

// ═══════════ DRUM PICKER: SNAP AL CENTRO ═══════════
try {
  memStore.clear();
  const { default: DrumColumn } = await vite.ssrLoadModule('/src/components/ui/DrumColumn.jsx');
  const c8 = window.document.createElement('div');
  window.document.body.appendChild(c8);
  const r8 = createRoot(c8);
  let picked = null;
  // jsdom è senza layout: scrollTop sul prototype resta 0 → rendilo scrivibile per istanza
  const realScrollTo = Element.prototype.scrollTo;
  let fakeST = 0;
  Element.prototype.scrollTo = function (opts) {
    this.scrollTop = opts?.top ?? 0; // usa il setter definito sotto (istanza scroller)
  };
  flushSync(() => r8.render(React.createElement(DrumColumn, { values: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], value: 3, onChange: (v) => { picked = v; }, format: (v) => String(v) })));
  await sleep(120);
  const scroller = c8.querySelector('.drum-scroller[role="listbox"]');
  Object.defineProperty(scroller, 'scrollTop', { get: () => fakeST, set: (v) => { fakeST = v; }, configurable: true });
  fakeST = 3 * 48; // posizione iniziale (valore 3 al centro)
  report('Drum: scroller con PAD simmetrici + role listbox', !!scroller && !!c8.querySelector('.drum-item[aria-selected="true"]'));
  report('Drum: item centrato = valore selezionato', c8.querySelector('.drum-item[aria-selected="true"]')?.textContent === '3');
  // Tap sul valore 7 → tapSelect → scrollTo(7*48) → poi lo scrollend (nativo) riallinea e notifica onChange
  const target = [...c8.querySelectorAll('.drum-item')].find((el) => el.textContent === '7');
  click(target);
  report('Drum: tap → scroll verso indice del valore', fakeST === 7 * 48, 'scrollTop=' + fakeST);
  scroller.dispatchEvent(new window.Event('scrollend'));
  await sleep(60);
  Element.prototype.scrollTo = realScrollTo;
  report('Drum: scrollend → onChange con il valore centrato', picked === 7, 'picked=' + picked);
} catch (err) {
  report('Drum picker snap', false, err.message);
}

// ═══════════ PROFILO: FUNZIONI STATISTICHE PURE ═══════════
try {
  memStore.clear();
  const stats = await vite.ssrLoadModule('/src/lib/stats.js');
  const sbc = stats.studyByCategory([
    { category: 'Studiare', categoryColor: '#30d158', actualMinutes: 90 },
    { category: 'Esercizi', categoryColor: '#ffd60a', actualMinutes: 30 },
    { category: 'Studiare', categoryColor: '#30d158', actualMinutes: 60 },
    { category: 'Leggere', categoryColor: '#66d4cf', actualMinutes: 0 },
  ]);
  report('Profilo stats: studio per tipologia (180 min, 75% teoria)', sbc.totalMinutes === 180 && sbc.rows[0].name === 'Studiare' && sbc.rows[0].pct === 83 && sbc.rows.length === 2);
  const ws = stats.workoutStats([
    { steps: [{ targetMinutes: 30, actualSeconds: 1800, completed: true }], completedAt: '2026-09-12T10:00:00' },
    { steps: [{ targetMinutes: 30, actualSeconds: 0, completed: false }], completedAt: null },
  ], 7);
  report('Profilo stats: allenamenti (1 completato, 1/sett, 30 min)', ws.completed === 1 && ws.total === 2 && ws.perWeek === 1 && ws.totalMinutes === 30);
  const wa = stats.walletSummary([{ amount: 5.5 }, { amount: 2.2 }], 35);
  report('Profilo stats: wallet (speso €7,70, residuo €27,30)', wa.spent === 7.7 && wa.remaining === 27.3 && wa.usedPct === 22);
  const ad = stats.nutritionAdherence([
    { date: '2026-09-08', calories: 1900 },
    { date: '2026-09-09', calories: 2100 },
    { date: '2026-09-10', calories: 800 },
  ], 2000);
  report('Profilo stats: aderenza ≥95% (2 giorni on target su 3)', ad.daysOnTarget === 2 && ad.daysTracked === 3 && ad.pct === 67 && ad.days[0].ok === true && ad.days[2].ok === false);
} catch (err) {
  report('Profilo: stats pure', false, err.message);
}

// ═══════════ PAGINA PROFILO: DASHBOARD + NAVIGAZIONE INTERNA ═══════════
try {
  memStore.clear();
  localStorage.setItem('app1_nutrition_goals_v2', JSON.stringify({ calories: 2000, protein: 150, carbs: 200, fat: 70, source: 'macro' }));
  const { default: ProfilePage } = await vite.ssrLoadModule('/src/pages/ProfilePage.jsx');
  const c9 = window.document.createElement('div');
  window.document.body.appendChild(c9);
  const r9 = createRoot(c9);
  flushSync(() => r9.render(React.createElement(ProfilePage, { selectedDate: new Date() })));
  await sleep(150);
  const text = c9.textContent;
  report('Profilo: card accesso rapido Note e Wallet', text.includes('Profilo') && text.includes('note salvate') && text.includes('Budget sett.'));
  report('Profilo: toggle Settimanale/Mensile presente', !![...c9.querySelectorAll('button')].find((b) => b.textContent === 'Settimanale') && !![...c9.querySelectorAll('button')].find((b) => b.textContent === 'Mensile'));
  report('Profilo: ore studio + aderenza target raggiunto nel contenuto', text.includes('accumulate nel periodo') && text.includes('target raggiunto'));
  // Toggle → mensile: cambia il label del periodo
  click([...c9.querySelectorAll('button')].find((b) => b.textContent === 'Mensile'));
  await sleep(80);
  report('Profilo: toggle mensile aggiorna il periodo', c9.textContent.includes('settembre 2026') || c9.textContent.includes('Settembre 2026'));
} catch (err) {
  report('Profilo: dashboard', false, err.message);
}

const passed = results.filter((r) => r[1]).length;
console.log(`\n${passed}/${results.length} test passati`);
await vite.close();
process.exit(passed === results.length ? 0 : 1);
