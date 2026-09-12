import { motion } from 'framer-motion';
import { ClipboardList } from 'lucide-react';

/**
 * EmptyState — Stato vuoto con illustrazione.
 * Replica il pattern dello screenshot 06 ("Nessuna attività in questo giorno").
 */
export default function EmptyState({ title = 'Nessuna attività', subtitle, icon: Icon = ClipboardList }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.3 }}
      className="flex flex-col items-center justify-center py-16 px-8"
    >
      <div className="w-20 h-20 rounded-[18px] bg-white/[0.06] border border-white/[0.08] flex items-center justify-center mb-4">
        <Icon size={34} className="text-[#8e8e93]" />
      </div>
      <p className="text-[16px] font-medium text-label-secondary text-center">
        {title}
      </p>
      {subtitle && (
        <p className="text-[13px] text-label-tertiary text-center mt-1">
          {subtitle}
        </p>
      )}
    </motion.div>
  );
}
