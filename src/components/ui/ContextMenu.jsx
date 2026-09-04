import { motion, AnimatePresence } from 'framer-motion';

/**
 * ContextMenu — Menu contestuale per task.
 * Replica il pattern dello screenshot 13_menu_gestione_compiti.
 * Azioni: Modifica, Copia, Sposta a domani, Cambia data, Elimina.
 */
export default function ContextMenu({ isOpen, onClose, position, actions = [] }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay trasparente */}
          <div
            className="fixed inset-0 z-40"
            onClick={onClose}
          />

          {/* Menu */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.15 }}
            className="fixed z-50 bg-surface-dialog backdrop-blur-dialog rounded-[12px] min-w-[200px] overflow-hidden shadow-xl py-1"
            style={{
              top: position?.y ?? '50%',
              right: 16,
              maxWidth: 'calc(100vw - 32px)',
            }}
          >
            {actions.map((action, i) => (
              <button
                key={i}
                onClick={() => {
                  action.onClick();
                  onClose();
                }}
                className={`w-full text-left px-4 py-3 text-[15px] active:bg-fill-primary transition-colors ${
                  action.destructive
                    ? 'text-sys-red'
                    : 'text-label'
                }`}
              >
                {action.label}
              </button>
            ))}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
