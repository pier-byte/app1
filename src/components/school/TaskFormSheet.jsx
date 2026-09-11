import { useState, useEffect, useMemo } from 'react';
import { X, Clock, Sunrise, ListChecks, Loader2, Timer, Mic, Plus, Check, Repeat } from 'lucide-react';
import { CATEGORY_COLORS } from '../../lib/constants';
import BottomSheet from '../ui/BottomSheet';
import Toggle from '../ui/Toggle';
import DatePickerDialog from './DatePickerDialog';
import ReminderPicker from './ReminderPicker';
import RepeatPicker from './RepeatPicker';
import AttachmentList from './AttachmentList';
import { formatDateDisplay, parseISO } from '../../lib/dates';
import { repeatLabel } from '../../lib/repeat';
import { Dialog } from '../ui/Dialog';
import { estimateStudyTime, hasGemini } from '../../lib/gemini';
import { cn } from '../../lib/cn';

const DEFAULT_REPEAT = { frequency: 'none', weekdays: undefined, endMode: 'never', endAfter: undefined, endDate: undefined };

/**
 * TaskFormSheet — Creazione/modifica attività/evento (screenshot 12):
 * titolo + descrizione, scadenza, tutto il giorno + orari, promemoria,
 * ripeti (giorni della settimana + fine), elenco attività, allegati.
 */
