import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Play, Check, RotateCcw, Clock3, Trash2, Plus, ChevronUp, ChevronDown, Pencil, X, Layers, LayoutGrid, Square } from 'lucide-react';
import { useRoutine, useRoutineTemplates } from '../hooks/useData';
import { useRoutineSession, routineSession } from '../store/routineSession';
import RoutineCarousel from '../components/routine/RoutineCarousel';
import RoutineIcon, { routineIconName } from '../components/routine/RoutineIcon';
import IconPicker from '../components/routine/IconPicker';
import { ROUTINE_COLORS } from '../lib/constants';
import { toDateKey, formatSeconds, formatMinutes } from '../lib/dates';
import { cn } from '../lib/cn';
import { Dialog } from '../components/ui/Dialog';

/**
 * Tab — Routine: più "schede" (template) con attività personalizzabili;
 * ogni scheda ha una sequenza di step con timer e tempi effettivi.
 */
export default function RoutinePage({ selectedDate }) {
  const dateKey = toDateKey(selectedDate);
  const { data: savedRoutine, isLoading, saveRoutine } = useRoutine(dateKey);
  const { data: templates, isLoading: templatesLoading, createTemplate, updateTemplate, removeTemplate } = useRoutineTemplates();
  const session = useRoutineSession();
  const [savedFlash, setSavedFlash] = useState(false);
  const [editing, setEditing] = useState(false);
  const [activeTemplateId, setActiveTemplateId] = useState(() => localStorage.getItem('app1_routine_active') || null);
  const [newTemplateOpen, setNewTemplateOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [view, setView] = useState('detail'); // detail | overview (panoramica compatta)

  const activeTemplate = useMemo(() => {
    const list = templates ?? [];
    if (!list.length) return null;
    return list.find((t) => t._id === activeTemplateId) ?? list[0];
  }, [templates, activeTemplateId]);

  useEffect(() => {
    if (activeTemplate) localStorage.setItem('app1_routine_active', activeTemplate._id);
  }, [activeTemplate]);

  const saveTemplate = (id, patch) => updateTemplate(id, patch);

  const isActiveSession = session.dateKey === dateKey && session.steps.length > 0 && session.status !== 'idle';
  const showSummary = !isActiveSession && savedRoutine && savedRoutine.completedAt;
  const showIntro = !isActiveSession && !showSummary && !isLoading && !templatesLoading && !!activeTemplate;

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
        routineId: session.routineId,
        routineName: session.routineName,
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

  const beginWith = (template) => {
    if (!template) return;
    routineSession.begin(dateKey, template.steps, {
      routineId: template._id,
      routineName: template.name,
      routineIcon: routineIconName(template),
    });
  };

  const begin = () => beginWith(activeTemplate);

  return (
    <div className="h-full overflow-y-auto scrollable px-4 pt-2 pb-32">
      {/* Header + toggle vista */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h1 className="text-[28px] font-semibold text-label tracking-tight leading-tight">Routine</h1>
          <p className="text-[13px] text-label-secondary capitalize">
            {format(selectedDate, 'EEEE d MMMM', { locale: it })}
          </p>
        </div>
        <div className="flex bg-surface-2 rounded-full p-1 shrink-0" aria-label="Vista routine">
          {[
            { id: 'detail', label: 'Scheda', Icon: Square },
            { id: 'overview', label: 'Tutte', Icon: LayoutGrid },
          ].map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className={cn(
                'h-8 px-3 rounded-full text-[12px] font-semibold flex items-center gap-1.5',
                view === id ? 'bg-accent text-white' : 'text-label-secondary'
              )}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Selettore schede routine (solo vista dettaglio) */}
      {view === 'detail' && (
        <div className="flex gap-2 overflow-x-auto scrollable-x pb-2 mb-4 -mx-1 px-1">
          {(templates ?? []).map((t) => {
            const active = activeTemplate?._id === t._id;
            return (
              <button
                key={t._id}
                onClick={() => setActiveTemplateId(t._id)}
                className={cn(
                  'flex items-center gap-2 h-11 px-4 rounded-full text-[14px] font-semibold shrink-0 transition-colors',
                  active ? 'text-white' : 'bg-surface-2 text-label-secondary'
                )}
                style={active ? { backgroundColor: t.color } : undefined}
              >
                <RoutineIcon template={t} size={16} className={active ? 'text-white' : undefined} />
                {t.name}
              </button>
            );
          })}
          <button
            onClick={() => setNewTemplateOpen(true)}
            className="flex items-center gap-1.5 h-11 px-4 rounded-full bg-surface-2 text-label-secondary text-[14px] font-semibold shrink-0 border border-dashed border-label-quaternary"
          >
            <Plus size={15} /> Nuova scheda
          </button>
        </div>
      )}

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

      {/* Vista panoramica: tutte le schede in formato compatto */}
      {view === 'overview' && !isActiveSession && (
        <OverviewGrid
          templates={templates ?? []}
          activeId={activeTemplate?._id}
          onOpen={(t) => {
            setActiveTemplateId(t._id);
            setView('detail');
          }}
          onStart={(t) => {
            setActiveTemplateId(t._id);
            beginWith(t);
          }}
          onNew={() => setNewTemplateOpen(true)}
        />
      )}

      {/* Riepilogo routine salvata */}
      {view === 'detail' && showSummary && (
        <SavedSummary routine={savedRoutine} totalActual={totalActual} onRepeat={begin} />
      )}

      {/* Intro / avvio */}
      {view === 'detail' && showIntro && activeTemplate && (
        <div>
          <div className="card p-5 mb-4">
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-9 h-9 rounded-xl grid place-items-center shrink-0"
                style={{ backgroundColor: `${activeTemplate.color}22` }}
              >
                <RoutineIcon template={activeTemplate} size={18} />
              </div>
              <div className="flex-1 min-w-0">
                {editing ? (
                  <input
                    value={activeTemplate.name}
                    onChange={(e) => saveTemplate(activeTemplate._id, { name: e.target.value })}
                    className="text-[16px] bg-surface-2 rounded-lg px-2 py-1 w-full"
                    aria-label="Nome routine"
                  />
                ) : (
                  <span className="text-[16px] font-semibold text-label">{activeTemplate.name}</span>
                )}
                <p className="text-[12px] text-label-tertiary">{activeTemplate.steps.length} attività</p>
              </div>
              <button
                onClick={() => setEditing(!editing)}
                className="text-[13px] text-sky min-h-10 flex items-center gap-1.5"
              >
                <Pencil size={14} />
                {editing ? 'Fine' : 'Personalizza'}
              </button>
            </div>

            {/* Selettore icona/colore in modalità modifica */}
            {editing && (
              <div className="mb-4">
                <p className="text-[13px] text-label-secondary mb-2">Icona</p>
                <div className="mb-3">
                  <IconPicker
                    value={routineIconName(activeTemplate)}
                    onChange={(icon) => saveTemplate(activeTemplate._id, { icon })}
                  />
                </div>
                <p className="text-[13px] text-label-secondary mb-2">Colore</p>
                <div className="flex gap-2 flex-wrap">
                  {ROUTINE_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => saveTemplate(activeTemplate._id, { color: c })}
                      className={cn('w-8 h-8 rounded-full grid place-items-center', activeTemplate.color === c && 'ring-2 ring-offset-2 ring-offset-surface-1')}
                      style={{ backgroundColor: c, boxShadow: activeTemplate.color === c ? `0 0 0 2px ${c}` : undefined }}
                      aria-label={`Colore ${c}`}
                    >
                      {activeTemplate.color === c && <Check size={14} className="text-white" strokeWidth={3} />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Attività della scheda */}
            <div className="flex flex-col">
              <AnimatePresence initial={false}>
                {activeTemplate.steps.map((step, i) => (
                  <motion.div
                    key={`${activeTemplate._id}-${i}`}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center justify-between py-2.5 border-b border-separator last:border-0"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-fill-tertiary text-label-secondary text-[12px] font-semibold flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      {editing ? (
                        <input
                          value={step.name}
                          onChange={(e) => {
                            const steps = activeTemplate.steps.map((s, j) => (j === i ? { ...s, name: e.target.value } : s));
                            saveTemplate(activeTemplate._id, { steps });
                          }}
                          className="text-[16px] bg-surface-2 rounded-lg px-2 py-1 w-32 min-w-0"
                          aria-label={`Nome attività ${i + 1}`}
                        />
                      ) : (
                        <span className="text-[16px] text-label truncate">{step.name}</span>
                      )}
                    </div>
                    {editing ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => {
                          const steps = activeTemplate.steps.map((s, j) => (j === i ? { ...s, targetMinutes: Math.max(1, s.targetMinutes - 1) } : s));
                          saveTemplate(activeTemplate._id, { steps });
                        }} className="w-9 h-9 rounded-full bg-surface-2 text-label-secondary grid place-items-center" aria-label="Riduci tempo">−</button>
                        <span className="w-10 text-center text-[14px] text-label tabular-nums">{step.targetMinutes} min</span>
                        <button onClick={() => {
                          const steps = activeTemplate.steps.map((s, j) => (j === i ? { ...s, targetMinutes: Math.min(180, s.targetMinutes + 1) } : s));
                          saveTemplate(activeTemplate._id, { steps });
                        }} className="w-9 h-9 rounded-full bg-surface-2 text-label-secondary grid place-items-center" aria-label="Aumenta tempo">+</button>
                        <button
                          onClick={() => {
                            if (i === 0) return;
                            const steps = [...activeTemplate.steps];
                            [steps[i - 1], steps[i]] = [steps[i], steps[i - 1]];
                            saveTemplate(activeTemplate._id, { steps });
                          }}
                          disabled={i === 0}
                          className="w-9 h-9 rounded-full bg-surface-2 grid place-items-center text-label-secondary disabled:opacity-30"
                          aria-label="Sposta su"
                        >
                          <ChevronUp size={15} />
                        </button>
                        <button
                          onClick={() => {
                            if (i === activeTemplate.steps.length - 1) return;
                            const steps = [...activeTemplate.steps];
                            [steps[i], steps[i + 1]] = [steps[i + 1], steps[i]];
                            saveTemplate(activeTemplate._id, { steps });
                          }}
                          disabled={i === activeTemplate.steps.length - 1}
                          className="w-9 h-9 rounded-full bg-surface-2 grid place-items-center text-label-secondary disabled:opacity-30"
                          aria-label="Sposta giù"
                        >
                          <ChevronDown size={15} />
                        </button>
                        <button
                          onClick={() => saveTemplate(activeTemplate._id, { steps: activeTemplate.steps.filter((_, j) => j !== i) })}
                          className="w-9 h-9 grid place-items-center text-sys-red"
                          aria-label="Rimuovi attività"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[13px] text-label-tertiary tabular-nums">~{step.targetMinutes} min</span>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {editing && (
              <button
                onClick={() =>
                  saveTemplate(activeTemplate._id, {
                    steps: [...activeTemplate.steps, { name: 'Nuova attività', targetMinutes: 10 }],
                  })
                }
                className="w-full h-11 mt-3 rounded-full border border-accent text-sky text-[14px] font-semibold flex items-center justify-center gap-2"
              >
                <Plus size={16} /> Aggiungi attività
              </button>
            )}

            <div className="flex items-center justify-center gap-1.5 mt-4 text-[13px] text-label-secondary">
              <Clock3 size={13} />
              Durata totale: {formatMinutes(activeTemplate.steps.reduce((s, st) => s + st.targetMinutes, 0))}
            </div>

            {!editing && (
              <button onClick={() => setConfirmDelete(true)} className="mx-auto mt-3 flex items-center gap-1 text-[12px] text-label-tertiary min-h-8">
                <Trash2 size={12} /> Elimina questa scheda
              </button>
            )}
          </div>

          {!editing && (
            <>
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
            </>
          )}
        </div>
      )}

      {/* Nessuna scheda (vista dettaglio) */}
      {view === 'detail' && !templatesLoading && (templates ?? []).length === 0 && (
        <div className="card p-8 text-center">
          <Layers size={32} className="text-label-tertiary mx-auto mb-3" />
          <p className="text-[15px] text-label">Nessuna routine</p>
          <p className="text-[13px] text-label-tertiary mt-1 mb-4">Crea la tua prima scheda con le attività che preferisci.</p>
          <button onClick={() => setNewTemplateOpen(true)} className="h-11 px-5 rounded-full bg-accent text-white text-[14px] font-semibold">
            <Plus size={16} className="inline mr-1" /> Crea routine
          </button>
        </div>
      )}

      <NewTemplateDialog
        isOpen={newTemplateOpen}
        onClose={() => setNewTemplateOpen(false)}
        onCreate={async (fields) => {
          const doc = await createTemplate(fields);
          setActiveTemplateId(doc || undefined);
        }}
      />

      <Dialog
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Eliminare la scheda?"
        actions={
          <>
            <button onClick={() => setConfirmDelete(false)} className="text-[17px] text-label-secondary font-medium active:opacity-60">Annulla</button>
            <button
              onClick={() => {
                if (activeTemplate) removeTemplate(activeTemplate._id);
                setConfirmDelete(false);
              }}
              className="text-[17px] text-sys-red font-semibold active:opacity-60"
            >
              Elimina
            </button>
          </>
        }
      >
        <p className="text-[14px] text-label-secondary leading-relaxed">
          Eliminerai «{activeTemplate?.name}» con le sue {activeTemplate?.steps?.length || 0} attività. I tempi già registrati restano salvati.
        </p>
      </Dialog>
    </div>
  );
}

/**
 * OverviewGrid — Vista globale e sintetica: tutte le schede routine insieme
 * in formato compatto (icona, nome, n° attività, durata). Tap → dettaglio,
 * pulsante play → avvio diretto della sessione.
 */
function OverviewGrid({ templates, activeId, onOpen, onStart, onNew }) {
  return (
    <div>
      <p className="text-[13px] text-label-secondary px-1 mb-2.5">
        {templates.length === 1 ? '1 scheda' : `${templates.length} schede`} · tocca per aprire, ▶ per avviare
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {templates.map((t) => {
          const total = (t.steps ?? []).reduce((s, st) => s + (st.targetMinutes || 0), 0);
          const active = t._id === activeId;
          return (
            <div
              key={t._id}
              className={cn(
                'card p-3.5 flex flex-col gap-2 text-left border',
                active ? 'border-accent/60' : 'border-transparent'
              )}
            >
              <button onClick={() => onOpen(t)} className="flex flex-col gap-2 text-left" aria-label={`Apri ${t.name}`}>
                <span
                  className="w-10 h-10 rounded-xl grid place-items-center"
                  style={{ backgroundColor: `${t.color}22` }}
                >
                  <RoutineIcon template={t} size={19} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[15px] font-semibold text-label truncate">{t.name}</span>
                  <span className="block text-[12px] text-label-tertiary tabular-nums mt-0.5">
                    {(t.steps ?? []).length} attività · ~{formatMinutes(total)}
                  </span>
                </span>
              </button>
              <button
                onClick={() => onStart(t)}
                className="h-10 rounded-full bg-accent/15 text-sky text-[13px] font-semibold flex items-center justify-center gap-1.5 active:bg-accent/25"
                aria-label={`Avvia ${t.name}`}
              >
                <Play size={14} fill="currentColor" /> Avvia
              </button>
            </div>
          );
        })}

        {/* Card "nuova scheda" */}
        <button
          onClick={onNew}
          className="rounded-2xl p-3.5 flex flex-col items-center justify-center gap-2 min-h-[148px] border border-dashed border-label-quaternary text-label-secondary active:bg-surface-1"
        >
          <span className="w-10 h-10 rounded-full bg-surface-2 grid place-items-center">
            <Plus size={19} />
          </span>
          <span className="text-[13px] font-semibold">Nuova scheda</span>
        </button>
      </div>
    </div>
  );
}

function NewTemplateDialog({ isOpen, onClose, onCreate }) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('Dumbbell');
  const [color, setColor] = useState(ROUTINE_COLORS[0]);
  const [steps, setSteps] = useState([
    { name: 'Attività 1', targetMinutes: 10 },
  ]);

  const addStep = () => setSteps((s) => [...s, { name: `Attività ${s.length + 1}`, targetMinutes: 10 }]);
  const removeStep = (i) => setSteps((s) => s.filter((_, j) => j !== i));

  const create = async () => {
    if (!name.trim()) return;
    await onCreate({ name: name.trim(), icon, color, steps });
    setName('');
    setIcon('Dumbbell');
    setSteps([{ name: 'Attività 1', targetMinutes: 10 }]);
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Nuova scheda routine"
      actions={
        <>
          <button onClick={onClose} className="text-[17px] text-label-secondary font-medium active:opacity-60">Annulla</button>
          <button onClick={create} disabled={!name.trim()} className="text-[17px] text-sky font-semibold active:opacity-60 disabled:opacity-40">Crea</button>
        </>
      }
    >
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nome routine (es. Allenamento)"
        className="w-full bg-surface-2 rounded-xl px-4 py-3 text-[16px] text-label placeholder:text-label-tertiary my-2"
      />
      <p className="text-[13px] text-label-secondary mb-2">Icona</p>
      <div className="mb-3">
        <IconPicker value={icon} onChange={setIcon} />
      </div>
      <p className="text-[13px] text-label-secondary mb-2">Colore</p>
      <div className="flex gap-2 flex-wrap mb-4">
        {ROUTINE_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className={cn('w-8 h-8 rounded-full grid place-items-center', color === c && 'ring-2 ring-offset-2 ring-offset-surface-2')}
            style={{ backgroundColor: c }}
          >
            {color === c && <Check size={14} className="text-white" strokeWidth={3} />}
          </button>
        ))}
      </div>
      <p className="text-[13px] font-semibold text-label-secondary mb-2">Attività</p>
      <div className="flex flex-col gap-2 mb-3 max-h-56 overflow-y-auto scrollable pr-1">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={step.name}
              onChange={(e) => setSteps(steps.map((s, j) => (j === i ? { ...s, name: e.target.value } : s)))}
              className="flex-1 bg-surface-2 rounded-lg px-3 h-11 text-[15px]"
              aria-label={`Attività ${i + 1}`}
            />
            <div className="flex items-center gap-1">
              <button onClick={() => setSteps(steps.map((s, j) => (j === i ? { ...s, targetMinutes: Math.max(1, s.targetMinutes - 1) } : s)))} className="w-9 h-9 rounded-full bg-surface-2 text-label-secondary">−</button>
              <span className="w-9 text-center text-[13px] tabular-nums text-label-secondary">{step.targetMinutes}</span>
              <button onClick={() => setSteps(steps.map((s, j) => (j === i ? { ...s, targetMinutes: Math.min(180, s.targetMinutes + 1) } : s)))} className="w-9 h-9 rounded-full bg-surface-2 text-label-secondary">+</button>
            </div>
            <button onClick={() => removeStep(i)} className="w-9 h-9 grid place-items-center text-sys-red" aria-label="Rimuovi">
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
      <button onClick={addStep} className="w-full h-11 rounded-full border border-accent text-sky text-[14px] font-semibold">
        <Plus size={15} className="inline mr-1" /> Aggiungi attività
      </button>
    </Dialog>
  );
}

function CompletionSummary({ session }) {
  const total = session.steps.reduce((s, st) => s + (st.actualSeconds || 0), 0);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="card p-6 flex flex-col items-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.1 }}
        className="w-20 h-20 rounded-full bg-sys-green/15 flex items-center justify-center mb-4"
      >
        <Check size={40} className="text-sys-green" strokeWidth={3} />
      </motion.div>
      <h2 className="text-[22px] font-semibold text-label tracking-tight">
        {session.routineName ? `${session.routineName} completata!` : 'Routine completata!'}
      </h2>
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
      <div className="card p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[15px] font-semibold text-label">
            {routine.routineName ? `${routine.routineName} — tempi effettivi` : 'Tempi effettivi di oggi'}
          </span>
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
