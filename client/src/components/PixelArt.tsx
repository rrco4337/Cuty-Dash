interface PixelArtProps {
  rows: string[];
  palette: Record<string, string>;
  size: number;
  className?: string;
}

// '.' = transparent; every other char is looked up in the palette.
function PixelArt({ rows, palette, size, className }: PixelArtProps) {
  const width = Math.max(...rows.map((r) => r.length));
  return (
    <svg
      className={className}
      width={width * size}
      height={rows.length * size}
      viewBox={`0 0 ${width} ${rows.length}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {rows.flatMap((row, y) =>
        [...row].map((ch, x) =>
          palette[ch] ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={palette[ch]} /> : null,
        ),
      )}
    </svg>
  );
}

const HEART = [
  '.dd.dd.',
  'dppdppd',
  'dpppppd',
  'dpppppd',
  '.dpppd.',
  '..dpd..',
  '...d...',
];

const BOW = [
  '.rr...rr.',
  'rpprrrppr',
  'rpwprprwr',
  'rppprrppr',
  '.rrr.rrr.',
  '..rp.pr..',
  '.rp...pr.',
];

export function PixelHeart({ size = 4 }: { size?: number }) {
  return <PixelArt rows={HEART} palette={{ d: '#3d2463', p: '#f48fb1' }} size={size} />;
}

export function PixelBow({ size = 4, className }: { size?: number; className?: string }) {
  return (
    <PixelArt
      rows={BOW}
      palette={{ r: '#e86a9a', p: '#f9c5d9', w: '#ffffff' }}
      size={size}
      className={className}
    />
  );
}
