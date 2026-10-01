import { firstImage } from '../lib';
import type { Me } from '../types';
import Window from './Window';

interface ProfileWindowProps {
  me: Me;
  onLogout: () => void;
  className?: string;
}

export default function ProfileWindow({ me, onLogout, className }: ProfileWindowProps) {
  const name = me.display_name ?? me.id;
  const avatar = firstImage(me.images);

  return (
    <Window title="Profil" className={className}>
      <div className="profile">
        {avatar ? (
          <img className="profile-pic" src={avatar} alt="" />
        ) : (
          <div className="profile-pic profile-pic--empty">{name.charAt(0).toUpperCase()}</div>
        )}
        <h3>{name}</h3>
        <p className="hint">{me.followers.total} abonné(e)s</p>
        <a className="btn" href={me.external_urls.spotify} target="_blank" rel="noreferrer">
          Voir sur Spotify
        </a>
        <button className="btn btn--light" onClick={onLogout}>
          Se déconnecter
        </button>
      </div>
    </Window>
  );
}
