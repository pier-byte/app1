import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';

/**
 * FAB — Floating Action Button circolare blu.
 * Posizionato in basso a destra, sopra la BottomNav.
 */
export default function FAB({ onClick, icon: Icon = Plus, label = 'Aggiungi' }) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.05 }}
      className="fixed right-5 z-30 w-14 h-14 rounded-full bg-accent flex items-center justify-center shadow-lg shadow-accent/30 active:bg-accent-pressed transition-colors"
      style={{ bottom: 'calc(80px + env(safe-area-inset-bottom, 8px) + 16px)' }}
      aria-label={label}
    >
      <Icon size={24} className="text-white" strokeWidth={2.5} />
    </motion.button>
  );
}
