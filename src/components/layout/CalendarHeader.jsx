import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { CalendarDays, CalendarRange, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * CalendarHeader — top bar Liquid Glass (ui-references
 * calendario_mensile_full_screen_liquid_glass): bottone vetro tondo per il
 * toggle vista (mese/settimana), pill centrale "set 2026 ⌄" che apre il
 * selettore mese/anno a tamburo, frecce vetro per il periodo. Tutti i
 * controlli sono target touch ≥44px e centrati con place-items-center.
 * In vista settimana mostra sotto la WeekStrip coordinata.
 */
export default function CalendarHeader({
  mode,
  onModeChange,
  selectedDate,
  onPrev,
  onNext,
  onToday,
  onHeaderClick,
  weekStrip,
}) {
  return (
    <header className="shrink-0 pt-2.5 pb-1 px-3.5 z-30 select-none">
      <div className="flex items-center justify-between gap-2">
        {/* Sinistra: toggle vista + pill mese/anno */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => onModeChange(mode === 'month' ? 'week' : 'month')}
            aria-label={mode === 'month' ? 'Passa alla vista settimana' : 'Passa alla vista mese'}
            className="glass-btn w-11 h-11 rounded-full flex items-center justify-center text-[#c9c9ce] shrink-0"
          >
            {mode === 'month' ? <CalendarRange size={19} /> : <CalendarDays size={19} />}
          </button>
          <button
            type="button"
            onClick={onHeaderClick}
            aria-label="Scegli mese e anno"
            className="glass-btn flex items-center gap-1.5 px-3.5 h-11 rounded-2xl text-label min-w-0"
          >
            <span className="text-[17px] font-semibold tracking-tight capitalize truncate">
              {format(selectedDate, 'MMM yyyy', { locale: it })}
            </span>
            <ChevronDown size={15} className="text-label-tertiary shrink-0" />
          </button>
        </div>

        {/* Destra: navigazione periodo (mese) o "Oggi" (settimana) */}
        <div className="flex items-center gap-2 shrink-0">
          {mode === 'month' ? (
            <>
              <button
                type="button"
                onClick={onPrev}
                aria-label="Mese precedente"
                className="glass-btn w-11 h-11 rounded-full flex items-center justify-center text-[#c9c9ce]"
              >
                <ChevronLeft size={19} />
              </button>
              <button
                type="button"
                onClick={onNext}
                aria-label="Mese successivo"
                className="glass-btn w-11 h-11 rounded-full flex items-center justify-center text-[#c9c9ce]"
              >
                <ChevronRight size={19} />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onToday}
              aria-label="Vai a oggi"
              className="glass-btn h-11 px-4 rounded-full text-sky text-[13px] font-semibold"
            >
              Oggi
            </button>
          )}
        </div>
      </div>

      {mode === 'week' && weekStrip}
    </header>
  );
}
