import { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { ClipboardList, Plus, Timer, CalendarRange, CheckCircle2, ChevronRight, X } from 'lucide-react';
import { useTasks, useExpandedTasksBetween, useTaskCategories } from '../hooks/useData';
import TaskCard from '../components/school/TaskCard';
// Editor lazy: scaricato solo alla prima apertura
const TaskFormSheet = lazy(() => import('../components/school/TaskFormSheet'));
import StudyTimerCard from '../components/school/StudyTimerCard';
import LoadInsightCard from '../components/school/LoadInsightCard';
import DatePickerDialog from '../components/school/DatePickerDialog';
import WeekStrip from '../components/layout/WeekStrip';
import ContextMenu from '../components/ui/ContextMenu';
import EmptyState from '../components/ui/EmptyState';
import LiquidDialog from '../components/ui/LiquidDialog';
import FAB from '../components/ui/FAB';
import { toDateKey, addDays, getWeekDates } from '../lib/dates';
import { cn } from '../lib/cn';

/**
 * Tab — Compiti:
 * - Filtro su singolo giorno: la lista principale mostra ESCLUSIVAMENTE
 *   le attività del giorno selezionato nella strip settimanale;
 * - Vista settimanale separata: pulsante dedicato in alto a destra
 *   ("Panoramica Settimanale") che apre una modale/sheet con l'aggregato dell'intera settimana;
 * - Timer studio flessibile e multi-sessione senza vincoli orari rigidi.
 */
export default function SchoolPage({ selectedDate, weekDates, weekLabel, goToPrevWeek, goToNextWeek, goToToday, onSelectDate }) {
  const dateKey = toDateKey(selectedDate);
  const { data: tasks, createTask, updateTask, toggleTask, removeTask, removeSeries, moveTaskToDate, addTaskMinutes } = useTasks(dateKey);
  const { data: categories, createCategory } = useTaskCategories();

  // Compiti dell'INTERA settimana per la modale di panoramica
  const fullWeek = useMemo(
    () => (Array.isArray(weekDates) && weekDates.length === 7 ? weekDates : getWeekDates(selectedDate)),
    [weekDates, selectedDate]
  );
  const weekStartKey = toDateKey(fullWeek[0]);
  const weekEndKey = toDateKey(fullWeek[6]);
  const { data: weekTasksByDay } = useExpandedTasksBetween(weekStartKey, weekEndKey);

  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [menuTask, setMenuTask] = useState(null);
  const [menuPos, setMenuPos] = useState(null);
  const [dateChangeTask, setDateChangeTask] = useState(null);
  const [showStudy, setShowStudy] = useState(false);
  const [weekOverviewOpen, setWeekOverviewOpen] = useState(false);

  // Compiti del SINGOLO giorno selezionato
  const singleDayTasks = useMemo(() => {
    return [...(tasks ?? [])].sort(
      (a, b) =>
        Number(a.completed) - Number(b.completed) ||
        String(a.startTime || '').localeCompare(String(b.startTime || '')) ||
        (a.createdAt || 0) - (b.createdAt || 0)
    );
  }, [tasks]);

  const singleDayOpenCount = singleDayTasks.filter((t) => !t.completed).length;

  // Raggruppamento per panoramica settimanale
  const dayGroups = useMemo(
    () =>
      fullWeek.map((date) => {
        const key = toDateKey(date);
        const items = [...(weekTasksByDay?.get(key) ?? [])].sort(
          (a, b) =>
            Number(a.completed) - Number(b.completed) ||
            String(a.startTime || '').localeCompare(String(b.startTime || '')) ||
            (a.createdAt || 0) - (b.createdAt || 0)
        );
        return { date, key, items, isToday: key === toDateKey(new Date()), isSelected: key === dateKey };
      }),
    [fullWeek, weekTasksByDay, dateKey]
  );

  const weekTotal = dayGroups.reduce((s, g) => s + g.items.length, 0);
  const weekOpen = dayGroups.reduce((s, g) => s + g.items.filter((t) => !t.completed).length, 0);

  const openMenu = useCallback((task, e) => {
    setMenuPos({ y: Math.min(e.clientY ?? 200, window.innerHeight - 260) });
    setMenuTask(task);
    import('../components/school/TaskFormSheet');
  }, []);

  const handleSave = async (fields) => {
    if (editingTask) {
      await updateTask(editingTask._id, fields);
    } else {
      await createTask(fields);
    }
    setEditingTask(null);
  };

  const handleDelete = (task) => removeTask(task._id);
  const handleMoveTomorrow = (task) => moveTaskToDate(task._id, toDateKey(addDays(selectedDate, 1)));

  return (
    <div className="h-full overflow-y-auto scrollable px-4 pt-2 pb-32">
      {/* Header pagina con pulsante Panoramica Settimanale in alto a destra */}
      <div className="flex items-center justify-between mb-2.5">
        <div>
          <h1 className="text-[28px] font-semibold text-label tracking-tight leading-tight">Compiti</h1>
          <p className="text-[13px] text-label-secondary capitalize">{format(selectedDate, 'EEEE d MMMM', { locale: it })}</p>
        </div>

        <button
          type="button"
          onClick={() => setWeekOverviewOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.14] border border-white/10 active:scale-95 transition-all text-[12.5px] font-semibold text-label"
          aria-label="Apri panoramica settimanale"
        >
          <CalendarRange size={15} className="text-sky" />
          <span>Panoramica Settimanale</span>
        </button>
      </div>

      {/* Navigazione settimana con strip interattiva */}
      <WeekStrip
        weekDates={weekDates}
        selectedDate={selectedDate}
        weekLabel={weekLabel}
        onSelectDate={onSelectDate}
        onPrevWeek={goToPrevWeek}
        onNextWeek={goToNextWeek}
        onToday={goToToday}
      />

      {/* Carico AI del giorno selezionato */}
      <div className="mb-4">
        <LoadInsightCard dateKey={dateKey} tasks={tasks ?? []} />
      </div>

      {/* Intestazione lista giorno */}
      <div className="flex items-center justify-between mb-2.5 px-1">
        <h2 className="text-[12px] font-semibold text-[#8e8e93] uppercase tracking-[0.08em] truncate">
          Attività di {format(selectedDate, 'EEEE d', { locale: it })} <span className="tabular-nums">({singleDayTasks.length})</span>
        </h2>
        <span className="text-[12px] text-label-tertiary tabular-nums">
          {singleDayOpenCount === 0 && singleDayTasks.length > 0
            ? 'Tutti completati!'
            : `${singleDayOpenCount} da fare`}
        </span>
      </div>

      {/* Lista esclusiva del SINGOLO giorno selezionato */}
      {singleDayTasks.length === 0 ? (
        <EmptyState
          title={`Nessun compito per ${format(selectedDate, 'EEEE d MMMM', { locale: it })}`}
          subtitle="Tocca + per aggiungere un compito a questa data"
          icon={ClipboardList}
        />
      ) : (
        <div className="flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {singleDayTasks.map((task) => (
              <TaskCard key={task._id} task={task} onToggle={toggleTask} onOpenMenu={openMenu} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Timer studio flessibile (collassabile) */}
      <div className="mt-6">
        <button
          onClick={() => setShowStudy((s) => !s)}
          className="w-full flex items-center gap-2 px-1 mb-2 text-[14px] font-semibold text-label-secondary min-h-11"
        >
          <Timer size={16} className="text-sky shrink-0" />
          <span>Timer di studio</span>
          <span className="ml-auto text-[13px] text-sky shrink-0">{showStudy ? 'Nascondi' : 'Mostra'}</span>
        </button>
        {showStudy && (
          <StudyTimerCard
            selectedDate={selectedDate}
            tasks={tasks ?? []}
            onAssignMinutes={(taskId, minutes) => addTaskMinutes(taskId, minutes)}
          />
        )}
      </div>

      {/* FAB nuovo compito */}
      <FAB
        onClick={() => {
          setEditingTask(null);
          setFormOpen(true);
        }}
        icon={Plus}
        label="Nuovo compito"
      />

      {/* Modale / Sheet: Panoramica Settimanale aggregata */}
      <LiquidDialog
        isOpen={weekOverviewOpen}
        onClose={() => setWeekOverviewOpen(false)}
        maxWidth={540}
        title={
          <span className="flex items-center gap-2">
            <CalendarRange size={18} className="text-sky" />
            <span className="text-[18px] font-semibold text-label">Panoramica Settimanale</span>
          </span>
        }
      >
        <div className="pt-1 pb-4">
          <div className="flex items-center justify-between px-1 mb-4 pb-2 border-b border-white/[0.08]">
            <span className="text-[13px] text-label-secondary">{weekLabel}</span>
            <span className="text-[12px] font-medium text-label-tertiary">
              {weekOpen} da fare su {weekTotal} totali
            </span>
          </div>

          <div className="flex flex-col gap-4 max-h-[62vh] overflow-y-auto scrollable pr-1">
            {dayGroups.map((group) => {
              const pendingCount = group.items.filter((t) => !t.completed).length;
              return (
                <section
                  key={group.key}
                  className={cn(
                    'rounded-2xl p-3 border transition-colors',
                    group.isSelected
                      ? 'bg-white/[0.06] border-sky/40'
                      : 'bg-white/[0.02] border-white/[0.06]'
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectDate(group.date);
                        setWeekOverviewOpen(false);
                      }}
                      className="flex items-center gap-2 text-left group"
                    >
                      <h3
                        className={cn(
                          'text-[14px] font-semibold capitalize group-hover:text-sky transition-colors',
                          group.isSelected ? 'text-sky' : group.isToday ? 'text-sky' : 'text-label'
                        )}
                      >
                        {format(group.date, 'EEEE d MMMM', { locale: it })}
                      </h3>
                      {group.isToday && (
                        <span className="text-[9.5px] font-semibold text-white bg-accent rounded-full px-2 py-0.5 uppercase tracking-wide">
                          Oggi
                        </span>
                      )}
                      <ChevronRight size={14} className="text-label-tertiary group-hover:text-sky transition-colors" />
                    </button>
                    <span className="text-[11.5px] text-label-tertiary tabular-nums">
                      {group.items.length - pendingCount}/{group.items.length} completati
                    </span>
                  </div>

                  {group.items.length === 0 ? (
                    <p className="text-[12px] text-label-tertiary py-1 italic">Nessuna attività programmata</p>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {group.items.map((task) => (
                        <div
                          key={task._id}
                          className="flex items-center gap-2.5 py-1.5 px-2 rounded-xl bg-white/[0.04] border border-white/[0.03]"
                        >
                          <button
                            type="button"
                            onClick={() => toggleTask(task._id)}
                            className="shrink-0"
                            aria-label={task.completed ? 'Segna come non completato' : 'Segna come completato'}
                          >
                            <CheckCircle2
                              size={17}
                              className={task.completed ? 'text-sys-green' : 'text-white/30'}
                            />
                          </button>
                          <span
                            className={cn(
                              'text-[13px] truncate flex-1',
                              task.completed ? 'line-through text-label-tertiary' : 'text-label'
                            )}
                          >
                            {task.title}
                          </span>
                          {task.startTime && (
                            <span className="text-[11px] text-label-tertiary tabular-nums shrink-0">
                              {task.startTime}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </div>
      </LiquidDialog>

      {/* Sheet creazione/modifica */}
      <Suspense fallback={null}>
        <TaskFormSheet
          isOpen={formOpen}
          onClose={() => {
            setFormOpen(false);
            setEditingTask(null);
          }}
          onSave={handleSave}
          editingTask={editingTask}
          defaultDate={dateKey}
          categories={categories ?? []}
          onCreateCategory={createCategory}
        />
      </Suspense>

      {/* Menu contestuale */}
      <ContextMenu
        isOpen={!!menuTask}
        onClose={() => setMenuTask(null)}
        position={menuPos}
        actions={
          menuTask
            ? [
                {
                  label: 'Modifica',
                  onClick: () => {
                    setEditingTask(menuTask);
                    setFormOpen(true);
                  },
                },
                { label: 'Sposta a domani', onClick: () => handleMoveTomorrow(menuTask) },
                { label: 'Cambia data', onClick: () => setDateChangeTask(menuTask) },
                { label: 'Elimina', destructive: true, onClick: () => handleDelete(menuTask) },
                ...(menuTask.seriesId
                  ? [{ label: 'Elimina l’intera serie', destructive: true, onClick: () => removeSeries(menuTask._id) }]
                  : []),
              ]
            : []
        }
      />

      {/* Cambia data diretto dal menu */}
      <DatePickerDialog
        isOpen={!!dateChangeTask}
        onClose={() => setDateChangeTask(null)}
        value={dateChangeTask?.date}
        onConfirm={(newDate) => {
          if (dateChangeTask) moveTaskToDate(dateChangeTask._id, newDate);
          setDateChangeTask(null);
        }}
      />
    </div>
  );
}
