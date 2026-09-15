import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeftRight, X, Check, PenLine } from 'lucide-react';
import { Dialog } from '../ui/Dialog';
import { DAYS_FULL } from '../../lib/constants';
import { cn } from '../../lib/cn';

const MEAL_COLS = [
  { key: 'colazione', label: 'Colazione' },
  { key: 'pranzo', label: 'Pranzo' },
  { key: 'cena', label: 'Cena' },
  { key: 'spuntino', label: 'Spuntino' },
];

/**
 * WeeklyPlanTable — Tabella rotazione pasti Lun–Dom.
 * Tap su cella → modifica del piatto.
 *
 * "Scambia pasti": lo scambio è consentito ESCLUSIVAMENTE tra lo stesso tipo
 * di pasto (Pranzo ↔ Pranzo, Cena ↔ Cena…): si seleziona una cella origine e
 * poi una cella della STESSA colonna su un altro giorno. Non è più possibile
 * scambiare pasti eterogenei né invertire l'intera giornata.
 */
export default function WeeklyPlanTable({ plan, onUpdatePlan }) {
  const [swapMode, setSwapMode] = useState(false);
  const [swapFirst, setSwapFirst] = useState(null); // { dayIndex, mealKey }
  const [swapHint, setSwapHint] = useState(null);
  const [editCell, setEditCell] = useState(null); // { dayIndex, mealKey }
  const [editValue, setEditValue] = useState('');

  const exitSwap = () => {
    setSwapMode(false);
    setSwapFirst(null);
    setSwapHint(null);
  };

  const handleCellTap = (dayIndex, mealKey) => {
    if (!swapMode) {
      setEditCell({ dayIndex, mealKey });
      setEditValue(plan[dayIndex]?.[mealKey] ?? '');
      return;
    }
    // Modalità scambio: solo stesso tipo di pasto
    if (!swapFirst) {
      setSwapFirst({ dayIndex, mealKey });
      setSwapHint(null);
      return;
    }
    if (swapFirst.dayIndex === dayIndex && swapFirst.mealKey === mealKey) {
      setSwapFirst(null);
      return;
    }
    if (swapFirst.mealKey !== mealKey) {
      // Pasti eterogenei → non permesso: riposiziona l'origine e spiega
      setSwapFirst({ dayIndex, mealKey });
      setSwapHint('Puoi scambiare solo pasti dello stesso tipo.');
      return;
    }
    // Swap dello stesso tipo di pasto tra due giorni
    const next = plan.map((d) => ({ ...d }));
    const a = next[swapFirst.dayIndex];
    const b = next[dayIndex];
    const tmp = a[mealKey];
    a[mealKey] = b[mealKey];
    b[mealKey] = tmp;
    onUpdatePlan(next);
    exitSwap();
  };

  const confirmEdit = () => {
    if (editCell) {
      const next = plan.map((d) => ({ ...d }));
      next[editCell.dayIndex][editCell.mealKey] = editValue.trim();
      onUpdatePlan(next);
    }
    setEditCell(null);
  };

  if (!plan || plan.length === 0) return null;

  const firstLabel = swapFirst
    ? `${DAYS_FULL[swapFirst.dayIndex]} · ${MEAL_COLS.find((c) => c.key === swapFirst.mealKey)?.label}`
    : null;

  return (
    <div>
      {/* Header con swap */}
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-[15px] font-semibold text-label-secondary">Rotazione pasti</h2>
        <button
          onClick={() => (swapMode ? exitSwap() : setSwapMode(true))}
          className={cn(
            'flex items-center gap-1.5 px-3 h-11 min-h-[44px] rounded-full text-[12px] font-semibold transition-colors',
            swapMode ? 'bg-accent text-white' : 'bg-fill-tertiary text-label-secondary active:bg-fill-secondary'
          )}
        >
          {swapMode ? <X size={13} /> : <ArrowLeftRight size={13} />}
          {swapMode ? 'Annulla' : 'Scambia pasti'}
        </button>
      </div>

      <AnimatePresence>
        {swapMode && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-[12px] text-sky mb-2 px-1 leading-snug"
          >
            {swapHint ? (
              <span className="text-sys-yellow">{swapHint}</span>
            ) : swapFirst === null ? (
              'Tocca il pasto da scambiare (es. il Pranzo di lunedì)…'
            ) : (
              `Ora tocca il ${MEAL_COLS.find((c) => c.key === swapFirst.mealKey)?.label.toLowerCase()} di un altro giorno («${firstLabel}»)`
            )}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Tabella */}
      <div className="card overflow-hidden">
        {/* Header colonne */}
        <div className="grid grid-cols-[56px_repeat(4,1fr)] bg-surface-2/60">
          <span className="px-2 py-2.5 text-[11px] font-semibold text-label-tertiary uppercase"></span>
          {MEAL_COLS.map((col) => (
            <span key={col.key} className="px-1 py-2.5 text-[10.5px] font-semibold text-label-tertiary uppercase tracking-wide text-center">
              {col.label}
            </span>
          ))}
        </div>

        {plan.map((day, dayIndex) => {
          return (
            <div
              key={day.day ?? dayIndex}
              className="grid grid-cols-[56px_repeat(4,1fr)] border-t border-separator"
            >
              <span className="px-2 py-3 text-[12px] font-semibold flex items-center text-label-secondary">
                {day.day?.slice(0, 3)}
              </span>
              {MEAL_COLS.map((col) => {
                const isSelectedFirst =
                  swapFirst?.dayIndex === dayIndex && swapFirst?.mealKey === col.key;
                return (
                  <button
                    key={col.key}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCellTap(dayIndex, col.key);
                    }}
                    aria-label={`${day.day} ${col.label}: ${day[col.key] || 'vuoto'}${swapMode ? ' (modalità scambio)' : ''}`}
                    className={cn(
                      'px-1 py-2.5 min-h-[52px] flex items-center justify-center text-center active:bg-fill-tertiary transition-colors group relative',
                      swapMode && 'cursor-pointer',
                      isSelectedFirst && 'bg-accent/15 ring-1 ring-inset ring-sky/50'
                    )}
                  >
                    <span className="text-[11.5px] leading-tight text-label">{day[col.key] || '—'}</span>
                    {!swapMode && (
                      <PenLine size={10} className="absolute top-1.5 right-1.5 text-label-quaternary opacity-0 group-active:opacity-100" />
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Dialog modifica cella */}
      <Dialog
        isOpen={!!editCell}
        onClose={() => setEditCell(null)}
        title={editCell ? `${plan[editCell.dayIndex]?.day} — ${MEAL_COLS.find((c) => c.key === editCell.mealKey)?.label}` : ''}
        actions={
          <>
            <button onClick={() => setEditCell(null)} className="text-[17px] text-label-secondary font-medium active:opacity-60">
              Annulla
            </button>
            <button onClick={confirmEdit} className="flex items-center gap-1 text-[17px] text-sky font-semibold active:opacity-60">
              <Check size={16} /> Salva
            </button>
          </>
        }
      >
        <input
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          autoFocus
          placeholder="es. Pasta al pomodoro"
          className="w-full bg-surface-2 rounded-xl px-4 py-3 text-[16px] text-label placeholder:text-label-tertiary my-2"
          onKeyDown={(e) => e.key === 'Enter' && confirmEdit()}
        />
      </Dialog>
    </div>
  );
}
