import { useEffect, useState } from 'react';
import { Minus, Plus, Link2 } from 'lucide-react';
import { Dialog } from '../ui/Dialog';
import { MEAL_TYPES } from '../../lib/constants';
import { kcalFromMacros } from '../../lib/nutritionMath';
import { cn } from '../../lib/cn';

const MACRO_FIELDS = [
  { key: 'protein', label: 'Proteine', color: '#30d158' },
  { key: 'carbs', label: 'Carboidrati', color: '#ffd60a' },
  { key: 'fat', label: 'Grassi', color: '#ff375f' },
];

/**
 * MealEditDialog — Modifica "in-post" di un pasto registrato:
 * descrizione, tipo pasto e macro (grammature) con kcal sempre collegate
 * (regola 4-4-9). Per correggere errori di battitura o valori a posteriori.
 */
export default function MealEditDialog({ meal, onClose, onSave }) {
  const [description, setDescription] = useState('');
  const [mealType, setMealType] = useState('Pranzo');
  const [macros, setMacros] = useState({ protein: 0, carbs: 0, fat: 0 });

  useEffect(() => {
    if (meal) {
      setDescription(meal.description ?? '');
      setMealType(meal.mealType ?? 'Pranzo');
      setMacros({
        protein: meal.protein ?? 0,
        carbs: meal.carbs ?? 0,
        fat: meal.fat ?? 0,
      });
    }
  }, [meal]);

  if (!meal) return null;

  const setMacro = (key, value) => setMacros((m) => ({ ...m, [key]: Math.max(0, Math.round((Number(value) || 0) * 10) / 10) }));
  const kcal = kcalFromMacros(macros);

  const save = () => {
    onSave(meal._id, {
      description: description.trim() || meal.description,
      mealType,
      protein: macros.protein,
      carbs: macros.carbs,
      fat: macros.fat,
      calories: kcal,
      caloriesSource: 'macro',
    });
    onClose();
  };

  return (
    <Dialog
      isOpen
      onClose={onClose}
      title="Modifica pasto"
      actions={
        <>
          <button onClick={onClose} className="text-[17px] text-label-secondary font-medium active:opacity-60">
            Annulla
          </button>
          <button onClick={save} className="text-[17px] text-sky font-semibold active:opacity-60">
            Salva
          </button>
        </>
      }
    >
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full bg-surface-2 rounded-xl px-3 py-3 text-[15px] my-2"
        aria-label="Descrizione pasto"
        placeholder="es. 150g pollo e riso"
      />

      {/* Macro: fonti di verità → kcal aggiornata in automatico */}
      <div className="grid grid-cols-3 gap-2 my-4">
        {MACRO_FIELDS.map((m) => (
          <label key={m.key} className="bg-surface-2 rounded-xl p-2 text-[10px] text-label-tertiary">
            <span className="flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
              {m.label}
            </span>
            <span className="flex items-center gap-1">
              <button
                onClick={() => setMacro(m.key, macros[m.key] - 1)}
                className="w-6 h-8 grid place-items-center text-label-tertiary active:text-sky"
                aria-label={`Riduci ${m.label}`}
              >
                <Minus size={11} />
              </button>
              <input
                type="number"
                min="0"
                value={macros[m.key]}
                onChange={(e) => setMacro(m.key, e.target.value)}
                className="w-full min-w-0 bg-transparent text-[17px] font-semibold text-label text-center"
              />
              <button
                onClick={() => setMacro(m.key, macros[m.key] + 1)}
                className="w-6 h-8 grid place-items-center text-label-tertiary active:text-sky"
                aria-label={`Aumenta ${m.label}`}
              >
                <Plus size={11} />
              </button>
            </span>
          </label>
        ))}
      </div>

      {/* Kcal collegate (sola lettura) */}
      <div className="flex items-center gap-3 bg-surface-2 rounded-xl px-4 py-3 mb-4">
        <Link2 size={16} className="text-sky shrink-0" />
        <p className="flex-1 text-[13px] text-label-secondary">Kcal aggiornate sui macro</p>
        <p className="text-[20px] font-semibold text-label tabular-nums">{kcal}</p>
        <span className="text-[12px] text-label-tertiary">kcal</span>
      </div>

      {/* Tipo pasto */}
      <p className="text-[13px] text-label-secondary mb-2">Tipo pasto</p>
      <div className="flex flex-wrap gap-2 pb-2">
        {MEAL_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => setMealType(type)}
            className={cn(
              'px-3.5 h-9 rounded-full text-[13px] font-medium transition-colors',
              mealType === type ? 'bg-accent text-white' : 'bg-fill-tertiary text-label-secondary active:bg-fill-secondary'
            )}
          >
            {type}
          </button>
        ))}
      </div>
    </Dialog>
  );
}
