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

// Mots/noms de services suspects détectés même sans URL
const SPAM_KEYWORDS_STANDALONE = [
  'stream boo',
  'streamboo',
  'streamhub',
  'stream hub',
  'viewbotting',
  'followbot',
  'twitch follow',
  'free followers',
  'free viewers',
  'get viewers',
  'buy followers',
  'buy viewers',
];

// Regex qui détecte une URL dans un message
const URL_REGEX = /https?:\/\/[^\s]+|www\.[^\s]+|[a-z0-9-]+\.[a-z]{2,}(\/[^\s]*)?/gi;

/**
 * Nettoie un message des caractères Unicode parasites (diacritiques, zero-width, etc.)
 */
function sanitize(text) {
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u200B-\u200F\u2028-\u202F\uFEFF\u00AD]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

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

  const cleaned = sanitize(message);
  const lowerMsg = cleaned.toLowerCase();
  const noSpaceMsg = lowerMsg.replace(/\s/g, '');

  // 1. Lien vers un domaine de spam connu → ban immédiat
  const urls = cleaned.match(URL_REGEX) || [];
  for (const url of urls) {
    const lowerUrl = url.toLowerCase();
    for (const domain of SPAM_DOMAINS) {
      if (lowerUrl.includes(domain)) {
        return { action: 'ban', reason: `Spam bot détecté (domaine : ${domain})` };
      }
    }
  }

  // 2. Mention du nom d'un service spam même sans URL → ban immédiat
  //    Vérifie aussi la version sans espaces pour contrer "streamboo .com"
  for (const keyword of SPAM_KEYWORDS_STANDALONE) {
    const noSpaceKw = keyword.replace(/\s/g, '');
    if (lowerMsg.includes(keyword) || noSpaceMsg.includes(noSpaceKw)) {
      return { action: 'ban', reason: `Spam bot détecté (service mentionné : ${keyword})` };
    }
  }

  // 3. Message contenant une URL + mots-clés suspects → timeout 10 min
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
