import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { ClipboardList, Plus, Timer } from 'lucide-react';
import { useTasks, useExpandedTasks, useTaskCategories } from '../hooks/useData';
import TaskCard from '../components/school/TaskCard';
import TaskFormSheet from '../components/school/TaskFormSheet';
import StudyTimerCard from '../components/school/StudyTimerCard';
import LoadInsightCard from '../components/school/LoadInsightCard';
import DatePickerDialog from '../components/school/DatePickerDialog';
import WeekStrip from '../components/layout/WeekStrip';
import ContextMenu from '../components/ui/ContextMenu';
import EmptyState from '../components/ui/EmptyState';
import FAB from '../components/ui/FAB';
import { toDateKey, addDays } from '../lib/dates';

/**
 * Tab — Compiti (screenshot 06): strip settimanale, lista attività/eventi
 * con orari, ripetizione, promemoria e allegati; timer studio e AI sotto.
 */
export default function SchoolPage({ selectedDate, weekDates, weekLabel, goToPrevWeek, goToNextWeek, goToToday, onSelectDate }) {
  const dateKey = toDateKey(selectedDate);
  const { data: tasks /* mutazioni */, createTask, updateTask, toggleTask, removeTask, moveTaskToDate, addTaskMinutes } = useTasks(dateKey);
  const { data: expandedTasks, isLoading } = useExpandedTasks(dateKey);
  const { data: categories, createCategory } = useTaskCategories();

  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [menuTask, setMenuTask] = useState(null);
  const [menuPos, setMenuPos] = useState(null);
  const [dateChangeTask, setDateChangeTask] = useState(null);
  const [showStudy, setShowStudy] = useState(false);

  const openTasks = useMemo(() => (expandedTasks ?? []).filter((t) => !t.completed), [expandedTasks]);
  const doneTasks = useMemo(() => (expandedTasks ?? []).filter((t) => t.completed), [expandedTasks]);

  const openMenu = useCallback((task, e) => {
    setMenuPos({ y: Math.min(e.clientY ?? 200, window.innerHeight - 260) });
    setMenuTask(task);
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
    <div className="h-full overflow-y-auto scrollable px-4 pt-3 pb-32">
      {/* Header pagina */}
      <div className="mb-1">
        <h1 className="text-[28px] font-bold text-label tracking-tight leading-tight">Compiti</h1>
        <p className="text-[13px] text-label-secondary capitalize">{format(selectedDate, 'EEEE d MMMM', { locale: it })}</p>
      </div>

      {/* Strip settimanale (screenshot 06) */}
      <WeekStrip
        embedded
        weekDates={weekDates}
        selectedDate={selectedDate}
        weekLabel={weekLabel}
        onSelectDate={onSelectDate}
        onPrevWeek={goToPrevWeek}
        onNextWeek={goToNextWeek}
        onToday={goToToday}
      />

      {/* Carico AI */}
      <div className="mb-4">
        <LoadInsightCard dateKey={dateKey} tasks={tasks ?? []} />
      </div>

      {/* Compiti aperti */}
      {(openTasks.length > 0 || doneTasks.length > 0) && (
        <div>
          <div className="flex items-center justify-between mb-2.5 px-1">
            <h2 className="text-[15px] font-semibold text-label-secondary">Attività del giorno ({openTasks.length})</h2>
          </div>
          <div className="flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {openTasks.map((task) => (
                <TaskCard
                  key={task._id}
                  task={task}
                  onToggle={toggleTask}
                  onOpenMenu={openMenu}
                />
              ))}
            </AnimatePresence>
          </div>

          {doneTasks.length > 0 && (
            <>
              <h2 className="text-[15px] font-semibold text-label-tertiary mt-5 mb-2.5 px-1">
                Completati ({doneTasks.length})
              </h2>
              <div className="flex flex-col gap-2 opacity-70">
                <AnimatePresence initial={false}>
                  {doneTasks.map((task) => (
                    <TaskCard
                      key={task._id}
                      task={task}
                      onToggle={toggleTask}
                      onOpenMenu={openMenu}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </>
          )}
        </div>
      )}

      {/* Vuoto */}
      {!isLoading && expandedTasks.length === 0 && (
        <EmptyState
          title="Nessuna attività in questo giorno"
          subtitle="Tocca + per aggiungere un compito"
          icon={ClipboardList}
        />
      )}

      {/* Timer studio (collassabile, per non appesantire la lista) */}
      <div className="mt-5">
        <button
          onClick={() => setShowStudy((s) => !s)}
          className="w-full flex items-center gap-2 px-1 mb-2 text-[14px] font-semibold text-label-secondary"
        >
          <Timer size={15} className="text-accent" />
          Timer di studio (15:00–20:00)
          <span className="ml-auto text-[13px] text-accent">{showStudy ? 'Nascondi' : 'Mostra'}</span>
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

      {/* Menu contestuale (screenshot 13) */}
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
