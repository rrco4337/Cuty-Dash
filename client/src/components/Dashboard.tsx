import type { Me } from '../types';
import NowPlaying from './NowPlaying';
import { PixelHeart } from './PixelArt';
import ProfileWindow from './ProfileWindow';
import RecentlyPlayed from './RecentlyPlayed';
import TopArtists from './TopArtists';
import TopGenres from './TopGenres';
import TopTracks from './TopTracks';

interface DashboardProps {
  me: Me;
  onLogout: () => void;
}

// La page principale : chaque bloc se place dans la grille grâce à sa classe `area-…` (voir styles.css).
export default function Dashboard({ me, onLogout }: DashboardProps) {
  return (
    <main className="dashboard">
      <header className="dash-header">
        <PixelHeart size={6} />
        <div>
          <h1>Hello {me.display_name ?? me.id}</h1>
          <p className="hint">Voici ton univers musical</p>
        </div>
      </header>

      <div className="dash-grid">
        <NowPlaying className="area-now" />
        <ProfileWindow me={me} onLogout={onLogout} className="area-profile" />
        <TopArtists className="area-artists" />
        <TopTracks className="area-tracks" />
        <TopGenres className="area-genres" />
        <RecentlyPlayed className="area-recent" />
      </div>
    </main>
  );
}
