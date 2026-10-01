import LoginButton from './LoginButton';
import SingingCat from './SingingCat';
import { PixelBow, PixelHeart } from './PixelArt';

export default function LoginCard({ error }: { error?: string | null }) {
  return (
    <section className="login-window">
      <SingingCat isPlaying={false} />
      <PixelBow className="login-bow" />
      <header className="login-titlebar">
        <span className="login-bars" aria-hidden="true">
          <i /><i /><i />
        </span>
        <h1>Welcome les zamis</h1>
        <span className="login-heart">
          <PixelHeart />
        </span>
      </header>
      <div className="login-body">
        <div className="vinyl" aria-hidden="true">
          <span className="vinyl-label">SPOT<br />IFY</span>
        </div>
        <h2>Se connecter avec Spotify</h2>
        {error && <p className="error">Connexion impossible ({error}).</p>}
        <LoginButton />
      </div>
    </section>
  );
}
