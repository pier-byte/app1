import { useMemo } from 'react';
import { addDays, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, isToday, startOfMonth, startOfWeek } from 'date-fns';
import { it } from 'date-fns/locale';
import { Check, Square } from 'lucide-react';
import { cn } from '../../lib/cn';
import { toDateKey } from '../../lib/dates';
import { useExpandedTasksBetween } from '../../hooks/useData';

const DAYS = ['LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB', 'DOM'];

/**
 * MonthGrid — Griglia mensile "fit-to-screen" (ui-references
 * calendario_mensile_full_screen_liquid_glass): intestazione maiuscoletta,
 * colonna del giorno selezionato in vetro con bordo azzurro, pill compatte
 * "check + titolo" con il colore della categoria. Tap sul giorno → DaySheet.
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
      {/* Intestazione giorni settimana (maiuscolo, tenue — come reference) */}
      <div className="grid grid-cols-7 shrink-0" role="row">
        {DAYS.map((d) => (
          <div key={d} className="text-center text-[10.5px] font-semibold text-[#8e8e93] tracking-[0.08em] py-1.5">
            {d}
          </div>
        ))}
      </div>

      {/* Griglia: righe flessibili che riempiono lo schermo senza scroll */}
      <div
        className="flex-1 min-h-0 grid grid-cols-7 gap-px bg-white/[0.04] border-y border-white/[0.05]"
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
                'tap-clean relative bg-canvas min-h-0 min-w-0 overflow-hidden flex flex-col items-stretch px-[3px] pt-1 pb-[3px] gap-[3px] transition-colors',
                selected
                  ? 'bg-white/[0.05] shadow-[inset_0_0_0_1.5px_rgba(41,151,255,0.65)] rounded-[10px]'
                  : 'active:bg-white/[0.04]',
                outside && 'opacity-45'
              )}
            >
              <span
                className={cn(
                  'mx-auto w-7 h-7 shrink-0 grid place-items-center rounded-full text-[13.5px] font-medium tabular-nums',
                  today
                    ? 'bg-accent text-white font-semibold shadow-sm shadow-blue-600/50'
                    : selected
                      ? 'text-sky font-semibold'
                      : 'text-label'
                )}
              >
                {format(date, 'd')}
              </span>

              <span className="flex flex-col gap-[2.5px] min-h-0 flex-1 overflow-hidden justify-start">
                {dayTasks.slice(0, maxPills).map((t) => {
                  const color = t.categoryColor || '#2997ff';
                  return (
                    <span
                      key={t._id}
                      className={cn(
                        'flex items-center gap-[3px] rounded-full px-[5px] py-[2px] text-[9.5px] leading-[1.2] font-medium bg-white/[0.05] border border-white/[0.04] truncate',
                        t.completed && 'opacity-50'
                      )}
                      style={{ color }}
                      title={t.title}
                    >
                      {t.completed ? (
                        <Check size={9.5} strokeWidth={3.5} className="shrink-0" />
                      ) : (
                        <Square size={8.5} className="shrink-0 opacity-75" />
                      )}
                      <span className={cn('truncate', t.completed && 'line-through')}>{t.title}</span>
                    </span>
                  );
                })}
                {overflow > 0 && (
                  <span className="text-[9.5px] leading-none text-[#8e8e93] font-semibold pl-[5px]">
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