export default function TaskFormSheet({ isOpen, onClose, onSave, editingTask, defaultDate, categories, onCreateCategory }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(null);
  const [date, setDate] = useState(defaultDate);
  const [allDay, setAllDay] = useState(true);
  const [startTime, setStartTime] = useState('16:00');
  const [endTime, setEndTime] = useState('17:00');
  const [reminders, setReminders] = useState([]);
  const [repeat, setRepeat] = useState(DEFAULT_REPEAT);
  const [attachments, setAttachments] = useState([]);
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
    const recognition = new Recognition();
    recognition.lang = 'it-IT';
    recognition.interimResults = false;
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
      setAllDay(editingTask?.allDay ?? true);
      setStartTime(editingTask?.startTime ?? '16:00');
      setEndTime(editingTask?.endTime ?? '17:00');
      setReminders(editingTask?.reminders ?? []);
      setRepeat(editingTask?.repeat ?? DEFAULT_REPEAT);
      setAttachments(editingTask?.attachments ?? []);
      setEstimate(editingTask?.estimatedMinutes ?? null);
      setEstimating(false);
    }
  }, [isOpen, editingTask, defaultDate, categories]);

  const canSave = useMemo(
    () => title.trim().length > 0 && category && !estimating && (!startTime || startTime <= (endTime || '23:59')),
    [title, category, estimating, startTime, endTime]
  );

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
      allDay,
      startTime: allDay ? undefined : startTime,
      endTime: allDay ? undefined : endTime || undefined,
      reminders,
      repeat,
      attachments,
      estimatedMinutes: estimatedMinutes || undefined,
    });
    onClose();
  };

  return (
    <>
      <BottomSheet isOpen={isOpen} onClose={onClose}>
        {/* Header: X + Salva (screenshot 12) */}
        <div className="flex items-center justify-between px-5 pb-3">
          <button onClick={onClose} className="w-10 h-10 grid place-items-center text-label-secondary active:opacity-60" aria-label="Chiudi">
            <X size={22} />
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className={cn(
              'h-10 px-5 rounded-full text-[15px] font-semibold transition-colors',
              canSave ? 'bg-accent text-white active:bg-accent-pressed' : 'bg-fill-secondary text-label-tertiary'
            )}
          >
            {estimating ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Salva'}
          </button>
        </div>

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
          <div className="flex items-center gap-2">
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrizione"
              className="flex-1 bg-transparent text-[14px] text-label-secondary placeholder:text-label-tertiary mt-1"
            />
            <button
              onClick={dictate}
              className="w-10 h-10 rounded-full bg-fill-tertiary grid place-items-center text-accent"
              aria-label="Detta descrizione"
            >
              <Mic size={17} />
            </button>
          </div>
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
          <span className="text-[13px] text-label-tertiary">›</span>
        </button>

        {/* Tutto il giorno + orari */}
        <div className="w-full flex items-center gap-3 px-1 py-3.5 border-b border-separator">
          <Sunrise size={20} className="text-label-secondary shrink-0" />
          <span className="flex-1 text-left text-[16px] text-label">Tutto il giorno</span>
          {!allDay && (
            <div className="flex items-center gap-1.5">
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                onClick={(e) => e.currentTarget.showPicker?.()}
                className="h-11 bg-surface-2 rounded-lg px-2 text-[16px]"
                aria-label="Ora inizio"
              />
              <span className="text-label-tertiary text-[13px]">→</span>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                onClick={(e) => e.currentTarget.showPicker?.()}
                className="h-11 bg-surface-2 rounded-lg px-2 text-[16px]"
                aria-label="Ora fine"
              />
            </div>
          )}
          <Toggle value={allDay} onChange={setAllDay} />
        </div>

        {/* Promemoria */}
        <ReminderPicker reminders={reminders} date={date} time={startTime} allDay={allDay} onChange={setReminders} />

        {/* Ripeti (sola lettura sulle istanze figlie di una serie) */}
        {editingTask?.seriesId && editingTask.seriesId !== editingTask._id ? (
          <div className="w-full flex items-center gap-3 px-1 py-3.5 border-b border-separator opacity-70">
            <Repeat size={20} className="text-label-secondary shrink-0" />
            <div className="flex-1">
              <p className="text-[16px] text-label">Ripeti</p>
              <p className="text-[13px] text-label-tertiary mt-0.5">
                {repeatLabel(repeat)} · istanza di una serie: modifica la prima occorrenza per cambiare la regola
              </p>
            </div>
          </div>
        ) : (
          <RepeatPicker repeat={repeat} onChange={setRepeat} baseDate={date} />
        )}

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
          <span className="text-[13px] text-label-tertiary">›</span>
        </button>

        {/* Allegati */}
        <AttachmentList attachments={attachments} onChange={setAttachments} />

        {/* Stima AI */}
        <div className="w-full flex items-center gap-3 px-1 py-3.5">
          <Timer size={20} className="text-label-secondary shrink-0" />
          <span className="flex-1 text-left text-[16px] text-label">Tempo stimato</span>
          {estimating ? (
            <Loader2 size={16} className="animate-spin text-accent" />
          ) : (
            <label className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="600"
                value={estimate ?? ''}
                onChange={(e) => setEstimate(e.target.value ? Number(e.target.value) : null)}
                placeholder="Auto"
                className="w-20 h-9 rounded-lg bg-surface-2 px-2 text-right text-[15px]"
                aria-label="Tempo stimato in minuti"
              />
              <span className="text-[13px] text-label-tertiary">min</span>
            </label>
          )}
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
        listCreating={listCreating}
        setListCreating={setListCreating}
        listName={listName}
        setListName={setListName}
        listColor={listColor}
        setListColor={setListColor}
        onCreate={async () => {
          if (!listName.trim()) return;
          await onCreateCategory?.(listName.trim(), listColor);
          setCategory({ name: listName.trim(), color: listColor });
          setListName('');
          setListCreating(false);
          setCategoryPickerOpen(false);
        }}
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
        {!listCreating ? (
          <button onClick={() => setListCreating(true)} className="w-full flex items-center gap-3 py-3 text-accent font-semibold">
            <Plus size={20} /> Crea nuovo elenco
          </button>
        ) : (
          <div className="border-t border-separator pt-4 mt-2">
            <input
              autoFocus
              maxLength={50}
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              placeholder="Nome elenco"
              className="w-full bg-surface-2 rounded-xl px-4 py-3 mb-4"
            />
            <div className="grid grid-cols-6 gap-3">
              {CATEGORY_COLORS.slice(0, 24).map((color) => (
                <button
                  key={color}
                  onClick={() => setListColor(color)}
                  className="aspect-square rounded-full grid place-items-center"
                  style={{ backgroundColor: color }}
                >
                  {listColor === color && <Check size={16} className="text-white" strokeWidth={3} />}
                </button>
              ))}
            </div>
            <button
              onClick={onCreate}
              disabled={!listName.trim()}
              className="w-full h-11 rounded-full bg-accent text-white font-semibold mt-5 disabled:opacity-40"
            >
              Crea elenco
            </button>
          </div>
        )}
      </div>
    </Dialog>
  );
}
