import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, apiGet } from '../api/client';

export type ApiState<T> =
  | { status: 'loading' }
  | { status: 'anonymous' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: T };

// Charge `path` au montage et à chaque changement de `path`.
// - refreshMs : recharge automatiquement toutes les X ms (sans repasser par « loading »)
// - reload    : recharge à la demande
export function useApi<T>(path: string, refreshMs?: number) {
  const [state, setState] = useState<ApiState<T>>({ status: 'loading' });
  const [reloadCount, setReloadCount] = useState(0);
  const loadedPath = useRef<string | null>(null);

  const reload = useCallback(() => setReloadCount((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    // On n'affiche « loading » que quand l'adresse change, pas à chaque rechargement.
    if (loadedPath.current !== path) {
      loadedPath.current = path;
      setState({ status: 'loading' });
    }
    apiGet<T>(path)
      .then((data) => {
        if (!cancelled) setState({ status: 'ready', data });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 401) {
          setState({ status: 'anonymous' });
        } else {
          setState({
            status: 'error',
            message: error instanceof Error ? error.message : 'Erreur inconnue',
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [path, reloadCount]);

  useEffect(() => {
    if (!refreshMs) return;
    const id = setInterval(reload, refreshMs);
    return () => clearInterval(id);
  }, [refreshMs, reload]);

  return { ...state, reload };
}
