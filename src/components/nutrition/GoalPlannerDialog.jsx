import { useMemo, useState } from 'react';
import { Target, Scale, Flame } from 'lucide-react';
import { Dialog } from '../ui/Dialog';
import {
  ACTIVITY_LEVELS, GOALS, GAIN_PACES, LOSE_PACES,
  bmrMifflin, tdee, targetKcal, suggestMacros, proteinTarget,
  expectedWeeklyChange, kcalFromMacros,
} from '../../lib/nutritionMath';
import { cn } from '../../lib/cn';

/**
 * GoalPlannerDialog — Calcola BMR/TDEE (Mifflin-St Jeor), obiettivo di peso
 * (mantenere / aumentare / diminuire) e i macro giornalieri suggeriti.
 * "Applica" salva i target usati dalla pagina Nutrizione.
 */
export default function GoalPlannerDialog({ isOpen, onClose, onApply, initial }) {
  const [sex, setSex] = useState(initial?.sex || 'female');
  const [age, setAge] = useState(initial?.age || 15);
  const [weightKg, setWeightKg] = useState(initial?.weightKg || '');
  const [heightCm, setHeightCm] = useState(initial?.heightCm || '');
  const [activity, setActivity] = useState(initial?.activity || 'moderate');
  const [goal, setGoal] = useState(initial?.goal || 'gain');
  const [pace, setPace] = useState(initial?.pace || 'standard');

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

  const kcal = useMemo(() => targetKcal(tdeeValue, goal, Math.abs(delta)), [tdeeValue, goal, delta]);
  const macros = useMemo(() => suggestMacros({ targetKcalValue: kcal, weightKg: Number(weightKg), goal }), [kcal, weightKg, goal]);
  const weekly = useMemo(() => expectedWeeklyChange(delta), [delta]);
  const protein = proteinTarget(Number(weightKg), goal);

  const apply = () => {
    if (!kcal || !macros) return;
    onApply({
      profile: { sex, age: Number(age), weightKg: Number(weightKg), heightCm: Number(heightCm), activity, goal, pace },
      goals: { calories: kcal, protein: macros.protein, carbs: macros.carbs, fat: macros.fat },
    });
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
            className="text-[17px] text-accent font-semibold active:opacity-60 disabled:opacity-40"
          >
            Applica
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4 py-1">
        {/* Profilo */}
        <section>
          <p className="text-[13px] font-semibold text-label-secondary uppercase tracking-wide mb-2">Profilo</p>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <label className="bg-surface-2 rounded-xl px-3 py-2 text-[10px] text-label-tertiary">
              Età
              <input type="number" min="10" max="90" value={age || ''} onChange={(e) => setAge(e.target.value)} className="w-full bg-transparent text-[16px] font-semibold text-label" inputMode="numeric" />
            </label>
            <label className="bg-surface-2 rounded-xl px-3 py-2 text-[10px] text-label-tertiary">
              Peso (kg)
              <input type="number" min="20" max="300" step="0.1" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} className="w-full bg-transparent text-[16px] font-semibold text-label" inputMode="decimal" placeholder="54" />
            </label>
            <label className="bg-surface-2 rounded-xl px-3 py-2 text-[10px] text-label-tertiary">
              Altezza (cm)
              <input type="number" min="50" max="250" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} className="w-full bg-transparent text-[16px] font-semibold text-label" inputMode="numeric" placeholder="165" />
            </label>
            <div className="bg-surface-2 rounded-xl px-3 py-2 text-[10px] text-label-tertiary">
              Sesso
              <div className="flex gap-1 mt-1">
                {['female', 'male'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSex(s)}
                    className={cn('h-8 flex-1 rounded-lg text-[12px] font-semibold', sex === s ? 'bg-accent text-white' : 'bg-fill-tertiary text-label-secondary')}
                  >
                    {s === 'female' ? 'F' : 'M'}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <p className="text-[13px] text-label-secondary mb-2">Attività fisica</p>
          <div className="flex flex-col gap-1">
            {ACTIVITY_LEVELS.map((a) => (
              <button
                key={a.id}
                onClick={() => setActivity(a.id)}
                className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl text-left', activity === a.id ? 'bg-accent/15' : 'bg-surface-2 active:bg-surface-3')}
              >
                <span className={cn('w-[18px] h-[18px] rounded-full border-2 grid place-items-center shrink-0', activity === a.id ? 'border-accent' : 'border-label-quaternary')}>
                  {activity === a.id && <span className="w-2.5 h-2.5 rounded-full bg-accent" />}
                </span>
                <span className="text-[14px] text-label">{a.label}</span>
                <span className="ml-auto text-[12px] text-label-tertiary">×{a.factor}</span>
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
                className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl text-left', goal === g.id ? 'bg-accent/15' : 'bg-surface-2 active:bg-surface-3')}
              >
                <span className={cn('w-[18px] h-[18px] rounded-full border-2 grid place-items-center shrink-0', goal === g.id ? 'border-accent' : 'border-label-quaternary')}>
                  {goal === g.id && <span className="w-2.5 h-2.5 rounded-full bg-accent" />}
                </span>
                <span className="text-[14px] text-label">{g.label}</span>
                <span className="ml-auto text-[12px] text-label-tertiary">{g.range}</span>
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
                    className={cn('rounded-xl px-1 py-2 text-center', pace === p.id ? 'bg-accent text-white' : 'bg-surface-2 text-label-secondary')}
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
                  className={cn('rounded-xl px-1 py-2 text-center', pace === p.id ? 'bg-accent text-white' : 'bg-surface-2 text-label-secondary')}
                >
                  <span className="block text-[12px] font-semibold">{p.label}</span>
                  <span className={cn('block text-[10px]', pace === p.id ? 'text-white/70' : 'text-label-tertiary')}>{p.delta} kcal</span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Risultato */}
        {bmr && tdeeValue && kcal && (
          <section className="bg-surface-1 rounded-2xl p-4">
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="bg-surface-2 rounded-xl p-2 text-center">
                <Flame size={13} className="mx-auto text-sys-orange mb-1" />
                <p className="text-[16px] font-bold text-label tabular-nums">{bmr}</p>
                <p className="text-[10px] text-label-tertiary">BMR</p>
              </div>
              <div className="bg-surface-2 rounded-xl p-2 text-center">
                <Target size={13} className="mx-auto text-accent mb-1" />
                <p className="text-[16px] font-bold text-label tabular-nums">{tdeeValue}</p>
                <p className="text-[10px] text-label-tertiary">TDEE</p>
              </div>
              <div className="bg-surface-2 rounded-xl p-2 text-center">
                <Scale size={13} className="mx-auto text-sys-green mb-1" />
                <p className="text-[16px] font-bold text-label tabular-nums">{kcal}</p>
                <p className="text-[10px] text-label-tertiary">Target kcal</p>
              </div>
            </div>

            {goal !== 'maintain' && (
              <p className="text-[12px] text-label-secondary mb-3">
                {goal === 'gain' ? 'Surplus' : 'Deficit'} di {Math.abs(delta)} kcal/giorno → circa {weekly} kg/settimana.
                {goal === 'gain' && ' Parti da +200/+250 e aggiusta in base alla bilancia dopo 2–3 settimane.'}
              </p>
            )}

            <p className="text-[13px] font-semibold text-label-secondary mb-2">Macro suggeriti (target)</p>
            <div className="flex items-center gap-2">
              {[
                { label: 'Proteine', value: macros.protein, unit: 'g', color: '#30d158', note: protein ? `${protein} g (1,6–2 g/kg)` : '' },
                { label: 'Carboidrati', value: macros.carbs, unit: 'g', color: '#ffd60a', note: 'il resto delle kcal' },
                { label: 'Grassi', value: macros.fat, unit: 'g', color: '#ff375f', note: '~28% kcal' },
              ].map((m) => (
                <div key={m.label} className="flex-1 bg-surface-2 rounded-xl py-2 px-1 text-center">
                  <span className="block text-[16px] font-bold text-label tabular-nums">{m.value}<span className="text-[10px] text-label-tertiary"> {m.unit}</span></span>
                  <span className="block text-[9.5px] text-label-tertiary leading-tight mt-0.5">{m.label}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-label-tertiary mt-2 text-center tabular-nums">
              Verifica: P·4 + C·4 + G·9 = {kcalFromMacros(macros)} kcal ≈ {kcal} kcal
            </p>
          </section>
        )}
      </div>
    </Dialog>
  );
}
