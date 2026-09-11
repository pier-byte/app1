import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { useCallback, useRef } from 'react';

/**
 * BottomSheet — Modal dal basso con drag handle, backdrop blur e swipe-to-close.
 * Replica il pattern dei screenshot (03, 07, 08).
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
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-40"
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
            className="fixed bottom-0 left-0 right-0 z-50 bg-surface-1 rounded-t-[14px] flex flex-col"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)', maxHeight }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-2 pb-3 cursor-grab active:cursor-grabbing">
              <div className="w-10 h-1 rounded-full bg-label-quaternary" />
            </div>

            {/* Titolo opzionale */}
            {title && (
              <div className="px-5 pb-3">
                <h3 className="text-lg font-semibold text-label">{title}</h3>
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
