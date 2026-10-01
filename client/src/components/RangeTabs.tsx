import type { TimeRange } from '../types';

const RANGES: { value: TimeRange; label: string }[] = [
  { value: 'short_term', label: '4 sem.' },
  { value: 'medium_term', label: '6 mois' },
  { value: 'long_term', label: 'Toujours' },
];

interface RangeTabsProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
}

// Les 3 boutons pour choisir la période d'un classement.
export default function RangeTabs({ value, onChange }: RangeTabsProps) {
  return (
    <div className="tabs">
      {RANGES.map((range) => (
        <button
          key={range.value}
          className="tab"
          aria-pressed={range.value === value}
          onClick={() => onChange(range.value)}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}
