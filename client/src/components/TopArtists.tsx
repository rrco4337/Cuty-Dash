import { useApi } from '../hooks/useApi';
import type { Artist } from '../types';

export default function TopArtists() {
  const state = useApi<{ items: Artist[] }>('/spotify/top-artists');

  if (state.status === 'loading') return <p>Chargement des artistes…</p>;
  if (state.status === 'anonymous') return <p className="error">Session expirée, rechargez la page.</p>;
  if (state.status === 'error') return <p className="error">{state.message}</p>;

  const artists = state.data.items;
  if (artists.length === 0) {
    return <p>Pas encore assez d'écoutes pour afficher vos artistes.</p>;
  }

  return (
    <section>
      <h2>Vos top artistes</h2>
      <ol className="artists">
        {artists.map((artist) => (
          <li key={artist.id} className="card artist">
            {artist.images[0] ? (
              <img className="artist-img" src={artist.images[0].url} alt="" />
            ) : (
              <div className="artist-img avatar-fallback">{artist.name.charAt(0)}</div>
            )}
            <a href={artist.external_urls.spotify} target="_blank" rel="noreferrer">
              {artist.name}
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}
