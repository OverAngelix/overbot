import 'dotenv/config';
import tmi from 'tmi.js';
import { handleCommand, shoutout } from './commands.js';
import { refreshAccessToken, ensureValidToken } from './auth.js';
import { checkMessage } from './moderation.js';
import { requireEnv } from './env.js';
import { registerSubAlerts } from './subs.js';
import { startYoutubeWatcher } from './youtube.js';

// Rafraîchit le token toutes les 3h30 (token valide 4h)
const REFRESH_INTERVAL_MS = 3.5 * 60 * 60 * 1000;

function createClient(): tmi.Client {
  return new tmi.Client({
    // debug: false → tmi.js ne logue que ses erreurs (pas les messages du chat)
    options: { debug: false },
    identity: {
      username: requireEnv('TWITCH_BOT_USERNAME'),
      password: `oauth:${requireEnv('TWITCH_ACCESS_TOKEN')}`,
    },
    channels: [requireEnv('TWITCH_CHANNEL')],
  });
}

function registerListeners(client: tmi.Client): void {
  client.on('connected', (addr, port) => {
    console.log(`Bot connecté à ${addr}:${port}`);
    console.log(`Channel rejoint : #${process.env.TWITCH_CHANNEL}`);
  });

  client.on('message', (channel, tags, message, self) => {
    if (self) return;

    const username = tags['display-name'] ?? tags.username ?? '';
    // Ban/timeout : toujours le login (le display-name peut être localisé, ex. caractères CJK)
    const login = tags.username ?? '';

    // Modération en priorité
    const mod = checkMessage(tags, message);
    if (mod) {
      if (mod.action === 'ban' && login) {
        console.log(`[mod] Ban de ${username} — ${mod.reason}`);
        client.ban(channel, login, mod.reason).catch(console.error);
      } else if (mod.action === 'timeout' && login) {
        console.log(`[mod] Timeout ${username} (${mod.duration}s) — ${mod.reason}`);
        client.timeout(channel, login, mod.duration, mod.reason).catch(console.error);
      } else if (mod.action === 'delete' && tags.id) {
        client.deletemessage(channel, tags.id).catch(console.error);
      }
      return; // Ne pas traiter les commandes d'un spammer
    }

    if (message.startsWith('!')) {
      handleCommand(client, channel, tags, message).catch(console.error);
    }
  });

  // Auto-shoutout après un raid de 2+ viewers
  client.on('raided', (channel, raidingUser, viewers) => {
    if (viewers >= 2) {
      shoutout(client, channel, raidingUser).catch(console.error);
    }
  });

  registerSubAlerts(client);

  client.on('disconnected', (reason) => {
    console.log(`Bot déconnecté : ${reason}`);
  });
}

async function start(): Promise<void> {
  await ensureValidToken();
  let client = createClient();
  registerListeners(client);
  await client.connect();

  // Annonces Discord des nouvelles vidéos YouTube (indépendant de la connexion Twitch)
  startYoutubeWatcher();

  // Refresh automatique du token avant expiration
  setInterval(async () => {
    console.log('[auth] Rafraîchissement du token...');
    try {
      await refreshAccessToken();
      await client.disconnect();
      client = createClient();
      registerListeners(client);
      await client.connect();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[auth] Échec du refresh, le bot reste connecté avec l\'ancien token :', message);
    }
  }, REFRESH_INTERVAL_MS);
}

start().catch(console.error);
