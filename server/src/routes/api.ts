import { Router } from 'express';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { AuthExpiredError, SpotifyError, spotifyGet, spotifySend } from '../spotifyClient.js';

export const apiRouter = Router();

function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.tokens) {
    res.status(401).json({ error: 'not_authenticated' });
    return;
  }
  next();
}

// Enveloppe une route : renvoie le résultat en JSON et traduit les erreurs en réponses HTTP.
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
      const status = error instanceof SpotifyError && error.status === 403 ? 403 : 502;
      res.status(status).json({ error: error instanceof Error ? error.message : 'Erreur inconnue' });
    }
  };
}

// ?range=short_term (4 semaines) | medium_term (6 mois) | long_term (depuis toujours)
const TIME_RANGES = ['short_term', 'medium_term', 'long_term'];
function timeRange(req: Request): string {
  const value = req.query.range;
  return typeof value === 'string' && TIME_RANGES.includes(value) ? value : 'medium_term';
}

// ?limit=6, borné entre 1 et max
function limit(req: Request, fallback: number, max: number): number {
  const value = Number(req.query.limit);
  return Number.isInteger(value) && value >= 1 ? Math.min(value, max) : fallback;
}

apiRouter.use(requireAuth);

apiRouter.get('/me', handle((req) => spotifyGet(req.session, '/me')));

apiRouter.get(
  '/spotify/top-artists',
  handle((req) =>
    spotifyGet(req.session, `/me/top/artists?limit=${limit(req, 6, 50)}&time_range=${timeRange(req)}`),
  ),
);

apiRouter.get(
  '/spotify/top-tracks',
  handle((req) =>
    spotifyGet(req.session, `/me/top/tracks?limit=${limit(req, 10, 50)}&time_range=${timeRange(req)}`),
  ),
);

apiRouter.get(
  '/spotify/recently-played',
  handle((req) => spotifyGet(req.session, `/me/player/recently-played?limit=${limit(req, 6, 50)}`)),
);

// Lecture en cours (null si aucun appareil Spotify n'est actif)
apiRouter.get('/spotify/now-playing', handle((req) => spotifyGet(req.session, '/me/player')));

// Commandes de lecture : on associe chaque action à la bonne requête Spotify.
const PLAYER_COMMANDS = {
  play: { method: 'PUT', path: '/me/player/play' },
  pause: { method: 'PUT', path: '/me/player/pause' },
  next: { method: 'POST', path: '/me/player/next' },
  previous: { method: 'POST', path: '/me/player/previous' },
} as const;

apiRouter.post('/spotify/player/:action', (req, res, next) => {
  const command = PLAYER_COMMANDS[req.params.action as keyof typeof PLAYER_COMMANDS];
  if (!command) {
    res.status(400).json({ error: 'Action inconnue' });
    return;
  }
  handle(async () => {
    await spotifySend(req.session, command.method, command.path);
    return { ok: true };
  })(req, res, next);
});
