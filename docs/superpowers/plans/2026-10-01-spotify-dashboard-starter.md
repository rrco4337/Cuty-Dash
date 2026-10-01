# Spotify Dashboard Starter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un monorepo React + TypeScript (client) et Express + TypeScript (server) qui connecte l'utilisateur à Spotify et affiche son profil et ses top artistes.

**Architecture:** npm workspaces (`client/`, `server/`). Le serveur fait l'Authorization Code flow avec le client secret, garde les tokens dans une session en mémoire (cookie httpOnly) et expose `/api/*`. Le client Vite proxifie `/api` vers le serveur.

**Tech Stack:** Node 23 / npm 10, TypeScript 5, Express 4 + express-session, tsx, Vite 5, React 18, concurrently.

**Spec:** `docs/superpowers/specs/2026-10-01-spotify-dashboard-starter-design.md`

## Global Constraints

- Redirect URI : `http://127.0.0.1:3001/api/auth/callback` (jamais `localhost`).
- App ouverte sur `http://127.0.0.1:5173`.
- Scopes : `user-read-private user-top-read`.
- Le client secret ne quitte jamais le serveur ; le navigateur ne reçoit qu'un cookie httpOnly.
- Pas de base de données, pas de tests automatisés, pas de lecteur audio, pas de déploiement (hors périmètre).
- Sessions en mémoire (MemoryStore), usage développement local uniquement.
- Le dossier n'est pas un dépôt git : aucune étape de commit dans ce plan.
- Variables d'environnement : `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REDIRECT_URI`, `SESSION_SECRET`, `CLIENT_URL`.

## Review Focus

