import { motion, AnimatePresence } from 'framer-motion';

/**
 * LiquidDialog — Modale centrato "Liquid Glass" (ui-references: time_picker,
 * date_picker, creazione_elenco): card in vetro scuro con blur, bordo chiaro,
 * specular highlight e ombra profonda. Footer opzionale Annulla/Conferma.
 * Il wrapper esterno gestisce il centraggio (il transform di motion non lo tocca).
 */
export default function LiquidDialog({ isOpen, onClose, title, titleRight, children, footer, maxWidth = 358 }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Scrim con blur profondo (come i reference) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/65 backdrop-blur-dialog z-50"
          />
          <div className="fixed inset-x-5 top-1/2 -translate-y-1/2 z-50 flex justify-center pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 28, stiffness: 380 }}
              role="dialog"
              aria-modal="true"
              className="liquid-glass liquid-specular relative w-full rounded-[28px] overflow-hidden flex flex-col pointer-events-auto"
              style={{ maxWidth }}
            >
              {/* Riflessione radiale superiore */}
              <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />

              {title !== undefined && (
                <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
                  <h2 className="text-[19px] font-semibold tracking-tight text-label">{title}</h2>
                  {titleRight}
                </div>
              )}

              <div className="flex-1 min-h-0 overflow-y-auto scrollable px-5">{children}</div>

              {footer && (
                <div className="pt-3.5 pb-5 px-5 mt-3 border-t border-white/10 flex items-center justify-between gap-3">{footer}</div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

/** Bottoni standard del footer: Annulla (ghost) + Conferma (pill blu). */
export function LiquidFooterActions({ onCancel, onConfirm, confirmLabel = 'Conferma', confirmDisabled = false }) {
  return (
    <>
      <button
        onClick={onCancel}
        className="flex-1 py-2.5 px-4 rounded-full text-[15px] font-medium text-white/70 hover:text-white hover:bg-white/5 active:scale-95 transition-all"
      >
        Annulla
      </button>
      <button
        onClick={onConfirm}
        disabled={confirmDisabled}
        className="flex-1 py-2.5 px-5 rounded-full bg-accent hover:bg-accent-hover active:scale-95 text-white text-[15px] font-semibold shadow-lg shadow-blue-500/30 border border-blue-400/30 transition-all disabled:opacity-40 disabled:active:scale-100"
      >
        {confirmLabel}
      </button>
    </>
  );
}
