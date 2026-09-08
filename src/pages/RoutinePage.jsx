import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Play, Check, RotateCcw, Dumbbell, Clock3, Trash2, Plus } from 'lucide-react';
import { useRoutine } from '../hooks/useData';
import { useRoutineSession, routineSession } from '../store/routineSession';
import RoutineCarousel from '../components/routine/RoutineCarousel';
import { DEFAULT_ROUTINE_STEPS } from '../lib/constants';
import { toDateKey, formatSeconds, formatMinutes } from '../lib/dates';
import { cn } from '../lib/cn';

/**
 * Tab 2 — Routine: sequence post-volley (Doccia, Capelli, Skincare, Denti, Cena)
 * con timer a scorrimento e tracciamento dei tempi effettivi.
 */
export default function RoutinePage({ selectedDate }) {
  const dateKey = toDateKey(selectedDate);
  const { data: savedRoutine, isLoading, saveRoutine } = useRoutine(dateKey);
  const session = useRoutineSession();
  const [savedFlash, setSavedFlash] = useState(false);
  const [editing, setEditing] = useState(false);
  const [routineSteps, setRoutineSteps] = useState(() => {
    try { return JSON.parse(localStorage.getItem('app1_routine_steps')) || DEFAULT_ROUTINE_STEPS; } catch { return DEFAULT_ROUTINE_STEPS; }
  });
  const saveSteps = (steps) => { setRoutineSteps(steps); localStorage.setItem('app1_routine_steps', JSON.stringify(steps)); };

  const isActiveSession = session.dateKey === dateKey && session.steps.length > 0 && session.status !== 'idle';
  const showSummary = !isActiveSession && savedRoutine && savedRoutine.completedAt;
  const showIntro = !isActiveSession && !showSummary && !isLoading;

  // Persistenza automatica: ad ogni step completato e al termine sessione
  const prevCompletedRef = useRef(0);
  useEffect(() => {
    if (session.dateKey !== dateKey || session.steps.length === 0) return;
    const completedCount = session.steps.filter((s) => s.status === 'done').length;
    const finished = session.status === 'done';

    if (completedCount !== prevCompletedRef.current || finished) {
      prevCompletedRef.current = completedCount;
      saveRoutine({
        date: dateKey,
        steps: session.steps.map(({ name, targetMinutes, actualSeconds, status }) => ({
          name,
          targetMinutes,
          actualSeconds: Math.round(actualSeconds || 0),
          completed: status === 'done',
        })),
        startedAt: session.startedAt,
        completedAt: finished ? session.completedAt : undefined,
      });
      if (finished) {
        setSavedFlash(true);
        const t = setTimeout(() => setSavedFlash(false), 2600);
        return () => clearTimeout(t);
      }
    }
  }, [session, dateKey, saveRoutine]);

  const totalActual = useMemo(
    () => (savedRoutine?.steps ?? []).reduce((s, st) => s + (st.actualSeconds || 0), 0),
    [savedRoutine]
  );

  const begin = () => routineSession.begin(dateKey, routineSteps);

  return (
    <div className="h-full overflow-y-auto scrollable px-4 pt-2 pb-32">
      {/* Header */}
      <div className="flex items-end justify-between mb-4">
        <div>
          <h1 className="text-[28px] font-bold text-label tracking-tight leading-tight">Routine</h1>
          <p className="text-[13px] text-label-secondary capitalize">
            {format(selectedDate, 'EEEE d MMMM', { locale: it })} · Post-volley
          </p>
        </div>
      </div>

      {/* Flash salvataggio */}
      <AnimatePresence>
        {savedFlash && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 bg-sys-green/15 text-sys-green text-[13px] font-semibold rounded-full px-4 py-2 mb-3 w-fit mx-auto"
          >
            <Check size={14} strokeWidth={3} /> Routine salvata con tempi effettivi
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sessione in corso → carousel */}
      {isActiveSession && (
        <RoutineCarousel
          session={session}
          onPause={() => routineSession.pause()}
          onResume={() => routineSession.resume()}
          onComplete={() => routineSession.completeStep()}
        />
      )}

      {/* Sessione completata appena → riepilogo celebrativo */}
      {session.dateKey === dateKey && session.status === 'done' && (
        <CompletionSummary session={session} />
      )}

      {/* Riepilogo routine salvata */}
      {showSummary && (
        <SavedSummary routine={savedRoutine} totalActual={totalActual} onRepeat={begin} />
      )}

      {/* Intro / avvio */}
      {showIntro && (
        <div>
          <div className="bg-surface-1 rounded-2xl p-5 mb-4">
            <div className="flex items-center gap-2 mb-4">
              <Dumbbell size={18} className="text-accent" />
              <span className="text-[15px] font-semibold text-label">La mia sequenza</span>
              <button onClick={() => setEditing(!editing)} className="ml-auto text-[13px] text-accent min-h-9">{editing ? 'Fine' : 'Personalizza'}</button>
            </div>
            <div className="flex flex-col gap-1">
              {routineSteps.map((step, i) => (
                <div key={step.name} className="flex items-center justify-between py-2.5 border-b border-separator last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-fill-tertiary text-label-secondary text-[12px] font-semibold flex items-center justify-center">
                      {i + 1}
                    </span>
                    {editing ? <input value={step.name} onChange={(e) => saveSteps(routineSteps.map((s,j) => j === i ? {...s,name:e.target.value} : s))} className="text-[16px] bg-surface-2 rounded-lg px-2 py-1 w-36" aria-label={`Nome attività ${i+1}`} /> : <span className="text-[16px] text-label">{step.name}</span>}
                  </div>
                  {editing ? <div className="flex items-center gap-1"><label className="flex items-center gap-1 text-[12px] text-label-tertiary"><input type="number" min="1" max="180" value={step.targetMinutes} onChange={(e) => saveSteps(routineSteps.map((s,j) => j === i ? {...s,targetMinutes:Number(e.target.value)} : s))} className="w-14 bg-surface-2 rounded-lg px-2 py-1 text-right" /> min</label><button onClick={()=>saveSteps(routineSteps.filter((_,j)=>j!==i))} className="w-9 h-9 grid place-items-center text-sys-red" aria-label="Rimuovi attività"><Trash2 size={15}/></button></div> : <span className="text-[13px] text-label-tertiary tabular-nums">~{step.targetMinutes} min</span>}
                </div>
              ))}
            </div>
            {editing && <button onClick={()=>saveSteps([...routineSteps,{name:'Nuova attività',targetMinutes:10}])} className="w-full h-11 mt-3 rounded-full border border-accent text-accent text-[14px] font-semibold flex items-center justify-center gap-2"><Plus size={16}/> Aggiungi attività</button>}
            <div className="flex items-center justify-center gap-1.5 mt-4 text-[13px] text-label-secondary">
              <Clock3 size={13} />
              Durata totale stimata: {formatMinutes(routineSteps.reduce((s, st) => s + st.targetMinutes, 0))}
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={begin}
            className="w-full h-14 rounded-2xl bg-accent text-white text-[17px] font-semibold flex items-center justify-center gap-2 shadow-lg shadow-accent/25 active:bg-accent-pressed transition-colors"
          >
            <Play size={20} fill="currentColor" /> Avvia routine
          </motion.button>
          <p className="text-[12px] text-label-tertiary text-center mt-3">
            Il timer scorre automaticamente da uno step al successivo registrando i tempi reali
          </p>
        </div>
      )}
    </div>
  );
}

