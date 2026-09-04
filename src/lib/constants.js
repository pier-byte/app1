/**
 * Costanti globali dell'applicazione
 */

// ── Tab di navigazione ──
export const TABS = [
  { id: 'scuola', label: 'Scuola', icon: 'BookOpen' },
  { id: 'routine', label: 'Routine', icon: 'Dumbbell' },
  { id: 'nutrizione', label: 'Nutrizione', icon: 'UtensilsCrossed' },
  { id: 'wallet', label: 'Wallet', icon: 'Wallet' },
];

// ── Categorie compiti predefinite ──
export const DEFAULT_TASK_CATEGORIES = [
  { name: 'Studiare', color: '#30d158' },
  { name: 'Esercizi', color: '#ffd60a' },
  { name: 'Verifica/interrogazione', color: '#ff375f' },
  { name: 'Ripetere', color: '#ff375f' },
  { name: 'Leggere', color: '#66d4cf' },
  { name: 'Ricopiare', color: '#64d2ff' },
  { name: 'Ricerche/presentazioni', color: '#ac8e68' },
];

// ── Griglia colori per nuova categoria ──
export const CATEGORY_COLORS = [
  '#ff453a', '#ff6723', '#ffd60a', '#32d74b', '#66d4cf', '#30d158',
  '#a2d149', '#0a84ff', '#5ac8fa', '#ff2d55', '#bf5af2', '#af52de',
  '#5e5ce6', '#ac8e68', '#8e8e93', '#aeaeb2', '#30d158', '#64d2ff',
  '#ff6961', '#e0b0ff',
];

// ── Step routine post-volley (default) ──
export const DEFAULT_ROUTINE_STEPS = [
  { name: 'Doccia', targetMinutes: 10 },
  { name: 'Capelli', targetMinutes: 8 },
  { name: 'Skincare', targetMinutes: 5 },
  { name: 'Denti', targetMinutes: 3 },
  { name: 'Cena', targetMinutes: 30 },
];

// ── Tipi pasto ──
export const MEAL_TYPES = ['Colazione', 'Pranzo', 'Cena', 'Spuntino'];

// ── Giorni della settimana ──
export const DAYS_SHORT = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
export const DAYS_FULL = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

// ── Timer studio ──
export const STUDY_START_HOUR = 15; // 15:00
export const STUDY_END_HOUR = 20;   // 20:00
export const STUDY_DURATION_MINUTES = (STUDY_END_HOUR - STUDY_START_HOUR) * 60;

// ── Soglie budget wallet ──
// Verde <50% · Giallo 50-80% · Rosso >80%
export const BUDGET_THRESHOLDS = {
  ok: 0.5,      // <50% = verde
  warn: 0.8,    // 50-80% = giallo
  danger: 1.0,  // >80% = rosso
};

/** Colore di soglia in base alla percentuale di budget usata (0–1+). */
export function budgetColor(ratio) {
  if (ratio < BUDGET_THRESHOLDS.ok) return '#30d158';      // verde
  if (ratio <= BUDGET_THRESHOLDS.warn) return '#ffd60a';   // giallo
  return '#ff375f';                                        // rosso
}

// ── Rotazione pasti predefinita ──
export const DEFAULT_WEEK_PLAN = [
  { day: 'Lunedì', colazione: 'Latte e cereali', pranzo: 'Pasta al pomodoro', cena: 'Pollo e verdure' },
  { day: 'Martedì', colazione: 'Yogurt e frutta', pranzo: 'Riso con tonno', cena: 'Pesce e insalata' },
  { day: 'Mercoledì', colazione: 'Pane, burro e marmellata', pranzo: 'Pasta alle zucchine', cena: 'Stringhi e pomodori' },
  { day: 'Giovedì', colazione: 'Frullato e biscotti', pranzo: 'Uova e toast', cena: 'Carne magra e spinaci' },
  { day: 'Venerdì', colazione: 'Latte e cereali', pranzo: 'Pasta al pesto', cena: 'Pizza (pizza night!)' },
  { day: 'Sabato', colazione: 'Cornetto e cappuccino', pranzo: 'Lasagna', cena: 'Sushi' },
  { day: 'Domenica', colazione: 'Torta della nonna', pranzo: 'Pranzo in famiglia', cena: 'Zuppa e formaggio' },
];

// ── Categorie spese ──
export const EXPENSE_CATEGORIES = ['Mensa', 'Trasporti', 'Scuola', 'Svago', 'Regali', 'Altro'];
