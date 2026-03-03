const IS_LOCAL = process.env.NODE_ENV !== 'production';

// Rafraîchit l'access_token via le refresh_token.
// En local : persiste aussi dans le .env.
// En prod  : met uniquement à jour process.env (les env vars sont gérées par la plateforme).
export async function refreshAccessToken() {
  const res = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.TWITCH_CLIENT_ID,
      client_secret: process.env.TWITCH_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: process.env.TWITCH_REFRESH_TOKEN,
    }),
  });

  const data = await res.json();

  if (!res.ok || !data.access_token) {
    throw new Error(`Refresh échoué : ${JSON.stringify(data)}`);
  }

  process.env.TWITCH_ACCESS_TOKEN = data.access_token;
  if (data.refresh_token) {
    process.env.TWITCH_REFRESH_TOKEN = data.refresh_token;
  }

  if (IS_LOCAL) {
    await persistToEnvFile(data.access_token, data.refresh_token);
  }

  console.log('[auth] Access token rafraîchi avec succès.');
  return data.access_token;
}

// Valide le token courant. Si invalide ou absent, le rafraîchit.
// À appeler au démarrage du bot.
export async function ensureValidToken() {
  if (!process.env.TWITCH_ACCESS_TOKEN) {
    console.log('[auth] Pas de token, rafraîchissement initial...');
    await refreshAccessToken();
    return;
  }

  const res = await fetch('https://id.twitch.tv/oauth2/validate', {
    headers: { Authorization: `OAuth ${process.env.TWITCH_ACCESS_TOKEN}` },
  });

  if (res.status === 401) {
    console.log('[auth] Token expiré, rafraîchissement...');
    await refreshAccessToken();
  } else {
    const data = await res.json();
    const minutesLeft = Math.round(data.expires_in / 60);
    console.log(`[auth] Token valide (expire dans ~${minutesLeft} min)`);
  }
}

async function persistToEnvFile(accessToken, refreshToken) {
  const { readFileSync, writeFileSync, existsSync } = await import('fs');
  const { resolve } = await import('path');

  const envPath = resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) return;

  let env = readFileSync(envPath, 'utf-8');
  env = setEnvVar(env, 'TWITCH_ACCESS_TOKEN', accessToken);
  if (refreshToken) {
    env = setEnvVar(env, 'TWITCH_REFRESH_TOKEN', refreshToken);
  }
  writeFileSync(envPath, env);
}

function setEnvVar(content, key, value) {
  const regex = new RegExp(`^${key}=.*$`, 'm');
  const line = `${key}=${value}`;
  return regex.test(content) ? content.replace(regex, line) : `${content}\n${line}`;
}
