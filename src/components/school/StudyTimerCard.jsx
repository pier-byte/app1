import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Square, Check, GraduationCap, Clock, Plus, Hourglass } from 'lucide-react';
import { useStudyTimer, studyTimer } from '../../store/studyTimer';
import { formatSeconds, formatMinutes, toDateKey } from '../../lib/dates';
import TimePickerDialog from './TimePickerDialog';
import { cn } from '../../lib/cn';

/**
 * StudyTimerCard — Timer di studio flessibile e multi-sessione.
 * Senza blocchi orari rigidi predefiniti. Consente di configurare liberamente
 * l'orario di fine sessione e mostra sia il tempo trascorso sia il tempo rimanente.
 */
export default function StudyTimerCard({ selectedDate, tasks, onAssignMinutes }) {
  const timer = useStudyTimer();
  const [assignOpen, setAssignOpen] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [pendingMinutes, setPendingMinutes] = useState(0);

  const dateKey = toDateKey(selectedDate);
  const sessionForToday = !timer.dateKey || timer.dateKey === dateKey;

  const studiedToday = useMemo(
    () => tasks.reduce((sum, t) => sum + (t.actualMinutes || 0), 0),
    [tasks]
  );

  const handleStop = () => {
    const total = studyTimer.stop();
    if (total >= 60) {
      setPendingMinutes(Math.round(total / 60));
      setAssignOpen(true);
    }
  };

  const pendingTasks = tasks.filter((t) => !t.completed);

  return (
    <>
      <div className="card p-5">
        {/* Header con orario di fine configurabile */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <GraduationCap size={18} className="text-sky" />
            <span className="text-[15px] font-semibold text-label">Sessione di studio</span>
          </div>

          <button
            type="button"
            onClick={() => setTimePickerOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.08] hover:bg-white/[0.14] border border-white/10 active:scale-95 transition-all"
            title="Modifica orario fine sessione"
          >
            <Clock size={12} className="text-sky" />
            <span className="text-[11.5px] font-medium text-label-secondary">Fine:</span>
            <span className="text-[12px] font-semibold text-label tabular-nums">{timer.targetEndTime}</span>
          </button>
        </div>

        {/* Display Timer: Tempo trascorso (principale) */}
        <div className="flex flex-col items-center py-2">
          <span className="text-[11.5px] font-semibold text-label-tertiary uppercase tracking-wider mb-1">
            Tempo trascorso
          </span>
          <motion.span
            key={timer.status}
            initial={{ opacity: 0.8 }}
            animate={{ opacity: 1 }}
            className={cn(
              'text-[52px] leading-none font-light tabular-nums tracking-tight',
              timer.status === 'idle' ? 'text-label-tertiary' : 'text-label'
            )}
          >
            {formatSeconds(timer.seconds)}
          </motion.span>

          {/* Indicatore di stato */}
          <div className="flex items-center gap-1.5 mt-2.5">
            {timer.status === 'running' && <span className="w-1.5 h-1.5 rounded-full bg-sys-green animate-pulse" />}
            <span className="text-[12px] text-label-secondary">
              {timer.status === 'idle' && 'Sessione pronta per l’avvio'}
              {timer.status === 'running' && 'Registrazione in corso…'}
              {timer.status === 'paused' && 'Sessione in pausa'}
            </span>
          </div>

          {/* Box Tempo rimanente al target orario */}
          <div className="w-full max-w-[280px] bg-white/[0.05] border border-white/[0.08] rounded-2xl p-3 mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Hourglass size={15} className={timer.remainingSeconds > 0 ? 'text-sky' : 'text-sys-green'} />
              <div className="flex flex-col text-left">
                <span className="text-[11px] font-medium text-label-tertiary leading-tight">
                  Tempo rimanente
                </span>
                <span className="text-[10px] text-label-secondary">
                  fino alle {timer.targetEndTime}
                </span>
              </div>
            </div>
            <div className="text-right">
              {timer.remainingSeconds > 0 ? (
                <span className="text-[17px] font-semibold text-label tabular-nums">
                  {formatSeconds(timer.remainingSeconds)}
                </span>
              ) : (
                <span className="text-[13px] font-semibold text-sys-green">
                  Obiettivo raggiunto!
                </span>
              )}
            </div>
          </div>

          {/* Chip rapide per estendere/cambiare orario */}
          <div className="flex items-center justify-center gap-2 mt-3.5">
            <button
              type="button"
              onClick={() => studyTimer.extendMinutes(15)}
              className="px-2.5 py-1 rounded-full bg-white/[0.06] hover:bg-white/[0.12] active:scale-95 text-[11px] font-medium text-white/80 border border-white/10 transition-all"
            >
              +15m
            </button>
            <button
              type="button"
              onClick={() => studyTimer.extendMinutes(30)}
              className="px-2.5 py-1 rounded-full bg-white/[0.06] hover:bg-white/[0.12] active:scale-95 text-[11px] font-medium text-white/80 border border-white/10 transition-all"
            >
              +30m
            </button>
            <button
              type="button"
              onClick={() => studyTimer.extendMinutes(60)}
              className="px-2.5 py-1 rounded-full bg-white/[0.06] hover:bg-white/[0.12] active:scale-95 text-[11px] font-medium text-white/80 border border-white/10 transition-all"
            >
              +1h
            </button>
            <button
              type="button"
              onClick={() => setTimePickerOpen(true)}
              className="px-2.5 py-1 rounded-full bg-sky/15 hover:bg-sky/25 active:scale-95 text-[11px] font-semibold text-sky border border-sky/20 transition-all"
            >
              Imposta fine
            </button>
          </div>

          {/* Totale studiato oggi */}
          <div className="w-full text-center mt-3 text-[11.5px] text-label-tertiary">
            <span>Oggi: {formatMinutes(studiedToday)} registrati in totale</span>
          </div>
        </div>

        {/* Controlli sessione */}
        <div className="flex items-center justify-center gap-3 mt-4">
          {timer.status === 'idle' && (
            <button
              onClick={() => studyTimer.start(dateKey)}
              className="flex items-center gap-2 px-6 h-11 rounded-full bg-accent text-white text-[15px] font-semibold active:bg-accent-pressed transition-colors shadow-lg shadow-blue-500/30"
            >
              <Play size={17} fill="currentColor" /> Avvia sessione
            </button>
          )}
          {timer.status === 'running' && (
            <>
              <button
                onClick={() => studyTimer.pause()}
                className="flex items-center gap-2 px-6 h-11 rounded-full bg-surface-3 text-label text-[15px] font-semibold active:opacity-70 transition-opacity"
              >
                <Pause size={17} fill="currentColor" /> Pausa
              </button>
              <button
                onClick={handleStop}
                className="flex items-center gap-2 px-6 h-11 rounded-full bg-sys-red/15 text-sys-red text-[15px] font-semibold active:opacity-70 transition-opacity"
              >
                <Square size={15} fill="currentColor" /> Fine
              </button>
            </>
          )}
          {timer.status === 'paused' && sessionForToday && (
            <>
              <button
                onClick={() => studyTimer.resume()}
                className="flex items-center gap-2 px-6 h-11 rounded-full bg-accent text-white text-[15px] font-semibold active:bg-accent-pressed transition-colors shadow-lg shadow-blue-500/30"
              >
                <Play size={17} fill="currentColor" /> Riprendi
              </button>
              <button
                onClick={handleStop}
                className="flex items-center gap-2 px-6 h-11 rounded-full bg-sys-red/15 text-sys-red text-[15px] font-semibold active:opacity-70 transition-opacity"
              >
                <Square size={15} fill="currentColor" /> Fine
              </button>
            </>
          )}
          {timer.status === 'paused' && !sessionForToday && (
            <button
              onClick={() => studyTimer.start(dateKey)}
              className="flex items-center gap-2 px-6 h-11 rounded-full bg-accent text-white text-[15px] font-semibold active:bg-accent-pressed transition-colors shadow-lg shadow-blue-500/30"
            >
              <Play size={17} fill="currentColor" /> Nuova sessione
            </button>
          )}
        </div>
      </div>

      {/* Dialog scelta orario di fine */}
      <TimePickerDialog
        isOpen={timePickerOpen}
        onClose={() => setTimePickerOpen(false)}
        value={timer.targetEndTime}
        title="Orario fine sessione"
        onConfirm={(timeStr) => {
          studyTimer.setTargetEndTime(timeStr);
          setTimePickerOpen(false);
        }}
      />

      {/* Dialog attribuzione minuti */}
      <AnimatePresence>
        {assignOpen && (
          <AssignTimeDialog
            minutes={pendingMinutes}
            tasks={pendingTasks}
            onClose={() => setAssignOpen(false)}
            onAssign={(taskId) => {
              if (taskId) onAssignMinutes(taskId, pendingMinutes);
              setAssignOpen(false);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function AssignTimeDialog({ minutes, tasks, onClose, onAssign }) {
  const [selected, setSelected] = useState(null);
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-dialog z-50"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
        transition={{ type: 'spring', damping: 25, stiffness: 400 }}
        className="fixed inset-x-6 top-1/2 -translate-y-1/2 z-50 bg-surface-dialog backdrop-blur-dialog rounded-[14px] overflow-hidden"
      >
        <div className="px-5 pt-5 pb-2">
          <h3 className="text-[17px] font-semibold text-label text-center">
            {minutes} min di studio
          </h3>
          <p className="text-[13px] text-label-secondary text-center mt-1">
            A quale compito vuoi attribuirli?
          </p>
        </div>
        <div className="px-3 pb-2 max-h-[40vh] overflow-y-auto scrollable">
          {tasks.length === 0 && (
            <p className="text-[14px] text-label-tertiary text-center py-4">
              Nessun task aperto oggi
            </p>
          )}
          {tasks.map((task) => (
            <button
              key={task._id}
              onClick={() => setSelected(task._id)}
              className="w-full flex items-center gap-3 px-2.5 py-3 rounded-lg active:bg-fill-tertiary transition-colors text-left"
            >
              <div
                className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                style={{
                  borderColor: selected === task._id ? task.categoryColor : 'rgba(235,235,245,0.3)',
                }}
              >
                {selected === task._id && (
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: task.categoryColor }} />
                )}
              </div>
              <span className="text-[15px] text-label truncate">{task.title}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between px-5 py-4 border-t border-separator">
          <button onClick={onClose} className="text-[17px] text-label-secondary font-medium active:opacity-60">
            Scarta
          </button>
          <button
            onClick={() => onAssign(selected)}
            disabled={!selected}
            className={cn(
              'flex items-center gap-1.5 text-[17px] font-semibold active:opacity-60',
              selected ? 'text-sky' : 'text-label-tertiary'
            )}
          >
            <Check size={17} /> Attribuisci
          </button>
        </div>
      </motion.div>
    </>
  );
}
