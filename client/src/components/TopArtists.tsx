import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { firstImage } from '../lib';
import type { Artist, TimeRange } from '../types';
import Loaded from './Loaded';
import RangeTabs from './RangeTabs';
import Window from './Window';

export default function TopArtists({ className }: { className?: string }) {
  const [range, setRange] = useState<TimeRange>('medium_term');
  const state = useApi<{ items: Artist[] }>(`/spotify/top-artists?limit=6&range=${range}`);

  return (
    <Window title="Top artistes" className={className} action={<RangeTabs value={range} onChange={setRange} />}>
      <Loaded state={state}>
        {({ items }) =>
          items.length === 0 ? (
            <p className="hint">Pas encore assez d'écoutes sur cette période.</p>
          ) : (
            <ol className="artists">
              {items.map((artist) => (
                <li key={artist.id}>
                  <a href={artist.external_urls.spotify} target="_blank" rel="noreferrer">
                    {firstImage(artist.images) ? (
                      <img className="artist-pic" src={firstImage(artist.images)} alt="" />
                    ) : (
                      <span className="artist-pic artist-pic--empty">{artist.name.charAt(0)}</span>
                    )}
                    <span className="ellipsis">{artist.name}</span>
                  </a>
                </li>
              ))}
            </ol>
          )
        }
      </Loaded>
    </Window>
  );
}
