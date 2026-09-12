import { useEffect, useState } from 'react';
import { X, Trash2, Pin, Plus, Check, Circle, CheckCircle2, FileText, ListTodo } from 'lucide-react';
import BottomSheet from '../ui/BottomSheet';
import SegmentedControl from '../ui/SegmentedControl';
import { NOTE_COLORS, emptyNote } from '../../lib/constants';
import { uid } from '../../lib/localStore';
import { cn } from '../../lib/cn';

/**
 * NoteEditorSheet — editor nota/checklist stile Notion:
 * titolo, testo o lista attività, pin, colore, eliminazione.
 */
export default function NoteEditorSheet({ isOpen, onClose, note, onSave, onDelete }) {
  const [draft, setDraft] = useState(emptyNote());
  const [newTodo, setNewTodo] = useState('');

  useEffect(() => {
    if (isOpen) {
      setDraft(
        note
          ? { title: note.title, body: note.body, type: note.type, todos: (note.todos || []).map((t) => ({ ...t })), pinned: note.pinned, color: note.color }
          : emptyNote()
      );
      setNewTodo('');
    }
  }, [isOpen, note]);

  const patch = (p) => setDraft((d) => ({ ...d, ...p }));

  const addTodo = () => {
    const text = newTodo.trim();
    if (!text) return;
    patch({ todos: [...draft.todos, { id: uid(), text, done: false }] });
    setNewTodo('');
  };

  const save = () => {
    if (!draft.title.trim() && draft.type === 'note' && !draft.body.trim() && draft.todos.length === 0) return;
    onSave({
      ...draft,
      title: draft.title.trim(),
      body: draft.body.trim(),
      todos: draft.todos,
    });
  };

  const canSave = draft.title.trim() || draft.body.trim() || draft.todos.length > 0;

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={note ? 'Modifica nota' : 'Nuova nota'}>
      {/* Header azioni */}
      <div className="flex items-center gap-2 pb-3">
        <div className="flex-1" />
        {onDelete && (
          <button
            onClick={() => {
              onDelete();
              onClose();
            }}
            className="w-10 h-10 grid place-items-center text-sys-red active:opacity-60"
            aria-label="Elimina nota"
          >
            <Trash2 size={18} />
          </button>
        )}
        <button
          onClick={() => patch({ pinned: !draft.pinned })}
          className={cn('w-10 h-10 grid place-items-center', draft.pinned ? 'text-sys-yellow' : 'text-label-secondary')}
          aria-label="Fissa nota"
        >
          <Pin size={18} fill={draft.pinned ? 'currentColor' : 'none'} />
        </button>
        <button
          onClick={save}
          disabled={!canSave}
          className={cn('h-10 px-5 rounded-full text-[14px] font-semibold shrink-0', canSave ? 'bg-accent text-white active:bg-accent-pressed' : 'bg-fill-secondary text-label-tertiary')}
        >
          Salva
        </button>
      </div>

      {/* Tipo — definitivo: scelta solo alla creazione, poi immutabile */}
      <div className="mb-3">
        {note ? (
          <div className="flex items-center gap-2 h-10 px-3.5 bg-white/[0.05] border border-white/[0.07] rounded-[12px] w-fit">
            {draft.type === 'todo' ? <ListTodo size={15} className="text-sky shrink-0" /> : <FileText size={15} className="text-sky shrink-0" />}
            <span className="text-[13.5px] font-semibold text-label">{draft.type === 'todo' ? 'Checklist' : 'Nota'}</span>
            <span className="text-[11px] text-label-tertiary">· tipo non modificabile</span>
          </div>
        ) : (
          <SegmentedControl
            segments={[
              { id: 'note', label: 'Nota' },
              { id: 'todo', label: 'Checklist' },
            ]}
            value={draft.type}
            onChange={(type) => patch({ type })}
          />
        )}
      </div>

      {/* Titolo */}
      <input
        value={draft.title}
        onChange={(e) => patch({ title: e.target.value })}
        placeholder="Titolo"
        autoFocus={!note}
        className="w-full bg-surface-2 rounded-xl px-4 py-3 text-[17px] font-semibold text-label placeholder:text-label-tertiary mb-3"
      />

      {/* Corpo o checklist */}
      {draft.type === 'note' ? (
        <textarea
          value={draft.body}
          onChange={(e) => patch({ body: e.target.value })}
          placeholder="Scrivi qui… (come Notion: appunti, idee, elenchi liberi)"
          rows={7}
          className="w-full bg-surface-2 rounded-xl px-4 py-3 text-[15px] text-label placeholder:text-label-tertiary resize-none leading-relaxed"
        />
      ) : (
        <div className="bg-surface-2 rounded-xl p-3">
          <div className="flex flex-col gap-1 mb-2">
            {draft.todos.map((t) => (
              <div key={t.id} className="flex items-center gap-2 py-1.5">
                <button
                  onClick={() => patch({ todos: draft.todos.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)) })}
                  className="shrink-0"
                  aria-label={t.done ? 'Segna da fare' : 'Segna fatto'}
                >
                  {t.done ? (
                    <CheckCircle2 size={20} className="text-sys-green" />
                  ) : (
                    <Circle size={20} className="text-label-quaternary" />
                  )}
                </button>
                <input
                  value={t.text}
                  onChange={(e) => patch({ todos: draft.todos.map((x) => (x.id === t.id ? { ...x, text: e.target.value } : x)) })}
                  className={cn('flex-1 bg-transparent text-[15px] min-h-9', t.done ? 'line-through text-label-tertiary' : 'text-label')}
                />
                <button
                  onClick={() => patch({ todos: draft.todos.filter((x) => x.id !== t.id) })}
                  className="w-8 h-8 grid place-items-center text-label-tertiary active:text-sys-red shrink-0"
                  aria-label="Rimuovi elemento"
                >
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Plus size={16} className="text-label-tertiary shrink-0" />
            <input
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTodo()}
              placeholder="Aggiungi un elemento e premi Invio"
              className="flex-1 bg-transparent text-[15px] text-label placeholder:text-label-tertiary min-h-9"
            />
            <button onClick={addTodo} className="h-9 px-3 rounded-full bg-accent text-white text-[13px] font-semibold shrink-0">
              Aggiungi
            </button>
          </div>
        </div>
      )}

      {/* Colore (ridisegnato: pallini 30px + check sull'attivo) */}
      <div className="mt-5 pt-4 border-t border-white/[0.07]">
        <p className="text-[11px] font-semibold text-[#8e8e93] uppercase tracking-[0.08em] mb-3">Colore</p>
        <div className="flex gap-3 flex-wrap">
          {NOTE_COLORS.map((c) => {
            const active = draft.color === c;
            return (
              <button
                key={c}
                onClick={() => patch({ color: c })}
                className={cn(
                  'w-[30px] h-[30px] rounded-full grid place-items-center transition-transform active:scale-90',
                  active ? 'ring-2 ring-white/85 ring-offset-2 ring-offset-[#1c1c1e] scale-105' : 'hover:scale-105'
                )}
                style={{ backgroundColor: c }}
                aria-label={`Colore ${c}`}
                aria-pressed={active}
              >
                {active && <Check size={14} className="text-white" strokeWidth={3.2} />}
              </button>
            );
          })}
        </div>
      </div>
    </BottomSheet>
  );
}
