import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { Check, Lock, CalendarClock } from 'lucide-react';
import BottomSheet from '../ui/BottomSheet';
import { formatMinutes } from '../../lib/dates';
import { cn } from '../../lib/cn';

/**
 * StudyPlanSheet — selettore della giornata di studio.
 * Da qui l'utente sceglie QUALI attività pianificare per il giorno
 * selezionato, attingendo dalle scadenze di oggi, domani, tra 2/3 giorni e
 * oltre (gruppi per data di scadenza). Lo scambio è solo "pianificazione":
 * la scadenza originale del compito non viene modificata.
 *
 * - riga con spunta = attività già nel carico del giorno;
 * - le scadenze del giorno stesso sono incluse automaticamente (lucchetto);
 * - il totale in fondo è il carico stimato risultante.
 */
export default function StudyPlanSheet({
  isOpen,
  onClose,
  dateKey,
  upcomingByDay = [],
  isAssigned,
  onToggleTask,
}) {
  if (!isOpen) return null;

  const dayLabel = (key) => {
    const diff = differenceInCalendarDays(parseISO(key), parseISO(dateKey));
    if (diff === 0) return 'Oggi';
    if (diff === 1) return 'Domani';
    if (diff === 2) return 'Tra 2 giorni';
    if (diff === 3) return 'Tra 3 giorni';
    return format(parseISO(key), 'EEEE d MMM', { locale: it });
  };

  const assignedRows = upcomingByDay.flatMap((g) => g.items).filter((t) => isAssigned(t));
  const totalAssigned = assignedRows.reduce((s, t) => s + (t.estimatedMinutes || 0), 0);

  return (
    <BottomSheet isOpen onClose={onClose} maxHeight="72dvh">
      <div className="flex items-center gap-2.5 px-1 pb-3">
        <span className="w-9 h-9 rounded-xl bg-sky/15 border border-sky/30 grid place-items-center shrink-0">
          <CalendarClock size={17} className="text-sky" />
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="text-[17px] font-semibold text-label leading-tight truncate">
            Studiati il {format(parseISO(dateKey), 'EEEE d MMM', { locale: it })}
          </h3>
          <p className="text-[12px] text-label-tertiary leading-snug">
            Scegli quali scadenze preparare in questo giorno · carico{' '}
            <span className="text-sky font-semibold tabular-nums">{formatMinutes(totalAssigned)}</span>
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4 pb-4">
        {upcomingByDay.length === 0 && (
          <p className="text-[13px] text-label-tertiary px-1 py-2">
            Nessuna scadenza nei prossimi 14 giorni da pianificare.
          </p>
        )}
        {upcomingByDay.map((group) => (
          <section key={group.key}>
            <p className="text-[11px] font-semibold text-[#8e8e93] uppercase tracking-[0.08em] px-1 mb-1.5 capitalize">
              {dayLabel(group.key)} <span className="normal-case font-normal text-label-tertiary">· scade {format(parseISO(group.key), 'd MMM', { locale: it })}</span>
            </p>
            <div className="flex flex-col gap-1.5">
              {group.items.map((task) => {
                const locked = task.date === dateKey && !task.studyDate; // scadenza oggi: auto-inclusa
                const assigned = isAssigned(task);
                return (
                  <button
                    key={task.instanceId ?? task._id}
                    onClick={() => !locked && onToggleTask(task)}
                    disabled={locked}
                    aria-pressed={assigned}
                    className={cn(
                      'flex items-center gap-3 rounded-2xl px-3 py-2.5 min-h-[52px] border text-left transition-colors',
                      assigned
                        ? 'bg-sky/10 border-sky/30'
                        : 'bg-white/[0.04] border-white/[0.06] active:bg-white/[0.08]',
                      locked && 'opacity-90'
                    )}
                  >
                    <span
                      className={cn(
                        'w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0',
                        assigned ? 'bg-accent border-accent' : 'border-label-quaternary'
                      )}
                    >
                      {assigned && <Check size={13} className="text-white" strokeWidth={3.5} />}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className={cn('block text-[14px] font-medium truncate', assigned ? 'text-label' : 'text-label-secondary')}>
                        {task.title}
                      </span>
                      <span className="block text-[11.5px] text-label-tertiary truncate">
                        {task.category}
                        {task.estimatedMinutes ? ` · ~${formatMinutes(task.estimatedMinutes)}` : ''}
                      </span>
                    </span>
                    {locked ? (
                      <span className="flex items-center gap-1 text-[11px] text-label-tertiary shrink-0">
                        <Lock size={11} /> oggi
                      </span>
                    ) : (
                      <span className="text-[11px] text-label-tertiary tabular-nums shrink-0">
                        {task.estimatedMinutes ? `${task.estimatedMinutes}m` : ''}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </BottomSheet>
  );
}
