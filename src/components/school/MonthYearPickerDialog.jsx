import { useMemo, useState, useEffect } from 'react';
import LiquidDialog, { LiquidFooterActions } from '../ui/LiquidDialog';
import DrumColumn from '../ui/DrumColumn';
import { MONTHS_IT } from './dates-it';

/**
 * MonthYearPickerDialog — "Seleziona data" a tamburo 3D Liquid Glass
 * (ui-references/month_year_picker_a_tamburo_3d_liquid_glass):
 * colonna mesi (adattamento dinamico larghezza per Settembre/Novembre)
 * + colonna anni (e opzionalmente colonna giorni) con effetto cilindro e banda centrata.
 * value: Date di riferimento · onConfirm(Date) · showDay (opzionale per date completa).
 */
export default function MonthYearPickerDialog(props) {
  if (!props.isOpen) return null;
  return <MonthYearContent key={props.value?.getTime() ?? 'my'} {...props} />;
}

function MonthYearContent({ onClose, value, onConfirm, showDay = false, title = 'Seleziona data' }) {
  const base = value ?? new Date();
  const [day, setDay] = useState(base.getDate());
  const [month, setMonth] = useState(base.getMonth());
  const [year, setYear] = useState(base.getFullYear());

  const thisYear = new Date().getFullYear();
  const years = useMemo(() => Array.from({ length: 25 }, (_, i) => thisYear - 12 + i), [thisYear]);

  const daysInCurrentMonth = useMemo(() => {
    return new Date(year, month + 1, 0).getDate();
  }, [year, month]);

  const days = useMemo(() => Array.from({ length: daysInCurrentMonth }, (_, i) => i + 1), [daysInCurrentMonth]);

  useEffect(() => {
    if (day > daysInCurrentMonth) setDay(daysInCurrentMonth);
  }, [day, daysInCurrentMonth]);

  const confirm = () => onConfirm?.(new Date(year, month, showDay ? day : 1));

  return (
    <LiquidDialog
      isOpen
      onClose={onClose}
      title={title}
      maxWidth={showDay ? 360 : 342}
      footer={<LiquidFooterActions onCancel={onClose} onConfirm={confirm} />}
    >
      <div className="relative w-full my-3 flex items-center justify-center overflow-hidden" style={{ height: 220 }}>
        {/* Banda centrale (z-0, dietro i numeri) */}
        <div className="drum-band absolute inset-x-2 h-[44px] rounded-2xl pointer-events-none z-0">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />
        </div>

        <div className="relative z-10 w-full flex items-center justify-center px-1">
          {showDay && (
            <DrumColumn
              values={days}
              value={day}
              onChange={setDay}
              label="Giorno"
              itemHeight={44}
              visibleCount={5}
              format={(d) => String(d).padStart(2, '0')}
              className="flex-[0.8] min-w-0"
            />
          )}
          <DrumColumn
            values={MONTHS_IT.map((_, i) => i)}
            value={month}
            onChange={setMonth}
            label="Mese"
            itemHeight={44}
            visibleCount={5}
            format={(i) => MONTHS_IT[i]}
            className={showDay ? 'flex-[1.25] min-w-0' : 'flex-[1.4] min-w-0'}
          />
          <DrumColumn
            values={years}
            value={year}
            onChange={setYear}
            label="Anno"
            itemHeight={44}
            visibleCount={5}
            className="flex-1 min-w-0"
          />
        </div>
      </div>
    </LiquidDialog>
  );
}
