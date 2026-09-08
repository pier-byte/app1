import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Check, Clock, ChevronRight, ListChecks, Loader2, Timer, Mic, Plus } from 'lucide-react';
import { CATEGORY_COLORS } from '../../lib/constants';
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
export default function TaskFormSheet({ isOpen, onClose, onSave, editingTask, defaultDate, categories, onCreateCategory }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(null);
  const [date, setDate] = useState(defaultDate);
  const [estimate, setEstimate] = useState(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [listName, setListName] = useState('');
  const [listColor, setListColor] = useState(CATEGORY_COLORS[7]);
  const [listCreating, setListCreating] = useState(false);

  const dictate = () => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return alert('La dettatura vocale non è supportata da questo browser.');
    const recognition = new Recognition(); recognition.lang = 'it-IT'; recognition.interimResults = false;
    recognition.onresult = (e) => setDescription((v) => `${v}${v ? ' ' : ''}${e.results[0][0].transcript}`);
    recognition.start();
  };

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
      estimatedMinutes = await estimateStudyTime(`${title.trim()}. Dettagli: ${description.trim()}`, category.name);
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
          <div className="flex items-center gap-2"><input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Spiega brevemente cosa devi fare" className="flex-1 bg-transparent text-[14px] text-label-secondary placeholder:text-label-tertiary mt-1" /><button onClick={dictate} className="w-10 h-10 rounded-full bg-fill-tertiary grid place-items-center text-accent" aria-label="Detta descrizione"><Mic size={17}/></button></div>
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
          {estimating ? <Loader2 size={16} className="animate-spin text-accent" /> : (
            <label className="flex items-center gap-2">
              <input type="number" min="1" max="600" value={estimate ?? ''} onChange={(e) => setEstimate(e.target.value ? Number(e.target.value) : null)} placeholder="Auto" className="w-20 h-9 rounded-lg bg-surface-2 px-2 text-right text-[15px]" aria-label="Tempo stimato in minuti" />
              <span className="text-[13px] text-label-tertiary">min</span>
            </label>
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
        onSelect={(cat) => { setCategory(cat); setCategoryPickerOpen(false); }}
        listCreating={listCreating} setListCreating={setListCreating} listName={listName} setListName={setListName} listColor={listColor} setListColor={setListColor}
        onCreate={async () => { if (!listName.trim()) return; await onCreateCategory?.(listName.trim(), listColor); setCategory({name:listName.trim(),color:listColor}); setListName(''); setListCreating(false); setCategoryPickerOpen(false); }}
      />
    </>
  );
}

function CategoryPickerDialog({ isOpen, onClose, categories, selected, onSelect, listCreating, setListCreating, listName, setListName, listColor, setListColor, onCreate }) {
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
        {!listCreating ? <button onClick={() => setListCreating(true)} className="w-full flex items-center gap-3 py-3 text-accent font-semibold"><Plus size={20}/> Crea nuovo elenco</button> : <div className="border-t border-separator pt-4 mt-2"><input autoFocus maxLength={50} value={listName} onChange={(e)=>setListName(e.target.value)} placeholder="Nome elenco" className="w-full bg-surface-2 rounded-xl px-4 py-3 mb-4"/><div className="grid grid-cols-6 gap-3">{CATEGORY_COLORS.slice(0,24).map(color=><button key={color} onClick={()=>setListColor(color)} className="aspect-square rounded-full grid place-items-center" style={{backgroundColor:color}}>{listColor===color&&<Check size={16} className="text-white" strokeWidth={3}/>}</button>)}</div><button onClick={onCreate} disabled={!listName.trim()} className="w-full h-11 rounded-full bg-accent text-white font-semibold mt-5 disabled:opacity-40">Crea elenco</button></div>}
      </div>
    </Dialog>
  );
}
