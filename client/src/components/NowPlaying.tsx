import { useState } from 'react';
import { apiPost } from '../api/client';
import { useApi } from '../hooks/useApi';
import { firstImage, formatTime } from '../lib';
import type { Playback } from '../types';
import Loaded from './Loaded';
import { NextIcon, PauseIcon, PlayIcon, PreviousIcon } from './PixelIcons';
import SingingCat from './SingingCat';
import Window from './Window';

const SEGMENTS = 24; // nombre de petits blocs de la barre de progression
const REFRESH_MS = 5000; // on redemande la lecture en cours toutes les 5 secondes
const INK = '#3d2463';

export default function NowPlaying({ className }: { className?: string }) {
  const state = useApi<Playback | null>('/spotify/now-playing', REFRESH_MS);
  const [commandError, setCommandError] = useState<string | null>(null);

  const isPlaying = state.status === 'ready' && state.data?.is_playing === true;

  async function send(action: 'play' | 'pause' | 'next' | 'previous') {
    setCommandError(null);
    try {
      await apiPost(`/spotify/player/${action}`);
      setTimeout(state.reload, 500); // Spotify met un instant à mettre son état à jour
    } catch (error) {
      setCommandError(error instanceof Error ? error.message : 'Commande impossible');
    }
  }

  return (
    <Window title="En ce moment" className={className}>
      <SingingCat isPlaying={isPlaying} />
      <Loaded state={state}>
        {(playback) => {
          const track = playback?.item;
          if (!playback || !track) {
            return <p className="hint">Rien en lecture. Lance un morceau sur Spotify (téléphone, ordi…) et il apparaîtra ici.</p>;
          }

          const progress = playback.progress_ms ?? 0;
          const filled = Math.round((progress / track.duration_ms) * SEGMENTS);

          return (
            <div className="now">
              <div className={`vinyl ${playback.is_playing ? 'vinyl--spin' : ''}`} aria-hidden="true">
                <span className="vinyl-label vinyl-label--cover">
                  {firstImage(track.album.images) && <img src={firstImage(track.album.images)} alt="" />}
                </span>
              </div>

              <div className="now-info">
                <a className="now-title" href={track.external_urls.spotify} target="_blank" rel="noreferrer">
                  {track.name}
                </a>
                <p className="now-artist">{track.artists.map((a) => a.name).join(', ')}</p>
                <p className="hint">{track.album.name}</p>

                <div className="progress" aria-hidden="true">
                  {Array.from({ length: SEGMENTS }, (_, i) => (
                    <i key={i} className={i < filled ? 'on' : ''} />
                  ))}
                </div>
                <div className="times">
                  <span>{formatTime(progress)}</span>
                  <span>{formatTime(track.duration_ms)}</span>
                </div>

                <div className="controls">
                  <button className="ctl" aria-label="Précédent" onClick={() => send('previous')}>
                    <PreviousIcon color={INK} />
                  </button>
                  <button
                    className="ctl ctl--main"
                    aria-label={playback.is_playing ? 'Pause' : 'Lecture'}
                    onClick={() => send(playback.is_playing ? 'pause' : 'play')}
                  >
                    {playback.is_playing ? <PauseIcon color="#fff" size={4} /> : <PlayIcon color="#fff" size={4} />}
                  </button>
                  <button className="ctl" aria-label="Suivant" onClick={() => send('next')}>
                    <NextIcon color={INK} />
                  </button>
                </div>
                {commandError && <p className="error">{commandError}</p>}
              </div>
            </div>
          );
        }}
      </Loaded>
    </Window>
  );
}
