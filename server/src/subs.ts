import type { Client, CommonSubUserstate, SubGiftUserstate } from 'tmi.js';

// Nom d'utilisateur utilisé par Twitch pour les gifts anonymes
const ANONYMOUS_GIFTER = 'ananonymousgifter';

// IDs des gifts groupés ("X offre 5 subs") déjà annoncés :
// Twitch envoie ensuite un event `subgift` par destinataire, qu'on ignore pour éviter le spam.
const announcedMysteryGifts = new Set<string>();

function displayName(username: string, userstate: CommonSubUserstate): string {
  if (username.toLowerCase() === ANONYMOUS_GIFTER) return 'Un généreux anonyme';
  return userstate['display-name'] || username;
}

function isPartOfMysteryGift(userstate: SubGiftUserstate): boolean {
  const originId = userstate['msg-param-origin-id'];
  return Boolean(userstate['msg-param-community-gift-id'])
    || (originId !== undefined && announcedMysteryGifts.has(originId));
}

function say(client: Client, channel: string, message: string): void {
  console.log(`[subs] ${message}`);
  client.say(channel, message).catch(console.error);
}

/**
 * Annonce dans le chat les nouveaux subs, resubs et gifts.
 */
export function registerSubAlerts(client: Client): void {
  // Nouveau sub
  client.on('subscription', (channel, username, _methods, _message, userstate) => {
    const name = displayName(username, userstate);
    say(client, channel, `Merci @${name} pour le sub ! <3`);
  });

  // Resub
  client.on('resub', (channel, username, _months, _message, userstate) => {
    const name = displayName(username, userstate);
    const months = Number(userstate['msg-param-cumulative-months']) || 0;
    const duration = months > 1 ? ` — ${months} mois` : '';
    say(client, channel, `Merci @${name} pour le resub${duration} ! <3`);
  });

  // Gift de plusieurs subs d'un coup
  client.on('submysterygift', (channel, username, numbOfSubs, _methods, userstate) => {
    const originId = userstate['msg-param-origin-id'];
    if (originId) announcedMysteryGifts.add(originId);
    const name = displayName(username, userstate);
    say(client, channel, `${name} offre ${numbOfSubs} subs à la commu ! Merci énormément <3`);
  });

  // Gift d'un sub à une personne précise
  client.on('subgift', (channel, username, _streakMonths, recipient, _methods, userstate) => {
    if (isPartOfMysteryGift(userstate)) return;
    const name = displayName(username, userstate);
    const recipientName = userstate['msg-param-recipient-display-name'] || recipient;
    say(client, channel, `${name} offre un sub à @${recipientName} ! Merci <3`);
  });
}
