import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import type { Artist, TimeRange } from '../types';
import Loaded from './Loaded';
import RangeTabs from './RangeTabs';
import Window from './Window';

const GENRES_SHOWN = 5;

// Compte combien d'artistes appartiennent à chaque genre et garde les plus fréquents.
function countGenres(artists: Artist[]): { genre: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const artist of artists) {
    // Spotify n'envoie pas toujours `genres` : on évite de planter dans ce cas.
    for (const genre of artist.genres ?? []) counts.set(genre, (counts.get(genre) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, GENRES_SHOWN);
}

export default function TopGenres({ className }: { className?: string }) {
  const [range, setRange] = useState<TimeRange>('medium_term');
  // On demande 50 artistes : plus on en a, plus le classement des genres est juste.
  const state = useApi<{ items: Artist[] }>(`/spotify/top-artists?limit=50&range=${range}`);

  return (
    <Window title="Genres" className={className} action={<RangeTabs value={range} onChange={setRange} />}>
      <Loaded state={state}>
        {({ items }) => {
          const genres = countGenres(items);
          if (genres.length === 0) return <p className="hint">Spotify n'a pas renvoyé de genres pour tes artistes sur cette période.</p>;
          return (
            <ol className="genres">
              {genres.map(({ genre, count }) => (
                <li key={genre} className="genre">
                  <strong>{genre}</strong>
                  <span>{count} artiste{count > 1 ? 's' : ''}</span>
                </li>
              ))}
            </ol>
          );
        }}
      </Loaded>
    </Window>
  );
}
