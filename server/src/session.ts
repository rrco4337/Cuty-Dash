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
