import { useState } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { ArrowRight, CheckCircle2, Circle, Plus, Repeat, Bell, Paperclip, Clock } from 'lucide-react';
import CalendarHeader from '../components/layout/CalendarHeader';
import WeekStrip from '../components/layout/WeekStrip';
import FAB from '../components/ui/FAB';
import { useExpandedTasks } from '../hooks/useData';
import { toDateKey } from '../lib/dates';

/**
 * Home — Calendario mese/settimana (screenshot home): eventi e attività nei
 * giorni, agenda del giorno selezionato con orari/badge, FAB per aggiungere.
 */
export default function CalendarPage({ selectedDate, selectDate, mode, setMode, goPrev, goNext, goToToday, weekDates, weekLabel, goToPrevWeek, goToNextWeek, onOpenTasks }) {
  const [inspected, setInspected] = useState(false);
  const { data: tasks = [] } = useExpandedTasks(toDateKey(selectedDate));

  const choose = (date) => {
    selectDate(date);
    setInspected(true);
  };

  return (
    <div className="h-full overflow-y-auto scrollable pb-28">
      <CalendarHeader
        mode={mode}
        onModeChange={setMode}
        selectedDate={selectedDate}
        onSelectDate={choose}
        onPrev={() => { goPrev(); setInspected(false); }}
        onNext={() => { goNext(); setInspected(false); }}
        onToday={() => { goToToday(); setInspected(false); }}
        weekStrip={<WeekStrip embedded weekDates={weekDates} selectedDate={selectedDate} weekLabel={weekLabel} onSelectDate={choose} onPrevWeek={goToPrevWeek} onNextWeek={goToNextWeek} onToday={goToToday} />}
      />

      {inspected && (
        <section className="max-w-[900px] mx-auto px-4 pt-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[12px] uppercase tracking-wide text-label-tertiary">Agenda</p>
              <h2 className="text-[20px] font-semibold capitalize">{format(selectedDate, 'EEEE d MMMM', { locale: it })}</h2>
            </div>
            <button onClick={onOpenTasks} className="h-10 px-4 rounded-full bg-accent text-white text-[13px] font-semibold flex items-center gap-2">
              Apri compiti <ArrowRight size={15} />
            </button>
          </div>

          {tasks.length === 0 ? (
            <div className="rounded-2xl bg-surface-1 p-5 text-label-secondary text-[15px]">
              Niente da fare in questo giorno.
            </div>
          ) : (
            <div className="rounded-2xl bg-surface-1 overflow-hidden">
              {tasks.slice(0, 12).map((t) => {
                const done = t.completed;
                const meta = [];
                if (!t.allDay && t.startTime) meta.push(<span key="time" className="flex items-center gap-1"><Clock size={11} /> {t.startTime}{t.endTime ? `–${t.endTime}` : ''}</span>);
                if (t.repeat?.frequency && t.repeat.frequency !== 'none') meta.push(<span key="rep"><Repeat size={11} /></span>);
                if (t.reminders?.length) meta.push(<span key="rem"><Bell size={11} /></span>);
                if (t.attachments?.length) meta.push(<span key="att"><Paperclip size={11} /></span>);
                return (
                  <div key={t._id} className="flex items-center gap-3 px-4 py-3 border-b border-separator last:border-0">
                    {done ? <CheckCircle2 size={18} className="text-sys-green" /> : <Circle size={18} style={{ color: t.categoryColor || '#0a84ff' }} />}
                    <div className="flex-1 min-w-0">
                      <span className={done ? 'line-through text-label-tertiary' : 'text-label'}>{t.title}</span>
                      <div className="flex items-center gap-1.5 text-[11px] text-label-tertiary mt-0.5">{meta}</div>
                    </div>
                    <span className="text-[12px] text-label-tertiary">{t.estimatedMinutes ? `${t.estimatedMinutes} min` : ''}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      <FAB onClick={onOpenTasks} icon={Plus} label="Nuova attività" />
    </div>
  );
}
