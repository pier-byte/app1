/**
 * Toggle — Switch iOS-style.
 * Usato per "Tutto il giorno" e altre opzioni booleane.
 */
export default function Toggle({ value, onChange, disabled = false }) {
  return (
    <button
      role="switch"
      aria-checked={value}
      disabled={disabled}
      onClick={() => onChange(!value)}
      className={`toggle-track ${value ? 'active' : ''} ${disabled ? 'opacity-40' : ''}`}
    >
      <div className="toggle-thumb" />
    </button>
  );
}
