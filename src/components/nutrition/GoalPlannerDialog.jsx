import { useMemo, useState, useEffect } from 'react';
import { Target, Scale, Flame, PencilLine } from 'lucide-react';
import { Dialog } from '../ui/Dialog';
import {
  ACTIVITY_LEVELS, GOALS, GAIN_PACES, LOSE_PACES,
  bmrMifflin, tdee, targetKcal, suggestMacros, proteinTarget,
  expectedWeeklyChange, kcalFromMacros,
} from '../../lib/nutritionMath';
import { cn } from '../../lib/cn';

/**
 * GoalPlannerDialog — Calcola BMR/TDEE (Mifflin-St Jeor) e i macro giornalieri.
 * - Sesso fisso MASCHILE (default dell'app, non modificabile)
 * - Età/Peso/Altezza LETTI AUTOMATICAMENTE dallo store (profilo salvato +
 *   misure della sezione "Andamento"): nessun inserimento manuale
 * - In fondo, campo "Obiettivo manuale": la kcal inserita ricalcola al volo
 *   macro e calorie giornaliere (override del valore calcolato)
 * "Applica" salva i target usati dalla pagina Nutrizione e chiude il dialog.
 */
export default function GoalPlannerDialog({ isOpen, onClose, onApply, initial }) {
  const [sex] = useState('male'); // sesso fisso: Maschile
  const [age, setAge] = useState(() => Number(initial?.age) || 16);
  const [weightKg] = useState(() => Number(initial?.weightKg) || '');
  const [heightCm] = useState(() => Number(initial?.heightCm) || '');
  const [activity, setActivity] = useState(initial?.activity || 'moderate');
  const [goal, setGoal] = useState(initial?.goal || 'gain');
  const [pace, setPace] = useState(initial?.pace || 'standard');
  const [manualKcal, setManualKcal] = useState('');

  // Allinea i dati correnti ad ogni apertura (remount con key dalla pagina)
  useEffect(() => {
    if (isOpen) {
      setAge(Number(initial?.age) || 16);
      setActivity(initial?.activity || 'moderate');
      setGoal(initial?.goal || 'gain');
      setPace(initial?.pace || 'standard');
      setManualKcal('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const bmr = useMemo(
    () => bmrMifflin({ sex, weightKg: Number(weightKg), heightCm: Number(heightCm), age: Number(age) }),
    [sex, weightKg, heightCm, age]
  );
  const tdeeValue = useMemo(() => {
    const factor = ACTIVITY_LEVELS.find((a) => a.id === activity)?.factor || 1.55;
    return tdee(bmr, factor);
  }, [bmr, activity]);

  const delta = useMemo(() => {
    if (goal === 'maintain') return 0;
    const paceList = goal === 'gain' ? GAIN_PACES : LOSE_PACES;
    const p = paceList.find((x) => x.id === pace) ?? paceList[0];
    return goal === 'gain' ? p.surplus : p.delta;
  }, [goal, pace]);

  // Target calcolato dai dati automatici
  const computedKcal = useMemo(() => targetKcal(tdeeValue, goal, Math.abs(delta)), [tdeeValue, goal, delta]);

  // OVERRIDE manuale: la kcal inserita vince sul calcolo…
  const kcalNum = Math.max(0, Math.round(Number(manualKcal) || 0));
  const isManual = kcalNum > 0;
  const kcal = isManual ? kcalNum : computedKcal;
  // …e ricalcola DINAMICAMENTE i macro collegati
  const macros = useMemo(
    () => (kcal ? suggestMacros({ targetKcalValue: kcal, weightKg: Number(weightKg), goal }) : null),
    [kcal, weightKg, goal]
  );
  const manualMacros = useMemo(() => (kcal ? kcalFromMacros(macros) : 0), [kcal, macros]);
  const weekly = useMemo(() => expectedWeeklyChange(delta), [delta]);
  const protein = proteinTarget(Number(weightKg), goal);

  const apply = () => {
    if (!kcal || !macros) return;
    onApply({
      profile: { sex, age: Number(age), weightKg: Number(weightKg), heightCm: Number(heightCm), activity, goal, pace },
      goals: { calories: kcal, protein: macros.protein, carbs: macros.carbs, fat: macros.fat },
    });
    // Salvataggio → chiusura immediata: la pagina dietro mostra subito i target
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Obiettivo nutrizione"
      actions={
        <>
          <button onClick={onClose} className="text-[17px] text-label-secondary font-medium active:opacity-60">Annulla</button>
          <button
            onClick={apply}
            disabled={!kcal}
            className="text-[17px] text-sky font-semibold active:opacity-60 disabled:opacity-40"
          >
            Applica
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4 py-1">
        {/* Dati automatici (dal profilo + sezione Andamento) — sola lettura */}
        <section>
          <p className="text-[13px] font-semibold text-label-secondary uppercase tracking-wide mb-2">I tuoi dati</p>
          <div className="card p-3.5">
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { label: 'Età', value: age ? `${age}` : '—', unit: 'anni' },
                { label: 'Peso', value: weightKg ? `${weightKg}` : '—', unit: 'kg' },
                { label: 'Altezza', value: heightCm ? `${heightCm}` : '—', unit: 'cm' },
                { label: 'Sesso', value: 'M', unit: '' },
              ].map((d) => (
                <div key={d.label} className="bg-white/[0.05] rounded-xl py-2 px-1">
                  <p className="text-[15px] font-semibold text-label tabular-nums leading-tight">
                    {d.value}
                    {d.unit && <span className="text-[9.5px] text-label-tertiary font-normal"> {d.unit}</span>}
                  </p>
                  <p className="text-[9.5px] text-label-tertiary mt-0.5">{d.label}</p>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-label-tertiary mt-2.5 flex items-center gap-1">
              <PencilLine size={11} className="shrink-0" />
              Dati letti automaticamente dal profilo e dalle misure di Andamento
            </p>
          </div>

          <p className="text-[13px] text-label-secondary mb-2 mt-3">Attività fisica</p>
          <div className="flex flex-col gap-1">
            {ACTIVITY_LEVELS.map((a) => (
              <button
                key={a.id}
                onClick={() => setActivity(a.id)}
                className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl text-left min-h-11', activity === a.id ? 'bg-accent/15' : 'bg-white/[0.05] active:bg-white/[0.09]')}
              >
                <span className={cn('w-[18px] h-[18px] rounded-full border-2 grid place-items-center shrink-0', activity === a.id ? 'border-sky' : 'border-label-quaternary')}>
                  {activity === a.id && <span className="w-2.5 h-2.5 rounded-full bg-sky" />}
                </span>
                <span className="text-[14px] text-label">{a.label}</span>
                <span className="ml-auto text-[12px] text-label-tertiary shrink-0">×{a.factor}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Obiettivo */}
        <section>
          <p className="text-[13px] font-semibold text-label-secondary uppercase tracking-wide mb-2">Obiettivo di peso</p>
          <div className="flex flex-col gap-1 mb-2">
            {GOALS.map((g) => (
              <button
                key={g.id}
                onClick={() => { setGoal(g.id); if (g.id === 'gain') setPace('standard'); if (g.id === 'lose') setPace('moderate'); }}
                className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl text-left min-h-11', goal === g.id ? 'bg-accent/15' : 'bg-white/[0.05] active:bg-white/[0.09]')}
              >
                <span className={cn('w-[18px] h-[18px] rounded-full border-2 grid place-items-center shrink-0', goal === g.id ? 'border-sky' : 'border-label-quaternary')}>
                  {goal === g.id && <span className="w-2.5 h-2.5 rounded-full bg-sky" />}
                </span>
                <span className="text-[14px] text-label">{g.label}</span>
                <span className="ml-auto text-[12px] text-label-tertiary shrink-0">{g.range}</span>
              </button>
            ))}
          </div>

          {goal === 'gain' && (
            <>
              <p className="text-[13px] text-label-secondary mb-2">Ritmo di aumento</p>
              <div className="grid grid-cols-3 gap-1.5">
                {GAIN_PACES.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPace(p.id)}
                    className={cn('rounded-xl px-1 py-2 text-center min-h-14', pace === p.id ? 'bg-accent text-white' : 'bg-white/[0.05] text-label-secondary')}
                  >
                    <span className="block text-[12px] font-semibold">{p.label}</span>
                    <span className={cn('block text-[10px]', pace === p.id ? 'text-white/70' : 'text-label-tertiary')}>+{p.surplus} kcal</span>
                  </button>
                ))}
              </div>
            </>
          )}
          {goal === 'lose' && (
            <div className="grid grid-cols-2 gap-1.5">
              {LOSE_PACES.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPace(p.id)}
                  className={cn('rounded-xl px-1 py-2 text-center min-h-14', pace === p.id ? 'bg-accent text-white' : 'bg-white/[0.05] text-label-secondary')}
                >
                  <span className="block text-[12px] font-semibold">{p.label}</span>
                  <span className={cn('block text-[10px]', pace === p.id ? 'text-white/70' : 'text-label-tertiary')}>{p.delta} kcal</span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Risultato (calcolato o override manuale) */}
        {bmr && tdeeValue && kcal && macros && (
          <section className="card p-4">
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="bg-white/[0.05] rounded-xl p-2 text-center">
                <Flame size={13} className="mx-auto text-sys-orange mb-1" />
                <p className="text-[16px] font-semibold text-label tabular-nums">{bmr}</p>
                <p className="text-[10px] text-label-tertiary">BMR</p>
              </div>
              <div className="bg-white/[0.05] rounded-xl p-2 text-center">
                <Target size={13} className="mx-auto text-sky mb-1" />
                <p className="text-[16px] font-semibold text-label tabular-nums">{tdeeValue}</p>
                <p className="text-[10px] text-label-tertiary">TDEE</p>
              </div>
              <div className="bg-white/[0.05] rounded-xl p-2 text-center">
                <Scale size={13} className="mx-auto text-sys-green mb-1" />
                <p className="text-[16px] font-semibold text-label tabular-nums">{kcal}</p>
                <p className="text-[10px] text-label-tertiary">Target kcal</p>
              </div>
            </div>

            {goal !== 'maintain' && !isManual && (
              <p className="text-[12px] text-label-secondary mb-3">
                {goal === 'gain' ? 'Surplus' : 'Deficit'} di {Math.abs(delta)} kcal/giorno → circa {weekly} kg/settimana.
                {goal === 'gain' && ' Parti da +200/+250 e aggiusta in base alla bilancia dopo 2–3 settimane.'}
              </p>
            )}

            <p className="text-[13px] font-semibold text-label-secondary mb-2">Macro suggeriti (target)</p>
            <div className="flex items-center gap-2">
              {[
                { label: 'Proteine', value: macros.protein, unit: 'g', color: '#30d158' },
                { label: 'Carboidrati', value: macros.carbs, unit: 'g', color: '#ffd60a' },
                { label: 'Grassi', value: macros.fat, unit: 'g', color: '#ff375f' },
              ].map((m) => (
                <div key={m.label} className="flex-1 bg-white/[0.05] rounded-xl py-2 px-1 text-center">
                  <span className="block text-[16px] font-semibold text-label tabular-nums">{m.value}<span className="text-[10px] text-label-tertiary"> {m.unit}</span></span>
                  <span className="block text-[9.5px] text-label-tertiary leading-tight mt-0.5">{m.label}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* OVERRIDE manuale dell'obiettivo — aggiorna macro e kcal al volo */}
        <section className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <PencilLine size={14} className="text-sky shrink-0" />
            <p className="text-[13px] font-semibold text-label-secondary uppercase tracking-wide">Obiettivo manuale</p>
          </div>
          <p className="text-[11.5px] text-label-tertiary leading-relaxed mb-3">
            Sostituisci il valore calcolato: macro e calorie giornaliere si aggiornano subito.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              step="10"
              inputMode="numeric"
              value={manualKcal}
              onChange={(e) => setManualKcal(e.target.value)}
              placeholder={computedKcal ? String(computedKcal) : 'es. 3000'}
              aria-label="Obiettivo kcal manuale"
              className="flex-1 min-w-0 bg-surface-2 rounded-xl px-4 h-12 text-[20px] font-semibold text-label tabular-nums placeholder:text-label-tertiary text-center"
            />
            <span className="text-[13px] text-label-tertiary shrink-0">kcal</span>
          </div>
          {isManual && macros && (
            <p className="text-[12px] text-sky mt-2.5 tabular-nums">
              Override attivo: {manualMacros} kcal dai macro (P {macros.protein} · C {macros.carbs} · G {macros.fat})
            </p>
          )}
        </section>
      </div>
    </Dialog>
  );
}
