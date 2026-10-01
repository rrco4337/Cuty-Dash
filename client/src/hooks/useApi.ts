import { useEffect, useState } from 'react';
import { ApiError, apiGet } from '../api/client';

export type ApiState<T> =
  | { status: 'loading' }
  | { status: 'anonymous' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: T };

export function useApi<T>(path: string): ApiState<T> {
  const [state, setState] = useState<ApiState<T>>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
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
  }, [path]);

  return state;
}
