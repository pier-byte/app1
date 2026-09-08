import { useState } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { ArrowRight, CheckCircle2, Circle } from 'lucide-react';
import CalendarHeader from '../components/layout/CalendarHeader';
import WeekStrip from '../components/layout/WeekStrip';
import { useTasks } from '../hooks/useData';
import { toDateKey } from '../lib/dates';

export default function CalendarPage({ selectedDate, selectDate, mode, setMode, goPrev, goNext, goToToday, weekDates, weekLabel, goToPrevWeek, goToNextWeek, onOpenTasks }) {
  const [inspected, setInspected] = useState(false);
  const { data: tasks = [] } = useTasks(toDateKey(selectedDate));
  const choose = (date) => { selectDate(date); setInspected(true); };
  return <div className="h-full overflow-y-auto scrollable pb-28">
    <CalendarHeader mode={mode} onModeChange={setMode} selectedDate={selectedDate} onSelectDate={choose} onPrev={() => {goPrev(); setInspected(false)}} onNext={() => {goNext(); setInspected(false)}} onToday={() => {goToToday(); setInspected(false)}} weekStrip={<WeekStrip embedded weekDates={weekDates} selectedDate={selectedDate} weekLabel={weekLabel} onSelectDate={choose} onPrevWeek={goToPrevWeek} onNextWeek={goToNextWeek} onToday={goToToday}/>} />
    {inspected && <section className="max-w-[900px] mx-auto px-4 pt-5">
      <div className="flex items-center justify-between mb-3"><div><p className="text-[12px] uppercase tracking-wide text-label-tertiary">Agenda</p><h2 className="text-[20px] font-semibold capitalize">{format(selectedDate,'EEEE d MMMM',{locale:it})}</h2></div><button onClick={onOpenTasks} className="h-10 px-4 rounded-full bg-accent text-white text-[13px] font-semibold flex items-center gap-2">Apri compiti <ArrowRight size={15}/></button></div>
      {tasks.length === 0 ? <div className="rounded-2xl bg-surface-1 p-5 text-label-secondary text-[15px]">Niente da fare in questo giorno.</div> : <div className="rounded-2xl bg-surface-1 overflow-hidden">{tasks.slice(0,5).map(t => <div key={t._id} className="flex items-center gap-3 px-4 py-3 border-b border-separator last:border-0">{t.completed?<CheckCircle2 size={18} className="text-sys-green"/>:<Circle size={18} style={{color:t.categoryColor}}/>}<span className={t.completed?'line-through text-label-tertiary':'text-label'}>{t.title}</span><span className="ml-auto text-[12px] text-label-tertiary">{t.estimatedMinutes ? `${t.estimatedMinutes} min` : ''}</span></div>)}</div>}
    </section>}
  </div>;
}
