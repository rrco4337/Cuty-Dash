import type { Me } from '../types';

interface Props {
  me: Me;
  onLogout: () => void;
}

export default function ProfileCard({ me, onLogout }: Props) {
  const name = me.display_name ?? me.id;
  const avatar = me.images[0]?.url;

  return (
    <header className="card profile">
      {avatar ? (
        <img className="avatar" src={avatar} alt="" />
      ) : (
        <div className="avatar avatar-fallback">{name.charAt(0).toUpperCase()}</div>
      )}
      <h1>{name}</h1>
      <button className="btn btn-ghost" onClick={onLogout}>
        Se déconnecter
      </button>
    </header>
  );
}
