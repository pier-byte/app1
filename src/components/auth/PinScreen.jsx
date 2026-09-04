import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Delete } from 'lucide-react';
import { HAS_CONVEX } from '../../lib/db';

/**
 * PinScreen — Schermata PIN a 6 cifre al primo avvio.
 * Design iOS: 6 dot, tastierino numerico circolare, logo in alto.
 * Validazione: mutation Convex su env APP_PIN (o fallback locale in demo).
 */
export default function PinScreen({ onAuthenticate }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const hasConvex = HAS_CONVEX;
  const demoPin = import.meta.env.VITE_APP_PIN || '123456';

  const handleDigit = useCallback(async (digit) => {
    if (pin.length >= 6 || isChecking) return;

    const newPin = pin + digit;
    setPin(newPin);
    setError(false);

    if (newPin.length === 6) {
      setIsChecking(true);
      const success = await onAuthenticate(newPin);
      if (!success) {
        setError(true);
        setTimeout(() => {
          setPin('');
          setError(false);
          setIsChecking(false);
        }, 600);
      }
    }
  }, [pin, isChecking, onAuthenticate]);

  const handleDelete = useCallback(() => {
    if (isChecking) return;
    setPin((prev) => prev.slice(0, -1));
    setError(false);
  }, [isChecking]);

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

  return (
    <div className="flex flex-col items-center justify-center h-full bg-canvas px-8">
      {/* Logo / Titolo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="mb-8"
      >
        <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mb-4 mx-auto">
          <span className="text-white font-bold text-xl">a1</span>
        </div>
        <h1 className="text-xl font-semibold text-label text-center tracking-tight">
          Inserisci il PIN
        </h1>
        <p className="text-sm text-label-secondary text-center mt-1">
          {error ? 'PIN errato, riprova' : '6 cifre per accedere'}
        </p>
      </motion.div>

      {/* Dot indicators */}
      <div className={`flex gap-4 mb-12 ${error ? 'shake' : ''}`}>
        {Array.from({ length: 6 }).map((_, i) => (
          <motion.div
            key={i}
            className={`pin-dot ${i < pin.length ? 'filled' : ''}`}
            animate={i < pin.length ? { scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 0.15 }}
          />
        ))}
      </div>

      {/* Tastierino numerico */}
      <div className="grid grid-cols-3 gap-4 w-full max-w-[280px]">
        {digits.map((digit, i) => {
          if (digit === '') {
            return <div key={i} />;
          }

          if (digit === 'del') {
            return (
              <button
                key={i}
                onClick={handleDelete}
                className="flex items-center justify-center w-[72px] h-[72px] mx-auto rounded-full active:bg-surface-2 transition-colors"
              >
                <Delete size={24} className="text-label" />
              </button>
            );
          }

          return (
            <motion.button
              key={i}
              onClick={() => handleDigit(digit)}
              whileTap={{ scale: 0.92 }}
              className="flex items-center justify-center w-[72px] h-[72px] mx-auto rounded-full bg-surface-2 text-label text-2xl font-light active:bg-surface-3 transition-colors"
            >
              {digit}
            </motion.button>
          );
        })}
      </div>

      {/* Hint demo quando Convex non è configurato */}
      {!hasConvex && (
        <p className="text-[12px] text-label-tertiary mt-8">
          Modalità demo · PIN: {demoPin}
        </p>
      )}

      {/* Supporto tastiera fisica (desktop) */}
      <KeyboardInput onDigit={handleDigit} onDelete={handleDelete} />
    </div>
  );
}

function KeyboardInput({ onDigit, onDelete }) {
  useEffect(() => {
    const handler = (e) => {
      if (/^[0-9]$/.test(e.key)) onDigit(e.key);
      else if (e.key === 'Backspace') onDelete();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onDigit, onDelete]);
  return null;
}
