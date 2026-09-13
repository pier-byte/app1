import { useState, lazy, Suspense } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { ArrowRight, CheckCircle2, Circle, Plus, Repeat, Bell, Paperclip, Clock } from 'lucide-react';
import CalendarHeader from '../components/layout/CalendarHeader';
import WeekStrip from '../components/layout/WeekStrip';
import MonthGrid from '../components/calendar/MonthGrid';
import DaySheet from '../components/calendar/DaySheet';
import MonthYearPickerDialog from '../components/school/MonthYearPickerDialog';
// Editor lazy: scaricato solo alla prima apertura (risparmia ~70kB al primo paint)
const TaskFormSheet = lazy(() => import('../components/school/TaskFormSheet'));
import FAB from '../components/ui/FAB';
import { useExpandedTasks, useTasks, useTaskCategories } from '../hooks/useData';
import { toDateKey } from '../lib/dates';

/**
 * Home — Calendario (screenshot home):
 * - vista Mese: griglia fit-to-screen con pill delle attività; tap sul giorno
 *   → DaySheet con check/uncheck, modifica inline e cambio categoria;
 * - vista Settimana: strip + agenda del giorno con toggle bidirezionale;
 * - FAB: editor completo per la data selezionata.
 */
export default function CalendarPage({ selectedDate, selectDate, mode, setMode, goPrev, goNext, goToToday, weekDates, weekLabel, goToPrevWeek, goToNextWeek, onOpenTasks }) {
  const dateKey = toDateKey(selectedDate);
  const [sheetDate, setSheetDate] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const { data: dayTasks = [] } = useExpandedTasks(dateKey);
  const { createTask, updateTask, toggleTask } = useTasks(dateKey);
  const { data: categories, createCategory } = useTaskCategories();

  const openDay = (date) => {
    selectDate(date);
    setSheetDate(date);
    import('../components/school/TaskFormSheet'); // preload: l'editor è a un tap di distanza
  };

  const openFullEditor = (task) => {
    setEditingTask(task ?? null);
    setFormOpen(true);
  };

  const handleSave = async (fields) => {
    if (editingTask) {
      await updateTask(editingTask._id, fields);
    } else {
      await createTask(fields);
    }
    setEditingTask(null);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <CalendarHeader
        mode={mode}
        onModeChange={setMode}
        selectedDate={selectedDate}
        onPrev={goPrev}
        onNext={goNext}
        onToday={goToToday}
        onHeaderClick={() => setMonthPickerOpen(true)}
        weekStrip={<WeekStrip embedded weekDates={weekDates} selectedDate={selectedDate} weekLabel={weekLabel} onSelectDate={selectDate} onPrevWeek={goToPrevWeek} onNextWeek={goToNextWeek} onToday={goToToday} />}
      />

      <MonthYearPickerDialog
        isOpen={monthPickerOpen}
        onClose={() => setMonthPickerOpen(false)}
        value={selectedDate}
        onConfirm={(newMonthDate) => {
          selectDate(newMonthDate);
          setMonthPickerOpen(false);
        }}
      />

      {mode === 'month' ? (
        <MonthGrid selectedDate={selectedDate} onSelectDate={openDay} />
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto scrollable pb-32">
          <section className="max-w-[900px] mx-auto px-4 pt-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[12px] uppercase tracking-wide text-label-tertiary">Agenda</p>
                <h2 className="text-[20px] font-semibold capitalize">{format(selectedDate, 'EEEE d MMMM', { locale: it })}</h2>
              </div>
              <button onClick={onOpenTasks} className="shrink-0 h-10 px-4 rounded-full bg-accent border border-blue-400/25 text-white text-[13px] font-semibold flex items-center gap-2 shadow-sm shadow-blue-600/40">
                Apri compiti <ArrowRight size={15} className="shrink-0" />
              </button>
            </div>

            {dayTasks.length === 0 ? (
              <div className="card p-5 text-label-secondary text-[15px]">
                Niente da fare in questo giorno.
              </div>
            ) : (
              <div className="card overflow-hidden">
                {dayTasks.slice(0, 30).map((t) => {
                  const done = t.completed;
                  const meta = [];
                  if (!t.allDay && t.startTime) meta.push(<span key="time" className="flex items-center gap-1"><Clock size={11} /> {t.startTime}{t.endTime ? `–${t.endTime}` : ''}</span>);
                  if (t.repeat?.frequency && t.repeat.frequency !== 'none') meta.push(<span key="rep"><Repeat size={11} /></span>);
                  if (t.reminders?.length) meta.push(<span key="rem"><Bell size={11} /></span>);
                  if (t.attachments?.length) meta.push(<span key="att"><Paperclip size={11} /></span>);
                  return (
                    <div key={t._id} className="flex items-center gap-3 px-4 py-2.5 border-b border-separator last:border-0">
                      <button
                        onClick={() => toggleTask(t._id)}
                        aria-label={done ? 'Segna come non completato' : 'Segna come completato'}
                        className="w-10 h-10 grid place-items-center shrink-0 -ml-2"
                      >
                        {done ? <CheckCircle2 size={20} className="text-sys-green" /> : <Circle size={20} style={{ color: t.categoryColor || '#2997ff' }} />}
                      </button>
                      <button onClick={() => openDay(selectedDate)} className="flex-1 min-w-0 text-left">
                        <span className={done ? 'line-through text-label-tertiary' : 'text-label'}>{t.title}</span>
                        <div className="flex items-center gap-1.5 text-[11px] text-label-tertiary mt-0.5">{meta}</div>
                      </button>
                      <span className="text-[12px] text-label-tertiary">{t.estimatedMinutes ? `${t.estimatedMinutes} min` : ''}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {sheetDate && (
        <DaySheet
          date={sheetDate}
          onClose={() => setSheetDate(null)}
          onEditFull={openFullEditor}
          categories={categories ?? []}
        />
      )}

      <Suspense fallback={null}>
        <TaskFormSheet
          isOpen={formOpen}
          onClose={() => {
            setFormOpen(false);
            setEditingTask(null);
          }}
          onSave={handleSave}
          editingTask={editingTask}
          defaultDate={toDateKey(sheetDate ?? selectedDate)}
          categories={categories ?? []}
          onCreateCategory={createCategory}
        />
      </Suspense>

      <FAB onClick={() => openFullEditor(null)} icon={Plus} label="Nuova attività" />
    </div>
  );
}
