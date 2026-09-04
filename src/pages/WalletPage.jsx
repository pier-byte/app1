import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { Wallet, Settings2, Plus, Trash2, Receipt } from 'lucide-react';
import { useExpenses, useBudget } from '../hooks/useData';
import FAB from '../components/ui/FAB';
import Dialog from '../components/ui/Dialog';
import ExpenseFormSheet from '../components/wallet/ExpenseFormSheet';
import { toDateKey, getWeekDates, getWeekLabel, formatDateDisplay } from '../lib/dates';
import { budgetColor } from '../lib/constants';
import { cn } from '../lib/cn';

const euro = (n) => `€ ${n.toFixed(2).replace('.', ',')}`;

/**
 * Tab 4 — Wallet: budget settimanale, log rapido spese e
 * indicatori visivi di soglia (verde <50%, giallo 50–80%, rosso >80%).
 */
export default function WalletPage({ selectedDate, weekDates }) {
  const dateKey = toDateKey(selectedDate);
  const weekStartKey = toDateKey(getWeekDates(selectedDate)[0]);
  const weekEndKey = toDateKey(getWeekDates(selectedDate)[6]);

  const { data: expenses, isLoading, addExpense, removeExpense } = useExpenses(weekStartKey, weekEndKey);
  const { data: budget, isLoading: budgetLoading, setBudget } = useBudget(weekStartKey);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');

  const spent = useMemo(() => (expenses ?? []).reduce((s, e) => s + e.amount, 0), [expenses]);
  const spentToday = useMemo(() => (expenses ?? []).filter((e) => e.date === dateKey).reduce((s, e) => s + e.amount, 0), [expenses, dateKey]);
  const budgetAmount = budget?.budgetAmount ?? 0;
  const ratio = budgetAmount > 0 ? spent / budgetAmount : 0;
  const remaining = budgetAmount - spent;
  const color = budgetAmount > 0 ? budgetColor(ratio) : '#0a84ff';

  // Raggruppa per giorno (desc)
  const grouped = useMemo(() => {
    const map = new Map();
    (expenses ?? []).forEach((e) => {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date).push(e);
    });
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [expenses]);

  const openBudgetDialog = () => {
    setBudgetInput(budgetAmount ? String(budgetAmount) : '');
    setBudgetDialogOpen(true);
  };

  const confirmBudget = () => {
    const v = parseFloat(budgetInput.replace(',', '.'));
    if (!isNaN(v) && v > 0) setBudget(Math.round(v * 100) / 100);
    setBudgetDialogOpen(false);
  };

  return (
    <div className="h-full overflow-y-auto scrollable px-4 pt-2 pb-32">
      {/* Header */}
      <div className="flex items-end justify-between mb-4">
        <div>
          <h1 className="text-[28px] font-bold text-label tracking-tight leading-tight">Wallet</h1>
          <p className="text-[13px] text-label-secondary">{getWeekLabel(getWeekDates(selectedDate))}</p>
        </div>
        <button
          onClick={openBudgetDialog}
          className="w-9 h-9 rounded-full bg-surface-2 flex items-center justify-center active:bg-surface-3"
          aria-label="Imposta budget"
        >
          <Settings2 size={17} className="text-label-secondary" />
        </button>
      </div>

      {/* Card budget */}
      <div className="bg-surface-1 rounded-2xl p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Wallet size={18} className="text-accent" />
            <span className="text-[15px] font-semibold text-label">Budget settimanale</span>
          </div>
          <button onClick={openBudgetDialog} className="text-[13px] font-semibold text-accent active:opacity-60">
            {budgetAmount ? 'Modifica' : 'Imposta'}
          </button>
        </div>

        {budgetAmount > 0 ? (
          <>
            <div className="flex items-baseline gap-1.5 mb-3">
              <span className="text-[36px] leading-none font-bold tracking-tight tabular-nums" style={{ color }}>
                {euro(Math.max(remaining, 0))}
              </span>
              <span className="text-[14px] text-label-tertiary">rimanenti su {euro(budgetAmount)}</span>
            </div>

            {/* Barra con soglia colorata */}
            <div className="w-full h-2.5 rounded-full bg-fill-tertiary overflow-hidden mb-3">
              <motion.div
                className="h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(ratio * 100, 100)}%` }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                style={{ backgroundColor: color }}
              />
            </div>

            <div className="flex items-center justify-between text-[12px]">
              <span className="text-label-secondary">
                Spesi <span className="font-semibold text-label">{euro(spent)}</span> ({Math.round(ratio * 100)}%)
              </span>
              <span className="flex items-center gap-1 font-semibold" style={{ color }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                {ratio < 0.5 ? 'Sotto controllo' : ratio <= 0.8 ? 'Attenzione al budget' : 'Budget quasi esaurito'}
              </span>
            </div>
          </>
        ) : (
          <button
            onClick={openBudgetDialog}
            className="w-full h-12 rounded-xl bg-accent/15 text-accent text-[15px] font-semibold active:opacity-70"
          >
            Imposta il budget di questa settimana
          </button>
        )}

        <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-separator">
          <Receipt size={13} className="text-label-tertiary" />
          <span className="text-[12px] text-label-tertiary">
            Oggi: <span className="text-label-secondary font-medium">{euro(spentToday)}</span> · {expenses?.length ?? 0} spese questa settimana
          </span>
        </div>
      </div>

      {/* Lista spese */}
      {!isLoading && grouped.length === 0 && (
        <p className="text-[14px] text-label-tertiary text-center py-10">
          Nessuna spesa in questa settimana
        </p>
      )}

      {grouped.map(([day, items]) => (
        <div key={day} className="mb-4">
          <div className="flex items-center justify-between mb-2 px-1">
            <h3 className="text-[13px] font-semibold text-label-secondary capitalize">{formatDateDisplay(parseISO(day))}</h3>
            <span className="text-[13px] text-label-tertiary tabular-nums">
              {euro(items.reduce((s, e) => s + e.amount, 0))}
            </span>
          </div>
          <div className="bg-surface-1 rounded-2xl overflow-hidden">
            <AnimatePresence initial={false}>
              {items.map((exp) => (
                <motion.div
                  key={exp._id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-3 px-4 py-3 border-b border-separator last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] text-label">{exp.description}</p>
                    {exp.category && <span className="text-[12px] text-label-tertiary">{exp.category}</span>}
                  </div>
                  <span className="text-[15px] font-semibold text-label tabular-nums">−{euro(exp.amount)}</span>
                  <button
                    onClick={() => removeExpense(exp._id)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-label-tertiary active:text-sys-red shrink-0"
                    aria-label="Elimina spesa"
                  >
                    <Trash2 size={15} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      ))}

      {/* FAB log rapido */}
      <FAB onClick={() => setSheetOpen(true)} icon={Plus} label="Nuova spesa" />

      {/* Sheet nuova spesa */}
      <ExpenseFormSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        defaultDate={dateKey}
        onSave={(fields) => addExpense(fields)}
      />

      {/* Dialog budget */}
      <Dialog
        isOpen={budgetDialogOpen}
        onClose={() => setBudgetDialogOpen(false)}
        title="Budget settimanale"
        actions={
          <>
            <button onClick={() => setBudgetDialogOpen(false)} className="text-[17px] text-label-secondary font-medium active:opacity-60">
              Annulla
            </button>
            <button onClick={confirmBudget} className="text-[17px] text-accent font-semibold active:opacity-60">
              Salva
            </button>
          </>
        }
      >
        <p className="text-[13px] text-label-secondary mb-3">Quanto puoi spendere a settimana?</p>
        <div className="flex items-center gap-2 my-2">
          <span className="text-[28px] font-bold text-label-tertiary">€</span>
          <input
            value={budgetInput}
            onChange={(e) => setBudgetInput(e.target.value.replace(/[^\d.,]/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && confirmBudget()}
            inputMode="decimal"
            autoFocus
            placeholder="30,00"
            className="flex-1 bg-surface-2 rounded-xl px-4 py-3 text-[24px] font-semibold text-label placeholder:text-label-tertiary"
          />
        </div>
        <div className="flex gap-2 py-3">
          {[20, 30, 50, 80].map((v) => (
            <button
              key={v}
              onClick={() => setBudgetInput(String(v))}
              className={cn(
                'px-3.5 h-8 rounded-full text-[13px] font-medium transition-colors',
                budgetInput === String(v) ? 'bg-accent text-white' : 'bg-fill-tertiary text-label-secondary active:bg-fill-secondary'
              )}
            >
              €{v}
            </button>
          ))}
        </div>
      </Dialog>
    </div>
  );
}
