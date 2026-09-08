import { useMemo } from 'react';
import { addDays, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek } from 'date-fns';
import { it } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/cn';
import { toDateKey } from '../../lib/dates';
import { useTasksBetween } from '../../hooks/useData';

const DAYS = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];

export default function CalendarHeader({ mode, onModeChange, selectedDate, onSelectDate, onPrev, onNext, onToday, weekStrip }) {
  const monthStart = startOfMonth(selectedDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(selectedDate), { weekStartsOn: 1 });
  const dates = useMemo(() => {
    const result = [];
    for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) result.push(d);
    return result;
  }, [gridStart.getTime(), gridEnd.getTime()]);
  const { data: monthTasks = [] } = useTasksBetween(toDateKey(gridStart), toDateKey(gridEnd));
  const colorsByDate = useMemo(() => monthTasks.reduce((map, task) => {
    (map[task.date] ||= []).push(task.categoryColor);
    return map;
  }, {}), [monthTasks]);

  return <header className="calendar-header border-b border-separator-opaque bg-canvas/95 backdrop-blur-dialog shrink-0">
    <div className="max-w-[1100px] mx-auto w-full px-4 pt-3">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div>
          <h1 className="text-[25px] font-semibold tracking-tight capitalize">{format(selectedDate, mode === 'month' ? 'MMMM yyyy' : 'MMMM yyyy', { locale: it })}</h1>
          <button onClick={onToday} className="text-accent text-[13px] min-h-8">Vai a oggi</button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-surface-2 rounded-full p-1" aria-label="Vista calendario">
            {['week','month'].map(v => <button key={v} onClick={() => onModeChange(v)} className={cn('h-8 px-3 rounded-full text-[12px] font-semibold', mode === v ? 'bg-accent text-white' : 'text-label-secondary')}>{v === 'week' ? 'Settimana' : 'Mese'}</button>)}
          </div>
          <button onClick={onPrev} aria-label="Periodo precedente" className="control-button"><ChevronLeft size={20}/></button>
          <button onClick={onNext} aria-label="Periodo successivo" className="control-button"><ChevronRight size={20}/></button>
        </div>
      </div>
      {mode === 'week' ? weekStrip : <div className="month-grid pb-3">
        {DAYS.map((d,i) => <div key={i} className="text-center text-[11px] font-semibold text-label-tertiary py-1">{d}</div>)}
        {dates.map(date => {
          const active = isSameDay(date, selectedDate);
          const dayTasks = (monthTasks || []).filter((t) => t.date === toDateKey(date));
          const colors = [...new Set(dayTasks.map((t) => t.categoryColor || '#0a84ff'))].slice(0, 4);
          return (
            <button key={date.toISOString()} onClick={() => onSelectDate(date)} className={cn('month-day', !isSameMonth(date, selectedDate) && 'opacity-35')} aria-label={format(date, 'd MMMM yyyy', {locale:it})}>
              <span className={cn('month-number', active && 'bg-accent text-white')}>{format(date,'d')}</span>
              {/* Anteprima eventi/attività (screenshot home) */}
              <span className="flex flex-col items-center gap-0.5 w-full min-h-[16px]">
                {dayTasks.slice(0, 2).map((t) => (
                  <span key={t._id} className={cn('flex items-center gap-1 max-w-full px-1 py-px rounded-[4px] text-[8.5px] leading-[1.15] truncate', active ? 'bg-accent/20 text-label' : 'bg-surface-2 text-label-secondary')}>
                    <i className="w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: t.categoryColor || '#0a84ff' }} />
                    <span className="truncate">{t.title}</span>
                  </span>
                ))}
                {dayTasks.length > 2 && <span className="text-[8.5px] text-label-tertiary leading-none">+{dayTasks.length - 2}</span>}
                {dayTasks.length === 0 && <span className="flex h-1.5 gap-0.5 justify-center">{colors.map(c => <i key={c} className="w-1 h-1 rounded-full" style={{backgroundColor:c}} />)}</span>}
              </span>
            </button>
          );
        })}
      </div>}
    </div>
  </header>;
}
