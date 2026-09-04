import { motion, AnimatePresence } from 'framer-motion';

/**
 * Dialog — Modale centrato con backdrop blur (stile iOS).
 * Replica il pattern degli screenshot (05, 10, 11).
 */
export default function Dialog({ isOpen, onClose, title, children, actions }) {
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
            className="fixed inset-0 bg-black/50 backdrop-blur-dialog z-50"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            className="fixed inset-x-6 top-1/2 -translate-y-1/2 z-50 bg-surface-dialog rounded-[14px] overflow-hidden max-h-[80vh] flex flex-col"
          >
            {/* Titolo */}
            {title && (
              <div className="px-5 pt-5 pb-2">
                <h3 className="text-[17px] font-semibold text-label">{title}</h3>
              </div>
            )}

            {/* Contenuto scrollabile */}
            <div className="flex-1 overflow-y-auto px-5 pb-4 scrollable">
              {children}
            </div>

            {/* Azioni (Annulla / Conferma) */}
            {actions && (
              <div className="flex items-center justify-end gap-6 px-5 py-4 border-t border-separator">
                {actions}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
