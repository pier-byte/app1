import { useMemo, useState } from 'react';
import { StickyNote, Search, Pin, ListTodo, FileText, CheckCircle2, Circle, Plus , ChevronLeft } from 'lucide-react';
import { useNotes } from '../hooks/useData';
import NoteEditorSheet from '../components/notes/NoteEditorSheet';
import SegmentedControl from '../components/ui/SegmentedControl';
import EmptyState from '../components/ui/EmptyState';
import FAB from '../components/ui/FAB';
import { cn } from '../lib/cn';

/**
 * Tab — Note: appunti rapidi e checklist (stile Notion), con pin, colori,
 * ricerca e modalità testo/to-do.
 */
export default function NotesPage({ onBack } = {}) {
  const { data: notes, isLoading, createNote, updateNote, removeNote } = useNotes();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [editingNote, setEditingNote] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (notes ?? []).filter((n) => {
      if (filter === 'note' && n.type !== 'note') return false;
      if (filter === 'todo' && n.type !== 'todo') return false;
      if (!q) return true;
      return (
        n.title?.toLowerCase().includes(q) ||
        n.body?.toLowerCase().includes(q) ||
        (n.todos || []).some((t) => t.text.toLowerCase().includes(q))
      );
    });
  }, [notes, query, filter]);

  const openNew = () => {
    setEditingNote(null);
    setSheetOpen(true);
  };

  return (
    <div className="h-full overflow-y-auto scrollable px-4 pt-2 pb-32">
      <div className="mb-4">
        <div className="flex items-center gap-2.5">
          {onBack && (
            <button onClick={onBack} aria-label="Torna al profilo" className="tap-clean shrink-0 w-9 h-9 grid place-items-center rounded-full bg-white/[0.08] border border-white/[0.08] text-label-secondary active:text-label">
              <ChevronLeft size={20} />
            </button>
          )}
          <div className="min-w-0">
            <h1 className="text-[28px] font-semibold text-label tracking-tight leading-tight">Note</h1>
            <p className="text-[13px] text-label-secondary">Appunti e to-do list veloci</p>
          </div>
        </div>
      </div>

      {/* Ricerca */}
      <div className="flex items-center gap-2 bg-surface-2 rounded-full px-4 h-11 mb-3">
        <Search size={16} className="text-label-tertiary shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca nelle note…"
          className="flex-1 bg-transparent text-[15px] text-label placeholder:text-label-tertiary"
        />
      </div>

      <div className="mb-4">
        <SegmentedControl
          segments={[
            { id: 'all', label: 'Tutte' },
            { id: 'note', label: 'Note' },
            { id: 'todo', label: 'To-do' },
          ]}
          value={filter}
          onChange={setFilter}
        />
      </div>

      {!isLoading && filtered.length === 0 ? (
        <EmptyState
          title={query ? 'Nessuna nota trovata' : 'Nessuna nota'}
          subtitle={query ? 'Prova con un altro termine' : 'Tocca + per appuntare un’idea o creare una checklist'}
          icon={StickyNote}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((note) => (
            <NoteCard
              key={note._id}
              note={note}
              onOpen={() => {
                setEditingNote(note);
                setSheetOpen(true);
              }}
              onToggleTodo={(todoId) => {
                const todos = (note.todos || []).map((t) =>
                  t.id === todoId ? { ...t, done: !t.done } : t
                );
                updateNote(note._id, { todos });
              }}
              onTogglePin={() => updateNote(note._id, { pinned: !note.pinned })}
              onDelete={() => removeNote(note._id)}
            />
          ))}
        </div>
      )}

      <FAB onClick={openNew} icon={Plus} label="Nuova nota" />

      <NoteEditorSheet
        isOpen={sheetOpen}
        onClose={() => {
          setSheetOpen(false);
          setEditingNote(null);
        }}
        note={editingNote}
        onSave={(fields) => {
          if (editingNote) updateNote(editingNote._id, fields);
          else createNote(fields);
          setSheetOpen(false);
          setEditingNote(null);
        }}
        onDelete={editingNote ? () => removeNote(editingNote._id) : null}
      />
    </div>
  );
}

function NoteCard({ note, onOpen, onToggleTodo, onTogglePin, onDelete }) {
  const todos = note.todos || [];
  const doneCount = todos.filter((t) => t.done).length;
  const isTodo = note.type === 'todo';

  return (
    <div
      onClick={onOpen}
      className="card p-4 cursor-pointer active:bg-surface-2 transition-colors border-t-2"
      style={{ borderTopColor: note.color || '#2997ff' }}
    >
      <div className="flex items-start gap-2 mb-1.5">
        <span className="text-[14px] font-semibold text-label flex-1 leading-snug">{note.title || 'Senza titolo'}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin();
          }}
          className={cn('w-9 h-9 -mr-1 -mt-1 grid place-items-center shrink-0', note.pinned ? 'text-sys-yellow' : 'text-label-tertiary')}
          aria-label={note.pinned ? 'Rimuovi dal pin' : 'Fissa nota'}
        >
          <Pin size={15} fill={note.pinned ? 'currentColor' : 'none'} />
        </button>
      </div>

      {isTodo ? (
        <div className="flex flex-col gap-1.5">
          {todos.slice(0, 4).map((t) => (
            <button
              key={t.id}
              onClick={(e) => {
                e.stopPropagation();
                onToggleTodo(t.id);
              }}
              className="flex items-center gap-2 text-left min-h-8"
            >
              {t.done ? (
                <CheckCircle2 size={17} className="text-sys-green shrink-0" />
              ) : (
                <Circle size={17} className="text-label-quaternary shrink-0" />
              )}
              <span className={cn('text-[13.5px] leading-snug', t.done ? 'line-through text-label-tertiary' : 'text-label-secondary')}>
                {t.text}
              </span>
            </button>
          ))}
          {todos.length > 4 && <span className="text-[12px] text-label-tertiary">+{todos.length - 4} altre</span>}
          {todos.length === 0 && <span className="text-[13px] text-label-tertiary">Checklist vuota</span>}
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-1.5 rounded-full bg-fill-tertiary overflow-hidden">
              <div className="h-full rounded-full bg-sys-green" style={{ width: `${todos.length ? (doneCount / todos.length) * 100 : 0}%` }} />
            </div>
            <span className="text-[11px] tabular-nums text-label-tertiary">{doneCount}/{todos.length}</span>
          </div>
        </div>
      ) : (
        <p className="text-[13.5px] text-label-secondary leading-relaxed line-clamp-4 whitespace-pre-wrap">
          {note.body || 'Nota vuota'}
        </p>
      )}

      <div className="flex items-center gap-2 mt-3 text-[11px] text-label-tertiary">
        <span className="flex items-center gap-1">
          {isTodo ? <ListTodo size={11} /> : <FileText size={11} />}
          {isTodo ? 'Checklist' : 'Nota'}
        </span>
        <span>·</span>
        <span>{new Date(note.updatedAt || Date.now()).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}</span>
      </div>
    </div>
  );
}
