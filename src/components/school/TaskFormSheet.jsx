import { useState, useEffect, useMemo } from 'react';
import { X, Clock, Sunrise, ListChecks, Loader2, Timer, Mic, Plus, Check, Repeat } from 'lucide-react';
import { CATEGORY_COLORS, DEFAULT_TASK_CATEGORIES } from '../../lib/constants';
import BottomSheet from '../ui/BottomSheet';
import Toggle from '../ui/Toggle';
import LiquidDialog from '../ui/LiquidDialog';
import DatePickerDialog from './DatePickerDialog';
import TimePickerDialog from './TimePickerDialog';
import ReminderPicker from './ReminderPicker';
import RepeatPicker from './RepeatPicker';
import AttachmentList from './AttachmentList';
import { formatDateDisplay, parseISO } from '../../lib/dates';
import { repeatLabel } from '../../lib/repeat';
import { estimateStudyTime, hasGemini } from '../../lib/gemini';
import { cn } from '../../lib/cn';

const DEFAULT_REPEAT = { frequency: 'none', weekdays: undefined, endMode: 'never', endAfter: undefined, endDate: undefined };

/**
 * TaskFormSheet — Creazione/modifica attività/evento (screenshot 12):
 * titolo + descrizione, scadenza, tutto il giorno + orari (picker a tamburo
 * Liquid Glass), promemoria, ripeti (giorni della settimana + fine),
 * elenco attività (selezione stile Liquid Glass + creazione con colori),
 * allegati.
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
  const [timePickerMode, setTimePickerMode] = useState(null); // null | 'start' | 'end'
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [estimating, setEstimating] = useState(false);

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
              className="w-10 h-10 rounded-full bg-fill-tertiary grid place-items-center text-sky"
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

        {/* Tutto il giorno + orari (tap → tamburo Liquid Glass) */}
        <div className="w-full flex items-center gap-3 px-1 py-3.5 border-b border-separator">
          <Sunrise size={20} className="text-label-secondary shrink-0" />
          <span className="flex-1 text-left text-[16px] text-label">Tutto il giorno</span>
          {!allDay && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setTimePickerMode('start')}
                className="h-11 min-w-[64px] bg-surface-2 rounded-lg px-2.5 text-[16px] tabular-nums text-label active:bg-surface-3"
                aria-label={`Ora inizio ${startTime}. Tocca per cambiare`}
              >
                {startTime}
              </button>
              <span className="text-label-tertiary text-[13px]">→</span>
              <button
                onClick={() => setTimePickerMode('end')}
                className="h-11 min-w-[64px] bg-surface-2 rounded-lg px-2.5 text-[16px] tabular-nums text-label active:bg-surface-3"
                aria-label={`Ora fine ${endTime}. Tocca per cambiare`}
              >
                {endTime}
              </button>
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
            <Loader2 size={16} className="animate-spin text-sky" />
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

      {/* Data — calendario mensile Liquid Glass (+ tamburo mese/anno) */}
      <DatePickerDialog
        isOpen={datePickerOpen}
        onClose={() => setDatePickerOpen(false)}
        value={date}
        onConfirm={setDate}
      />

      {/* Orario — tamburo 3D Liquid Glass */}
      <TimePickerDialog
        isOpen={timePickerMode !== null}
        onClose={() => setTimePickerMode(null)}
        value={timePickerMode === 'start' ? startTime : endTime}
        onConfirm={(time) => {
          if (timePickerMode === 'start') setStartTime(time);
          else setEndTime(time);
          setTimePickerMode(null);
        }}
        onToggleAllDay={
          timePickerMode !== null
            ? () => {
                setAllDay(true);
                setTimePickerMode(null);
              }
            : undefined
        }
        title={timePickerMode === 'end' ? 'Ora di fine' : 'Ora di inizio'}
      />

      {/* Elenco attività — selezione Liquid Glass + crea nuovo */}
      <CategorySheet
        isOpen={categoryPickerOpen}
        onClose={() => setCategoryPickerOpen(false)}
        categories={categories}
        selected={category}
        onSelect={(cat) => {
          setCategory(cat);
          setCategoryPickerOpen(false);
        }}
        onCreate={async (name, color) => {
          await onCreateCategory?.(name, color);
          setCategory({ name, color });
        }}
      />
    </>
  );
}

/**
 * CategorySheet — Selezione elenco attività stile Liquid Glass
 * (ui-references/selezione_elenco_attivit): bottom sheet con radio colorate,
 * etichetta "Predefinito" per gli elenchi di sistema e "Crea nuovo".
 */