- `state` OAuth manquant ou différent au callback : réponse 400, aucun token enregistré.
- Utilisateur qui refuse l'accès (`?error=access_denied` au callback) : retour au client avec un message, pas de crash.
- Rafraîchissement du token : Spotify peut ne pas renvoyer de nouveau `refresh_token` (on garde l'ancien) ; un refresh révoqué (400/401) donne un 401 et vide la session.
- Compte sans image, sans `display_name` ou sans top artists : l'UI affiche un repli (initiale, identifiant, message vide), pas d'écran blanc.
- Variable d'environnement manquante : le serveur s'arrête au démarrage avec la liste des variables manquantes.

---

### Task 1: Racine du monorepo et environnement

**Files:**
- Create: `package.json`, `.gitignore`, `.env.example`
- Modify: `.env` (actuellement vide)

**Interfaces:**
- Produces: workspaces `client` et `server` ; script racine `npm run dev` (lance les deux) ; variables d'environnement listées dans Global Constraints, lues depuis `../.env` par le serveur.

- [ ] **Step 1: Créer `package.json`**

```json
{
  "name": "cute-dashboard",
  "private": true,
  "workspaces": ["client", "server"],
  "scripts": {
    "dev": "concurrently -n server,client -c blue,magenta \"npm run dev -w server\" \"npm run dev -w client\"",
    "build": "npm run build -w server && npm run build -w client",
    "typecheck": "npm run typecheck -w server && npm run typecheck -w client"
  },
  "devDependencies": {
    "concurrently": "^9.0.0"
  }
}
```

- [ ] **Step 2: Créer `.gitignore`**

```
node_modules
dist
.env
```

- [ ] **Step 3: Créer `.env.example`**

```
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REDIRECT_URI=http://127.0.0.1:3001/api/auth/callback
SESSION_SECRET=
CLIENT_URL=http://127.0.0.1:5173
```

- [ ] **Step 4: Remplir `.env` (secret de session généré, identifiants Spotify laissés vides)**

Run: `cp .env.example .env && sed -i '' "s|^SESSION_SECRET=.*|SESSION_SECRET=$(openssl rand -hex 32)|" .env && sed 's/=.*/=<masqué>/' .env`
Expected: les cinq noms de variables s'affichent, valeurs masquées.

- [ ] **Step 5 (action utilisateur) : créer l'application Spotify**

Sur https://developer.spotify.com/dashboard : « Create app », ajouter le Redirect URI `http://127.0.0.1:3001/api/auth/callback`, cocher « Web API », puis copier le Client ID et le Client secret dans `.env` (`SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`).

---

### Task 2: Configuration serveur et client Spotify

**Files:**
- Create: `server/package.json`, `server/tsconfig.json`, `server/src/config.ts`, `server/src/session.ts`, `server/src/spotifyClient.ts`

**Interfaces:**
- Consumes: variables d'environnement de la Task 1.
- Produces:
  - `config` : `{ clientId, clientSecret, redirectUri, sessionSecret, clientUrl, port, scopes }` (toutes `string`, `port: number`).
  - `Tokens` : `{ accessToken: string; refreshToken: string; expiresAt: number }` ; `SessionData` enrichi de `oauthState?: string` et `tokens?: Tokens`.
  - `buildAuthUrl(state: string): string`
  - `exchangeCode(code: string): Promise<Tokens>`
  - `spotifyGet<T>(session: Request['session'], path: string): Promise<T>` : rafraîchit le token si besoin et met à jour `session.tokens`.
  - `SpotifyError(status: number, message: string)` et `AuthExpiredError`.

- [ ] **Step 1: Créer `server/package.json`**

```json
{
  "name": "server",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch --env-file=../.env src/index.ts",
    "build": "tsc -p .",
    "start": "node --env-file=../.env dist/index.js",
    "typecheck": "tsc --noEmit -p ."
  },
  "dependencies": {
    "express": "^4.21.0",
    "express-session": "^1.18.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/express-session": "^1.18.0",
    "@types/node": "^22.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 2: Créer `server/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Créer `server/src/config.ts`**

```ts
const missing: string[] = [];

function required(name: string): string {
  const value = process.env[name];
  if (!value) missing.push(name);
  return value ?? '';
}

export const config = {
  clientId: required('SPOTIFY_CLIENT_ID'),
  clientSecret: required('SPOTIFY_CLIENT_SECRET'),
  redirectUri: required('SPOTIFY_REDIRECT_URI'),
  sessionSecret: required('SESSION_SECRET'),
  clientUrl: required('CLIENT_URL'),
  port: Number(process.env.PORT ?? 3001),
  scopes: 'user-read-private user-top-read',
};

if (missing.length > 0) {
  console.error(`Variables manquantes dans .env : ${missing.join(', ')}`);
  process.exit(1);
}
```

- [ ] **Step 4: Créer `server/src/session.ts`**

```ts
import 'express-session';

export interface Tokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

declare module 'express-session' {
  interface SessionData {
    oauthState?: string;
    tokens?: Tokens;
  }
}
```

- [ ] **Step 5: Créer `server/src/spotifyClient.ts`**

```ts
import type { Request } from 'express';
import { config } from './config.js';
import type { Tokens } from './session.js';

const ACCOUNTS_URL = 'https://accounts.spotify.com';
const API_URL = 'https://api.spotify.com/v1';
const EXPIRY_MARGIN_MS = 60_000;

export class SpotifyError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export class AuthExpiredError extends Error {}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

export function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    scope: config.scopes,
    redirect_uri: config.redirectUri,
    state,
  });
  return `${ACCOUNTS_URL}/authorize?${params}`;
}

async function requestToken(body: Record<string, string>): Promise<TokenResponse> {
  const basic = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
  const res = await fetch(`${ACCOUNTS_URL}/api/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(body),
  });
  if (!res.ok) {
    throw new SpotifyError(res.status, `Échange de token refusé par Spotify (${res.status})`);
  }
  return (await res.json()) as TokenResponse;
}

function toTokens(response: TokenResponse, fallbackRefreshToken?: string): Tokens {
  const refreshToken = response.refresh_token ?? fallbackRefreshToken;
  if (!refreshToken) {
    throw new SpotifyError(502, "Spotify n'a pas renvoyé de refresh token");
  }
  return {
    accessToken: response.access_token,
    refreshToken,
    expiresAt: Date.now() + response.expires_in * 1000,
  };
}

export async function exchangeCode(code: string): Promise<Tokens> {
  return toTokens(
    await requestToken({
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.redirectUri,
    }),
  );
}

async function refresh(tokens: Tokens): Promise<Tokens> {
  try {
    return toTokens(
      await requestToken({ grant_type: 'refresh_token', refresh_token: tokens.refreshToken }),
      tokens.refreshToken,
    );
  } catch (error) {
    if (error instanceof SpotifyError && (error.status === 400 || error.status === 401)) {
      throw new AuthExpiredError();
    }
    throw error;
  }
}

