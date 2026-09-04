import { useState, useCallback, useEffect } from 'react';

const AUTH_KEY = 'app1_authenticated';

/**
 * Hook per gestione autenticazione PIN.
 * Valida il PIN contro la variabile d'ambiente e persiste in localStorage.
 */
export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Controlla localStorage al montaggio
  useEffect(() => {
    const stored = localStorage.getItem(AUTH_KEY);
    if (stored === 'true') {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const authenticate = useCallback(async (pin) => {
    // Validazione locale contro env var
    // In produzione, usare la mutation Convex per validare server-side
    const correctPin = import.meta.env.VITE_APP_PIN || '123456';

    if (pin === correctPin) {
      localStorage.setItem(AUTH_KEY, 'true');
      setIsAuthenticated(true);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_KEY);
    setIsAuthenticated(false);
  }, []);

  return { isAuthenticated, isLoading, authenticate, logout };
}
