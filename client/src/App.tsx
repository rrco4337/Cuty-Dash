import { apiLogout } from './api/client';
import LoginCard from './components/LoginCard';
import ProfileCard from './components/ProfileCard';
import TopArtists from './components/TopArtists';
import { useApi } from './hooks/useApi';
import type { Me } from './types';

export default function App() {
  const me = useApi<Me>('/me');
  const urlError = new URLSearchParams(window.location.search).get('error');

  if (me.status === 'loading') return <main><p>Chargement…</p></main>;

  if (me.status === 'anonymous') {
    return (
      <main className="login-page">
        <LoginCard error={urlError} />
      </main>
    );
  }

  if (me.status === 'error') return <main><p className="error">{me.message}</p></main>;

  const logout = () => {
    void apiLogout().then(() => window.location.assign('/'));
  };

  return (
    <main>
      <ProfileCard me={me.data} onLogout={logout} />
      <TopArtists />
    </main>
  );
}
