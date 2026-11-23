import type { ChatUserstate, Client } from 'tmi.js';
import { getStream, getUser, formatDuration } from './twitch-api.js';

/**
 * Gestionnaire principal des commandes du bot
 */
export async function handleCommand(
  client: Client,
  channel: string,
  tags: ChatUserstate,
  message: string,
): Promise<void> {
  const args = message.slice(1).split(' ');
  const command = (args.shift() ?? '').toLowerCase();
  const username = tags['display-name'];
  const isMod = tags.mod || tags['user-type'] === 'mod';
  const isBroadcaster = tags.badges?.broadcaster === '1';

  console.log(`Commande reçue : !${command} de ${username}`);

  switch (command) {
    case 'ping':
      await client.say(channel, `Pong ! @${username}`);
      break;

    case 'hello':
    case 'bonjour':
      await client.say(channel, `Bonjour @${username} ! Bienvenue dans le chat !`);
      break;

    case 'uptime': {
      const channelName = channel.replace('#', '');
      const stream = await getStream(channelName).catch(() => null);
      if (!stream) {
        await client.say(channel, `${channelName} n'est pas en live actuellement.`);
      } else {
        const duration = formatDuration(Date.now() - new Date(stream.started_at).getTime());
        await client.say(channel, `${channelName} est en live depuis ${duration} — en train de jouer à ${stream.game_name} !`);
      }
      break;
    }

    case 'so':
    case 'shoutout': {
      if (!isMod && !isBroadcaster) {
        await client.say(channel, `@${username} cette commande est réservée aux modérateurs.`);
        break;
      }
      const target = args[0]?.replace('@', '');
      if (!target) {
        await client.say(channel, `Usage : !so <pseudo>`);
        break;
      }
      await shoutout(client, channel, target);
      break;
    }

    case 'discord':
      await client.say(channel, `Rejoins notre Discord ! ${process.env.DISCORD_URL}`);
      break;

    case 'commandes':
    case 'commands':
      await client.say(channel, `Commandes disponibles : !ping, !bonjour, !uptime, !discord, !so, !roulette, !commandes`);
      break;

    default:
      break;
  }
}

// Poste un message de shoutout pour un utilisateur Twitch
export async function shoutout(client: Client, channel: string, targetUsername: string): Promise<void> {
  const user = await getUser(targetUsername).catch(() => null);
  if (!user) {
    await client.say(channel, `Impossible de trouver le compte Twitch : ${targetUsername}`);
    return;
  }

  const stream = await getStream(targetUsername).catch(() => null);
  const gameInfo = stream ? ` jouait à ${stream.game_name}` : '';

  await client.say(
    channel,
    `@${user.display_name}${gameInfo} ! Allez lui rendre visite sur https://twitch.tv/${user.login} PogChamp`,
  );
}
