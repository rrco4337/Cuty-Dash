import { PixelArt } from './PixelArt';

interface IconProps {
  color: string;
  size?: number;
}

const PLAY = ['d......', 'dd.....', 'ddd....', 'dddd...', 'ddddd..', 'dddd...', 'ddd....', 'dd.....', 'd......'];
const PAUSE = Array<string>(9).fill('ddd.ddd');
const PREVIOUS = ['d.....d', 'd....dd', 'd...ddd', 'd..dddd', 'd.ddddd', 'd..dddd', 'd...ddd', 'd....dd', 'd.....d'];
const NEXT = ['d.....d', 'dd....d', 'ddd...d', 'dddd..d', 'ddddd.d', 'dddd..d', 'ddd...d', 'dd....d', 'd.....d'];

const icon = (rows: string[]) =>
  function Icon({ color, size = 3 }: IconProps) {
    return <PixelArt rows={rows} palette={{ d: color }} size={size} />;
  };

export const PlayIcon = icon(PLAY);
export const PauseIcon = icon(PAUSE);
export const PreviousIcon = icon(PREVIOUS);
export const NextIcon = icon(NEXT);
