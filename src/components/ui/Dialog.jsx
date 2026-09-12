import { motion, AnimatePresence } from 'framer-motion';

/**
 * Dialog — Modale centrato Liquid Glass (stile ui-references):
 * vetro scuro traslucido + blur, hairline chiara, raggio 20px.
 * Replica il pattern degli screenshot (05, 10, 11).
 */
function Dialog({ isOpen, onClose, title, children, actions }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay con blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/55 backdrop-blur-dialog z-50"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ type: 'spring', damping: 26, stiffness: 400 }}
            className="fixed inset-x-5 top-1/2 -translate-y-1/2 z-50 mx-auto max-w-[398px] bg-surface-dialog backdrop-blur-dialog border border-white/[0.12] rounded-[20px] overflow-hidden max-h-[80vh] flex flex-col"
            style={{ boxShadow: '0 24px 70px -10px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255,255,255,0.16)' }}
          >
            {/* Titolo */}
            {title && (
              <div className="px-5 pt-5 pb-2">
                <h3 className="text-[17px] font-semibold text-label tracking-tight">{title}</h3>
              </div>
            )}

            {/* Contenuto scrollabile */}
            <div className="flex-1 overflow-y-auto px-5 pb-4 scrollable">
              {children}
            </div>

            {/* Azioni (Annulla / Conferma) */}
            {actions && (
              <div className="flex items-center justify-end gap-6 px-5 py-4 border-t border-white/[0.08]">
                {actions}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export { Dialog };
export default Dialog;
