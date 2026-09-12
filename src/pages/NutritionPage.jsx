import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  Flame, Trash2, UtensilsCrossed, CalendarRange, Link2, Scale, Pencil,
  Plus, Coffee, Apple, Soup, PencilLine,
} from 'lucide-react';
import { useMeals, useMealPlan, useBodyMetrics } from '../hooks/useData';
import SegmentedControl from '../components/ui/SegmentedControl';
import MealLogDialog from '../components/nutrition/MealLogDialog';
import WeeklyPlanTable from '../components/nutrition/WeeklyPlanTable';
import MetricsCharts from '../components/nutrition/MetricsCharts';
import GoalPlannerDialog from '../components/nutrition/GoalPlannerDialog';
import MealEditDialog from '../components/nutrition/MealEditDialog';
import EmptyState from '../components/ui/EmptyState';
import { toDateKey, getMonday, formatDateDisplay, parseISO } from '../lib/dates';
import { DEFAULT_WEEK_PLAN } from '../lib/constants';
import { kcalFromMacros } from '../lib/nutritionMath';
import { cn } from '../lib/cn';

const MACROS = [
  { key: 'protein', label: 'Proteine', color: '#30d158', goal: 'protein' },
  { key: 'carbs', label: 'Carboidrati', color: '#ffd60a', goal: 'carbs' },
  { key: 'fat', label: 'Grassi', color: '#ff375f', goal: 'fat' },
];

// Card pasti (screenshot allegato): icona + colore + quota consigliata
const MEAL_CARDS = [
  { type: 'Colazione', Icon: Coffee, color: '#ffd60a', share: 0.25 },
  { type: 'Spuntino (scuola e/o casa)', mealType: 'Spuntino', Icon: Apple, color: '#30d158', share: 0.1 },
  { type: 'Pranzo', Icon: UtensilsCrossed, color: '#2997ff', share: 0.35 },
  { type: 'Cena', Icon: Soup, color: '#bf5af2', share: 0.3 },
];

const DEFAULT_GOALS = { calories: 2000, protein: 100, carbs: 250, fat: 65, source: 'macro' };
const GOALS_KEY = 'app1_nutrition_goals_v2';
const PROFILE_KEY = 'app1_nutrition_profile_v1';

function loadGoals() {
  try {
    return JSON.parse(localStorage.getItem(GOALS_KEY)) || DEFAULT_GOALS;
  } catch {
    return DEFAULT_GOALS;
  }
}

/** kcal SEMPRE collegate ai macro (regola 4-4-9): normalizza qualsiasi source. */
function normalizeGoals(g) {
  const next = { ...g, protein: g.protein || 0, carbs: g.carbs || 0, fat: g.fat || 0 };
  next.calories = kcalFromMacros(next);
  next.source = 'macro';
  return next;
}

/**
 * Tab — Nutrizione (screenshot allegato): header data, card "Riepilogo
 * giornata" con chip Obiettivo e macro, card pasti con + rapido e CTA fissa
 * "Registra Alimento". Kcal e macro sempre collegati (4-4-9).
 */
