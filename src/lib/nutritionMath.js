/**
 * Nutrizione — matematica kcal ↔ macro e obiettivi di peso.
 *
 * Regola Atwater "4-4-9": proteine 4 kcal/g, carboidrati 4 kcal/g, grassi 9 kcal/g.
 * Per aumentare peso: surplus di ~250–500 kcal/giorno → ~0,25–0,5 kg/settimana
 * (≈7700 kcal per 1 kg di massa; 3500 kcal ≈ 0,45 kg). Proteine 1,6–2,2 g/kg.
 * BMR/TDEE: Mifflin-St Jeor (10·kg + 6,25·cm − 5·età ± costante) × fattore attività.
 *
 * Fonti: regola 4-4-9 (USDA/Atwater), Mifflin-St Jeor + fattori attività,
 * surplus 250–500 kcal per lean gain, ~7700 kcal/kg.
 */

export const MACRO_KCAL = { protein: 4, carbs: 4, fat: 9 };
export const KCAL_PER_KG = 7700; // surplus cumulato per ~1 kg di peso
export const KCAL_PER_LB = 3500;

export const ACTIVITY_LEVELS = [
  { id: 'sedentary', label: 'Sedentario', factor: 1.2, note: 'Poco movimento, studio/PC' },
  { id: 'light', label: 'Leggero', factor: 1.375, note: '1–3 allenamenti a settimana' },
  { id: 'moderate', label: 'Moderato', factor: 1.55, note: '3–5 allenamenti a settimana' },
  { id: 'very', label: 'Molto attivo', factor: 1.725, note: '6–7 allenamenti o sport intenso' },
];

export const GOALS = [
  { id: 'maintain', label: 'Mantenere', surplus: 0, range: 'TDEE' },
  { id: 'gain', label: 'Aumentare peso', surplus: 250, range: '+250/+500 kcal' },
  { id: 'lose', label: 'Diminuire peso', surplus: -300, range: '−250/−500 kcal' },
];

export const GAIN_PACES = [
  { id: 'lean', label: 'Leggero', surplus: 200, perWeek: '~0,2 kg/sett.' },
  { id: 'standard', label: 'Standard', surplus: 375, perWeek: '~0,3–0,4 kg/sett.' },
  { id: 'strong', label: 'Sostenuto', surplus: 500, perWeek: '~0,45 kg/sett.' },
];

export const LOSE_PACES = [
  { id: 'gentle', label: 'Gentile', delta: -250, perWeek: '~0,2 kg/sett.' },
  { id: 'moderate', label: 'Moderato', delta: -400, perWeek: '~0,35 kg/sett.' },
];

/** kcal derivate dai macro (regola 4-4-9). */
export function kcalFromMacros({ protein = 0, carbs = 0, fat = 0 } = {}) {
  return Math.round((protein || 0) * 4 + (carbs || 0) * 4 + (fat || 0) * 9);
}

/** Ripartizione kcal per singolo macro. */
export function macroKcalBreakdown({ protein = 0, carbs = 0, fat = 0 } = {}) {
  return {
    protein: Math.round((protein || 0) * 4),
    carbs: Math.round((carbs || 0) * 4),
    fat: Math.round((fat || 0) * 9),
  };
}

/**
 * Distribuisce un target kcal sui 3 macro in base alle % (somma 100).
 * @returns {protein, carbs, fat} grammi
 */
export function macrosFromKcal(calories, pct = { protein: 25, carbs: 45, fat: 30 }) {
  const k = Math.max(0, calories || 0);
  const protein = (k * (pct.protein / 100)) / 4;
  const carbs = (k * (pct.carbs / 100)) / 4;
  const fat = (k * (pct.fat / 100)) / 9;
  return {
    protein: Math.round(protein),
    carbs: Math.round(carbs),
    fat: Math.round(fat),
  };
}

/** BMR Mifflin-St Jeor. sex: 'female' | 'male' | 'other' (other → media). */
export function bmrMifflin({ sex = 'female', weightKg, heightCm, age }) {
  const w = Number(weightKg) || 0;
  const h = Number(heightCm) || 0;
  const a = Number(age) || 0;
  if (!w || !h || !a) return null;
  const female = 10 * w + 6.25 * h - 5 * a - 161;
  const male = 10 * w + 6.25 * h - 5 * a + 5;
  if (sex === 'male') return Math.round(male);
  if (sex === 'female') return Math.round(female);
  return Math.round((female + male) / 2);
}

/** TDEE = BMR × fattore attività. */
export function tdee(bmr, factor = 1.375) {
  if (!bmr) return null;
  return Math.round(bmr * factor);
}

/** Target kcal giornaliere per obiettivo di peso. */
export function targetKcal(tdeeValue, goal = 'maintain', delta = 250) {
  if (!tdeeValue) return null;
  if (goal === 'gain') return Math.round(tdeeValue + Math.abs(delta));
  if (goal === 'lose') return Math.round(tdeeValue - Math.abs(delta));
  return Math.round(tdeeValue);
}

/** Variazione di peso attesa (kg/settimana) per un surplus/deficit giornaliero. */
export function expectedWeeklyChange(deltaKcalPerDay) {
  return Math.round((Math.abs(deltaKcalPerDay) * 7 * 10) / KCAL_PER_KG) / 10;
}

/**
 * Grammi di proteine consigliati in base al peso e all'obiettivo
 * (range sport-nutrition 1,6–2,2 g/kg; per mantenimento ~1,6).
 */
export function proteinTarget(weightKg, goal = 'maintain') {
  const w = Number(weightKg) || 0;
  if (!w) return null;
  const gPerKg = goal === 'gain' ? 2.0 : goal === 'lose' ? 1.8 : 1.6;
  return Math.round(w * gPerKg);
}

/**
 * Suggerisce i 3 macro a partire da target kcal, peso e obiettivo:
 * proteine in g/kg, grassi ~28% kcal, carboidrati = resto.
 */
export function suggestMacros({ targetKcalValue, weightKg, goal = 'maintain' }) {
  const k = Number(targetKcalValue) || 0;
  const protein = proteinTarget(weightKg, goal) ?? Math.round((k * 0.25) / 4);
  const proteinKcal = protein * 4;
  const fat = Math.round(((k - proteinKcal) * 0.28) / 9);
  const fatKcal = fat * 9;
  const carbs = Math.max(0, Math.round((k - proteinKcal - fatKcal) / 4));
  return { protein, carbs, fat };
}

/** Se kcal "riportate" ≠ somma dei macro, mostra lo scostamento. */
export function kcalMismatch(reported, macros) {
  const derived = kcalFromMacros(macros);
  return Math.abs(derived - (Number(reported) || 0)) > 1;
}

export function round1(n) {
  return Math.round(n * 10) / 10;
}
