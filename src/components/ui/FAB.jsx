import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';

/**
 * FAB — Azione primaria circolare (DESIGN.md button-primary: Action Blue pill
 * + glow del reference). Ancorato al frame smartphone (non al viewport).
 */
export default function FAB({ onClick, icon: Icon = Plus, label = 'Aggiungi' }) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.92 }}
      whileHover={{ scale: 1.05 }}
      className="fixed z-30 shrink-0 w-14 h-14 rounded-full bg-accent border border-blue-400/30 flex items-center justify-center shadow-lg shadow-blue-600/40 active:bg-accent-pressed transition-colors"
      style={{
        bottom: 'calc(var(--bottom-nav-h, 78px) + env(safe-area-inset-bottom, 8px) + 20px)',
        right: 'max(20px, calc(50vw - 195px))',
      }}
      aria-label={label}
    >
      <Icon size={24} className="text-white" strokeWidth={2.5} />
    </motion.button>
  );
}
