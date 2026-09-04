import { useRef, useCallback } from 'react';

/**
 * Hook per gestire gesture swipe orizzontale.
 * Utile per navigare tra settimane o tab.
 *
 * @param {Function} onSwipeLeft - Callback swipe a sinistra (settimana successiva)
 * @param {Function} onSwipeRight - Callback swipe a destra (settimana precedente)
 * @param {number} threshold - Distanza minima in px per triggerare lo swipe
 */
export function useSwipeNavigation(onSwipeLeft, onSwipeRight, threshold = 50) {
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const swiping = useRef(false);

  const onTouchStart = useCallback((e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    swiping.current = true;
  }, []);

  const onTouchEnd = useCallback((e) => {
    if (!swiping.current) return;
    swiping.current = false;

    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;

    // Ignora se il movimento verticale è maggiore (scroll)
    if (Math.abs(deltaY) > Math.abs(deltaX)) return;

    if (deltaX < -threshold) {
      onSwipeLeft?.();
    } else if (deltaX > threshold) {
      onSwipeRight?.();
    }
  }, [onSwipeLeft, onSwipeRight, threshold]);

  return {
    onTouchStart,
    onTouchEnd,
  };
}
