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
