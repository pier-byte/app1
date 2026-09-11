import { useMemo } from 'react';
import { addDays, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, isToday, startOfMonth, startOfWeek } from 'date-fns';
import { it } from 'date-fns/locale';
import { Check, Square } from 'lucide-react';
import { cn } from '../../lib/cn';
import { toDateKey } from '../../lib/dates';
import { useExpandedTasksBetween } from '../../hooks/useData';

const DAYS = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'];

/**
 * MonthGrid — Griglia mensile "fit-to-screen" (screenshot home):
 * riempie esattamente lo spazio disponibile (flex + righe 1fr, niente scroll),
 * celle separate da hairline, pill colorate con stato check per ogni attività.
 * Tap su un giorno → apre il DaySheet (vedi CalendarPage).
 */
export default function MonthGrid({ selectedDate, onSelectDate }) {
  const monthStart = startOfMonth(selectedDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(selectedDate), { weekStartsOn: 1 });

  const dates = useMemo(() => {
    const result = [];
    for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) result.push(d);
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridStart.getTime(), gridEnd.getTime()]);

  const rows = dates.length / 7;
  const { data: tasksByDate } = useExpandedTasksBetween(toDateKey(gridStart), toDateKey(gridEnd));
  // Celle più basse (6 righe) → meno pill per cella
  const maxPills = rows <= 5 ? 3 : 2;

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Intestazione giorni settimana */}
      <div className="grid grid-cols-7 shrink-0" role="row">
        {DAYS.map((d) => (
          <div key={d} className="text-center text-[11px] font-semibold text-label-tertiary py-1.5">
            {d}
          </div>
        ))}
      </div>

      {/* Griglia: righe flessibili che riempiono lo schermo senza scroll */}
      <div
        className="flex-1 min-h-0 grid grid-cols-7 gap-px bg-separator-opaque/60 border-y border-separator-opaque/60"
        style={{ gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }}
        role="grid"
        aria-label={format(selectedDate, 'MMMM yyyy', { locale: it })}
      >
        {dates.map((date) => {
          const key = toDateKey(date);
          const dayTasks = [...(tasksByDate.get(key) ?? [])].sort(
            (a, b) =>
              Number(a.completed) - Number(b.completed) ||
              String(a.startTime || '').localeCompare(String(b.startTime || '')) ||
              (a.createdAt || 0) - (b.createdAt || 0)
          );
          const outside = !isSameMonth(date, selectedDate);
          const selected = isSameDay(date, selectedDate);
          const today = isToday(date);
          const overflow = dayTasks.length - maxPills;

          return (
            <button
              key={key}
              role="gridcell"
              onClick={() => onSelectDate(date)}
              aria-label={`${format(date, 'd MMMM', { locale: it })}${dayTasks.length ? `, ${dayTasks.length} attività` : ''}`}
              className={cn(
                'bg-canvas min-h-0 min-w-0 overflow-hidden flex flex-col items-stretch px-[3px] pt-1 pb-[3px] gap-[3px] active:bg-surface-1 transition-colors',
                outside && 'opacity-45'
              )}
            >
              <span
                className={cn(
                  'mx-auto w-7 h-7 shrink-0 grid place-items-center rounded-full text-[14px] font-medium tabular-nums',
                  today
                    ? 'bg-accent text-white font-semibold'
                    : selected
                      ? 'ring-1 ring-accent text-label'
                      : 'text-label'
                )}
              >
                {format(date, 'd')}
              </span>

              <span className="flex flex-col gap-[2px] min-h-0 flex-1 overflow-hidden">
                {dayTasks.slice(0, maxPills).map((t) => {
                  const color = t.categoryColor || '#0a84ff';
                  return (
                    <span
                      key={t._id}
                      className={cn(
                        'flex items-center gap-[3px] rounded-[5px] px-[4px] py-[2px] text-[9px] leading-[1.2] font-medium truncate',
                        t.completed && 'opacity-55'
                      )}
                      style={{ backgroundColor: `${color}26`, color }}
                      title={t.title}
                    >
                      {t.completed ? (
                        <Check size={10} strokeWidth={3.5} className="shrink-0" />
                      ) : (
                        <Square size={9} className="shrink-0 opacity-80" />
                      )}
                      <span className={cn('truncate', t.completed && 'line-through')}>{t.title}</span>
                    </span>
                  );
                })}
                {overflow > 0 && (
                  <span className="text-[9px] leading-none text-label-tertiary font-semibold pl-[3px]">
                    +{overflow}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
