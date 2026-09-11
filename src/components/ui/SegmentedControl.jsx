import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';

/**
 * SegmentedControl — Controllo segmentato iOS su vetro (bg white/8),
 * pill scura slideante per la voce attiva (pattern sub-nav frosted).
 */
export default function SegmentedControl({ segments, value, onChange }) {
  return (
    <div className="flex bg-white/[0.08] border border-white/[0.06] rounded-[12px] p-0.5">
      {segments.map((seg) => {
        const active = value === seg.id;
        return (
          <button
            key={seg.id}
            onClick={() => onChange(seg.id)}
            className={cn(
              'relative flex-1 h-8 text-[13px] font-medium rounded-[10px] transition-colors',
              active ? 'text-label font-semibold' : 'text-[#9a9aa0] active:text-label'
            )}
          >
            {active && (
              <motion.span
                layoutId="segmentedPill"
                className="absolute inset-0 rounded-[10px] bg-white/[0.14] border border-white/[0.08]"
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
