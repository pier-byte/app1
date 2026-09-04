import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Hook per timer generico con pause, usato per studio e routine.
 * @param {number} initialSeconds - Durata iniziale in secondi (0 = contatore crescente)
 * @param {boolean} countDown - Se true conta all'indietro, altrimenti in avanti
 */
export function useTimer(initialSeconds = 0, countDown = false) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);
  const elapsedRef = useRef(0);

  const tick = useCallback(() => {
    setSeconds((prev) => {
      if (countDown) {
        if (prev <= 0) {
          clearInterval(intervalRef.current);
          setIsRunning(false);
          return 0;
        }
        return prev - 1;
      }
      return prev + 1;
    });
  }, [countDown]);

  const start = useCallback(() => {
    if (isRunning && !isPaused) return;

    setIsRunning(true);
    setIsPaused(false);
    startTimeRef.current = Date.now();
    intervalRef.current = setInterval(tick, 1000);
  }, [isRunning, isPaused, tick]);

  const pause = useCallback(() => {
    if (!isRunning || isPaused) return;

    clearInterval(intervalRef.current);
    setIsPaused(true);
    elapsedRef.current += (Date.now() - startTimeRef.current) / 1000;
  }, [isRunning, isPaused]);

  const resume = useCallback(() => {
    if (!isPaused) return;

    setIsPaused(false);
    startTimeRef.current = Date.now();
    intervalRef.current = setInterval(tick, 1000);
  }, [isPaused, tick]);

  const reset = useCallback(() => {
    clearInterval(intervalRef.current);
    setSeconds(initialSeconds);
    setIsRunning(false);
    setIsPaused(false);
    elapsedRef.current = 0;
  }, [initialSeconds]);

  const stop = useCallback(() => {
    clearInterval(intervalRef.current);
    setIsRunning(false);
    setIsPaused(false);
    const totalElapsed = elapsedRef.current + (startTimeRef.current ? (Date.now() - startTimeRef.current) / 1000 : 0);
    return Math.round(totalElapsed);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return {
    seconds,
    isRunning,
    isPaused,
    start,
    pause,
    resume,
    reset,
    stop,
  };
}
