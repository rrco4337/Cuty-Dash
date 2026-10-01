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
