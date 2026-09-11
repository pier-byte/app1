import { useMemo, useState } from 'react';
import LiquidDialog, { LiquidFooterActions } from '../ui/LiquidDialog';
import DrumColumn from '../ui/DrumColumn';
import { cn } from '../../lib/cn';

const MINUTE_STEP = 5;

const pad = (n) => String(n).padStart(2, '0');
const parseHM = (time) => {
  const [h, m] = String(time || '').split(':').map(Number);
  return { h: Number.isFinite(h) ? h : 9, m: Number.isFinite(m) ? Math.round(m / MINUTE_STEP) * MINUTE_STEP % 60 : 0 };
};

/**
 * TimePickerDialog — "Seleziona orario" a tamburo 3D Liquid Glass
 * (ui-references/time_picker_a_tamburo_3d_liquid_glass):
 * due colonne ore/minuti con effetto cilindro, banda di selezione,
 * chip rapide (+15/+30/+45 min, Tutto il giorno) e Annulla/Conferma.
 *
 * value: "HH:mm" · onConfirm(timeStr) · onToggleAllDay opzionale (chip).
 * Il contenuto è rimontato ad ogni apertura (key) → stato sempre allineato.
 */
export default function TimePickerDialog(props) {
  if (!props.isOpen) return null;
  return <TimePickerContent key={props.value ?? 'time'} {...props} />;
}

function TimePickerContent({ onClose, value, onConfirm, onToggleAllDay, title = 'Seleziona orario' }) {
  const initial = useMemo(() => parseHM(value), [value]);
  const [hour, setHour] = useState(initial.h);
  const [minute, setMinute] = useState(initial.m);

  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const minutes = useMemo(() => Array.from({ length: 60 / MINUTE_STEP }, (_, i) => i * MINUTE_STEP), []);

  const shiftMinutes = (delta) => {
    const total = (hour * 60 + minute + delta + 24 * 60) % (24 * 60);
    setHour(Math.floor(total / 60));
    setMinute(Math.round((total % 60) / MINUTE_STEP) * MINUTE_STEP % 60);
  };

  const confirm = () => onConfirm?.(`${pad(hour)}:${pad(minute)}`);

  return (
    <LiquidDialog
      isOpen
      onClose={onClose}
      title={title}
      maxWidth={342}
      footer={<LiquidFooterActions onCancel={onClose} onConfirm={confirm} />}
    >
      <p className="text-center text-[13px] text-label-tertiary -mt-1 pb-2">{pad(hour)}:{pad(minute)}</p>

      {/* Tamburo: banda di selezione dietro le cifre + due colonne */}
      <div className="relative w-full my-1 flex items-center justify-center overflow-hidden" style={{ height: 208 }}>
        {/* Banda centrale (z-0, dietro i numeri) */}
        <div className="drum-band absolute inset-x-2 h-[48px] rounded-2xl pointer-events-none z-0">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />
        </div>

        <div className="relative z-10 w-full flex items-center justify-center px-2">
          <DrumColumn values={hours} value={hour} onChange={setHour} label="Ore" format={pad} />
          <div className="w-8 flex items-center justify-center z-20 select-none">
            <span className="text-[30px] font-bold text-label leading-none">:</span>
          </div>
          <DrumColumn values={minutes} value={minute} onChange={setMinute} label="Minuti" format={pad} />
        </div>
      </div>

      {/* Chip rapide */}
      <div className="flex items-center justify-center gap-1.5 mt-1 mb-4 overflow-x-auto scrollable-x py-1">
        {[15, 30, 45].map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => shiftMinutes(m)}
            className="px-2.5 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.16] active:scale-95 transition-all text-[11.5px] font-medium text-white/80 border border-white/10 whitespace-nowrap"
          >
            +{m} min
          </button>
        ))}
        {onToggleAllDay && (
          <button
            type="button"
            onClick={onToggleAllDay}
            className={cn(
              'px-2.5 py-1.5 rounded-full active:scale-95 transition-all text-[11.5px] font-medium whitespace-nowrap border',
              'bg-white/[0.08] hover:bg-white/[0.16] text-white/80 border-white/10'
            )}
          >
            Tutto il giorno
          </button>
        )}
      </div>
    </LiquidDialog>
  );
}
