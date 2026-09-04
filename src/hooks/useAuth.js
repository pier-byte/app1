import { useState, useCallback, useEffect } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { HAS_CONVEX } from '../lib/db';

const AUTH_KEY = 'app1_authenticated';

/**
 * Hook per gestione autenticazione PIN.
 * - Con Convex: validazione server-side tramite mutation su env `APP_PIN`.
 * - Senza Convex (modalità demo): confronto locale con VITE_APP_PIN.
 * L'esito positivo viene persistito in localStorage.
 */
export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const validatePin = HAS_CONVEX ? useMutation(api.auth.validatePin) : null;

  // Controlla localStorage al montaggio
  useEffect(() => {
    const stored = localStorage.getItem(AUTH_KEY);
    if (stored === 'true') {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const authenticate = useCallback(
    async (pin) => {
      // 1) Validazione tramite mutation Convex su env APP_PIN
      if (validatePin) {
        try {
          const res = await validatePin({ pin });
          if (res?.ok) {
            localStorage.setItem(AUTH_KEY, 'true');
            setIsAuthenticated(true);
            return true;
          }
          return false;
        } catch (err) {
          console.warn('[Auth] Mutation Convex non disponibile, fallback locale:', err);
        }
      }

      // 2) Fallback locale (modalità demo/offline)
      const correctPin = import.meta.env.VITE_APP_PIN || '123456';
      if (pin === correctPin) {
        localStorage.setItem(AUTH_KEY, 'true');
        setIsAuthenticated(true);
        return true;
      }
      return false;
    },
    [validatePin]
  );

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_KEY);
    setIsAuthenticated(false);
  }, []);

  return { isAuthenticated, isLoading, authenticate, logout };
}
