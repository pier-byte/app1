import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, Send, AlertCircle } from 'lucide-react';
import { parseFoodInput, hasGemini } from '../../lib/gemini';
import { Dialog } from '../ui/Dialog';
import { cn } from '../../lib/cn';
import { MEAL_TYPES } from '../../lib/constants';

/**
 * AiMealInput — Log macro/calorie tramite prompt testo processato da Gemini AI.
 * Es: "150g pollo e riso" → preview macros → conferma con tipo pasto.
 */
export default function AiMealInput({ onConfirm }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [parsed, setParsed] = useState(null);
  const [mealType, setMealType] = useState('Pranzo');

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
    setParsed({ ...result, original: value });
  };

  const confirm = () => {
    onConfirm({
      mealType,
      description: parsed.description,
      calories: parsed.calories,
      protein: parsed.protein,
      carbs: parsed.carbs,
      fat: parsed.fat,
      parsedByAI: true,
    });
    setParsed(null);
    setText('');
  };

  return (
    <>
      <div className="bg-surface-1 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={16} className="text-accent" />
          <span className="text-[15px] font-semibold text-label">Log rapido con AI</span>
        </div>
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => { setText(e.target.value); setError(null); }}
            placeholder='es. "150g pollo e riso"'
            rows={1}
            className="flex-1 bg-surface-2 rounded-xl px-4 py-3 text-[15px] text-label placeholder:text-label-tertiary resize-none min-h-[44px]"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                analyze();
              }
            }}
          />
          <motion.button
            whileTap={{ scale: 0.9 }}
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
          </motion.button>
        </div>
        {error && (
          <div className="flex items-start gap-2 mt-3">
            <AlertCircle size={14} className="text-sys-orange shrink-0 mt-0.5" />
            <p className="text-[12px] text-sys-orange leading-relaxed">{error}</p>
          </div>
        )}
      </div>

      {/* Preview macros */}
      <AnimatePresence>
        {parsed && (
          <Dialog
            isOpen
            onClose={() => setParsed(null)}
            title="Conferma pasto"
            actions={
              <>
                <button onClick={() => setParsed(null)} className="text-[17px] text-label-secondary font-medium active:opacity-60">
                  Annulla
                </button>
                <button onClick={confirm} className="text-[17px] text-accent font-semibold active:opacity-60">
                  Aggiungi
                </button>
              </>
            }
          >
            <p className="text-[15px] text-label leading-snug py-2">{parsed.description}</p>

            {/* Macro grid */}
            <div className="grid grid-cols-4 gap-2 my-4">
              <MacroTile label="kcal" value={parsed.calories} color="#0a84ff" />
              <MacroTile label="Proteine" value={`${parsed.protein}g`} color="#30d158" />
              <MacroTile label="Carboidrati" value={`${parsed.carbs}g`} color="#ffd60a" />
              <MacroTile label="Grassi" value={`${parsed.fat}g`} color="#ff375f" />
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
        )}
      </AnimatePresence>
    </>
  );
}

function MacroTile({ label, value, color }) {
  return (
    <div className="bg-surface-2 rounded-xl py-3 flex flex-col items-center gap-0.5">
      <span className="text-[17px] font-bold tabular-nums" style={{ color }}>{value}</span>
      <span className="text-[10px] text-label-tertiary">{label}</span>
    </div>
  );
}
