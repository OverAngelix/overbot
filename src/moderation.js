// Domaines de spam connus — ajoute/retire selon tes besoins
const SPAM_DOMAINS = [
  'streamboo',
  'streamhub',
  'stream.boo',
  'viewbotting',
  'followbot',
  'twitch-follow',
  'twitch-viewers',
  'free-followers',
  'get-viewers',
];

// Regex qui détecte une URL dans un message
const URL_REGEX = /https?:\/\/[^\s]+|www\.[^\s]+|[a-z0-9-]+\.[a-z]{2,}(\/[^\s]*)?/gi;

/**
 * Analyse un message et retourne l'action à effectuer, ou null si rien à faire.
 * @returns {{ action: 'ban'|'timeout'|'delete', reason: string, duration?: number } | null}
 */
export function checkMessage(tags, message) {
  const isMod = tags.mod || tags['user-type'] === 'mod';
  const isBroadcaster = tags.badges?.broadcaster === '1';
  const isVip = tags.badges?.vip === '1';

  // Ne jamais modérer les mods / broadcaster / VIPs
  if (isMod || isBroadcaster || isVip) return null;

  const lowerMsg = message.toLowerCase();

  // 1. Lien vers un domaine de spam connu → ban immédiat
  const urls = message.match(URL_REGEX) || [];
  for (const url of urls) {
    const lowerUrl = url.toLowerCase();
    for (const domain of SPAM_DOMAINS) {
      if (lowerUrl.includes(domain)) {
        return { action: 'ban', reason: `Spam bot détecté (domaine : ${domain})` };
      }
    }
  }

  // 2. Message contenant une URL + mots-clés suspects → timeout 10 min
  const SUSPICIOUS_KEYWORDS = [
    'free viewer', 'free follower', 'boost your stream',
    'buy viewer', 'buy follower', 'grow your channel',
    'check my stream', 'follow me', 'sub4sub', 'follow4follow',
  ];
  const hasUrl = urls.length > 0;
  const hasSuspiciousKeyword = SUSPICIOUS_KEYWORDS.some(kw => lowerMsg.includes(kw));

  if (hasUrl && hasSuspiciousKeyword) {
    return { action: 'timeout', duration: 600, reason: 'Lien suspect + mot-clé spam' };
  }

  return null;
}
