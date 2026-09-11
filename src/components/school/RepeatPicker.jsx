import { useMemo, useState } from 'react';
import { Repeat, ChevronRight } from 'lucide-react';
import { Dialog } from '../ui/Dialog';
import { REPEAT_FREQUENCIES, WEEKDAY_OPTIONS, repeatLabel, computeOccurrenceDates, hasRepeatRule, MAX_SERIES_INSTANCES } from '../../lib/repeat';
import { cn } from '../../lib/cn';

/**
 * RepeatPicker — "Ripeti" (screenshot 12): frequenza, giorni della settimana
 * per la ripetizione settimanale e condizioni di fine (mai / dopo N / data).
 * Al salvataggio la serie viene MATERIALIZZATA: ogni occorrenza diventa un
 * task reale nel DB (vedi anteprima "Verranno create N attività").
 */
export default function RepeatPicker({ repeat, onChange, baseDate }) {
  const [open, setOpen] = useState(false);
  const value = repeat && repeat.frequency ? repeat : { frequency: 'none' };

  const set = (patch) => onChange({ ...value, ...patch });

  const toggleWeekday = (id) => {
    const days = value.weekdays || [];
    const next = days.includes(id) ? days.filter((d) => d !== id) : [...days, id];
    set({ weekdays: next.length ? next : undefined });
  };

  // Anteprima live delle istanze che verranno generate al salvataggio
  const preview = useMemo(() => {
    if (!baseDate || !hasRepeatRule(value)) return null;
    try {
      const dates = computeOccurrenceDates(baseDate, value);
      return { count: dates.length, first: dates[0], last: dates[dates.length - 1] };
    } catch {
      return null;
    }
  }, [baseDate, value]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-3 px-1 py-3.5 border-b border-separator active:opacity-70"
      >
        <Repeat size={20} className="text-label-secondary shrink-0" />
        <div className="flex-1 text-left">
          <p className="text-[16px] text-label">Ripeti</p>
          <p className="text-[13px] text-label-tertiary mt-0.5">{repeatLabel(value)}</p>
        </div>
        <ChevronRight size={18} className="text-label-tertiary" />
      </button>

      <Dialog
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Ripeti"
        actions={
          <button onClick={() => setOpen(false)} className="text-[17px] text-label-secondary font-medium active:opacity-60">
            Fine
          </button>
        }
      >
        <p className="text-[13px] font-semibold text-label-secondary uppercase tracking-wide mb-2 mt-1">Frequenza</p>
        <div className="flex flex-col gap-1 mb-4">
          {REPEAT_FREQUENCIES.map((f) => (
            <button
              key={f.id}
              onClick={() => set({ frequency: f.id, weekdays: f.id === 'weekly' && !value.weekdays?.length ? [new Date().getDay() === 0 ? 7 : new Date().getDay()] : value.weekdays })}
              className="w-full flex items-center gap-3 py-2.5 text-left active:opacity-70"
            >
              <span
                className={cn(
                  'w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center shrink-0',
                  value.frequency === f.id ? 'border-accent' : 'border-label-quaternary'
                )}
              >
                {value.frequency === f.id && <span className="w-3 h-3 rounded-full bg-accent" />}
              </span>
              <span className="text-[15px] text-label flex-1">{f.label}</span>
            </button>
          ))}
        </div>

        {value.frequency === 'weekly' && (
          <>
            <p className="text-[13px] font-semibold text-label-secondary uppercase tracking-wide mb-2">Giorni della settimana</p>
            <div className="grid grid-cols-7 gap-1.5 mb-4">
              {WEEKDAY_OPTIONS.map((w) => {
                const active = (value.weekdays || []).includes(w.id);
                return (
                  <button
                    key={w.id}
                    onClick={() => toggleWeekday(w.id)}
                    className={cn(
                      'h-11 rounded-full text-[12px] font-semibold transition-colors',
                      active ? 'bg-accent text-white' : 'bg-fill-tertiary text-label-secondary'
                    )}
                  >
                    {w.label}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {value.frequency !== 'none' && (
          <>
            <p className="text-[13px] font-semibold text-label-secondary uppercase tracking-wide mb-2">Fine ripetizione</p>
            <div className="flex flex-col gap-1">
              {[
                { id: 'never', label: 'Mai' },
                { id: 'after', label: 'Dopo un numero di volte' },
                { id: 'on', label: 'In una data' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => set({ endMode: m.id })}
                  className="flex items-center gap-3 py-2.5 text-left active:opacity-70"
                >
                  <span
                    className={cn(
                      'w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center shrink-0',
                      (value.endMode || 'never') === m.id ? 'border-accent' : 'border-label-quaternary'
                    )}
                  >
                    {(value.endMode || 'never') === m.id && <span className="w-3 h-3 rounded-full bg-accent" />}
                  </span>
                  <span className="text-[15px] text-label flex-1">{m.label}</span>
                  {m.id === 'after' && (value.endMode || 'never') === 'after' && (
                    <label className="flex items-center gap-1.5">
                      <input
                        type="number"
                        inputMode="numeric"
                        min="1"
                        max={MAX_SERIES_INSTANCES}
                        value={value.endAfter || 5}
                        onChange={(e) => set({ endAfter: Math.min(MAX_SERIES_INSTANCES, Math.max(1, Number(e.target.value) || 1)) })}
                        onClick={(e) => e.stopPropagation()}
                        className="w-20 h-11 bg-surface-2 rounded-lg px-2 text-right text-[16px]"
                      />
                      <span className="text-[12px] text-label-tertiary">volte</span>
                    </label>
                  )}
                  {m.id === 'on' && (value.endMode || 'never') === 'on' && (
                    <input
                      type="date"
                      value={value.endDate || ''}
                      min={baseDate}
                      onChange={(e) => set({ endDate: e.target.value || undefined })}
                      onClick={(e) => {
                        e.stopPropagation();
                        // Apre il selettore data nativo (tamburo su iOS/Android)
                        e.currentTarget.showPicker?.();
                      }}
                      className="h-11 bg-surface-2 rounded-lg px-2 text-[15px] text-label"
                      aria-label="Data fine ripetizione"
                    />
                  )}
                </button>
              ))}
            </div>

            {preview && (
              <p className="text-[13px] text-sky font-medium mt-3 leading-snug">
                Verranno create {preview.count} {preview.count === 1 ? 'attività' : 'attività'}
                {preview.count > 1 && (
                  <> · dal {preview.first.split('-').reverse().slice(0, 2).join('/')} al {preview.last.split('-').reverse().slice(0, 2).join('/')}</>
                )}
              </p>
            )}
          </>
        )}
      </Dialog>
    </>
  );
}
