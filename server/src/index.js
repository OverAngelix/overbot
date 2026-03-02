import 'dotenv/config';
import tmi from 'tmi.js';
import { handleCommand, shoutout } from './commands/index.js';
import { refreshAccessToken, ensureValidToken } from './auth.js';
import { checkMessage } from './moderation.js';

// Rafraîchit le token toutes les 3h30 (token valide 4h)
const REFRESH_INTERVAL_MS = 3.5 * 60 * 60 * 1000;

function createClient() {
  return new tmi.Client({
    options: { debug: true },
    identity: {
      username: process.env.TWITCH_BOT_USERNAME,
      password: `oauth:${process.env.TWITCH_ACCESS_TOKEN}`,
    },
    channels: [process.env.TWITCH_CHANNEL],
  });
}

function registerListeners(client) {
  client.on('connected', (addr, port) => {
    console.log(`Bot connecté à ${addr}:${port}`);
    console.log(`Channel rejoint : #${process.env.TWITCH_CHANNEL}`);
  });

  client.on('message', (channel, tags, message, self) => {
    if (self) return;

    const username = tags['display-name'];

    // Modération en priorité
    const mod = checkMessage(tags, message);
    if (mod) {
      if (mod.action === 'ban') {
        console.log(`[mod] Ban de ${username} — ${mod.reason}`);
        client.ban(channel, username, mod.reason).catch(console.error);
      } else if (mod.action === 'timeout') {
        console.log(`[mod] Timeout ${username} (${mod.duration}s) — ${mod.reason}`);
        client.timeout(channel, username, mod.duration, mod.reason).catch(console.error);
      } else if (mod.action === 'delete') {
        client.deletemessage(channel, tags.id).catch(console.error);
      }
      return; // Ne pas traiter les commandes d'un spammer
    }

    if (message.startsWith('!')) {
      handleCommand(client, channel, tags, message);
    }
  });

  // Auto-shoutout après un raid de 2+ viewers
  client.on('raided', (channel, raidingUser, viewers) => {
    if (viewers >= 2) {
      shoutout(client, channel, raidingUser).catch(console.error);
    }
  });

  client.on('disconnected', (reason) => {
    console.log(`Bot déconnecté : ${reason}`);
  });
}

async function start() {
  await ensureValidToken();
  let client = createClient();
  registerListeners(client);
  await client.connect();

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
      console.error('[auth] Échec du refresh, le bot reste connecté avec l\'ancien token :', err.message);
    }
  }, REFRESH_INTERVAL_MS);
}

start().catch(console.error);
