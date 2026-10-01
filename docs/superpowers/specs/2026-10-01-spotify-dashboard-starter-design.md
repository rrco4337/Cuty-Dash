# Spotify Dashboard Starter — Design

Date: 2026-10-01

## Objectif
Squelette de projet React + TypeScript (front) et Express + TypeScript (back) qui s'authentifie auprès de l'API Spotify Web et affiche le profil et les top artistes de l'utilisateur. Usage : dashboard personnel, développement local.

## Choix
- Monorepo npm workspaces : `client/` (Vite + React + TS) et `server/` (Express + TS, `tsx` en dev).
- Un seul `npm install` et un seul `npm run dev` (client + server en parallèle, via `concurrently`).
- Auth : Authorization Code flow. Le client secret reste sur le serveur.
- Hors périmètre : base de données, tests, lecteur audio, déploiement. Sessions en mémoire.

## Structure
```
cuteDashbord/
├── package.json            # workspaces + script dev
├── .env / .env.example     # SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REDIRECT_URI, SESSION_SECRET, CLIENT_URL
├── server/src/             # index.ts, config.ts, routes/auth.ts, routes/spotify.ts
└── client/src/             # App.tsx, api/client.ts, hooks/useApi.ts, components/
```

## Flux d'authentification
1. Le client redirige vers `GET /api/auth/login` ; le serveur génère un `state` (anti-CSRF) et redirige vers Spotify.
2. Spotify rappelle `GET /api/auth/callback` ; le serveur vérifie le `state` et échange le code contre les tokens.
3. Les tokens sont stockés dans la session serveur ; le navigateur ne reçoit qu'un cookie httpOnly.
4. Le client appelle `/api/me` et `/api/spotify/top-artists` ; le serveur ajoute le token et le rafraîchit s'il a expiré.
5. `POST /api/auth/logout` détruit la session.
6. Le proxy Vite redirige `/api` vers `http://127.0.0.1:3001` (pas de CORS).

## Interface du squelette
- Non connecté : bouton « Se connecter avec Spotify ».
- Connecté : avatar + nom, liste des top artistes, bouton de déconnexion.
- Gestion d'erreur : état « non connecté » sur 401, message d'erreur si l'API Spotify échoue.

## Contraintes Spotify
- Redirect URI : `http://127.0.0.1:3001/api/auth/callback` (`localhost` n'est plus accepté), à déclarer dans le dashboard développeur.
- Ouvrir l'app sur `http://127.0.0.1:5173`.
- Scopes : `user-read-private user-top-read`.
