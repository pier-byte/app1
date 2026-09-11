import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getDayName, getDayNumber, isToday, isSameDay } from '../../lib/dates';
import { useSwipeNavigation } from '../../hooks/useSwipeNavigation';
import { cn } from '../../lib/cn';

/**
 * WeekStrip — Strip settimanale swipeabile con navigazione.
 * Mostra lun-dom, giorno attivo con cerchio blu, "Oggi" per tornare ad oggi.
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
    <div className={embedded ? 'bg-transparent pb-3' : 'bg-canvas px-4 pt-2 pb-3'} {...swipeHandlers}>
      {/* Riga navigazione settimana */}
      {!embedded && <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={onPrevWeek}
            className="p-1 text-label-secondary active:text-sky transition-colors"
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
              className="text-[15px] font-semibold text-label tracking-tight"
            >
              {weekLabel}
            </motion.span>
          </AnimatePresence>
          <button
            onClick={onNextWeek}
            className="p-1 text-label-secondary active:text-sky transition-colors"
            aria-label="Settimana successiva"
          >
            <ChevronRight size={20} />
          </button>
        </div>
        <button
          onClick={onToday}
          className="text-[13px] font-semibold text-sky active:opacity-70 transition-opacity"
        >
          Oggi
        </button>
      </div>}

      {/* Griglia giorni */}
      <div className="grid grid-cols-7 gap-1">
        {weekDates.map((date) => {
          const isSelected = isSameDay(date, selectedDate);
          const isTodayDate = isToday(date);

          return (
            <button
              key={date.toISOString()}
              onClick={() => onSelectDate(date)}
              className="flex flex-col items-center gap-0.5 py-1"
            >
              <span
                className={cn(
                  'text-[11px] uppercase tracking-wide',
                  isSelected ? 'text-sky font-semibold' :
                  isTodayDate ? 'text-sky' :
                  'text-label-tertiary'
                )}
              >
                {getDayName(date)}
              </span>
              <div className="relative flex items-center justify-center w-9 h-9">
                {isSelected && (
                  <motion.div
                    layoutId="daySelector"
                    className="absolute inset-0 rounded-full bg-accent"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <span
                  className={cn(
                    'relative z-10 text-[16px] font-semibold',
                    isSelected ? 'text-white' :
                    isTodayDate ? 'text-sky' :
                    'text-label'
                  )}
                >
                  {getDayNumber(date)}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
