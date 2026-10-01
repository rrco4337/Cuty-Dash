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
