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
