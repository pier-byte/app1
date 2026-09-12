import { useEffect, useState } from 'react';
import { Loader2, Send, AlertCircle, Link2, Minus, Plus } from 'lucide-react';
import { parseFoodInput, hasGemini } from '../../lib/gemini';
import { Dialog } from '../ui/Dialog';
import { kcalFromMacros } from '../../lib/nutritionMath';
import { MEAL_TYPES } from '../../lib/constants';
import { cn } from '../../lib/cn';

const MACRO_FIELDS = [
  { key: 'protein', label: 'Proteine', unit: 'g', color: '#30d158' },
  { key: 'carbs', label: 'Carboidrati', unit: 'g', color: '#ffd60a' },
  { key: 'fat', label: 'Grassi', unit: 'g', color: '#ff375f' },
];

/**
 * MealLogDialog — Registra un alimento (ex AiMealInput):
 * Gemini estrae kcal e macro dal testo libero, oppure inserimento manuale.
 * Le kcal sono SEMPRE collegate ai macro (regola 4-4-9). Il tipo pasto può
 * essere preimpostato dai pulsanti + delle card pasti della pagina Nutrizione.
 */
export default function MealLogDialog({ isOpen, onClose, onConfirm, defaultMealType = 'Pranzo' }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [parsed, setParsed] = useState(null);
  const [mealType, setMealType] = useState(defaultMealType);

  // Reset ad ogni apertura (con tipo pasto richiesto)
  useEffect(() => {
    if (isOpen) {
      setText('');
      setError(null);
      setParsed(null);
      setMealType(defaultMealType);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, defaultMealType]);

  const analyze = async () => {
    const value = text.trim();
    if (!value || loading) return;

    if (!hasGemini) {
      setError('AI non attiva: aggiungi VITE_GEMINI_API_KEY. Puoi inserire i valori manualmente.');
      return;
    }

    setLoading(true);
    setError(null);
    const result = await parseFoodInput(value);
    setLoading(false);

    if (!result) {
      setError('Non riesco a riconoscere questo alimento. Prova a riformulare (es. "150g pollo e riso").');
      return;
    }
    // Le kcal vengono ricalcolate dai macro così i dati restano coerenti
    setParsed({ ...result, calories: kcalFromMacros(result), caloriesSource: 'macro', original: value });
  };

  const setMacro = (key, value) => {
    const next = { ...parsed, [key]: Math.max(0, Number(value) || 0) };
    next.calories = kcalFromMacros(next);
    next.caloriesSource = 'macro';
    setParsed(next);
  };

  const setCaloriesManual = (value) => {
    const k = Math.max(0, Number(value) || 0);
    setParsed({ ...parsed, calories: k, caloriesSource: 'manual' });
  };

  const confirm = () => {
    onConfirm({
      mealType,
      description: parsed.description,
      calories: parsed.calories,
      protein: parsed.protein,
      carbs: parsed.carbs,
      fat: parsed.fat,
      caloriesSource: parsed.caloriesSource || 'macro',
      parsedByAI: true,
    });
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={parsed ? 'Conferma pasto' : 'Registra alimento'}
      actions={
        parsed ? (
          <>
            <button onClick={() => setParsed(null)} className="text-[17px] text-label-secondary font-medium active:opacity-60">
              Indietro
            </button>
            <button onClick={confirm} className="text-[17px] text-sky font-semibold active:opacity-60">
              Aggiungi
            </button>
          </>
        ) : (
          <button onClick={onClose} className="text-[17px] text-label-secondary font-medium active:opacity-60">
            Chiudi
          </button>
        )
      }
    >
      {parsed ? (
        <>
          <input
            value={parsed.description}
            onChange={(e) => setParsed({ ...parsed, description: e.target.value })}
            className="w-full bg-surface-2 rounded-xl px-3 py-3 text-[15px] my-2"
            aria-label="Nome pasto"
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
                    onClick={() => setMacro(m.key, parsed[m.key] - 1)}
                    className="w-6 h-8 grid place-items-center text-label-tertiary active:text-sky"
                    aria-label={`Riduci ${m.label}`}
                  >
                    <Minus size={11} />
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={parsed[m.key]}
                    onChange={(e) => setMacro(m.key, e.target.value)}
                    className="w-full min-w-0 bg-transparent text-[17px] font-semibold text-label text-center"
                  />
                  <button
                    onClick={() => setMacro(m.key, parsed[m.key] + 1)}
                    className="w-6 h-8 grid place-items-center text-label-tertiary active:text-sky"
                    aria-label={`Aumenta ${m.label}`}
                  >
                    <Plus size={11} />
                  </button>
                </span>
              </label>
            ))}
          </div>

          {/* Kcal collegate ai macro */}
          <div className="flex items-center gap-3 bg-surface-2 rounded-xl px-4 py-3 mb-4">
            <Link2 size={16} className="text-sky shrink-0" />
            <p className="flex-1 text-[13px] text-label-secondary">Kcal</p>
            <input
              type="number"
              min="0"
              step="1"
              value={parsed.calories}
              onChange={(e) => setCaloriesManual(e.target.value)}
              className="w-24 bg-transparent text-right text-[20px] font-semibold text-label tabular-nums"
              aria-label="Kcal"
            />
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
        </>
      ) : (
        <>
          <div className="flex items-end gap-2 my-2">
            <textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setError(null);
              }}
              placeholder='es. "150g pollo e riso"'
              rows={2}
              autoFocus
              className="flex-1 bg-surface-2 rounded-xl px-4 py-3 text-[15px] text-label placeholder:text-label-tertiary resize-none min-h-[52px]"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  analyze();
                }
              }}
            />
            <button
              onClick={analyze}
              disabled={!text.trim() || loading}
              className={cn(
                'w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-colors',
                text.trim() && !loading ? 'bg-accent' : 'bg-fill-secondary'
              )}
              aria-label="Analizza con AI"
            >
              {loading ? (
                <Loader2 size={18} className="text-white animate-spin" />
              ) : (
                <Send size={17} className={text.trim() && !loading ? 'text-white' : 'text-label-tertiary'} />
              )}
            </button>
          </div>

          <button
            onClick={() =>
              setParsed({
                description: text.trim() || 'Pasto',
                calories: 0,
                protein: 0,
                carbs: 0,
                fat: 0,
                caloriesSource: 'macro',
                original: text.trim(),
              })
            }
            className="mt-1 text-[13.5px] text-sky font-semibold min-h-9"
          >
            Inserisci kcal e macro manualmente
          </button>

          {error && (
            <div className="flex items-start gap-2 mt-3">
              <AlertCircle size={14} className="text-sys-orange shrink-0 mt-0.5" />
              <p className="text-[12px] text-sys-orange leading-relaxed">{error}</p>
            </div>
          )}

          {/* Tipo pasto (preimpostato dalle card) */}
          <p className="text-[13px] text-label-secondary mt-4 mb-2">Tipo pasto</p>
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
        </>
      )}
    </Dialog>
  );
}
