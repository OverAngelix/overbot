/**
 * Script de génération du token OAuth Twitch
 * Usage : npm run get-token
 *
 * 1. Lance un serveur HTTP temporaire sur localhost:3000
 * 2. Ouvre le navigateur sur la page d'autorisation Twitch
 * 3. Récupère le code de retour et l'échange contre un access_token + refresh_token
 * 4. Écrit les tokens dans le fichier .env
 */

import 'dotenv/config';
import http from 'http';
import { exec } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;
const REDIRECT_URI = process.env.TWITCH_REDIRECT_URI || 'http://localhost:3000/auth/callback';
const PORT = new URL(REDIRECT_URI).port || 3000;

const SCOPES = [
  'chat:read',
  'chat:edit',
  'channel:moderate',
  'moderator:manage:banned_users',
  'moderator:manage:chat_messages',
].join(' ');

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌  TWITCH_CLIENT_ID et TWITCH_CLIENT_SECRET doivent être définis dans .env');
  process.exit(1);
}

const authUrl =
  `https://id.twitch.tv/oauth2/authorize` +
  `?client_id=${CLIENT_ID}` +
  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
  `&response_type=code` +
  `&scope=${encodeURIComponent(SCOPES)}`;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname !== '/auth/callback') {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error || !code) {
    res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<h1>Erreur : ${error || 'code manquant'}</h1>`);
    server.close();
    process.exit(1);
  }

  // Échanger le code contre les tokens
  const tokenRes = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: REDIRECT_URI,
    }),
  });

  const data = await tokenRes.json();

  if (!tokenRes.ok || !data.access_token) {
    res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<h1>Erreur lors de l'échange du token</h1><pre>${JSON.stringify(data, null, 2)}</pre>`);
    server.close();
    process.exit(1);
  }

  // Écrire les tokens dans .env
  const envPath = resolve(process.cwd(), '.env');
  let envContent = readFileSync(envPath, 'utf-8');

  envContent = setEnvVar(envContent, 'TWITCH_ACCESS_TOKEN', data.access_token);
  envContent = setEnvVar(envContent, 'TWITCH_REFRESH_TOKEN', data.refresh_token);

  writeFileSync(envPath, envContent);

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`
    <h1>✅ Tokens enregistrés dans .env !</h1>
    <p>Tu peux fermer cet onglet et lancer le bot avec <code>npm run dev</code></p>
  `);

  console.log('\n✅ access_token et refresh_token écrits dans .env');
  console.log('Lance le bot avec : npm run dev\n');

  server.close();
  process.exit(0);
});

/**
 * Met à jour ou ajoute une variable dans un fichier .env
 */
function setEnvVar(content, key, value) {
  const regex = new RegExp(`^${key}=.*$`, 'm');
  const line = `${key}=${value}`;
  return regex.test(content) ? content.replace(regex, line) : `${content}\n${line}`;
}

server.listen(PORT, () => {
  console.log(`\n🔐 Ouverture du navigateur pour autoriser le bot Twitch...`);
  console.log(`   Si le navigateur ne s'ouvre pas, visite :\n   ${authUrl}\n`);

  // Ouvrir le navigateur selon l'OS
  const cmd =
    process.platform === 'win32' ? `start "" "${authUrl}"` :
    process.platform === 'darwin' ? `open "${authUrl}"` :
    `xdg-open "${authUrl}"`;

  exec(cmd);
});
