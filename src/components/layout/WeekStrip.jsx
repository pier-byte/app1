import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getDayName, getDayNumber, isToday, isSameDay } from '../../lib/dates';
import { useSwipeNavigation } from '../../hooks/useSwipeNavigation';
import { cn } from '../../lib/cn';

/**
 * WeekStrip — DatePicker orizzontale coordinato (ui-references
 * calendario_mensile_full_screen + sezione_compiti): chip settimana con frecce,
 * "Oggi" a destra, riga giorni lun→dom con il giorno selezionato in cerchio
 * pieno Action Blue e l'oggi in anello azzurro. Nessun anello di focus al tap
 * (classe tap-clean). Swipe orizzontale per cambiare settimana.
 */
export default function WeekStrip({
  weekDates,
  selectedDate,
  weekLabel,
  onSelectDate,
  onPrevWeek,
  onNextWeek,
  onToday,
  embedded = false,
}) {
  const swipeHandlers = useSwipeNavigation(onNextWeek, onPrevWeek);

  return (
    <div
      className={cn(
        'relative',
        embedded ? 'bg-transparent pb-3' : 'bg-canvas px-4 pt-2 pb-3'
      )}
      {...swipeHandlers}
    >
      {/* Riga navigazione settimana: ‹ label › + Oggi (sezione_compiti) */}
      {!embedded && (
        <div className="flex items-center justify-between mb-3.5 min-w-0">
          <div className="flex items-center gap-1 min-w-0 shrink">
            <button
              onClick={onPrevWeek}
              className="tap-clean w-10 h-10 grid place-items-center rounded-full text-label-secondary active:bg-white/[0.08] active:text-sky transition-colors shrink-0"
              aria-label="Settimana precedente"
            >
              <ChevronLeft size={20} />
            </button>
            <AnimatePresence mode="wait">
              <motion.span
                key={weekLabel}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.15 }}
                className="text-[16px] font-semibold text-label tracking-tight truncate"
              >
                {weekLabel}
              </motion.span>
            </AnimatePresence>
            <button
              onClick={onNextWeek}
              className="tap-clean w-10 h-10 grid place-items-center rounded-full text-label-secondary active:bg-white/[0.08] active:text-sky transition-colors shrink-0"
              aria-label="Settimana successiva"
            >
              <ChevronRight size={20} />
            </button>
          </div>
          {onToday && (
            <button
              onClick={onToday}
              className="tap-clean shrink-0 h-9 px-4 rounded-full bg-accent text-white text-[13px] font-semibold shadow-sm shadow-blue-600/40 active:scale-95 transition-transform"
            >
              Oggi
            </button>
          )}
        </div>
      )}

      {/* Griglia giorni (7 colonne toccabili ~44px, mai tagliate) */}
      <div className="grid grid-cols-7 gap-0.5">
        {weekDates.map((date) => {
          const isSelected = isSameDay(date, selectedDate);
          const isTodayDate = isToday(date);

          return (
            <button
              key={date.toISOString()}
              onClick={() => onSelectDate(date)}
              className="tap-clean flex flex-col items-center gap-1 py-1 min-w-0 rounded-xl active:bg-white/[0.06] transition-colors"
            >
              <span
                className={cn(
                  'text-[11px] uppercase tracking-wide',
                  isSelected ? 'text-sky font-semibold' : isTodayDate ? 'text-sky' : 'text-[#8e8e93]'
                )}
              >
                {getDayName(date)}
              </span>
              <span className="relative flex items-center justify-center w-9 h-9 shrink-0">
                {isSelected && (
                  <motion.span
                    layoutId="daySelector"
                    className="absolute inset-0 rounded-full bg-accent shadow-sm shadow-blue-600/50"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                {!isSelected && isTodayDate && (
                  <span className="absolute inset-0 rounded-full ring-[1.5px] ring-inset ring-sky/70" />
                )}
                <span
                  className={cn(
                    'relative z-10 text-[16px] font-semibold tabular-nums',
                    isSelected ? 'text-white' : isTodayDate ? 'text-sky' : 'text-label'
                  )}
                >
                  {getDayNumber(date)}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
