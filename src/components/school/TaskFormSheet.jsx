import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Check, Clock, ChevronRight, ListChecks, Sparkles, Loader2, Timer } from 'lucide-react';
import BottomSheet from '../ui/BottomSheet';
import DatePickerDialog from './DatePickerDialog';
import { formatDateDisplay, parseISO, formatMinutes } from '../../lib/dates';
import { Dialog } from '../ui/Dialog';
import { estimateStudyTime, hasGemini } from '../../lib/gemini';
import { cn } from '../../lib/cn';

/**
 * TaskFormSheet — Creazione/modifica attività (screenshot 07/08/09):
 * titolo + descrizione, scadenza, categoria (elenco con radio colorate),
 * conferma con pulsante check circolare blu. Stima tempi via Gemini AI.
 */
export default function TaskFormSheet({ isOpen, onClose, onSave, editingTask, defaultDate, categories }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(null);
  const [date, setDate] = useState(defaultDate);
  const [estimate, setEstimate] = useState(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [estimating, setEstimating] = useState(false);

  // Reset ad ogni apertura
  useEffect(() => {
    if (isOpen) {
      setTitle(editingTask?.title ?? '');
      setDescription(editingTask?.description ?? '');
      setCategory(
        categories.find((c) => c.name === editingTask?.category) ?? categories[0] ?? null
      );
      setDate(editingTask?.date ?? defaultDate);
      setEstimate(editingTask?.estimatedMinutes ?? null);
      setEstimating(false);
    }
  }, [isOpen, editingTask, defaultDate, categories]);

  const canSave = title.trim().length > 0 && category && !estimating;

  const handleSave = async () => {
    if (!canSave) return;

    // Stima tempi via Gemini AI se assente
    let estimatedMinutes = estimate;
    if (!estimatedMinutes && hasGemini) {
      setEstimating(true);
      estimatedMinutes = await estimateStudyTime(title.trim(), category.name);
      setEstimating(false);
    }

    onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      category: category.name,
      categoryColor: category.color,
      date,
      estimatedMinutes: estimatedMinutes || undefined,
    });
    onClose();
  };

  return (
    <>
      <BottomSheet isOpen={isOpen} onClose={onClose} title={editingTask ? 'Modifica attività' : undefined}>
        {/* Titolo + descrizione */}
        <div className="bg-surface-2 rounded-xl px-4 py-3.5 mb-4">
          <textarea
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Inserisci l'attività qui"
            rows={2}
            autoFocus={!editingTask}
            className="w-full bg-transparent text-[17px] font-medium text-label placeholder:text-label-tertiary resize-none"
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrizione"
            className="w-full bg-transparent text-[14px] text-label-secondary placeholder:text-label-tertiary mt-1"
          />
        </div>

        {/* Scadenza */}
        <button
          onClick={() => setDatePickerOpen(true)}
          className="w-full flex items-center gap-3 px-1 py-3.5 border-b border-separator active:opacity-70 transition-opacity"
        >
          <Clock size={20} className="text-label-secondary shrink-0" />
          <span className="flex-1 text-left text-[16px] text-label">
            {date ? <span className="capitalize">{formatDateDisplay(parseISO(date))}</span> : 'Nessuna data'}
          </span>
          <ChevronRight size={18} className="text-label-tertiary" />
        </button>

        {/* Categoria (elenco attività) */}
        <button
          onClick={() => setCategoryPickerOpen(true)}
          className="w-full flex items-center gap-3 px-1 py-3.5 border-b border-separator active:opacity-70 transition-opacity"
        >
          <ListChecks size={20} className="text-label-secondary shrink-0" />
          <span className="flex-1 text-left text-[16px] text-label">Elenco attività</span>
          {category && (
            <span className="flex items-center gap-1.5 text-[15px] text-label-secondary">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: category.color }} />
              {category.name}
            </span>
          )}
          <ChevronRight size={18} className="text-label-tertiary" />
        </button>

        {/* Stima AI */}
        <div className="w-full flex items-center gap-3 px-1 py-3.5">
          <Timer size={20} className="text-label-secondary shrink-0" />
          <span className="flex-1 text-left text-[16px] text-label">Tempo stimato</span>
          {estimating ? (
            <span className="flex items-center gap-1.5 text-[14px] text-accent">
              <Loader2 size={14} className="animate-spin" /> Gemini sta stimando…
            </span>
          ) : estimate ? (
            <span className="flex items-center gap-1.5 text-[15px] text-label-secondary">
              <Sparkles size={13} className="text-accent" /> ~{formatMinutes(estimate)}
            </span>
          ) : (
            <span className="text-[14px] text-label-tertiary">{hasGemini ? 'Automatica con AI' : '—'}</span>
          )}
        </div>

        {/* Conferma: check circolare blu (screenshot 03/07) */}
        <div className="flex items-center justify-center py-4">
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={handleSave}
            disabled={!canSave}
            className={cn(
              'w-16 h-16 rounded-full flex items-center justify-center transition-colors',
              canSave ? 'bg-accent shadow-lg shadow-accent/30' : 'bg-fill-secondary'
            )}
            aria-label="Salva attività"
          >
            {estimating ? (
              <Loader2 size={26} className="text-white animate-spin" />
            ) : (
              <Check size={28} className={canSave ? 'text-white' : 'text-label-tertiary'} strokeWidth={3} />
            )}
          </motion.button>
        </div>
      </BottomSheet>

      <DatePickerDialog
        isOpen={datePickerOpen}
        onClose={() => setDatePickerOpen(false)}
        value={date}
        onConfirm={setDate}
      />

      <CategoryPickerDialog
        isOpen={categoryPickerOpen}
        onClose={() => setCategoryPickerOpen(false)}
        categories={categories}
        selected={category}
        onSelect={(cat) => {
          setCategory(cat);
          setCategoryPickerOpen(false);
        }}
      />
    </>
  );
}

function CategoryPickerDialog({ isOpen, onClose, categories, selected, onSelect }) {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Elenco delle attività"
      actions={
        <button onClick={onClose} className="text-[17px] text-label-secondary font-medium active:opacity-60">
          Annulla
        </button>
      }
    >
      <div className="py-2">
        {categories.map((cat) => {
          const active = selected?.name === cat.name;
          return (
            <button
              key={cat._id ?? cat.name}
              onClick={() => onSelect(cat)}
              className="w-full flex items-center gap-3.5 py-3 active:opacity-70 transition-opacity text-left"
            >
              <span
                className="w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center shrink-0"
                style={{ borderColor: cat.color }}
              >
                {active && <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />}
              </span>
              <span className="text-[16px] text-label">{cat.name}</span>
            </button>
          );
        })}
      </div>
    </Dialog>
  );
}