function CategorySheet({ isOpen, onClose, categories, selected, onSelect, onCreate }) {
  const [pending, setPending] = useState(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (isOpen) setPending(selected ?? categories[0] ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const isDefault = (cat) => DEFAULT_TASK_CATEGORIES.some((d) => d.name === cat.name);

  return (
    <>
      <BottomSheet isOpen={isOpen} onClose={onClose} maxHeight="80dvh">
        {/* Header sheet (reference: titolo + chip SELEZIONA) */}
        <div className="flex items-end justify-between px-1 pb-4">
          <div>
            <h2 className="text-[22px] font-semibold text-label tracking-tight leading-tight">Elenco attività</h2>
            <p className="text-[13px] text-label-tertiary mt-0.5">Scegli a quale elenco appartiene l'attività</p>
          </div>
          <button
            onClick={() => pending && onSelect(pending)}
            disabled={!pending}
            className="text-[11.5px] font-semibold tracking-wide text-[#2997ff] px-3 py-1.5 rounded-full bg-accent/15 border border-accent/25 disabled:opacity-40"
          >
            SELEZIONA
          </button>
        </div>

        {/* Lista radio (divide-y come reference) */}
        <div className="flex flex-col px-1">
          {categories.map((cat) => {
            const active = pending?.name === cat.name;
            return (
              <button
                key={cat._id ?? cat.name}
                onClick={() => setPending(cat)}
                className="w-full flex items-center gap-3.5 py-3.5 border-b border-separator last:border-0 text-left active:opacity-70 transition-opacity"
              >
                <span
                  className="relative w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center shrink-0 transition-colors"
                  style={{ borderColor: cat.color }}
                >
                  {active && <span className="w-[12px] h-[12px] rounded-full" style={{ backgroundColor: cat.color }} />}
                </span>
                <span className={cn('flex-1 text-[16px] truncate', active ? 'text-label font-medium' : 'text-label')}>{cat.name}</span>
                {isDefault(cat) && <span className="text-[12px] text-label-tertiary">Predefinito</span>}
              </button>
            );
          })}

          {/* Crea nuovo (reference: cerchio tratteggiato +) */}
          <button
            onClick={() => setCreating(true)}
            className="w-full flex items-center gap-3.5 py-3.5 text-left active:opacity-70 transition-opacity"
          >
            <span className="w-[22px] h-[22px] rounded-full border-2 border-dashed border-accent/70 grid place-items-center shrink-0">
              <Plus size={13} className="text-sky" />
            </span>
            <span className="text-[16px] text-sky font-medium">Crea nuovo</span>
          </button>
        </div>

        {/* Footer sheet: Annulla / Conferma */}
        <div className="pt-3 pb-1 flex items-center justify-end gap-6">
          <button onClick={onClose} className="text-[16px] text-label-secondary font-medium active:opacity-60 px-2 py-2">
            Annulla
          </button>
          <button
            onClick={() => pending && onSelect(pending)}
            disabled={!pending}
            className="min-w-[120px] py-2.5 px-6 rounded-full bg-accent text-white text-[15px] font-semibold shadow-lg shadow-blue-500/30 active:scale-95 transition-all disabled:opacity-40"
          >
            Conferma
          </button>
        </div>
      </BottomSheet>

      {/* Creazione nuovo elenco (reference: creazione_elenco_colori) */}
      <CategoryCreateDialog
        isOpen={creating}
        onClose={() => setCreating(false)}
        onCreate={async (name, color) => {
          await onCreate(name, color);
          setCreating(false);
          onClose();
        }}
      />
    </>
  );
}

/**
 * CategoryCreateDialog — "Crea un nuovo elenco di attività" Liquid Glass
 * (ui-references/creazione_elenco_colori): nome con contatore 0/50 e
 * griglia colori con check sulla selezione. Footer Annulla / Crea.
 */
function CategoryCreateDialog({ isOpen, onClose, onCreate }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(CATEGORY_COLORS[7]);

  return (
    <LiquidDialog
      isOpen={isOpen}
      onClose={onClose}
      maxWidth={358}
      title="Crea un nuovo elenco di attività"
      footer={
        <>
          <button onClick={onClose} className="flex-1 py-2.5 text-[15px] font-medium text-white/70 hover:text-white active:scale-95 transition-all">
            Annulla
          </button>
          <button
            onClick={() => name.trim() && onCreate(name.trim(), color)}
            disabled={!name.trim()}
            className="flex-1 py-2.5 text-[16px] font-semibold text-sky active:opacity-60 transition-opacity disabled:opacity-40"
          >
            Crea
          </button>
        </>
      }
    >
      <p className="text-[12.5px] text-label-tertiary mb-2">Nome dell'elenco attività</p>
      <div className="flex items-center bg-surface-2 border border-white/10 rounded-xl px-4 py-3 mb-5">
        <input
          autoFocus
          maxLength={50}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Inserisci qui"
          className="flex-1 min-w-0 bg-transparent text-[16px] text-label placeholder:text-label-tertiary"
          aria-label="Nome dell'elenco attività"
        />
        <span className="text-[12px] text-label-tertiary tabular-nums shrink-0 ml-2">{name.length}/50</span>
      </div>

      <p className="text-[12.5px] text-label-tertiary mb-3">Colore calendario</p>
      <div className="grid grid-cols-6 gap-3 pb-2">
        {CATEGORY_COLORS.map((c) => {
          const active = color === c;
          return (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={`Colore ${c}`}
              aria-pressed={active}
              className={cn(
                'aspect-square rounded-full grid place-items-center transition-all active:scale-90',
                active ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1c1c1e]' : 'hover:scale-105'
              )}
              style={{ backgroundColor: c }}
            >
              {active && <Check size={15} className="text-white" strokeWidth={3.2} />}
            </button>
          );
        })}
      </div>
    </LiquidDialog>
  );
}
