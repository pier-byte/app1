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
            className="fixed z-50 bg-surface-dialog backdrop-blur-dialog border border-white/[0.12] rounded-[14px] min-w-[200px] overflow-hidden py-1"
            style={{
              top: position?.y ?? '50%',
              right: 'max(16px, calc(50vw - 199px))',
              maxWidth: 'calc(100vw - 32px)',
              boxShadow: '0 20px 60px -10px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255,255,255,0.16)',
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
