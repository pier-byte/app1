import { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { ClipboardList, Plus, Timer, CalendarRange, CheckCircle2, ChevronRight } from 'lucide-react';
import { useTasks, useExpandedTasks, useExpandedTasksBetween, useTaskCategories } from '../hooks/useData';
import TaskCard from '../components/school/TaskCard';
// Editor lazy: scaricato solo alla prima apertura
const TaskFormSheet = lazy(() => import('../components/school/TaskFormSheet'));
import StudyTimerCard from '../components/school/StudyTimerCard';
import LoadInsightCard from '../components/school/LoadInsightCard';
import StudyPlanSheet from '../components/school/StudyPlanSheet';
import DatePickerDialog from '../components/school/DatePickerDialog';
import WeekStrip from '../components/layout/WeekStrip';
import ContextMenu from '../components/ui/ContextMenu';
import EmptyState from '../components/ui/EmptyState';
import LiquidDialog from '../components/ui/LiquidDialog';
import FAB from '../components/ui/FAB';
import { useDeviceClock } from '../hooks/useDeviceClock';
import { toDateKey, addDays, getWeekDates } from '../lib/dates';
import { collectStudyTasks, buildUpcomingGroups, isAssignedToStudyDay } from '../lib/studyPlan';
import { cn } from '../lib/cn';

/**
 * Tab — Compiti (ui-references/sezione_compiti_liquid_glass):
 * - Filtro su singolo giorno: la lista principale mostra ESCLUSIVAMENTE
 *   le attività del giorno selezionato nella strip settimanale (incluse le
 *   occorrenze delle serie ricorrenti, focalizzate sul giorno cliccato);
 * - "COMPITI CON DATA (n)" come intestazione di sezione del reference;
 * - Carico di studio = giornata di STUDIO (scadenza ≠ svolgimento) con
 *   selettore per attingere alle scadenze dei giorni successivi;
 * - Vista settimanale separata: "Panoramica Settimanale" in alto a destra.
 */
export default function SchoolPage({ selectedDate, weekDates, weekLabel, goToPrevWeek, goToNextWeek, goToToday, onSelectDate }) {
  const dateKey = toDateKey(selectedDate);
  const todayKey = useDeviceClock();
  const {
    data: rawTasks, createTask, updateTaskInstance, toggleTaskInstance,
    removeTaskInstance, removeSeries, moveTaskInstance, addTaskMinutes,
  } = useTasks(dateKey);
  const { data: categories, createCategory } = useTaskCategories();

  // Lista del giorno: istanze espanse (serie ricorrenti incluse, ognuna col
  // proprio targetDate = giorno mostrato → focus corretto dell'occorrenza).
  const { data: dayTasks = [] } = useExpandedTasks(dateKey);

  // Finestra di pianificazione studio: −45 giorni (recuperi) … +14 (scadenze future)
  const planStartKey = toDateKey(addDays(selectedDate, -45));
  const planEndKey = toDateKey(addDays(selectedDate, 14));
  const { data: planWindowMap } = useExpandedTasksBetween(planStartKey, planEndKey);

  // Attività che compongono il carico della giornata di studio `dateKey`:
  // assegnate esplicitamente (studyDate === dateKey) + scadenze del giorno
  // senza pianificazione altrove (auto). Le occorrenze virtuali legacy non
  // partecipano finché non vengono materializzate dall'interazione.
  const studyTasks = useMemo(
    () => collectStudyTasks(planWindowMap, dateKey),
    [planWindowMap, dateKey]
  );

  // Scadenze future raggruppate per giorno (per lo StudyPlanSheet)
  const upcomingByDay = useMemo(
    () => buildUpcomingGroups(planWindowMap, dateKey, 14),
    [planWindowMap, dateKey]
  );

  const isAssignedToDay = useCallback(
    (task) => isAssignedToStudyDay(task, dateKey),
    [dateKey]
  );

  const toggleStudyPlan = useCallback(
    (task) => {
      if (task.studyDate === dateKey) {
        updateTaskInstance(task, { studyDate: '' }); // torna "auto" (giorno della scadenza)
      } else {
        updateTaskInstance(task, { studyDate: dateKey });
      }
    },
    [dateKey, updateTaskInstance]
  );

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
  const [planOpen, setPlanOpen] = useState(false);

  const singleDayTasks = useMemo(() => {
    return [...dayTasks].sort(
      (a, b) =>
        Number(a.completed) - Number(b.completed) ||
        String(a.startTime || '').localeCompare(String(b.startTime || '')) ||
        (a.createdAt || 0) - (b.createdAt || 0)
    );
  }, [dayTasks]);

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
        return { date, key, items, isToday: key === todayKey, isSelected: key === dateKey };
      }),
    [fullWeek, weekTasksByDay, dateKey, todayKey]
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
      // Le occorrenze virtuali vengono materializzate sul giorno focalizzato
      await updateTaskInstance(editingTask, fields);
    } else {
      await createTask(fields);
    }
    setEditingTask(null);
  };

  const handleDelete = (task) => removeTaskInstance(task);
  const handleMoveTomorrow = (task) => moveTaskInstance(task, toDateKey(addDays(selectedDate, 1)));

  return (
    <div className="h-full overflow-y-auto scrollable px-4 pt-2 page-bottom-pad">
      {/* Header pagina (reference: titolo grande + azione secondaria a destra) */}
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <div className="min-w-0">
          <h1 className="text-[28px] font-semibold text-label tracking-tight leading-tight">Compiti</h1>
          <p className="text-[13px] text-label-secondary capitalize truncate">
            {format(selectedDate, 'EEEE d MMMM', { locale: it })}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setWeekOverviewOpen(true)}
          className="glass-btn flex items-center gap-1.5 h-11 px-3.5 rounded-2xl text-[12.5px] font-semibold text-label shrink-0 active:scale-95 transition-transform"
          aria-label="Apri panoramica settimanale"
        >
          <CalendarRange size={15} className="text-sky shrink-0" />
          <span className="truncate">Panoramica</span>
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

      {/* Carico di studio della giornata di studio selezionata */}
      <div className="mb-4">
        <LoadInsightCard
          dateKey={dateKey}
          studyTasks={studyTasks}
          onOpenPlan={() => setPlanOpen(true)}
        />
      </div>

      {/* Intestazione lista giorno (reference: "COMPITI CON DATA (n)") */}
      <div className="flex items-center justify-between mb-2.5 px-1">
        <h2 className="text-[12px] font-semibold text-[#9a9aa0] uppercase tracking-wider truncate">
          Compiti con data <span className="font-normal text-label-tertiary tabular-nums">({singleDayTasks.length})</span>
        </h2>
        <span className="text-[12px] text-label-tertiary tabular-nums shrink-0">
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
              <TaskCard
                key={task.instanceId ?? task._id}
                task={task}
                dateKey={dateKey}
                onToggle={toggleTaskInstance}
                onOpenMenu={openMenu}
              />
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
            tasks={rawTasks ?? dayTasks}
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

      {/* Selettore giornata di studio (scadenze oggi…+14 giorni) */}
      <StudyPlanSheet
        isOpen={planOpen}
        onClose={() => setPlanOpen(false)}
        dateKey={dateKey}
        upcomingByDay={upcomingByDay}
        isAssigned={isAssignedToDay}
        onToggleTask={toggleStudyPlan}
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
                      className="flex items-center gap-2 text-left group min-h-11"
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
                          key={task.instanceId ?? task._id}
                          className="flex items-center gap-2.5 py-1.5 px-2 rounded-xl bg-white/[0.04] border border-white/[0.03]"
                        >
                          <button
                            type="button"
                            onClick={() => toggleTaskInstance(task)}
                            className="shrink-0 w-11 h-11 grid place-items-center -ml-2"
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

      {/* Menu contestuale (operazioni sull'istanza del giorno) */}
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
        value={dateChangeTask?.targetDate ?? dateChangeTask?.date}
        onConfirm={(newDate) => {
          if (dateChangeTask) moveTaskInstance(dateChangeTask, newDate);
          setDateChangeTask(null);
        }}
      />
    </div>
  );
}
