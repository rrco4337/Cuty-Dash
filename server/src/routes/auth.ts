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