export async function spotifyGet<T>(session: Request['session'], path: string): Promise<T> {
  let tokens = session.tokens;
  if (!tokens) throw new AuthExpiredError();

  if (tokens.expiresAt - EXPIRY_MARGIN_MS <= Date.now()) {
    tokens = await refresh(tokens);
    session.tokens = tokens;
  }

  const res = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${tokens.accessToken}` },
  });
  if (res.status === 401) throw new AuthExpiredError();
  if (!res.ok) throw new SpotifyError(res.status, `Erreur API Spotify (${res.status})`);
  return (await res.json()) as T;
}
```

- [ ] **Step 6: Installer et vérifier les types**

Run: `npm install && npm run typecheck -w server`
Expected: installation OK, `tsc` se termine sans erreur.

---

### Task 3: Routes et serveur Express

**Files:**
- Create: `server/src/routes/auth.ts`, `server/src/routes/api.ts`, `server/src/index.ts`

**Interfaces:**
- Consumes: `config`, `buildAuthUrl`, `exchangeCode`, `spotifyGet`, `SpotifyError`, `AuthExpiredError` (Task 2).
- Produces, sur `http://127.0.0.1:3001` :
  - `GET /api/auth/login` : 302 vers Spotify.
  - `GET /api/auth/callback` : 302 vers `CLIENT_URL` (ou `CLIENT_URL/?error=<code>`), 400 si `state` invalide.
  - `POST /api/auth/logout` : 204.
  - `GET /api/me` : JSON profil Spotify ; 401 `{error:'not_authenticated'}` si non connecté.
  - `GET /api/spotify/top-artists` : JSON `{ items: Artist[] }` ; mêmes erreurs ; 502 `{error}` si Spotify échoue.

- [ ] **Step 1: Créer `server/src/routes/auth.ts`**

```ts
import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import { config } from '../config.js';
import { buildAuthUrl, exchangeCode } from '../spotifyClient.js';

export const authRouter = Router();

authRouter.get('/login', (req, res) => {
  const state = randomBytes(16).toString('hex');
  req.session.oauthState = state;
  res.redirect(buildAuthUrl(state));
});

authRouter.get('/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (typeof error === 'string') {
    res.redirect(`${config.clientUrl}/?error=${encodeURIComponent(error)}`);
    return;
  }

  const expectedState = req.session.oauthState;
  delete req.session.oauthState;
  if (!expectedState || state !== expectedState || typeof code !== 'string') {
    res.status(400).send('Requête de connexion invalide');
    return;
  }

  try {
    req.session.tokens = await exchangeCode(code);
    res.redirect(config.clientUrl);
  } catch (err) {
    console.error(err);
    res.redirect(`${config.clientUrl}/?error=token_exchange_failed`);
  }
});

authRouter.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.status(204).end();
  });
});
```

- [ ] **Step 2: Créer `server/src/routes/api.ts`**

```ts
import { Router } from 'express';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { AuthExpiredError, spotifyGet } from '../spotifyClient.js';

export const apiRouter = Router();

function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.tokens) {
    res.status(401).json({ error: 'not_authenticated' });
    return;
  }
  next();
}

function handle(fetcher: (req: Request) => Promise<unknown>): RequestHandler {
  return async (req, res) => {
    try {
      res.json(await fetcher(req));
    } catch (error) {
      if (error instanceof AuthExpiredError) {
        delete req.session.tokens;
        res.status(401).json({ error: 'not_authenticated' });
        return;
      }
      console.error(error);
      res.status(502).json({ error: error instanceof Error ? error.message : 'Erreur inconnue' });
    }
  };
}

apiRouter.use(requireAuth);
apiRouter.get('/me', handle((req) => spotifyGet(req.session, '/me')));
apiRouter.get(
  '/spotify/top-artists',
  handle((req) => spotifyGet(req.session, '/me/top/artists?limit=10&time_range=medium_term')),
);
```

- [ ] **Step 3: Créer `server/src/index.ts`**

```ts
import express from 'express';
import session from 'express-session';
import { config } from './config.js';
import { apiRouter } from './routes/api.js';
import { authRouter } from './routes/auth.js';

const app = express();

app.use(
  session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 },
  }),
);

app.use('/api/auth', authRouter);
app.use('/api', apiRouter);

app.listen(config.port, '127.0.0.1', () => {
  console.log(`Serveur prêt sur http://127.0.0.1:${config.port}`);
});
```

- [ ] **Step 4: Vérifier les types**

Run: `npm run typecheck -w server`
Expected: aucune erreur.

- [ ] **Step 5: Démarrer le serveur et vérifier les routes (les identifiants Spotify peuvent être fictifs pour ces tests)**

Run (serveur en arrière-plan) : `npm run dev -w server`, puis :
```bash
curl -i http://127.0.0.1:3001/api/me
curl -i "http://127.0.0.1:3001/api/auth/login"
curl -i "http://127.0.0.1:3001/api/auth/callback?code=x&state=bad"
curl -i "http://127.0.0.1:3001/api/auth/callback?error=access_denied"
```
Expected, dans l'ordre :
1. `401` avec `{"error":"not_authenticated"}`.
2. `302` avec `Location: https://accounts.spotify.com/authorize?...client_id=...&state=...` et un `Set-Cookie: connect.sid`.
3. `400` « Requête de connexion invalide ».
4. `302` avec `Location: http://127.0.0.1:5173/?error=access_denied`.

