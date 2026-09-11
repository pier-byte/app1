/**
 * Costanti globali dell'applicazione
 */

// ── Tab di navigazione ──
export const TABS = [
  { id: 'calendario', label: 'Calendario', icon: 'CalendarDays' },
  { id: 'scuola', label: 'Compiti', icon: 'ListChecks' },
  { id: 'routine', label: 'Routine', icon: 'Dumbbell' },
  { id: 'nutrizione', label: 'Nutrizione', icon: 'UtensilsCrossed' },
  { id: 'note', label: 'Note', icon: 'StickyNote' },
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

// ── Griglia colori per nuova categoria (tutti unici: usati come key React) ──
export const CATEGORY_COLORS = [
  '#ff453a', '#ff6723', '#ffd60a', '#32d74b', '#66d4cf', '#30d158',
  '#a2d149', '#0a84ff', '#5ac8fa', '#ff2d55', '#bf5af2', '#af52de',
  '#5e5ce6', '#ac8e68', '#8e8e93', '#aeaeb2', '#00c7be', '#64d2ff',
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

// ── Template routine (più "schede" personalizzabili) ──
export const DEFAULT_ROUTINE_TEMPLATES = [
  {
    id: 'post-volley',
    name: 'Post-volley',
    icon: 'Volleyball',
    color: '#0a84ff',
    steps: DEFAULT_ROUTINE_STEPS,
  },
  {
    id: 'mattina',
    name: 'Mattina',
    icon: 'Sunrise',
    color: '#ffd60a',
    steps: [
      { name: 'Sveglia e stretch', targetMinutes: 5 },
      { name: 'Colazione', targetMinutes: 20 },
      { name: 'Denti', targetMinutes: 3 },
      { name: 'Prep zaino', targetMinutes: 5 },
    ],
  },
  {
    id: 'sera',
    name: 'Sera',
    icon: 'MoonStar',
    color: '#bf5af2',
    steps: [
      { name: 'Doccia', targetMinutes: 10 },
      { name: 'Skincare', targetMinutes: 5 },
      { name: 'Preparazione per domani', targetMinutes: 10 },
      { name: 'Lettura', targetMinutes: 20 },
    ],
  },
];

// ── Colori per routine personalizzate ──
export const ROUTINE_COLORS = ['#0a84ff', '#30d158', '#ffd60a', '#ff375f', '#bf5af2', '#64d2ff', '#ff9f0a', '#66d4cf', '#5e5ce6', '#ff2d55'];

// ── Libreria icone monocromatiche (nomi lucide-react) ──
// Le prime 5 sono mostrate in primo piano, le altre nel modale "+N".
export const ROUTINE_ICONS_PRIMARY = ['Dumbbell', 'Volleyball', 'Sunrise', 'MoonStar', 'BookOpen'];
export const ROUTINE_ICONS = [
  ...ROUTINE_ICONS_PRIMARY,
  'Bike', 'Footprints', 'Waves', 'Timer', 'AlarmClock', 'Sunset', 'Sun', 'Moon',
  'Coffee', 'Salad', 'UtensilsCrossed', 'GraduationCap', 'Briefcase', 'HeartPulse',
  'Sparkles', 'Star', 'Target', 'Trophy', 'Music', 'Headphones', 'Zap', 'Leaf',
  'Droplets', 'ShowerHead', 'Bath', 'BedDouble',
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

// ── Note ──
export const NOTE_COLORS = ['#0a84ff', '#30d158', '#ffd60a', '#ff375f', '#bf5af2', '#64d2ff', '#ff9f0a', '#8e8e93'];

/** Tipo di nota: testo libero oppure checklist (stile Notion). */
export function emptyNote() {
  return {
    title: '',
    body: '',
    type: 'note', // note | todo
    todos: [],
    pinned: false,
    color: NOTE_COLORS[0],
  };
}
