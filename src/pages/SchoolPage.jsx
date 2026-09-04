import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { ClipboardList, Plus } from 'lucide-react';
import { useTasks, useTaskCategories } from '../hooks/useData';
import TaskCard from '../components/school/TaskCard';
import TaskFormSheet from '../components/school/TaskFormSheet';
import StudyTimerCard from '../components/school/StudyTimerCard';
import LoadInsightCard from '../components/school/LoadInsightCard';
import DatePickerDialog from '../components/school/DatePickerDialog';
import ContextMenu from '../components/ui/ContextMenu';
import EmptyState from '../components/ui/EmptyState';
import FAB from '../components/ui/FAB';
import { toDateKey, addDays } from '../lib/dates';

/**
 * Tab 1 — Scuola: timer studio (15:00–20:00), task categorizzati con
 * menu contestuale, stima tempi e carico via Gemini AI.
 */
export default function SchoolPage({ selectedDate }) {
  const dateKey = toDateKey(selectedDate);
  const { data: tasks, isLoading, createTask, updateTask, toggleTask, removeTask, moveTaskToDate, addTaskMinutes } = useTasks(dateKey);
  const { data: categories } = useTaskCategories();

  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [menuTask, setMenuTask] = useState(null);
  const [menuPos, setMenuPos] = useState(null);
  const [dateChangeTask, setDateChangeTask] = useState(null);

  const openTasks = useMemo(() => (tasks ?? []).filter((t) => !t.completed), [tasks]);
  const doneTasks = useMemo(() => (tasks ?? []).filter((t) => t.completed), [tasks]);

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
    <div className="h-full overflow-y-auto scrollable px-4 pt-2 pb-32">
      {/* Header pagina */}
      <div className="flex items-end justify-between mb-4">
        <div>
          <h1 className="text-[28px] font-bold text-label tracking-tight leading-tight">Scuola</h1>
          <p className="text-[13px] text-label-secondary capitalize">{format(selectedDate, 'EEEE d MMMM', { locale: it })}</p>
        </div>
      </div>

      {/* Timer studio */}
      <div className="mb-4">
        <StudyTimerCard
          selectedDate={selectedDate}
          tasks={tasks ?? []}
          onAssignMinutes={(taskId, minutes) => addTaskMinutes(taskId, minutes)}
        />
      </div>

      {/* Carico AI */}
      <div className="mb-4">
        <LoadInsightCard dateKey={dateKey} tasks={tasks ?? []} />
      </div>

      {/* Compiti aperti */}
      {(openTasks.length > 0 || doneTasks.length > 0) && (
        <div>
          <div className="flex items-center justify-between mb-2.5 px-1">
            <h2 className="text-[15px] font-semibold text-label-secondary">Compiti con data ({tasks.length})</h2>
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
      {!isLoading && tasks.length === 0 && (
        <EmptyState
          title="Nessuna attività in questo giorno"
          subtitle="Tocca + per aggiungere un compito"
          icon={ClipboardList}
        />
      )}

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
