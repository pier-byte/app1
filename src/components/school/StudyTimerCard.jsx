import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Square, Check, GraduationCap } from 'lucide-react';
import { useStudyTimer, studyTimer } from '../../store/studyTimer';
import { formatSeconds, formatMinutes, isToday, toDateKey } from '../../lib/dates';
import { cn } from '../../lib/cn';

/**
 * StudyTimerCard — Timer di studio con finestra 15:00–20:00, pausa e ripresa.
 * Alla chiusura propone l'attribuzione dei minuti a uno dei task del giorno.
 */
export default function StudyTimerCard({ selectedDate, tasks, onAssignMinutes }) {
  const timer = useStudyTimer();
  const [assignOpen, setAssignOpen] = useState(false);
  const [pendingMinutes, setPendingMinutes] = useState(0);

  const dateKey = toDateKey(selectedDate);
  const isTodayDate = isToday(selectedDate);
  const sessionForToday = !timer.dateKey || timer.dateKey === dateKey;

  // Finestra di studio 15:00–20:00
  const now = new Date();
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const inWindow = isTodayDate && minutesNow >= 15 * 60 && minutesNow < 20 * 60;

  const studiedToday = useMemo(
    () => tasks.reduce((sum, t) => sum + (t.actualMinutes || 0), 0),
    [tasks]
  );
  const maxSeconds = 5 * 60 * 60; // 5h finestra
  const progress = Math.min(timer.seconds / maxSeconds, 1);

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
      <div className="bg-surface-1 rounded-2xl p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <GraduationCap size={18} className="text-accent" />
            <span className="text-[15px] font-semibold text-label">Sessione di studio</span>
          </div>
          <span className="text-[12px] text-label-tertiary tabular-nums">15:00 – 20:00</span>
        </div>

        {/* Timer grande */}
        <div className="flex flex-col items-center py-2">
          <motion.span
            key={timer.status}
            initial={{ opacity: 0.6 }}
            animate={{ opacity: 1 }}
            className={cn(
              'text-[52px] leading-none font-light tabular-nums tracking-tight',
              timer.status === 'idle' ? 'text-label-tertiary' : 'text-label'
            )}
          >
            {formatSeconds(timer.seconds)}
          </motion.span>

          <div className="flex items-center gap-1.5 mt-2.5">
            {timer.status === 'running' && <span className="w-1.5 h-1.5 rounded-full bg-sys-green animate-pulse" />}
            <span className="text-[12px] text-label-secondary">
              {timer.status === 'idle' && (inWindow ? 'Sei nella finestra di studio' : 'Timer non avviato')}
              {timer.status === 'running' && 'Registrazione in corso…'}
              {timer.status === 'paused' && 'In pausa'}
            </span>
          </div>

          {/* Barra progresso finestra 5h */}
          <div className="w-full h-1 rounded-full bg-fill-tertiary mt-4 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-accent"
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <div className="w-full flex justify-between mt-1.5 text-[11px] text-label-tertiary">
            <span>Oggi: {formatMinutes(studiedToday)} registrati</span>
            <span>{Math.round(progress * 100)}% di 5h</span>
          </div>
        </div>

        {/* Controlli */}
        <div className="flex items-center justify-center gap-3 mt-4">
          {timer.status === 'idle' && (
            <button
              onClick={() => studyTimer.start(dateKey)}
              className="flex items-center gap-2 px-6 h-11 rounded-full bg-accent text-white text-[15px] font-semibold active:bg-accent-pressed transition-colors"
            >
              <Play size={17} fill="currentColor" /> Avvia
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
                className="flex items-center gap-2 px-6 h-11 rounded-full bg-accent text-white text-[15px] font-semibold active:bg-accent-pressed transition-colors"
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
              className="flex items-center gap-2 px-6 h-11 rounded-full bg-accent text-white text-[15px] font-semibold active:bg-accent-pressed transition-colors"
            >
              <Play size={17} fill="currentColor" /> Nuova sessione
            </button>
          )}
        </div>
      </div>

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
              selected ? 'text-accent' : 'text-label-tertiary'
            )}
          >
            <Check size={17} /> Attribuisci
          </button>
        </div>
      </motion.div>
    </>
  );
}
