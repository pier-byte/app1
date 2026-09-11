import { useState } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Check, Plus, Trash2, Layers, ChevronRight, Bell, Paperclip, Repeat, Clock, CalendarPlus } from 'lucide-react';
import BottomSheet from '../ui/BottomSheet';
import { useExpandedTasks, useTasks } from '../../hooks/useData';
import { toDateKey } from '../../lib/dates';
import { repeatLabel } from '../../lib/repeat';
import { cn } from '../../lib/cn';

/**
 * DaySheet — Bottom sheet giornaliero (~52dvh): tap su un giorno del mese →
 * lista attività del giorno con check/uncheck rapido, modifica titolo inline,
 * cambio categoria al volo ed eliminazione (singola o intera serie).
 */
export default function DaySheet({ date, onClose, onEditFull, categories = [] }) {
  const dateKey = toDateKey(date);
  const { data: tasks = [] } = useExpandedTasks(dateKey);
  const { createTask, updateTask, toggleTask, removeTask, removeSeries } = useTasks(dateKey);
  const [quickTitle, setQuickTitle] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');

  const sorted = [...tasks].sort(
    (a, b) =>
      Number(a.completed) - Number(b.completed) ||
      String(a.startTime || '').localeCompare(String(b.startTime || '')) ||
      (a.createdAt || 0) - (b.createdAt || 0)
  );

  const quickAdd = async () => {
    const title = quickTitle.trim();
    if (!title) return;
    const cat = categories[0];
    await createTask({
      title,
      category: cat?.name ?? 'Studiare',
      categoryColor: cat?.color ?? '#2997ff',
      date: dateKey,
      allDay: true,
      reminders: [],
      attachments: [],
    });
    setQuickTitle('');
  };

  const commitTitle = async (task) => {
    const title = editingTitle.trim();
    setEditingId(null);
    if (title && title !== task.title) await updateTask(task._id, { title });
  };

  const cycleCategory = async (task) => {
    if (categories.length < 2) return;
    const idx = categories.findIndex((c) => c.name === task.category);
    const next = categories[(idx + 1) % categories.length];
    await updateTask(task._id, { category: next.name, categoryColor: next.color });
  };

  return (
    <BottomSheet isOpen onClose={onClose} maxHeight="52dvh">
      {/* Header giorno */}
      <div className="flex items-center gap-3 px-1 pb-3">
        <div className="flex-1 min-w-0">
          <p className="text-[12px] uppercase tracking-wide text-label-tertiary">
            {sorted.length ? `${sorted.filter((t) => !t.completed).length} da fare · ${sorted.filter((t) => t.completed).length} completate` : 'Nessuna attività'}
          </p>
          <h3 className="text-[19px] font-semibold capitalize leading-tight">{format(date, 'EEEE d MMMM', { locale: it })}</h3>
        </div>
        <button
          onClick={() => onEditFull(null)}
          className="h-10 px-4 rounded-full bg-accent border border-blue-400/30 text-white text-[13px] font-semibold flex items-center gap-1.5 shrink-0 shadow-lg shadow-blue-600/40"
        >
          <CalendarPlus size={15} /> Dettagli
        </button>
      </div>

      {/* Aggiunta rapida */}
      <div className="flex items-center gap-2 bg-white/[0.06] border border-white/[0.08] rounded-[14px] pl-4 pr-1.5 py-1.5 mb-2">
        <input
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && quickAdd()}
          placeholder="Aggiungi attività rapida…"
          className="flex-1 bg-transparent text-[16px] text-label placeholder:text-label-tertiary min-w-0"
          aria-label="Nuova attività rapida"
        />
        <button
          onClick={quickAdd}
          disabled={!quickTitle.trim()}
          className="w-11 h-11 rounded-full bg-accent text-white grid place-items-center shrink-0 disabled:opacity-40"
          aria-label="Aggiungi"
        >
          <Plus size={20} strokeWidth={2.5} />
        </button>
      </div>

      {/* Lista attività */}
      <div className="flex flex-col">
        {sorted.map((task) => {
          const done = task.completed;
          const color = task.categoryColor || '#2997ff';
          const hasRepeat = task.repeat?.frequency && task.repeat.frequency !== 'none';
          return (
            <div key={task._id} className="flex items-center gap-1 py-1 border-b border-separator last:border-0">
              {/* Check/uncheck bidirezionale */}
              <button
                onClick={() => toggleTask(task._id)}
                aria-label={done ? 'Segna come non completato' : 'Segna come completato'}
                className="w-11 h-11 grid place-items-center shrink-0"
              >
                <span
                  className={cn(
                    'w-[26px] h-[26px] rounded-full border-2 flex items-center justify-center transition-colors',
                    done ? 'bg-accent border-accent' : 'border-label-quaternary active:border-label-secondary'
                  )}
                >
                  {done && <Check size={14} className="text-white" strokeWidth={3.5} />}
                </span>
              </button>

              {/* Titolo (tap → modifica inline) + meta */}
              <div className="flex-1 min-w-0">
                {editingId === task._id ? (
                  <input
                    autoFocus
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onBlur={() => commitTitle(task)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitTitle(task);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    className="w-full bg-surface-2 rounded-lg px-2 py-1.5 text-[16px]"
                    aria-label="Modifica titolo"
                  />
                ) : (
                  <button
                    onClick={() => {
                      setEditingId(task._id);
                      setEditingTitle(task.title);
                    }}
                    className={cn(
                      'block w-full text-left text-[15px] font-medium truncate',
                      done ? 'line-through text-label-tertiary' : 'text-label'
                    )}
                  >
                    {task.title}
                  </button>
                )}
                <div className="flex items-center gap-1.5 text-[11px] text-label-tertiary mt-0.5">
                  {!task.allDay && task.startTime && (
                    <span className="flex items-center gap-0.5"><Clock size={10} />{task.startTime}{task.endTime ? `–${task.endTime}` : ''}</span>
                  )}
                  <span className="truncate">{task.category}</span>
                  {hasRepeat && <Repeat size={10} title={repeatLabel(task.repeat)} />}
                  {!!task.reminders?.length && <Bell size={10} />}
                  {!!task.attachments?.length && <Paperclip size={10} />}
                </div>
              </div>

              {/* Cambio categoria al volo (tap sul pallino) */}
              <button
                onClick={() => cycleCategory(task)}
                className="w-10 h-11 grid place-items-center shrink-0"
                title={categories.length > 1 ? `Categoria: ${task.category} (tocca per cambiare)` : task.category}
                aria-label="Cambia categoria"
              >
                <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: color }} />
              </button>

              {/* Elimina serie (solo per istanze di serie ricorrenti) */}
              {task.seriesId && (
                <button
                  onClick={() => removeSeries(task._id)}
                  className="w-10 h-11 grid place-items-center text-sys-red shrink-0"
                  title="Elimina l’intera serie"
                  aria-label="Elimina l’intera serie"
                >
                  <Layers size={16} />
                </button>
              )}

              {/* Elimina singola istanza */}
              <button
                onClick={() => removeTask(task._id)}
                className="w-10 h-11 grid place-items-center text-label-tertiary active:text-sys-red shrink-0"
                aria-label="Elimina attività"
              >
                <Trash2 size={16} />
              </button>

              {/* Editor completo */}
              <button
                onClick={() => onEditFull(task)}
                className="w-9 h-11 grid place-items-center text-label-tertiary shrink-0"
                aria-label="Modifica dettagli"
              >
                <ChevronRight size={17} />
              </button>
            </div>
          );
        })}
      </div>
    </BottomSheet>
  );
}
