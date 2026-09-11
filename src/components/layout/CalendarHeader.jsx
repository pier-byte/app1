import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/cn';

/**
 * CalendarHeader — Titolo mese, "Vai a oggi", toggle Settimana/Mese e frecce.
 * La griglia mensile è in MonthGrid (fit-to-screen), la settimana in WeekStrip.
 */
export default function CalendarHeader({ mode, onModeChange, selectedDate, onPrev, onNext, onToday, weekStrip }) {
  return (
    <header className="border-b border-white/[0.06] bg-canvas/85 backdrop-blur-dialog shrink-0">
      <div className="max-w-[1100px] mx-auto w-full px-4 pt-3">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div>
            <h1 className="text-[25px] font-semibold tracking-[-0.02em] capitalize leading-tight">
              {format(selectedDate, 'MMMM yyyy', { locale: it })}
            </h1>
            <button onClick={onToday} className="text-sky text-[13px] font-medium min-h-8">
              Vai a oggi
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-white/[0.08] border border-white/[0.06] rounded-full p-1" aria-label="Vista calendario">
              {['week', 'month'].map((v) => (
                <button
                  key={v}
                  onClick={() => onModeChange(v)}
                  className={cn(
                    'h-8 px-3 rounded-full text-[12px] font-semibold transition-colors',
                    mode === v ? 'bg-accent text-white shadow-sm shadow-blue-600/40' : 'text-[#9a9aa0]'
                  )}
                >
                  {v === 'week' ? 'Settimana' : 'Mese'}
                </button>
              ))}
            </div>
            <button onClick={onPrev} aria-label="Periodo precedente" className="control-button">
              <ChevronLeft size={20} />
            </button>
            <button onClick={onNext} aria-label="Periodo successivo" className="control-button">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
        {mode === 'week' && weekStrip}
      </div>
    </header>
  );
}