- [ ] **Step 6: Vérifier l'arrêt si une variable manque**

Run: `cd server && env -u SPOTIFY_CLIENT_ID npx tsx src/index.ts` avec un `.env` sans `SPOTIFY_CLIENT_ID` (ou `SPOTIFY_CLIENT_ID= npx tsx src/index.ts`)
Expected: message `Variables manquantes dans .env : SPOTIFY_CLIENT_ID` et code de sortie 1.

---

### Task 4: Squelette client Vite + React et couche API

**Files:**
- Create: `client/package.json`, `client/tsconfig.json`, `client/vite.config.ts`, `client/index.html`, `client/src/main.tsx`, `client/src/types.ts`, `client/src/api/client.ts`, `client/src/hooks/useApi.ts`

**Interfaces:**
- Consumes: routes `/api/*` de la Task 3 (via proxy Vite).
- Produces:
  - Types `Me` et `Artist` (`client/src/types.ts`).
  - `ApiError(status: number, message: string)`, `apiGet<T>(path: string): Promise<T>`, `apiLogout(): Promise<void>` (`path` sans le préfixe `/api`).
  - `useApi<T>(path: string): ApiState<T>` avec `ApiState<T> = {status:'loading'} | {status:'anonymous'} | {status:'error'; message: string} | {status:'ready'; data: T}` (401 devient `anonymous`).
  - `src/App.tsx` importé par `main.tsx` (créé en Task 5).

- [ ] **Step 1: Créer `client/package.json`**

```json
{
  "name": "client",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.6.0",
    "vite": "^5.4.0"
  }
}
```

- [ ] **Step 2: Créer `client/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "types": ["vite/client"]
  },
  "include": ["src", "vite.config.ts"]
}
```

- [ ] **Step 3: Créer `client/vite.config.ts`**

```ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: { '/api': 'http://127.0.0.1:3001' },
  },
});
```

- [ ] **Step 4: Créer `client/index.html`**

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Cute Dashboard</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Créer `client/src/main.tsx`**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 6: Créer `client/src/types.ts`**

```ts
export interface SpotifyImage {
  url: string;
}

export interface Me {
  id: string;
  display_name: string | null;
  images: SpotifyImage[];
}

export interface Artist {
  id: string;
  name: string;
  genres: string[];
  images: SpotifyImage[];
  external_urls: { spotify: string };
}
```

- [ ] **Step 7: Créer `client/src/api/client.ts`**

```ts
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, init);
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new ApiError(res.status, body?.error ?? `Erreur ${res.status}`);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export const apiGet = <T>(path: string) => request<T>(path);

export const apiLogout = () => request<void>('/auth/logout', { method: 'POST' });
```

- [ ] **Step 8: Créer `client/src/hooks/useApi.ts`**

```ts
import { useEffect, useState } from 'react';
import { ApiError, apiGet } from '../api/client';

export type ApiState<T> =
  | { status: 'loading' }
  | { status: 'anonymous' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: T };

export function useApi<T>(path: string): ApiState<T> {
  const [state, setState] = useState<ApiState<T>>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    apiGet<T>(path)
      .then((data) => {
        if (!cancelled) setState({ status: 'ready', data });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 401) {
          setState({ status: 'anonymous' });
        } else {
          setState({
            status: 'error',
            message: error instanceof Error ? error.message : 'Erreur inconnue',
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  return state;
}
```

- [ ] **Step 9: Installer (nouvelles dépendances client) et vérifier les types après la Task 5**

