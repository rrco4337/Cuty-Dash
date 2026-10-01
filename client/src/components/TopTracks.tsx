import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { formatTime } from '../lib';
import type { TimeRange, Track } from '../types';
import Loaded from './Loaded';
import RangeTabs from './RangeTabs';
import Window from './Window';

export default function TopTracks({ className }: { className?: string }) {
  const [range, setRange] = useState<TimeRange>('medium_term');
  const state = useApi<{ items: Track[] }>(`/spotify/top-tracks?limit=10&range=${range}`);

  return (
    <Window title="Top titres" className={className} action={<RangeTabs value={range} onChange={setRange} />}>
      <Loaded state={state}>
        {({ items }) =>
          items.length === 0 ? (
            <p className="hint">Pas encore assez d'écoutes sur cette période.</p>
          ) : (
            <ol className="tracks">
              {items.map((track, index) => (
                <li key={track.id} className="track">
                  <span className="track-rank">{index + 1}</span>
                  <div className="track-text">
                    <a className="ellipsis" href={track.external_urls.spotify} target="_blank" rel="noreferrer">
                      {track.name}
                    </a>
                    <span className="ellipsis hint">{track.artists.map((a) => a.name).join(', ')}</span>
                  </div>
                  <span className="hint">{formatTime(track.duration_ms)}</span>
                </li>
              ))}
            </ol>
          )
        }
      </Loaded>
    </Window>
  );
}
