import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Flame, Trash2, UtensilsCrossed, CalendarRange } from 'lucide-react';
import { useMeals, useMealPlan, useBodyMetrics } from '../hooks/useData';
import SegmentedControl from '../components/ui/SegmentedControl';
import AiMealInput from '../components/nutrition/AiMealInput';
import WeeklyPlanTable from '../components/nutrition/WeeklyPlanTable';
import MetricsCharts from '../components/nutrition/MetricsCharts';
import EmptyState from '../components/ui/EmptyState';
import { toDateKey, getMonday, formatDateDisplay, parseISO } from '../lib/dates';
import { DEFAULT_WEEK_PLAN, MEAL_TYPES } from '../lib/constants';
import { cn } from '../lib/cn';

const MACROS = [
  { key: 'protein', label: 'Proteine', color: '#30d158' },
  { key: 'carbs', label: 'Carboidrati', color: '#ffd60a' },
  { key: 'fat', label: 'Grassi', color: '#ff375f' },
];

/**
 * Tab 3 — Nutrizione: log macro/calorie via Gemini AI, rotazione pasti
 * settimanale con swap rapido, grafici peso/altezza.
 */
export default function NutritionPage({ selectedDate }) {
  const [view, setView] = useState('oggi');
  const [goals, setGoals] = useState(() => { try { return JSON.parse(localStorage.getItem('app1_nutrition_goals')) || {calories:2000,protein:100,carbs:250,fat:65}; } catch { return {calories:2000,protein:100,carbs:250,fat:65}; } });
  const updateGoal = (key, value) => { const next={...goals,[key]:Number(value)}; setGoals(next); localStorage.setItem('app1_nutrition_goals',JSON.stringify(next)); };
  const dateKey = toDateKey(selectedDate);
  const weekStartKey = toDateKey(getMonday(selectedDate));

  const { data: meals, isLoading, addMeal, removeMeal } = useMeals(dateKey);
  const { data: plan, isLoading: planLoading, savePlan } = useMealPlan(weekStartKey);
  const { data: metrics, addMetric } = useBodyMetrics();

  // Auto-inizializza il piano con la rotazione predefinita (per ogni settimana)
  const planInitRef = useRef(null);
  useEffect(() => {
    if (!planLoading && plan === null && planInitRef.current !== weekStartKey) {
      planInitRef.current = weekStartKey;
      savePlan(DEFAULT_WEEK_PLAN.map((d) => ({ ...d })));
    }
  }, [plan, planLoading, savePlan, weekStartKey]);

  const totals = useMemo(() => {
    return (meals ?? []).reduce(
      (acc, m) => ({
        calories: acc.calories + (m.calories || 0),
        protein: acc.protein + (m.protein || 0),
        carbs: acc.carbs + (m.carbs || 0),
        fat: acc.fat + (m.fat || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [meals]);

  const groupedMeals = useMemo(
    () =>
      MEAL_TYPES.map((type) => ({
        type,
        items: (meals ?? []).filter((m) => m.mealType === type),
      })).filter((g) => g.items.length > 0),
    [meals]
  );

  return (
    <div className="h-full overflow-y-auto scrollable px-4 pt-2 pb-32">
      {/* Header */}
      <div className="mb-3">
        <h1 className="text-[28px] font-bold text-label tracking-tight leading-tight">Nutrizione</h1>
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
              <AiMealInput
                onConfirm={(fields) => addMeal({ ...fields, date: dateKey })}
              />

              <div className="bg-surface-1 rounded-2xl p-4"><p className="text-[13px] font-semibold text-label-secondary mb-3">Obiettivi giornalieri</p><div className="grid grid-cols-4 gap-2">{[['calories','kcal'],['protein','P g'],['carbs','C g'],['fat','G g']].map(([key,label])=><label key={key} className="bg-surface-2 rounded-xl p-2 text-[10px] text-label-tertiary"><input type="number" min="0" value={goals[key]} onChange={(e)=>updateGoal(key,e.target.value)} className="w-full bg-transparent text-[16px] font-semibold"/>{label}</label>)}</div></div>
              {/* Riepilogo giorno */}
              <div className="bg-surface-1 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Flame size={18} className="text-accent" />
                  <span className="text-[15px] font-semibold text-label">Riepilogo giornata</span>
                </div>
                <div className="flex items-baseline gap-1.5 mb-4">
                  <span className="text-[40px] leading-none font-bold text-label tracking-tight tabular-nums">{totals.calories}</span>
                  <span className="text-[14px] text-label-tertiary">kcal</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {MACROS.map((macro) => (
                    <div key={macro.key} className="bg-surface-2 rounded-xl py-3 px-2">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: macro.color }} />
                        <span className="text-[10px] text-label-tertiary uppercase tracking-wide">{macro.label}</span>
                      </div>
                      <span className="text-[17px] font-bold text-label tabular-nums">{totals[macro.key]}g</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pasti registrati */}
              {isLoading ? null : meals.length === 0 ? (
                <EmptyState title="Nessun pasto registrato" subtitle='Prova il log AI: "150g pollo e riso"' icon={UtensilsCrossed} />
              ) : (
                groupedMeals.map((group) => (
                  <div key={group.type}>
                    <h3 className="text-[13px] font-semibold text-label-secondary uppercase tracking-wide mb-2 px-1">{group.type}</h3>
                    <div className="bg-surface-1 rounded-2xl overflow-hidden">
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
                            <div className="flex-1 min-w-0">
                              <p className="text-[15px] text-label leading-snug">{meal.description}</p>
                              {meal.parsedByAI && (
                                <span className="text-[11px] text-accent mt-0.5 inline-block">✦ analizzato da Gemini</span>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-[15px] font-semibold text-label tabular-nums">{meal.calories ?? '—'} <span className="text-[11px] text-label-tertiary font-normal">kcal</span></p>
                              <p className="text-[11px] text-label-tertiary tabular-nums">
                                P{meal.protein ?? 0} · C{meal.carbs ?? 0} · G{meal.fat ?? 0}
                              </p>
                            </div>
                            <button
                              onClick={() => removeMeal(meal._id)}
                              className="w-8 h-8 rounded-full flex items-center justify-center text-label-tertiary active:text-sys-red shrink-0"
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
              <p className="text-[12px] text-label-tertiary text-center mt-4 px-6 leading-relaxed">
                Tocca una cella per modificare il pasto. Usa "Scambia giorni" per uno swap rapido tra due giorni.
              </p>
            </div>
          )}

          {view === 'andamento' && (
            <MetricsCharts metrics={metrics ?? []} onAdd={(fields) => addMetric({ date: dateKey, ...fields })} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
