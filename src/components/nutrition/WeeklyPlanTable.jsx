import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeftRight, X, Check, PenLine } from 'lucide-react';
import { Dialog } from '../ui/Dialog';
import { DAYS_FULL } from '../../lib/constants';
import { cn } from '../../lib/cn';

const MEAL_COLS = [
  { key: 'colazione', label: 'Colazione' },
  { key: 'pranzo', label: 'Pranzo' },
  { key: 'cena', label: 'Cena' },
];

/**
 * WeeklyPlanTable — Tabella rotazione pasti Lun–Dom.
 * Tap su cella → modifica. Swap rapido: attiva la modalità scambio e
 * tocca due giorni per scambiare tutti i pasti.
 */
export default function WeeklyPlanTable({ plan, onUpdatePlan }) {
  const [swapMode, setSwapMode] = useState(false);
  const [swapFirst, setSwapFirst] = useState(null);
  const [editCell, setEditCell] = useState(null); // { dayIndex, mealKey }
  const [editValue, setEditValue] = useState('');

  const handleRowTap = (dayIndex) => {
    if (!swapMode) return;
    if (swapFirst === null) {
      setSwapFirst(dayIndex);
    } else if (swapFirst === dayIndex) {
      setSwapFirst(null);
    } else {
      // Esegui swap dei pasti tra i due giorni
      const next = plan.map((d) => ({ ...d }));
      const a = next[swapFirst];
      const b = next[dayIndex];
      MEAL_COLS.forEach(({ key }) => {
        const tmp = a[key];
        a[key] = b[key];
        b[key] = tmp;
      });
      const spuntinoA = a.spuntino;
      const spuntinoB = b.spuntino;
      a.spuntino = spuntinoB;
      b.spuntino = spuntinoA;
      onUpdatePlan(next);
      setSwapFirst(null);
      setSwapMode(false);
    }
  };

  const openEdit = (dayIndex, mealKey) => {
    if (swapMode) return;
    setEditCell({ dayIndex, mealKey });
    setEditValue(plan[dayIndex]?.[mealKey] ?? '');
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

  return (
    <div>
      {/* Header con swap */}
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-[15px] font-semibold text-label-secondary">Rotazione pasti</h2>
        <button
          onClick={() => {
            setSwapMode(!swapMode);
            setSwapFirst(null);
          }}
          className={cn(
            'flex items-center gap-1.5 px-3 h-8 rounded-full text-[12px] font-semibold transition-colors',
            swapMode ? 'bg-accent text-white' : 'bg-fill-tertiary text-label-secondary active:bg-fill-secondary'
          )}
        >
          {swapMode ? <X size={13} /> : <ArrowLeftRight size={13} />}
          {swapMode ? 'Annulla' : 'Scambia giorni'}
        </button>
      </div>

      {swapMode && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[12px] text-accent mb-2 px-1"
        >
          {swapFirst === null
            ? 'Tocca il primo giorno da scambiare…'
            : `Ora tocca il giorno con cui scambiare "${DAYS_FULL[swapFirst]}"`}
        </motion.p>
      )}

      {/* Tabella */}
      <div className="bg-surface-1 rounded-2xl overflow-hidden">
        {/* Header colonne */}
        <div className="grid grid-cols-[64px_repeat(3,1fr)] bg-surface-2/60">
          <span className="px-2 py-2.5 text-[11px] font-semibold text-label-tertiary uppercase"></span>
          {MEAL_COLS.map((col) => (
            <span key={col.key} className="px-1 py-2.5 text-[11px] font-semibold text-label-tertiary uppercase tracking-wide text-center">
              {col.label}
            </span>
          ))}
        </div>

        {plan.map((day, dayIndex) => {
          const isSelectedFirst = swapFirst === dayIndex;
          return (
            <div
              key={day.day ?? dayIndex}
              className={cn(
                'grid grid-cols-[64px_repeat(3,1fr)] border-t border-separator',
                isSelectedFirst && 'bg-accent/10',
                swapMode && 'cursor-pointer active:bg-fill-tertiary'
              )}
              onClick={() => handleRowTap(dayIndex)}
            >
              <span className={cn('px-2 py-3 text-[12px] font-semibold flex items-center', isSelectedFirst ? 'text-accent' : 'text-label-secondary')}>
                {day.day?.slice(0, 3)}
              </span>
              {MEAL_COLS.map((col) => (
                <button
                  key={col.key}
                  onClick={(e) => {
                    if (swapMode) return;
                    e.stopPropagation();
                    openEdit(dayIndex, col.key);
                  }}
                  className="px-1.5 py-2.5 min-h-[52px] flex items-center justify-center text-center active:bg-fill-tertiary transition-colors group relative"
                >
                  <span className="text-[12px] leading-tight text-label">{day[col.key] || '—'}</span>
                  {!swapMode && (
                    <PenLine size={10} className="absolute top-1.5 right-1.5 text-label-quaternary opacity-0 group-active:opacity-100" />
                  )}
                </button>
              ))}
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
            <button onClick={confirmEdit} className="flex items-center gap-1 text-[17px] text-accent font-semibold active:opacity-60">
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
