import { useApi } from '../hooks/useApi';
import { firstImage } from '../lib';
import type { Track } from '../types';
import Loaded from './Loaded';
import Window from './Window';

interface RecentItem {
  played_at: string;
  track: Track;
}

export default function RecentlyPlayed({ className }: { className?: string }) {
  const state = useApi<{ items: RecentItem[] }>('/spotify/recently-played?limit=6');

  return (
    <Window title="Écoutés récemment" className={className}>
      <Loaded state={state}>
        {({ items }) =>
          items.length === 0 ? (
            <p className="hint">Rien d'écouté récemment.</p>
          ) : (
            <ol className="recent">
              {items.map(({ track, played_at }) => (
                <li key={played_at}>
                  <a href={track.external_urls.spotify} target="_blank" rel="noreferrer">
                    {firstImage(track.album.images) ? (
                      <img className="cover" src={firstImage(track.album.images)} alt="" />
                    ) : (
                      <span className="cover" />
                    )}
                    <strong className="ellipsis">{track.name}</strong>
                    <span className="ellipsis hint">{track.artists.map((a) => a.name).join(', ')}</span>
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
