import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';

/**
 * SegmentedControl — Controllo segmentato iOS (fixed width, pill animata).
 */
export default function SegmentedControl({ segments, value, onChange }) {
  return (
    <div className="flex bg-fill-tertiary rounded-[10px] p-0.5">
      {segments.map((seg) => {
        const active = value === seg.id;
        return (
          <button
            key={seg.id}
            onClick={() => onChange(seg.id)}
            className={cn(
              'relative flex-1 h-8 text-[13px] font-medium rounded-[8px] transition-colors',
              active ? 'text-label' : 'text-label-secondary active:text-label'
            )}
          >
            {active && (
              <motion.span
                layoutId="segmentedPill"
                className="absolute inset-0 rounded-[8px] bg-surface-3 shadow-sm"
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              />
            )}
            <span className="relative z-10">{seg.label}</span>
          </button>
        );
      })}
    </div>
  );
}
