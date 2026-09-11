import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Flame, Trash2, UtensilsCrossed, CalendarRange, Target, Link2, Scale, Pencil } from 'lucide-react';
import { useMeals, useMealPlan, useBodyMetrics } from '../hooks/useData';
import SegmentedControl from '../components/ui/SegmentedControl';
import AiMealInput from '../components/nutrition/AiMealInput';
import WeeklyPlanTable from '../components/nutrition/WeeklyPlanTable';
import MetricsCharts from '../components/nutrition/MetricsCharts';
import GoalPlannerDialog from '../components/nutrition/GoalPlannerDialog';
import MealEditDialog from '../components/nutrition/MealEditDialog';
import EmptyState from '../components/ui/EmptyState';
import { toDateKey, getMonday, formatDateDisplay, parseISO } from '../lib/dates';
import { DEFAULT_WEEK_PLAN, MEAL_TYPES } from '../lib/constants';
import { kcalFromMacros } from '../lib/nutritionMath';

const MACROS = [
  { key: 'protein', label: 'Proteine', short: 'P', color: '#30d158', goal: 'protein' },
  { key: 'carbs', label: 'Carboidrati', short: 'C', color: '#ffd60a', goal: 'carbs' },
  { key: 'fat', label: 'Grassi', short: 'G', color: '#ff375f', goal: 'fat' },
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
 * Tab — Nutrizione: macro e kcal SEMPRE collegati (regola 4-4-9: P·4 + C·4 + G·9).
 * Obiettivo giornaliero calcolato da BMR/TDEE + surplus (aumento peso) o deficit.
 * Ogni pasto è modificabile a posteriori (descrizione, tipo, macro).
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

  // Salvataggio target (dal planner Obiettivo) → la pagina si aggiorna SUBITO:
  // goals è stato React e kcal è ricalcolata 4-4-9 per restare coerente.
  const applyPlan = useCallback(({ profile: p, goals: g }) => {
    const next = normalizeGoals(g);
    setGoals(next);
    setProfile(p);
    localStorage.setItem(GOALS_KEY, JSON.stringify(next));
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
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

  // Ultimo peso/altezza per prefill del planner
  const lastMetric = useMemo(() => {
    const sorted = [...(metrics ?? [])].sort((a, b) => a.date.localeCompare(b.date));
    const weight = [...sorted].reverse().find((m) => m.weightKg != null);
    const height = [...sorted].reverse().find((m) => m.heightCm != null);
    return { weightKg: weight?.weightKg, heightCm: height?.heightCm };
  }, [metrics]);

  const groupedMeals = useMemo(
    () =>
      MEAL_TYPES.map((type) => ({
        type,
        items: (meals ?? []).filter((m) => m.mealType === type),
      })).filter((g) => g.items.length > 0),
    [meals]
  );

  const goalLabel = useMemo(() => {
    if (!profile) return '';
    const g = profile.goal === 'gain' ? 'Aumento' : profile.goal === 'lose' ? 'Diminuzione' : 'Mantenimento';
    const p = profile.pace === 'lean' || profile.pace === 'gentle' ? 'leggero' : profile.pace === 'strong' ? 'sostenuto' : 'standard';
    return `${g} peso (${p})`;
  }, [profile]);

  return (
    <div className="h-full overflow-y-auto scrollable px-4 pt-2 pb-32">
      {/* Header */}
      <div className="mb-3">
        <h1 className="text-[28px] font-semibold text-label tracking-tight leading-tight">Nutrizione</h1>
        <p className="text-[13px] text-label-secondary capitalize">{formatDateDisplay(parseISO(dateKey))}</p>
      </div>

      <div className="mb-5">
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
            <div className="flex flex-col gap-4">
              <AiMealInput onConfirm={(fields) => addMeal({ ...fields, date: dateKey })} />

              {/* Obiettivi giornalieri: macro = fonte, kcal collegata */}
              <div className="card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Target size={15} className="text-sky" />
                  <span className="text-[13px] font-semibold text-label-secondary flex-1">Obiettivi giornalieri</span>
                  <button onClick={() => setPlannerOpen(true)} className="text-[13px] font-semibold text-sky min-h-9 flex items-center gap-1">
                    <Scale size={13} /> Obiettivo {goalLabel ? '· ' + goalLabel : ''}
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {MACROS.map((m) => (
                    <label key={m.key} className="bg-surface-2 rounded-xl p-2 text-[10px] text-label-tertiary">
                      <span className="flex items-center justify-center gap-1.5 mb-1">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                        {m.label}
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={goals[m.goal] ?? 0}
                        onChange={(e) => updateGoal(m.goal, e.target.value)}
                        className="w-full bg-transparent text-[16px] font-semibold text-label text-center"
                        inputMode="numeric"
                      />
                      <span className="block text-center">g</span>
                    </label>
                  ))}
                </div>
                {/* Kcal = P·4 + C·4 + G·9 (sola lettura, aggiornata in automatico) */}
                <div className="flex items-center gap-2.5 bg-surface-2 rounded-xl px-3 py-2.5">
                  <Link2 size={15} className="text-sky shrink-0" />
                  <p className="flex-1 text-[14px] font-semibold text-label tabular-nums">
                    {goals.calories} <span className="text-[11px] font-normal text-label-tertiary">kcal</span>
                  </p>
                </div>
              </div>

              {/* Riepilogo giornata: kcal calcolata dai macro */}
              <div className="card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Flame size={18} className="text-sky" />
                  <span className="text-[15px] font-semibold text-label">Riepilogo giornata</span>
                  {goals.calories > 0 && (
                    <span className="ml-auto text-[12px] text-label-tertiary tabular-nums">
                      restano {remainingKcal} kcal
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-1.5 mb-1">
                  <span className="text-[40px] leading-none font-semibold text-label tracking-tight tabular-nums">{totals.calories}</span>
                  <span className="text-[14px] text-label-tertiary">kcal</span>
                  {goals.calories > 0 && (
                    <span className="text-[12px] text-label-tertiary">/ {goals.calories}</span>
                  )}
                </div>
                {goals.calories > 0 && (
                  <div className="w-full h-2 rounded-full bg-fill-tertiary overflow-hidden mb-3">
                    <motion.div
                      className="h-full rounded-full"
                      animate={{ width: `${kcalRatio * 100}%` }}
                      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                      style={{ backgroundColor: kcalRatio >= 1 ? '#ff375f' : kcalRatio >= 0.8 ? '#ff9f0a' : '#2997ff' }}
                    />
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2">
                  {MACROS.map((macro) => {
                    const eaten = totals[macro.key] ?? 0;
                    const goal = goals[macro.goal] || 0;
                    const ratio = goal > 0 ? Math.min(eaten / goal, 1) : 0;
                    return (
                      <div key={macro.key} className="bg-surface-2 rounded-xl py-3 px-2">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: macro.color }} />
                          <span className="text-[10px] text-label-tertiary uppercase tracking-wide">{macro.label}</span>
                        </div>
                        <span className="text-[17px] font-semibold text-label tabular-nums">{Math.round(eaten)}g</span>
                        {goal > 0 && (
                          <>
                            <div className="w-full h-1 rounded-full bg-fill-tertiary overflow-hidden mt-2 mb-1">
                              <div className="h-full rounded-full" style={{ width: `${ratio * 100}%`, backgroundColor: macro.color }} />
                            </div>
                            <span className="text-[10px] text-label-tertiary tabular-nums">{Math.round(eaten)} / {goal} g</span>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pasti registrati (tap = modifica, cestino = elimina) */}
              {isLoading ? null : meals.length === 0 ? (
                <EmptyState title="Nessun pasto registrato" subtitle='Prova il log AI: "150g pollo e riso"' icon={UtensilsCrossed} />
              ) : (
                groupedMeals.map((group) => (
                  <div key={group.type}>
                    <h3 className="text-[13px] font-semibold text-label-secondary uppercase tracking-wide mb-2 px-1">{group.type}</h3>
                    <div className="card overflow-hidden">
                      <AnimatePresence initial={false}>
                        {group.items.map((meal) => (
                          <motion.div
                            key={meal._id}
                            layout
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0, height: 0 }}
                            className="flex items-center gap-3 px-4 py-3.5 border-b border-separator last:border-0"
                          >
                            <button
                              onClick={() => setEditingMeal(meal)}
                              className="flex-1 min-w-0 text-left active:opacity-70 transition-opacity"
                              aria-label={`Modifica ${meal.description}`}
                            >
                              <p className="text-[15px] text-label leading-snug">{meal.description}</p>
                              <span className="text-[11px] text-label-tertiary tabular-nums flex items-center gap-1">
                                <Pencil size={9} />
                                modifica
                              </span>
                            </button>
                            <div className="text-right shrink-0">
                              <p className="text-[15px] font-semibold text-label tabular-nums">{kcalFromMacros(meal)} <span className="text-[11px] text-label-tertiary font-normal">kcal</span></p>
                              <p className="text-[11px] text-label-tertiary tabular-nums">
                                P{meal.protein ?? 0} · C{meal.carbs ?? 0} · G{meal.fat ?? 0}
                              </p>
                            </div>
                            <button
                              onClick={() => removeMeal(meal._id)}
                              className="w-9 h-9 rounded-full flex items-center justify-center text-label-tertiary active:text-sys-red shrink-0"
                              aria-label="Elimina pasto"
                            >
                              <Trash2 size={15} />
                            </button>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                ))
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

      {/* Planner Obiettivo: remount ad ogni apertura → parte dai dati correnti,
          e "Applica" aggiorna subito la pagina (vedi applyPlan) */}
      {plannerOpen && (
        <GoalPlannerDialog
          isOpen
          onClose={() => setPlannerOpen(false)}
          onApply={applyPlan}
          initial={{
            ...(profile || {}),
            weightKg: profile?.weightKg || lastMetric.weightKg || '',
            heightCm: profile?.heightCm || lastMetric.heightCm || '',
          }}
        />
      )}

      {/* Modifica pasto (in-post): descrizione, tipo, macro con kcal collegate */}
      <MealEditDialog
        meal={editingMeal}
        onClose={() => setEditingMeal(null)}
        onSave={(id, patch) => updateMeal(id, patch)}
      />
    </div>
  );
}
