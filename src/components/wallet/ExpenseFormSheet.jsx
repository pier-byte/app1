import { useState } from 'react';
import BottomSheet from '../ui/BottomSheet';
import DatePickerDialog from '../school/DatePickerDialog';
import { EXPENSE_CATEGORIES } from '../../lib/constants';
import { formatDateDisplay, parseISO } from '../../lib/dates';
import { cn } from '../../lib/cn';

/**
 * ExpenseFormSheet — Log/modifica spesa: importo grande, descrizione,
 * categoria chip e data (calendario Liquid Glass).
 * `editing` ≠ null → modalità modifica (campi precompilati).
 */
export default function ExpenseFormSheet({ isOpen, onClose, onSave, defaultDate, editing }) {
  const [amount, setAmount] = useState(editing ? String(editing.amount).replace('.', ',') : '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [category, setCategory] = useState(editing?.category ?? 'Altro');
  const [date, setDate] = useState(editing?.date ?? defaultDate);
  const [datePickOpen, setDatePickOpen] = useState(false);

  const numeric = parseFloat(amount.replace(',', '.')) || 0;
  const canSave = numeric > 0 && description.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      date,
      description: description.trim(),
      amount: Math.round(numeric * 100) / 100,
      category,
    });
    onClose();
  };

  return (
    <>
      <BottomSheet isOpen={isOpen} onClose={onClose}>
        {/* Importo grande */}
        <div className="flex flex-col items-center py-4">
          <p className="text-[13px] text-label-secondary mb-1">{editing ? 'Modifica spesa' : 'Nuova spesa'}</p>
          <div className="flex items-baseline gap-1">
            <span className={cn('text-[28px] font-semibold', numeric > 0 ? 'text-sky' : 'text-label-tertiary')}>€</span>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              inputMode="decimal"
              autoFocus
              placeholder="0,00"
              className="w-36 text-center bg-transparent text-[44px] leading-none font-semibold text-label placeholder:text-label-quaternary tabular-nums"
            />
          </div>
          <button
            onClick={() => setDatePickOpen(true)}
            className="flex items-center gap-2 mt-2 active:opacity-70 transition-opacity"
            aria-label="Cambia data della spesa"
          >
            <span className="text-[12px] text-label-tertiary capitalize">{date ? formatDateDisplay(parseISO(date)) : ''}</span>
            <span className="text-[11px] text-sky font-medium">Cambia</span>
          </button>
        </div>

        {/* Descrizione */}
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descrizione (es. Mensa)"
          className="w-full bg-surface-2 rounded-xl px-4 py-3.5 text-[16px] text-label placeholder:text-label-tertiary mb-3"
        />

        {/* Categoria */}
        <div className="flex flex-wrap gap-2 mb-4">
          {EXPENSE_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={cn(
                'px-3.5 h-9 rounded-full text-[13px] font-medium transition-colors',
                category === cat ? 'bg-accent text-white' : 'bg-fill-tertiary text-label-secondary active:bg-fill-secondary'
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Conferma */}
        <button
          onClick={handleSave}
          disabled={!canSave}
          className={cn(
            'w-full h-12 rounded-full text-[16px] font-semibold transition-colors',
            canSave ? 'bg-accent text-white active:bg-accent-pressed' : 'bg-fill-secondary text-label-tertiary'
          )}
        >
          {editing ? 'Salva modifiche' : 'Registra spesa'}
        </button>
      </BottomSheet>

      {/* Data — calendario Liquid Glass */}
      <DatePickerDialog
        isOpen={datePickOpen}
        onClose={() => setDatePickOpen(false)}
        value={date}
        onConfirm={setDate}
      />
    </>
  );
}
