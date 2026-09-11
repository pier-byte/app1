import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import BottomSheet from '../ui/BottomSheet';
import { EXPENSE_CATEGORIES } from '../../lib/constants';
import { formatDateDisplay, parseISO } from '../../lib/dates';
import { cn } from '../../lib/cn';

const euro = (n) => `€ ${n.toFixed(2).replace('.', ',')}`;

/**
 * ExpenseFormSheet — Log rapido spesa: importo grande, descrizione,
 * categoria chip e data. Conferma con check circolare blu.
 */
export default function ExpenseFormSheet({ isOpen, onClose, onSave, defaultDate }) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Altro');
  const [date, setDate] = useState(defaultDate);

  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setDescription('');
      setCategory('Altro');
      setDate(defaultDate);
    }
  }, [isOpen, defaultDate]);

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
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      {/* Importo grande */}
      <div className="flex flex-col items-center py-4">
        <p className="text-[13px] text-label-secondary mb-1">Nuova spesa</p>
        <div className="flex items-baseline gap-1">
          <span className={cn('text-[28px] font-semibold', numeric > 0 ? 'text-accent' : 'text-label-tertiary')}>€</span>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            inputMode="decimal"
            autoFocus
            placeholder="0,00"
            className="w-36 text-center bg-transparent text-[44px] leading-none font-bold text-label placeholder:text-label-quaternary tabular-nums"
          />
        </div>
        <label className="flex items-center gap-2 mt-2">
          <span className="text-[12px] text-label-tertiary capitalize">{date ? formatDateDisplay(parseISO(date)) : ''}</span>
          <input
            type="date"
            value={date || ''}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            onClick={(e) => e.currentTarget.showPicker?.()}
            className="h-11 bg-surface-2 rounded-lg px-2 text-[15px] text-label"
            aria-label="Data della spesa"
          />
        </label>
      </div>

      {/* Descrizione */}
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Descrizione (es. Mensa)"
        className="w-full bg-surface-2 rounded-xl px-4 py-3.5 text-[16px] text-label placeholder:text-label-tertiary mb-3"
      />

      {/* Categoria */}
      <div className="flex flex-wrap gap-2 mb-5">
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
      <div className="flex items-center justify-center pb-3">
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={handleSave}
          disabled={!canSave}
          className={cn(
            'w-16 h-16 rounded-full flex items-center justify-center transition-colors',
            canSave ? 'bg-accent shadow-lg shadow-accent/30' : 'bg-fill-secondary'
          )}
          aria-label="Salva spesa"
        >
          <Check size={28} className={canSave ? 'text-white' : 'text-label-tertiary'} strokeWidth={3} />
        </motion.button>
      </div>
    </BottomSheet>
  );
}
