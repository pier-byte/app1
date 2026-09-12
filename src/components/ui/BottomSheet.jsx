import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { useCallback, useRef } from 'react';

/**
 * BottomSheet — Modal dal basso "Liquid Glass" (ui-references
 * dettaglio_creazione_evento): superficie #1c1c1e traslucida con blur,
 * hairline superiore, drag handle chiaro e swipe-to-close.
 */
export default function BottomSheet({ isOpen, onClose, children, title, maxHeight = '90dvh' }) {
  const handleDragEnd = useCallback((_, info) => {
    if (info.offset.y > 100 || info.velocity.y > 500) {
      onClose();
    }
  }, [onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Scrim frosted (reference: bg-black/65 + blur) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-dialog z-40"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.1}
            onDragEnd={handleDragEnd}
            className="fixed bottom-0 left-0 right-0 z-50 bg-surface-sheet backdrop-blur-dialog rounded-t-[22px] border-t border-x border-white/[0.12] flex flex-col"
            style={{
              paddingBottom: 'env(safe-area-inset-bottom, 16px)',
              maxHeight,
              marginInline: 'auto',
              maxWidth: 430,
              boxShadow: '0 -18px 60px -10px rgba(0, 0, 0, 0.75), inset 0 1px 0 rgba(255,255,255,0.18)',
            }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-2.5 pb-3 cursor-grab active:cursor-grabbing">
              <div className="w-10 h-1 rounded-full bg-white/30" />
            </div>

            {/* Titolo opzionale */}
            {title && (
              <div className="px-5 pb-3">
                <h3 className="text-[19px] font-semibold text-label tracking-tight">{title}</h3>
              </div>
            )}

            {/* Contenuto */}
            <div className="flex-1 overflow-y-auto px-5 pb-4 scrollable">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
