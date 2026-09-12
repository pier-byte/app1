import { useMemo, useState } from 'react';
import {
  addDays, addMonths, differenceInCalendarDays, format, getDaysInMonth, isSameDay,
  isSameMonth, isToday, parseISO, startOfMonth, startOfWeek,
} from 'date-fns';
import { it } from 'date-fns/locale';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { toDateKey } from '../../lib/dates';
import LiquidDialog, { LiquidFooterActions } from '../ui/LiquidDialog';
import MonthYearPickerDialog from './MonthYearPickerDialog';
import { WEEKDAYS_IT } from './dates-it';
import { cn } from '../../lib/cn';

/**
 * DatePickerDialog — "Seleziona data" calendario mensile Liquid Glass
 * (ui-references/date_picker_mensile_liquid_glass):
 * header con chip icona + "Oggi", navigazione mese (tap sul titolo →
 * selettore mese/anno a tamburo), griglia giorni con oggi/selezione,
 * chip rapide (Domani, Dopodomani, Prossima settimana) e Annulla/Conferma.
 *
 * API invariata: { isOpen, onClose, value: "YYYY-MM-DD"|undefined, onConfirm(key) }.
 * Il contenuto viene rimontato ad ogni apertura (key) → stato sempre allineato.
 */
export default function DatePickerDialog(props) {
  if (!props.isOpen) return null;
  return <DatePickerContent key={`${props.value ?? ''}`} {...props} />;
}

function DatePickerContent({ onClose, value, onConfirm }) {
  const [selected, setSelected] = useState(() => (value ? parseISO(value) : new Date()));
  const [shownMonth, setShownMonth] = useState(() => (value ? parseISO(value) : new Date()));
  const [monthYearOpen, setMonthYearOpen] = useState(false);

  // Griglia completa del mese mostrato (5–6 righe, lun→dom)
  const days = useMemo(() => {
    const monthStart = startOfMonth(shownMonth);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const offset = differenceInCalendarDays(monthStart, gridStart);
    const rows = Math.ceil((offset + getDaysInMonth(monthStart)) / 7);
    return Array.from({ length: rows * 7 }, (_, i) => addDays(gridStart, i));
  }, [shownMonth]);

  const quickOptions = useMemo(
    () => [
      { label: 'Domani', date: addDays(new Date(), 1) },
      { label: 'Dopodomani', date: addDays(new Date(), 2) },
      { label: 'Prossima settimana', date: addDays(new Date(), 7) },
    ],
    []
  );

  const handleConfirm = () => {
    onConfirm(toDateKey(selected));
    onClose();
  };

  return (
    <>
      <LiquidDialog
        isOpen
        onClose={onClose}
        maxWidth={358}
        title={
          <span className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-accent/20 border border-accent/30 flex items-center justify-center text-[#2997ff]">
              <CalendarDays size={15} />
            </span>
            <span className="text-[19px] font-semibold tracking-tight text-label">Seleziona data</span>
          </span>
        }
        titleRight={
          <button
            onClick={() => {
              setSelected(new Date());
              setShownMonth(new Date());
            }}
            className="text-xs font-medium text-[#2997ff] px-2.5 py-1 rounded-full bg-accent/15 hover:bg-accent/30 border border-accent/25 transition-colors"
          >
            Oggi
          </button>
        }
        footer={<LiquidFooterActions onCancel={onClose} onConfirm={handleConfirm} />}
      >
        {/* Navigazione mese: titolo (tap → tamburo mese/anno) + chevron tondi */}
        <div className="flex items-center justify-between pt-1 pb-2">
          <button
            onClick={() => setMonthYearOpen(true)}
            className="flex items-baseline gap-1.5 pl-1 active:opacity-70 transition-opacity"
            aria-label="Scegli mese e anno"
          >
            <span className="text-[16px] font-semibold text-label capitalize">
              {format(shownMonth, 'MMMM', { locale: it })}
            </span>
            <span className="text-[13px] text-label-secondary tabular-nums">{format(shownMonth, 'yyyy')}</span>
          </button>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShownMonth(addMonths(shownMonth, -1))}
              aria-label="Mese precedente"
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/15 active:bg-white/20 border border-white/10 flex items-center justify-center text-white/80 transition-all"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setShownMonth(addMonths(shownMonth, 1))}
              aria-label="Mese successivo"
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/15 active:bg-white/20 border border-white/10 flex items-center justify-center text-white/80 transition-all"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Intestazione giorni */}
        <div className="grid grid-cols-7 gap-1 text-center py-2 border-b border-white/[0.06]">
          {WEEKDAYS_IT.map((d) => (
            <span key={d} className="text-[12px] font-medium text-white/40">{d}</span>
          ))}
        </div>

        {/* Griglia date */}
        <div
          className="grid grid-cols-7 gap-y-1.5 gap-x-1 py-3 place-items-center"
          role="grid"
          aria-label={format(shownMonth, 'MMMM yyyy', { locale: it })}
        >
          {days.map((date) => {
            const active = isSameDay(date, selected);
            const today = isToday(date);
            const outside = !isSameMonth(date, shownMonth);
            return (
              <button
                key={date.toISOString()}
                type="button"
                role="gridcell"
                onClick={() => {
                  setSelected(date);
                  if (outside) setShownMonth(startOfMonth(date));
                }}
                aria-label={format(date, 'd MMMM yyyy', { locale: it })}
                aria-pressed={active}
                className={cn(
                  'w-9 h-9 flex items-center justify-center rounded-full transition-all text-[14px]',
                  active
                    ? 'text-white font-semibold bg-gradient-to-b from-accent to-[#2997ff] shadow-lg shadow-blue-500/40'
                    : today
                      ? 'text-[#2997ff] font-medium ring-1 ring-[#2997ff]/70 bg-accent/10'
                      : outside
                        ? 'text-white/20'
                        : 'text-white/90 hover:bg-white/10'
                )}
              >
                {format(date, 'd')}
              </button>
            );
          })}
        </div>

        {/* Chip rapide */}
        <div className="pt-1 pb-2 overflow-x-auto scrollable-x flex items-center gap-2 -mx-1 px-1">
          {quickOptions.map((opt) => {
            const active = isSameDay(selected, opt.date);
            return (
              <button
                key={opt.label}
                type="button"
                onClick={() => {
                  setSelected(opt.date);
                  setShownMonth(startOfMonth(opt.date));
                }}
                className={cn(
                  'shrink-0 px-2.5 py-1.5 rounded-full text-[12px] font-medium border transition-colors',
                  active
                    ? 'bg-accent/25 text-white border-accent/40'
                    : 'bg-white/10 hover:bg-white/15 text-white/85 border-white/10'
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </LiquidDialog>

      {/* Tamburo mese/anno (sopra il date picker) */}
      <MonthYearPickerDialog
        isOpen={monthYearOpen}
        onClose={() => setMonthYearOpen(false)}
        value={shownMonth}
        onConfirm={(d) => setShownMonth(d)}
      />
    </>
  );
}
