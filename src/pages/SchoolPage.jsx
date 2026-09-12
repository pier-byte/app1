import { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { ClipboardList, Plus, Timer, ChevronLeft, ChevronRight } from 'lucide-react';
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
import FAB from '../components/ui/FAB';
import { toDateKey, addDays, getWeekDates } from '../lib/dates';
import { cn } from '../lib/cn';

/**
 * Tab — Compiti (ui-references/sezione_compiti_liquid_glass):
 * navigazione tra le settimane con frecce ‹ › e pill "Oggi"; la lista mostra
 * TUTTI i compiti della settimana selezionata, raggruppati per giorno
 * (giorno corrente evidenziato in azzurro).
 */
export default function SchoolPage({ selectedDate, weekDates, weekLabel, goToPrevWeek, goToNextWeek, goToToday, onSelectDate }) {
  const dateKey = toDateKey(selectedDate);
  const { data: tasks /* mutazioni */, createTask, updateTask, toggleTask, removeTask, removeSeries, moveTaskToDate, addTaskMinutes } = useTasks(dateKey);
  const { data: categories, createCategory } = useTaskCategories();

  // Compiti dell'INTERA settimana selezionata, raggruppati per giorno
  // (weekDates può mancare/incompleta → derivata dalla data selezionata)
  const fullWeek = useMemo(
    () => (Array.isArray(weekDates) && weekDates.length === 7 ? weekDates : getWeekDates(selectedDate)),
    [weekDates, selectedDate]
  );
  const weekStartKey = toDateKey(fullWeek[0]);
  const weekEndKey = toDateKey(fullWeek[6]);
  const { data: weekTasksByDay, isLoading: weekLoading } = useExpandedTasksBetween(weekStartKey, weekEndKey);

  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [menuTask, setMenuTask] = useState(null);
  const [menuPos, setMenuPos] = useState(null);
  const [dateChangeTask, setDateChangeTask] = useState(null);
  const [showStudy, setShowStudy] = useState(false);

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
    import('../components/school/TaskFormSheet'); // preload: "Modifica" è nel menu
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
      {/* Header pagina */}
      <div className="mb-2.5">
        <h1 className="text-[28px] font-semibold text-label tracking-tight leading-tight">Compiti</h1>
        <p className="text-[13px] text-label-secondary capitalize">{format(selectedDate, 'EEEE d MMMM', { locale: it })}</p>
      </div>

      {/* Navigazione settimana: ‹ 31 ago - 6 set › + Oggi (reference sezione_compiti) */}
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

      {/* Elenco settimana */}
      <div className="flex items-center justify-between mb-2.5 px-1">
        <h2 className="text-[12px] font-semibold text-[#8e8e93] uppercase tracking-[0.08em] truncate">
          Compiti con data <span className="tabular-nums">({weekTotal})</span>
        </h2>
        <span className="text-[12px] text-label-tertiary tabular-nums">{weekOpen} da fare</span>
      </div>

      {!weekLoading && weekTotal === 0 ? (
        <EmptyState
          title="Nessun compito questa settimana"
          subtitle="Tocca + per aggiungere un compito"
          icon={ClipboardList}
        />
      ) : (
        <div className="flex flex-col gap-4">
          {dayGroups.map((group) =>
            group.items.length === 0 ? null : (
              <section key={group.key}>
                {/* Intestazione giorno (selezionato → azzurro, come reference) */}
                <div className="flex items-center gap-2 mb-2 px-1">
                  <h3
                    className={cn(
                      'text-[14px] font-semibold capitalize',
                      group.isSelected ? 'text-sky' : group.isToday ? 'text-sky' : 'text-label-secondary'
                    )}
                  >
                    {format(group.date, 'EEEE d MMMM', { locale: it })}
                  </h3>
                  {group.isToday && (
                    <span className="text-[10px] font-semibold text-white bg-accent rounded-full px-2 py-0.5 uppercase tracking-wide">
                      Oggi
                    </span>
                  )}
                  <span className="flex-1 h-px bg-white/[0.06]" />
                  <span className="text-[11.5px] text-label-tertiary tabular-nums">
                    {group.items.filter((t) => !t.completed).length}/{group.items.length}
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  <AnimatePresence initial={false}>
                    {group.items.map((task) => (
                      <TaskCard key={task._id} task={task} onToggle={toggleTask} onOpenMenu={openMenu} />
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            )
          )}
        </div>
      )}

      {/* Timer studio (collassabile, per non appesantire la lista) */}
      <div className="mt-5">
        <button
          onClick={() => setShowStudy((s) => !s)}
          className="w-full flex items-center gap-2 px-1 mb-2 text-[14px] font-semibold text-label-secondary min-h-11"
        >
          <Timer size={15} className="text-sky shrink-0" />
          Timer di studio (15:00–20:00)
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

      {/* Menu contestuale (reference: Modifica/Copia/Sposta/Cambia data/Elimina) */}
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
