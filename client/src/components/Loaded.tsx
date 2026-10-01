import type { ReactNode } from 'react';
import type { ApiState } from '../hooks/useApi';

interface LoadedProps<T> {
  state: ApiState<T>;
  children: (data: T) => ReactNode; // appelé uniquement quand les données sont prêtes
}

// Affiche « chargement » / erreur, ou le contenu quand les données sont là.
export default function Loaded<T>({ state, children }: LoadedProps<T>) {
  if (state.status === 'loading') return <p className="hint">Chargement…</p>;
  if (state.status === 'anonymous') return <p className="error">Session expirée, recharge la page.</p>;
  if (state.status === 'error') return <p className="error">{state.message}</p>;
  return <>{children(state.data)}</>;
}
