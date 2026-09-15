import { useMemo } from 'react';
import {
  addDays, endOfMonth, endOfWeek, format, getDay, isSameMonth, parseISO,
  startOfMonth, startOfWeek,
} from 'date-fns';
import { it } from 'date-fns/locale';
import { Check } from 'lucide-react';
import { cn } from '../../lib/cn';
import { toDateKey } from '../../lib/dates';
import { useExpandedTasksBetween } from '../../hooks/useData';
import { useDeviceClock } from '../../hooks/useDeviceClock';
import { useSwipeNavigation } from '../../hooks/useSwipeNavigation';

const DAYS = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'];

/**
 * MonthGrid — griglia mensile full-screen Liquid Glass (ui-references
 * calendario_mensile_full_screen_liquid_glass):
 * - intestazione giorni minuscola con l'oggi in sky + glow;
 * - contenitore rounded-xl con hairline interne (cal-cell), vetro scuro
 *   backdrop-blur che riempie esattamente lo spazio rimasto (100dvh,
 *   nessun scroll verticale: righe flex minmax(0,1fr) + pill overflow-hidden);
 * - giorno attivo (oggi/selezionato): colonna azzurrata con ring inset e
 *   numero in cerchio gradiente sky→blue con glow;
 * - pill evento compatte col colore categoria + check se completate;
 * - swipe orizzontale per cambiare mese.
 */
export default function MonthGrid({ selectedDate, onSelectDate, onPrevMonth, onNextMonth }) {
  const todayKey = useDeviceClock();
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
  // Celle più basse (6 righe) → meno pill per cella, mai overflow
  const maxPills = rows <= 5 ? 3 : 2;
  const selKey = toDateKey(selectedDate);
  const todayIdx = (getDay(parseISO(todayKey)) + 6) % 7;
  const swipe = useSwipeNavigation(onNextMonth, onPrevMonth);

  return (
    <div className="flex-1 min-h-0 flex flex-col px-1.5 pb-1.5" {...swipe}>
      {/* Intestazione giorni (minuscolo, tenue — come reference) */}
      <div className="grid grid-cols-7 pt-2 pb-1 text-center shrink-0" role="row">
        {DAYS.map((d, i) => (
          <span
            key={d}
            className={cn(
              'text-[11px] font-medium uppercase tracking-wide',
              i === todayIdx ? 'text-sky font-semibold cal-today-glow' : 'text-[#8e8e93]'
            )}
          >
            {d}
          </span>
        ))}
      </div>

      {/* Griglia fit-to-screen: hairline + vetro, nessuna scrollbar */}
      <div
        className="flex-1 min-h-0 grid grid-cols-7 rounded-xl overflow-hidden border border-white/[0.06] bg-[#0d0f14]/70 backdrop-blur-md shadow-2xl"
        style={{ gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }}
        role="grid"
        aria-label={format(selectedDate, 'MMMM yyyy', { locale: it })}
      >
        {dates.map((date) => {
          const key = toDateKey(date);
          const dayTasks = [...(tasksByDate?.get(key) ?? [])].sort(
            (a, b) =>
              Number(a.completed) - Number(b.completed) ||
              String(a.startTime || '').localeCompare(String(b.startTime || '')) ||
              (a.createdAt || 0) - (b.createdAt || 0)
          );
          const outside = !isSameMonth(date, selectedDate);
          const isToday = key === todayKey;
          const isSel = key === selKey;
          const active = isToday || isSel;
          const pills = dayTasks.slice(0, maxPills);
          const overflow = dayTasks.length - pills.length;

          return (
            <button
              key={key}
              type="button"
              role="gridcell"
              onClick={() => onSelectDate(date)}
              aria-label={`${format(date, 'd MMMM', { locale: it })}${dayTasks.length ? `, ${dayTasks.length} attività` : ''}`}
              className={cn(
                'cal-cell relative flex flex-col p-1 min-h-0 overflow-hidden text-left active:bg-white/[0.05] transition-colors tap-clean',
                active && 'cal-cell-active'
              )}
            >
              {active ? (
                <span className="self-center w-5 h-5 rounded-full bg-gradient-to-tr from-sky-600 to-blue-500 text-white font-bold text-[11px] flex items-center justify-center cal-day-glow shrink-0">
                  {format(date, 'd')}
                </span>
              ) : (
                <span
                  className={cn(
                    'self-center text-[12px] font-medium shrink-0',
                    outside ? 'text-[#5b5b63]' : 'text-[#d4d4d8]'
                  )}
                >
                  {format(date, 'd')}
                </span>
              )}

              <span className="mt-1 flex flex-col gap-1 min-h-0 overflow-hidden">
                {pills.map((t) => {
                  const color = t.categoryColor || '#2997ff';
                  return (
                    <span
                      key={t._id}
                      className="event-chip rounded-[5px] px-1.5 py-[3px] text-[10px] font-medium flex items-center gap-1 border"
                      style={{ backgroundColor: `${color}1c`, borderColor: `${color}42`, color }}
                    >
                      {t.completed && <Check size={9} strokeWidth={3.5} className="shrink-0" />}
                      <span className="truncate">{t.title}</span>
                    </span>
                  );
                })}
                {overflow > 0 && (
                  <span className="event-chip rounded-[5px] px-1.5 py-[3px] text-[10px] font-semibold text-label-tertiary bg-white/[0.06] border border-white/[0.06]">
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