function CompletionSummary({ session }) {
  const total = session.steps.reduce((s, st) => s + (st.actualSeconds || 0), 0);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-surface-1 rounded-2xl p-6 flex flex-col items-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.1 }}
        className="w-20 h-20 rounded-full bg-sys-green/15 flex items-center justify-center mb-4"
      >
        <Check size={40} className="text-sys-green" strokeWidth={3} />
      </motion.div>
      <h2 className="text-[22px] font-bold text-label tracking-tight">Routine completata!</h2>
      <p className="text-[14px] text-label-secondary mt-1 mb-5">
        Tempo totale: {formatSeconds(total)}
      </p>
      <StepList steps={session.steps} />
    </motion.div>
  );
}

function SavedSummary({ routine, totalActual, onRepeat }) {
  return (
    <div>
      <div className="bg-surface-1 rounded-2xl p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[15px] font-semibold text-label">Tempi effettivi di oggi</span>
          <span className="text-[13px] text-label-secondary tabular-nums">{formatSeconds(totalActual)}</span>
        </div>
        <StepList steps={routine.steps} />
      </div>
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={onRepeat}
        className="w-full h-14 rounded-2xl bg-accent text-white text-[17px] font-semibold flex items-center justify-center gap-2 active:bg-accent-pressed transition-colors"
      >
        <RotateCcw size={19} /> Ripeti routine
      </motion.button>
    </div>
  );
}

function StepList({ steps }) {
  return (
    <div className="w-full">
      {steps.map((step, i) => {
        const actualMin = Math.round((step.actualSeconds || 0) / 60);
        const targetMin = step.targetMinutes;
        const faster = actualMin < targetMin;
        const done = step.completed ?? step.status === 'done';
        return (
          <div key={i} className="flex items-center justify-between py-2.5 border-b border-separator last:border-0">
            <div className="flex items-center gap-3">
              <span className={cn('w-6 h-6 rounded-full flex items-center justify-center', done ? 'bg-sys-green/15' : 'bg-fill-tertiary')}>
                {done ? <Check size={12} className="text-sys-green" strokeWidth={3} /> : <span className="text-[12px] font-semibold text-label-secondary">{i + 1}</span>}
              </span>
              <span className={cn('text-[15px]', done ? 'text-label' : 'text-label-secondary')}>{step.name}</span>
            </div>
            <div className="flex items-center gap-2 tabular-nums">
              <span className="text-[14px] font-semibold text-label">{formatSeconds(step.actualSeconds || 0)}</span>
              <span className={cn('text-[11px]', faster ? 'text-sys-green' : 'text-sys-orange')}>
                {faster ? '−' : '+'}{Math.abs(actualMin - targetMin)}m vs obiettivo
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
