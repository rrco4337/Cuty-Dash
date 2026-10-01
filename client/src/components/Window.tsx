import type { ReactNode } from 'react';

interface WindowProps {
  title: string;
  action?: ReactNode; // contenu optionnel à droite de la barre de titre
  className?: string;
  children: ReactNode;
}

// La « fenêtre » rétro qui entoure chaque bloc du dashboard.
export default function Window({ title, action, className = '', children }: WindowProps) {
  return (
    <section className={`window ${className}`}>
      <header className="window-bar">
        <span className="bars" aria-hidden="true">
          <i /><i /><i />
        </span>
        <h2>{title}</h2>
        {action}
      </header>
      <div className="window-body">{children}</div>
    </section>
  );
}
