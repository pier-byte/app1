import { useMemo, useState } from 'react';
import LiquidDialog, { LiquidFooterActions } from '../ui/LiquidDialog';
import DrumColumn from '../ui/DrumColumn';
import { MONTHS_IT } from './dates-it';

/**
 * MonthYearPickerDialog — "Seleziona data" a tamburo 3D Liquid Glass
 * (ui-references/month_year_picker_a_tamburo_3d_liquid_glass):
 * colonna mesi + colonna anni con effetto cilindro e banda di selezione.
 * value: Date di riferimento · onConfirm(Date).
 */
export default function MonthYearPickerDialog(props) {
  if (!props.isOpen) return null;
  return <MonthYearContent key={props.value?.getTime() ?? 'my'} {...props} />;
}

function MonthYearContent({ onClose, value, onConfirm }) {
  const base = value ?? new Date();
  const [month, setMonth] = useState(base.getMonth());
  const [year, setYear] = useState(base.getFullYear());

  const thisYear = new Date().getFullYear();
  const years = useMemo(() => Array.from({ length: 17 }, (_, i) => thisYear - 8 + i), [thisYear]);

  const confirm = () => onConfirm?.(new Date(year, month, 1));

  return (
    <LiquidDialog
      isOpen
      onClose={onClose}
      title="Seleziona data"
      maxWidth={342}
      footer={<LiquidFooterActions onCancel={onClose} onConfirm={confirm} />}
    >
      <div className="relative w-full my-3 flex items-center justify-center overflow-hidden" style={{ height: 208 }}>
        <div className="drum-band absolute inset-x-2 h-[48px] rounded-2xl pointer-events-none z-0">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />
        </div>
        <div className="relative z-10 w-full flex items-center justify-center px-2">
          <DrumColumn
            values={MONTHS_IT.map((_, i) => i)}
            value={month}
            onChange={setMonth}
            label="Mese"
            format={(i) => MONTHS_IT[i]}
          />
          <DrumColumn values={years} value={year} onChange={setYear} label="Anno" />
        </div>
      </div>
    </LiquidDialog>
  );
}