export default function NutritionPage({ selectedDate }) {
  const [view, setView] = useState('oggi');
  const [goals, setGoals] = useState(loadGoals);
  const [profile, setProfile] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(PROFILE_KEY)) || null;
    } catch {
      return null;
    }
  });
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [logMealType, setLogMealType] = useState('Pranzo');
  const [editingMeal, setEditingMeal] = useState(null);

  const dateKey = toDateKey(selectedDate);
  const weekStartKey = toDateKey(getMonday(selectedDate));

  const { data: meals, isLoading, addMeal, updateMeal, removeMeal } = useMeals(dateKey);
  const { data: plan, isLoading: planLoading, savePlan } = useMealPlan(weekStartKey);
  const { data: metrics, addMetric, updateMetric, removeMetric } = useBodyMetrics();

  // Auto-inizializza il piano con la rotazione predefinita (per ogni settimana)
  const planInitRef = useRef(null);
  useEffect(() => {
    if (!planLoading && plan === null && planInitRef.current !== weekStartKey) {
      planInitRef.current = weekStartKey;
      savePlan(DEFAULT_WEEK_PLAN.map((d) => ({ ...d })));
    }
  }, [plan, planLoading, savePlan, weekStartKey]);

  const updateGoal = useCallback((key, value) => {
    setGoals((g) => {
      const next = normalizeGoals({ ...g, [key]: Number(value) || 0 });
      localStorage.setItem(GOALS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  // Salvataggio target (dal planner Obiettivo) → la pagina si aggiorna SUBITO
  const applyPlan = useCallback(({ profile: p, goals: g }) => {
    const next = normalizeGoals(g);
    setGoals(next);
    setProfile(p);
    localStorage.setItem(GOALS_KEY, JSON.stringify(next));
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  }, []);

  const openLog = useCallback((mealType) => {
    setLogMealType(mealType);
    setLogOpen(true);
  }, []);

  // Totali: kcal SEMPRE derivate dai macro dei pasti
  const totals = useMemo(() => {
    const sum = (meals ?? []).reduce(
      (acc, m) => ({
        protein: acc.protein + (m.protein || 0),
        carbs: acc.carbs + (m.carbs || 0),
        fat: acc.fat + (m.fat || 0),
      }),
      { protein: 0, carbs: 0, fat: 0 }
    );
    return { ...sum, calories: kcalFromMacros(sum) };
  }, [meals]);

  const remainingKcal = Math.max(0, (goals.calories || 0) - totals.calories);
  const kcalRatio = goals.calories > 0 ? Math.min(totals.calories / goals.calories, 1) : 0;

  // Misure correnti dalla sezione "Andamento" (fonte automatica del planner)
  const lastMetric = useMemo(() => {
    const sorted = [...(metrics ?? [])].sort((a, b) => a.date.localeCompare(b.date));
    const weight = [...sorted].reverse().find((m) => m.weightKg != null);
    const height = [...sorted].reverse().find((m) => m.heightCm != null);
    return { weightKg: weight?.weightKg, heightCm: height?.heightCm };
  }, [metrics]);

  const goalLabel = useMemo(() => {
    if (!profile) return 'Aumento peso';
    const g = profile.goal === 'gain' ? 'Aumento peso' : profile.goal === 'lose' ? 'Diminuzione peso' : 'Mantenimento';
    return g;
  }, [profile]);

  const isToday = dateKey === toDateKey(new Date());

  return (
    <div className="h-full overflow-y-auto scrollable px-4 pt-2 pb-44">
      {/* Header (screenshot): OGGI / data */}
      <div className="mb-4">
        <p className="text-[11px] font-semibold text-[#8e8e93] uppercase tracking-[0.08em]">
          {isToday ? 'Oggi' : format(parseISO(dateKey), 'EEEE', { locale: it })}
        </p>
        <h1 className="text-[19px] font-semibold text-label tracking-tight capitalize leading-snug">
          {format(parseISO(dateKey), 'd MMMM', { locale: it })}
        </h1>
      </div>

      <div className="mb-4">
        <SegmentedControl
          segments={[
            { id: 'oggi', label: 'Oggi' },
            { id: 'planner', label: 'Planner' },
            { id: 'andamento', label: 'Andamento' },
          ]}
          value={view}
          onChange={setView}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
        >
          {view === 'oggi' && (
            <div className="flex flex-col gap-3.5">
              {/* ── Riepilogo giornata (screenshot) ── */}
              <div className="card p-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-full bg-sky/15 border border-sky/30 grid place-items-center shrink-0">
                    <Flame size={15} className="text-sky" />
                  </span>
                  <span className="flex-1 text-[16px] font-semibold text-label">Riepilogo giornata</span>
                  {goals.calories > 0 && (
                    <span className="text-[11px] text-label-secondary bg-white/[0.06] rounded-full px-2.5 py-1 tabular-nums shrink-0">
                      restano <span className="font-semibold text-label">{remainingKcal}</span>
                    </span>
                  )}
                </div>

                {/* Chip Obiettivo → apre il planner */}
                <button
                  onClick={() => setPlannerOpen(true)}
                  className="mt-3 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full border border-sky/40 bg-sky/10 text-sky text-[13px] font-semibold active:scale-[0.97] transition-transform"
                >
                  <Scale size={13} className="shrink-0" />
                  Obiettivo <span className="font-normal text-sky/80">· {goalLabel}</span>
                </button>

                {/* Kcal totali */}
                <div className="flex items-baseline gap-1.5 mt-4">
                  <span className="text-[44px] leading-none font-semibold text-label tracking-tight tabular-nums">{totals.calories}</span>
                  <span className="text-[14px] text-label-tertiary">kcal {goals.calories > 0 && `/ ${goals.calories}`}</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-fill-tertiary overflow-hidden mt-3">
                  <motion.div
                    className="h-full rounded-full"
                    animate={{ width: `${kcalRatio * 100}%` }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    style={{ backgroundColor: kcalRatio >= 1 ? '#ff375f' : kcalRatio >= 0.8 ? '#ff9f0a' : '#0066cc' }}
                  />
                </div>

                {/* Macro */}
                <div className="grid grid-cols-3 gap-2 mt-4">
                  {MACROS.map((macro) => {
                    const eaten = totals[macro.key] ?? 0;
                    const goal = goals[macro.goal] || 0;
                    const ratio = goal > 0 ? Math.min(eaten / goal, 1) : 0;
                    return (
                      <div key={macro.key} className="bg-white/[0.04] border border-white/[0.05] rounded-2xl py-3 px-2.5">
                        <div className="flex items-center gap-1.5 mb-1.5 min-w-0">
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: macro.color }} />
                          <span className="text-[9.5px] text-[#9a9aa0] uppercase tracking-wide truncate" title={macro.label}>{macro.label}</span>
                        </div>
                        <span className="text-[22px] font-semibold text-label tabular-nums leading-none">{Math.round(eaten)}<span className="text-[11px] text-label-tertiary font-normal">g</span></span>
                        {goal > 0 && (
                          <>
                            <div className="w-full h-1 rounded-full bg-fill-tertiary overflow-hidden mt-2.5 mb-1.5">
                              <div className="h-full rounded-full" style={{ width: `${ratio * 100}%`, backgroundColor: macro.color }} />
                            </div>
                            <span className="text-[10px] text-label-tertiary tabular-nums">{Math.round(eaten)} / {goal} g</span>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Target collegati (sola lettura) */}
                <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.05] rounded-xl px-3 py-2.5 mt-3">
                  <Link2 size={14} className="text-sky shrink-0" />
                  <p className="flex-1 text-[13px] font-semibold text-label tabular-nums">
                    {goals.calories} <span className="text-[11px] font-normal text-label-tertiary">kcal</span>
                  </p>
                  <button
                    onClick={() => setPlannerOpen(true)}
                    className="text-[12px] text-sky font-semibold shrink-0 min-h-8 flex items-center gap-1"
                  >
                    <PencilLine size={11} /> Modifica
                  </button>
                </div>
              </div>

              {/* ── Pasti di oggi (screenshot): card con + rapido ── */}
              <div className="flex items-center justify-between mb-0.5 px-1">
                <h2 className="text-[12px] font-semibold text-[#8e8e93] uppercase tracking-[0.08em]">Pasti di oggi</h2>
                <button
                  onClick={() => openLog('Pranzo')}
                  className="text-[13px] text-sky font-semibold min-h-9 flex items-center shrink-0"
                >
                  + Aggiungi pasto
                </button>
              </div>

              {isLoading ? null : (
                <div className="flex flex-col gap-3">
                  {MEAL_CARDS.map(({ type, mealType, Icon, color, share }) => {
                    const items = (meals ?? []).filter((m) => m.mealType === (mealType || type));
                    const kcalSum = items.reduce((s, m) => s + kcalFromMacros(m), 0);
                    const suggested = Math.round((goals.calories || 0) * share / 10) * 10;
                    return (
                      <div key={type} className="card overflow-hidden">
                        <div className="flex items-center gap-3 px-3.5 py-3">
                          <span
                            className="w-10 h-10 rounded-xl grid place-items-center shrink-0 border"
                            style={{ backgroundColor: `${color}1f`, borderColor: `${color}33` }}
                          >
                            <Icon size={19} style={{ color }} />
                          </span>
                          <button onClick={() => openLog(mealType || type)} className="flex-1 min-w-0 text-left active:opacity-70 transition-opacity">
                            <p className="text-[15px] font-semibold text-label leading-snug truncate">{type}</p>
                            <p className="text-[12.5px] text-label-tertiary leading-snug">
                              {items.length === 0
                                ? suggested > 0
                                  ? `Consigliati ~ ${suggested} kcal`
                                  : 'Nessun alimento inserito'
                                : `${items.length} ${items.length === 1 ? 'alimento' : 'alimenti'} · ${kcalSum} kcal`}
                            </p>
                          </button>
                          <button
                            onClick={() => openLog(mealType || type)}
                            className="w-9 h-9 rounded-full bg-white/[0.07] border border-white/[0.1] grid place-items-center shrink-0 active:bg-white/[0.14] transition-colors"
                            aria-label={`Aggiungi a ${type}`}
                          >
                            <Plus size={17} className="text-label" />
                          </button>
                        </div>

                        {/* Alimenti registrati (modifica/elimina in-post) */}
                        {items.length > 0 && (
                          <div className="border-t border-white/[0.06]">
                            {items.map((meal) => (
                              <motion.div
                                key={meal._id}
                                layout
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0, height: 0 }}
                                className="flex items-center gap-3 px-3.5 py-2.5 border-b border-white/[0.05] last:border-0"
                              >
                                <button
                                  onClick={() => setEditingMeal(meal)}
                                  className="flex-1 min-w-0 text-left active:opacity-70 transition-opacity"
                                  aria-label={`Modifica ${meal.description}`}
                                >
                                  <p className="text-[14px] text-label leading-snug truncate">{meal.description}</p>
                                  <span className="text-[11px] text-label-tertiary tabular-nums flex items-center gap-1">
                                    P{Math.round(meal.protein || 0)} · C{Math.round(meal.carbs || 0)} · G{Math.round(meal.fat || 0)}
                                    <Pencil size={9} className="opacity-70 shrink-0" />
                                  </span>
                                </button>
                                <span className="text-[13.5px] font-semibold text-label tabular-nums shrink-0">{kcalFromMacros(meal)} kcal</span>
                                <button
                                  onClick={() => removeMeal(meal._id)}
                                  className="w-8 h-8 rounded-full flex items-center justify-center text-label-tertiary active:text-sys-red shrink-0"
                                  aria-label="Elimina pasto"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </motion.div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {(!meals || meals.length === 0) && !isLoading && (
                    <EmptyState title="Nessun alimento registrato" subtitle='Tocca "Registra Alimento" o il + su un pasto' icon={UtensilsCrossed} />
                  )}
                </div>
              )}
            </div>
          )}

          {view === 'planner' && (
            <div>
              <div className="flex items-center gap-2 mb-3 px-1">
                <CalendarRange size={15} className="text-label-tertiary" />
                <span className="text-[13px] text-label-secondary capitalize">
                  Settimana del {format(parseISO(weekStartKey), 'd MMMM', { locale: it })}
                </span>
              </div>
              <WeeklyPlanTable plan={plan} onUpdatePlan={savePlan} />
            </div>
          )}

          {view === 'andamento' && (
            <MetricsCharts
              metrics={metrics ?? []}
              onAdd={(fields) => addMetric({ date: dateKey, ...fields })}
              onUpdate={(id, patch) => updateMetric(id, patch)}
              onRemove={(id) => removeMetric(id)}
              defaultDate={dateKey}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* CTA fissa "Registra Alimento" (screenshot): sempre intera, sopra la nav */}
      {view === 'oggi' && (
        <div
          className="fixed z-30 inset-x-0"
          style={{
            bottom: 'calc(var(--bottom-nav-h, 78px) + env(safe-area-inset-bottom, 8px) + 12px)',
            paddingLeft: 'max(16px, calc(50vw - 199px))',
            paddingRight: 'max(16px, calc(50vw - 199px))',
          }}
        >
          <button
            onClick={() => openLog(defaultMealTypeByHour())}
            className="w-full rounded-full bg-accent border border-blue-400/30 text-white text-[15px] font-semibold flex items-center justify-center gap-2 shadow-lg shadow-blue-600/40 active:bg-accent-pressed active:scale-[0.98] transition-all"
          >
            <Plus size={18} strokeWidth={2.5} className="shrink-0" /> Registra Alimento
          </button>
        </div>
      )}

      {/* Planner Obiettivo: remount ad ogni apertura → parte dai dati correnti */}
      {plannerOpen && (
        <GoalPlannerDialog
          isOpen
          onClose={() => setPlannerOpen(false)}
          onApply={applyPlan}
          initial={{
            ...(profile || {}),
            age: profile?.age || 16,
            weightKg: profile?.weightKg || lastMetric.weightKg || '',
            heightCm: profile?.heightCm || lastMetric.heightCm || '',
          }}
        />
      )}

      {/* Registra alimento (AI o manuale) con tipo pasto preimpostato */}
      <MealLogDialog
        isOpen={logOpen}
        onClose={() => setLogOpen(false)}
        onConfirm={(fields) => {
          addMeal({ ...fields, date: dateKey });
          setLogOpen(false);
        }}
        defaultMealType={logMealType}
      />

      {/* Modifica pasto (in-post) */}
      <MealEditDialog
        meal={editingMeal}
        onClose={() => setEditingMeal(null)}
        onSave={(id, patch) => updateMeal(id, patch)}
      />
    </div>
  );
}

/** Tipo pasto suggerito dall'ora corrente. */
function defaultMealTypeByHour() {
  const h = new Date().getHours();
  if (h < 10) return 'Colazione';
  if (h < 12) return 'Spuntino';
  if (h < 15) return 'Pranzo';
  if (h < 18) return 'Spuntino';
  return 'Cena';
}