Run: `npm install`
Expected: installation OK. La vérification `npm run typecheck -w client` se fait à la fin de la Task 5, car `main.tsx` importe `App` et `styles.css`.

---

### Task 5: Interface et vérification de bout en bout

**Files:**
- Create: `client/src/App.tsx`, `client/src/styles.css`, `client/src/components/LoginButton.tsx`, `client/src/components/ProfileCard.tsx`, `client/src/components/TopArtists.tsx`

**Interfaces:**
- Consumes: `useApi`, `apiLogout`, `Me`, `Artist` (Task 4).
- Produces: l'application complète (non connecté : bouton ; connecté : profil, top artistes, déconnexion).

- [ ] **Step 1: Créer `client/src/components/LoginButton.tsx`**

```tsx
export default function LoginButton() {
  return (
    <a className="btn" href="/api/auth/login">
      Se connecter avec Spotify
    </a>
  );
}
```

- [ ] **Step 2: Créer `client/src/components/ProfileCard.tsx`**

```tsx
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
```

- [ ] **Step 3: Créer `client/src/components/TopArtists.tsx`**

```tsx
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
```

- [ ] **Step 4: Créer `client/src/App.tsx`**

```tsx
import { apiLogout } from './api/client';
import LoginButton from './components/LoginButton';
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
      <main className="center">
        <h1>Cute Dashboard</h1>
        {urlError && <p className="error">Connexion impossible ({urlError}).</p>}
        <LoginButton />
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
```

- [ ] **Step 5: Créer `client/src/styles.css`**

```css
:root {
  --bg: #fff5f9;
  --card: #ffffff;
  --text: #4a3b47;
  --accent: #ff8fb8;
  --accent-dark: #e86a9a;
  font-family: system-ui, sans-serif;
  color: var(--text);
  background: var(--bg);
}

body { margin: 0; }
main { max-width: 640px; margin: 0 auto; padding: 2rem 1rem; }
main.center { text-align: center; padding-top: 20vh; }
h1, h2 { margin: 0 0 1rem; }

.card { background: var(--card); border-radius: 20px; padding: 1rem; box-shadow: 0 4px 16px rgb(255 143 184 / 20%); }
.profile { display: flex; align-items: center; gap: 1rem; margin-bottom: 2rem; }
.profile h1 { flex: 1; margin: 0; font-size: 1.4rem; }
.avatar { width: 64px; height: 64px; border-radius: 50%; object-fit: cover; }
.avatar-fallback { display: grid; place-items: center; background: var(--accent); color: #fff; font-weight: 700; font-size: 1.5rem; }

.btn { display: inline-block; border: 0; border-radius: 999px; padding: 0.7rem 1.4rem; background: var(--accent); color: #fff; font: inherit; font-weight: 600; text-decoration: none; cursor: pointer; }
.btn:hover { background: var(--accent-dark); }
.btn-ghost { background: transparent; color: var(--accent-dark); border: 2px solid var(--accent); }

.artists { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.75rem; }
.artist { display: flex; align-items: center; gap: 1rem; }
.artist a { color: var(--text); font-weight: 600; text-decoration: none; }
.artist-img { width: 48px; height: 48px; border-radius: 12px; object-fit: cover; }
.error { color: #c0334f; }
```

- [ ] **Step 6: Vérifier types et build**

Run: `npm run typecheck && npm run build -w client`
Expected: aucune erreur de type, `vite build` termine avec « built in … ».

- [ ] **Step 7: Vérifier le proxy sans identifiants Spotify**

Run: `npm run dev` (en arrière-plan), puis `curl -i http://127.0.0.1:5173/api/me`
Expected: `401` avec `{"error":"not_authenticated"}` (la requête passe bien par le proxy Vite jusqu'au serveur). Ouvrir `http://127.0.0.1:5173` : titre « Cute Dashboard » et bouton « Se connecter avec Spotify ».

- [ ] **Step 8 (action utilisateur) : test de bout en bout avec de vrais identifiants**

Avec `SPOTIFY_CLIENT_ID` et `SPOTIFY_CLIENT_SECRET` renseignés dans `.env`, relancer `npm run dev`, ouvrir `http://127.0.0.1:5173`, cliquer sur le bouton, accepter sur Spotify.
Expected: retour sur l'app avec votre nom, votre avatar et vos top artistes ; « Se déconnecter » ramène au bouton de connexion. Refuser l'accès sur Spotify affiche « Connexion impossible (access_denied) ».
