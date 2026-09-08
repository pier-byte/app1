import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { isToday, isSameDay, addDays, format, parseISO, startOfMonth, startOfWeek, addMonths } from 'date-fns';
import { it } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { toDateKey } from '../../lib/dates';
import { Dialog } from '../ui/Dialog';
import { cn } from '../../lib/cn';

function label(date) {
  return format(date, 'EEEE d MMMM', { locale: it });
}

/**
 * DatePickerDialog — Cambia data stile iOS:
 * chip rapide (Oggi/Domani/Dopodomani) + griglia 2 settimane.
 */
export default function DatePickerDialog({ isOpen, onClose, value, onConfirm }) {
  const [selected, setSelected] = useState(() => (value ? parseISO(value) : new Date()));
  const [shownMonth, setShownMonth] = useState(() => (value ? parseISO(value) : new Date()));

  const days = useMemo(() => {
    if (!isOpen) return [];
    const start = startOfWeek(startOfMonth(shownMonth), { weekStartsOn: 1 });
    return Array.from({length:42}, (_,i) => addDays(start,i));
  }, [isOpen, shownMonth]);

  const quickOptions = useMemo(
    () => [
      { label: 'Oggi', date: new Date() },
      { label: 'Domani', date: addDays(new Date(), 1) },
      { label: 'Dopodomani', date: addDays(new Date(), 2) },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isOpen]
  );

  const handleConfirm = () => {
    onConfirm(toDateKey(selected));
    onClose();
  };

  const dayHeaders = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Data di scadenza"
      actions={
        <>
          <button onClick={onClose} className="text-[17px] text-label-secondary font-medium active:opacity-60">
            Annulla
          </button>
          <button onClick={handleConfirm} className="text-[17px] text-accent font-semibold active:opacity-60">
            Conferma
          </button>
        </>
      }
    >
      {/* Chip rapide */}
      <div className="flex gap-2 py-3">
        {quickOptions.map((opt) => {
          const active = isSameDay(selected, opt.date);
          return (
            <button
              key={opt.label}
              onClick={() => setSelected(opt.date)}
              className={cn(
                'px-3.5 h-8 rounded-full text-[13px] font-medium transition-colors',
                active ? 'bg-accent text-white' : 'bg-fill-tertiary text-label-secondary active:bg-fill-secondary'
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Griglia 2 settimane */}
      <div className="py-2">
        <div className="flex items-center justify-between mb-3"><button onClick={() => setShownMonth(addMonths(shownMonth,-1))} className="control-button"><ChevronLeft size={18}/></button><p className="text-[15px] font-semibold capitalize">{format(shownMonth, 'MMMM yyyy', { locale: it })}</p><button onClick={() => setShownMonth(addMonths(shownMonth,1))} className="control-button"><ChevronRight size={18}/></button></div>
        <div className="grid grid-cols-7 gap-y-1 mb-1">
          {dayHeaders.map((d, i) => (
            <span key={i} className="text-center text-[11px] text-label-tertiary font-medium">{d}</span>
          ))}
        </div>
          <div className="grid grid-cols-7 gap-y-1 mb-1">
            {days.map((date) => {
              const active = isSameDay(date, selected);
              const today = isToday(date);
              return (
                <button
                  key={date.toISOString()}
                  onClick={() => setSelected(date)}
                  className="flex items-center justify-center"
                >
                  <span
                    className={cn(
                      'w-9 h-9 rounded-full flex items-center justify-center text-[15px] font-medium transition-colors',
                      active && 'bg-accent text-white',
                      !active && today && 'text-accent',
                      !active && !today && 'text-label'
                    )}
                  >
                    {format(date, 'd')}
                  </span>
                </button>
              );
            })}
          </div>
      </div>

      <p className="text-[13px] text-label-secondary capitalize pb-3">{label(selected)}</p>
    </Dialog>
  );
}
