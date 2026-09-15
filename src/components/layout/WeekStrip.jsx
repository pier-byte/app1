import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getDayName, getDayNumber, toDateKey } from '../../lib/dates';
import { useSwipeNavigation } from '../../hooks/useSwipeNavigation';
import { useDeviceClock } from '../../hooks/useDeviceClock';
import { cn } from '../../lib/cn';

/**
 * WeekStrip — DatePicker orizzontale coordinato (ui-references
 * sezione_compiti_liquid_glass + calendario_mensile_full_screen):
 * riga navigazione ‹ label › + chip "Oggi" liquido, griglia 7 giorni con
 * target touch ≥44px; il giorno OGGI è la capsula gradiente blu con glow
 * (reference "ven 4"), il giorno selezionato l'anello sky vetrato
 * (reference "gio 3"); se coincidono vince la capsula con ring sky.
 * "Oggi" deriva dall'orologio locale del dispositivo (useDeviceClock).
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
  const todayKey = useDeviceClock();
  const swipeHandlers = useSwipeNavigation(onNextWeek, onPrevWeek);
  const selKey = toDateKey(selectedDate);

  return (
    <div
      className={cn(
        'relative',
        embedded ? 'bg-transparent pb-2 pt-1' : 'bg-canvas px-4 pt-2 pb-3'
      )}
      {...swipeHandlers}
    >
      {/* Riga navigazione settimana: ‹ label › + Oggi (sezione_compiti) */}
      {!embedded && (
        <div className="flex items-center justify-between mb-3 min-w-0">
          <div className="flex items-center gap-0.5 min-w-0 shrink">
            <button
              onClick={onPrevWeek}
              className="tap-clean touch-target rounded-full text-label-secondary active:bg-white/[0.08] active:text-sky transition-colors shrink-0"
              aria-label="Settimana precedente"
            >
              <ChevronLeft size={18} />
            </button>
            <AnimatePresence mode="wait">
              <motion.span
                key={weekLabel}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.15 }}
                className="text-[14px] font-semibold text-label tracking-tight truncate px-1"
              >
                {weekLabel}
              </motion.span>
            </AnimatePresence>
            <button
              onClick={onNextWeek}
              className="tap-clean touch-target rounded-full text-label-secondary active:bg-white/[0.08] active:text-sky transition-colors shrink-0"
              aria-label="Settimana successiva"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          {onToday && (
            <button
              onClick={onToday}
              className="tap-clean shrink-0 h-9 px-3.5 rounded-full bg-sky/10 border border-sky/25 text-sky text-[12px] font-semibold active:scale-95 transition-transform"
            >
              Oggi
            </button>
          )}
        </div>
      )}

      {/* Griglia giorni (7 colonne toccabili ≥44px, mai tagliate) */}
      <div className="grid grid-cols-7 gap-1">
        {weekDates.map((date) => {
          const key = toDateKey(date);
          const isSelected = key === selKey;
          const isTodayDate = key === todayKey;
          const capsule = isTodayDate; // oggi = capsula gradiente (reference)

          return (
            <button
              key={key}
              onClick={() => onSelectDate(date)}
              className="tap-clean flex flex-col items-center justify-center gap-1.5 py-1.5 min-h-[52px] min-w-0 rounded-2xl active:bg-white/[0.06] transition-colors"
              aria-label={`${getDayName(date)} ${getDayNumber(date)}`}
              aria-pressed={isSelected}
            >
              <span
                className={cn(
                  'text-[11px] font-medium',
                  isSelected ? 'text-sky font-semibold' : isTodayDate ? 'text-sky' : 'text-[#8e8e93]'
                )}
              >
                {getDayName(date)}
              </span>
              <span
                className={cn(
                  'relative flex items-center justify-center w-9 h-9 rounded-full text-[14px] font-semibold tabular-nums shrink-0',
                  capsule
                    ? 'bg-gradient-to-tr from-[#007AFF] to-[#38ACFF] text-white font-bold shadow-[0_0_14px_rgba(0,122,255,0.55)]'
                    : isSelected
                      ? 'border border-sky-400/40 bg-sky-500/20 text-sky-300 font-bold'
                      : 'text-[#c9c9ce]'
                )}
              >
                {getDayNumber(date)}
                {capsule && isSelected && (
                  <span className="absolute -inset-1 rounded-full ring-[1.5px] ring-sky/60 pointer-events-none" />
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
