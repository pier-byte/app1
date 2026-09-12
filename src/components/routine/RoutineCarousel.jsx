import { useEffect, useRef } from 'react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Pause, Play, Flag, } from 'lucide-react';
import { formatSeconds, formatMinutes } from '../../lib/dates';
import { cn } from '../../lib/cn';

/**
 * RoutineCarousel — "Timer a scorrimento": card per step con scroll-snap,
 * il timer scorre automaticamente allo step attivo.
 */
export default function RoutineCarousel({ session, onPause, onResume, onComplete, onFinish }) {
  const containerRef = useRef(null);
  const cardRefs = useRef([]);

  // Auto-scroll allo step attivo
  useEffect(() => {
    const el = cardRefs.current[session.currentIndex];
    const container = containerRef.current;
    if (el && container) {
      const left = Math.max(0, el.offsetLeft - container.offsetLeft - 24);
      if (typeof container.scrollTo === 'function') {
        container.scrollTo({ left, behavior: 'smooth' });
      } else {
        container.scrollLeft = left; // fallback (ambienti senza scrollTo)
      }
    }
  }, [session.currentIndex]);

  const totalTarget = session.steps.reduce((s, st) => s + st.targetMinutes, 0);
  const elapsedTotal = session.steps.reduce((s, st) => s + (st.actualSeconds || 0), 0) + session.stepSeconds;

  return (
    <div>
      {/* Header progresso */}
      <div className="px-1 mb-3">
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-[15px] font-semibold text-label">
            Step {session.currentIndex + 1} di {session.steps.length}
          </span>
          <span className="text-[13px] text-label-secondary tabular-nums">
            {formatSeconds(elapsedTotal)} / ~{formatMinutes(totalTarget)}
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-fill-tertiary overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-accent"
            animate={{ width: `${((session.currentIndex + (session.steps[session.currentIndex]?.status === 'done' ? 1 : 0)) / session.steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Carosello step */}
      <div
        ref={containerRef}
        className="flex gap-3 overflow-x-auto scrollable snap-x snap-mandatory px-6 py-2 -mx-4"
        style={{ scrollPaddingLeft: '24px' }}
      >
        {session.steps.map((step, i) => {
          const isActive = i === session.currentIndex && step.status !== 'done';
          const isDone = step.status === 'done';
          const targetSeconds = step.targetMinutes * 60;
          const shown = isDone ? step.actualSeconds : isActive ? session.stepSeconds : 0;
          const ratio = targetSeconds > 0 ? Math.min(shown / targetSeconds, 1) : 0;

          return (
            <div
              key={i}
              ref={(el) => (cardRefs.current[i] = el)}
              className={cn(
                'snap-center shrink-0 w-[78%] rounded-2xl p-5 transition-colors',
                isActive ? 'bg-surface-2 ring-1 ring-sky/60' : 'bg-surface-1',
                !isActive && !isDone && 'opacity-60'
              )}
              onClick={() => isActive && (session.status === 'running' ? onPause() : onResume())}
            >
              <div className="flex items-center justify-between mb-6">
                <span className="text-[12px] font-semibold uppercase tracking-wider text-label-tertiary">
                  Step {i + 1}
                </span>
                {isDone && (
                  <span className="flex items-center gap-1 text-[12px] font-semibold text-sys-green">
                    <Check size={13} strokeWidth={3} /> Fatto
                  </span>
                )}
                {isActive && session.status === 'running' && (
                  <span className="w-2 h-2 rounded-full bg-sys-green animate-pulse" />
                )}
                {isActive && session.status === 'paused' && (
                  <Pause size={13} className="text-sys-yellow" />
                )}
              </div>

              <h3 className="text-[24px] font-semibold text-label tracking-tight mb-1">{step.name}</h3>
              <p className="text-[13px] text-label-secondary mb-6">Obiettivo: {step.targetMinutes} min</p>

              <p
                className={cn(
                  'text-[44px] leading-none font-light tabular-nums tracking-tight',
                  isDone ? 'text-sys-green' : isActive ? 'text-label' : 'text-label-tertiary'
                )}
              >
                {formatSeconds(shown)}
              </p>

              <div className="w-full h-1 rounded-full bg-fill-tertiary overflow-hidden mt-4">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    ratio >= 1 ? 'bg-sys-green' : isActive ? 'bg-accent' : 'bg-label-quaternary'
                  )}
                  style={{ width: `${ratio * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Controlli */}
      <div className="flex flex-col items-stretch gap-2.5 mt-4">
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={session.status === 'running' ? onPause : onResume}
            disabled={session.status === 'done'}
            className="flex items-center gap-2 px-5 h-12 rounded-full bg-white/[0.08] border border-white/[0.1] text-label text-[15px] font-semibold active:opacity-70 disabled:opacity-40 transition-opacity"
          >
            {session.status === 'running' ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}
            {session.status === 'running' ? 'Pausa' : 'Riprendi'}
          </button>
          <button
            onClick={onComplete}
            disabled={session.status === 'done'}
            className="flex-1 max-w-[220px] flex items-center justify-center gap-2 px-5 h-12 rounded-full bg-accent border border-blue-400/25 text-white text-[15px] font-semibold shadow-lg shadow-blue-600/40 active:bg-accent-pressed disabled:opacity-40 transition-opacity"
          >
            <Check size={18} strokeWidth={3} /> Completa step
          </button>
        </div>

        {/* Concludi Routine: salva i progressi e chiude la sessione */}
        <RoutineFinishButton onFinish={onFinish} disabled={session.status === 'done'} />
      </div>
    </div>
  );
}

/**
 * RoutineFinishButton — "Concludi Routine": al tap mostra subito il feedback
 * (check + "Concludo…"), poi chiama onFinish → la sessione passa a done,
 * la pagina salva su DB e appare il flash "Routine salvata" + riepilogo.
 */
function RoutineFinishButton({ onFinish, disabled }) {
  const [ending, setEnding] = useState(false);

  const handle = () => {
    if (ending || disabled) return;
    setEnding(true); // feedback visivo immediato
    setTimeout(() => {
      onFinish?.();
      setEnding(false);
    }, 220);
  };

  return (
    <button
      onClick={handle}
      disabled={disabled || ending}
      className={cn(
        'w-full h-11 rounded-full text-[14px] font-semibold flex items-center justify-center gap-2 transition-colors',
        ending
          ? 'bg-sys-green/20 text-sys-green border border-sys-green/40'
          : 'bg-white/[0.05] border border-white/[0.1] text-label-secondary active:bg-white/[0.12] active:text-label'
      )}
      aria-label="Concludi routine"
    >
      {ending ? (
        <>
          <Check size={15} strokeWidth={3} /> Concludo…
        </>
      ) : (
        <>
          <Flag size={15} /> Concludi Routine
        </>
      )}
    </button>
  );
}
