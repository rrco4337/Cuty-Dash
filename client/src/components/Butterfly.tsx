import type { CSSProperties } from 'react';

interface ButterflyProps {
  size: 1 | 2; // 1 = 28×31 px, 2 = 56×62 px
  top: number | string; // position absolue : le parent doit être en `position: relative`
  left: number | string;
  delay?: number; // en secondes : décale le battement pour deux papillons voisins
}

const SIZES = { 1: { width: 28, height: 31 }, 2: { width: 56, height: 62 } };

export default function Butterfly({ size, top, left, delay = 0 }: ButterflyProps) {
  const style: CSSProperties = { top, left, ...SIZES[size], animationDelay: `${delay}s` };
  return <img className="butterfly" src="/sprites/butterfly.png" alt="" style={style} />;
}
