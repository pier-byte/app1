import { useEffect, useState } from 'react';
import { todayKey as readTodayKey } from '../lib/dates';

/**
 * useDeviceClock — chiave del giorno corrente (YYYY-MM-DD) letta SEMPRE
 * dall'orologio locale del dispositivo e aggiornata automaticamente quando
 * cambia la data (mezzanotte passata con l'app aperta), al ritorno in
 * foreground (visibilitychange/focus) o ogni 30s.
 *
 * Evita i classici bug di offset UTC: nessuna parsing di stringhe ISO come
 * date UTC (`new Date("YYYY-MM-DD")`) e nessun valore cacheato stale —
 * ogni componente che mostra "oggi" si sottoscrive qui e si allinea
 * all'orologio di sistema Android/iOS.
 */
export function useDeviceClock() {
  const [key, setKey] = useState(readTodayKey);

  useEffect(() => {
    let alive = true;
    const sync = () => {
      if (!alive) return;
      const next = readTodayKey();
      setKey((prev) => (prev === next ? prev : next));
    };
    const interval = setInterval(sync, 30000);
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('focus', sync);
    return () => {
      alive = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('focus', sync);
    };
  }, []);

  return key;
}

export default useDeviceClock;
