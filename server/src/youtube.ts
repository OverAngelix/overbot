// Annonce automatiquement les nouvelles vidéos YouTube dans un salon Discord.
// Source : flux RSS public de la chaîne (pas de clé API).
// Envoi : webhook Discord (pas de bot Discord nécessaire).

const POLL_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

interface YoutubeVideo {
  id: string;
  title: string;
  url: string;
  published: string;
}

// Vidéos déjà vues (annoncées ou présentes au démarrage)
const seenVideoIds = new Set<string>();
let initialized = false;

function decodeXml(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function parseFeed(xml: string): YoutubeVideo[] {
  const videos: YoutubeVideo[] = [];
  for (const [, entry = ''] of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const id = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1];
    const title = entry.match(/<title>([^<]*)<\/title>/)?.[1];
    const published = entry.match(/<published>([^<]+)<\/published>/)?.[1] ?? '';
    if (!id || title === undefined) continue;
    videos.push({
      id,
      title: decodeXml(title),
      url: `https://www.youtube.com/watch?v=${id}`,
      published,
    });
  }
  return videos;
}

async function fetchVideos(channelId: string): Promise<YoutubeVideo[]> {
  const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`);
  if (!res.ok) throw new Error(`Flux YouTube indisponible (HTTP ${res.status})`);
  return parseFeed(await res.text());
}

async function postToDiscord(webhookUrl: string, video: YoutubeVideo): Promise<void> {
  const template = process.env.YOUTUBE_DISCORD_MESSAGE || '{url}';
  const content = template.replace(/\{title\}/g, video.title).replace(/\{url\}/g, video.url);

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // allowed_mentions : autorise @everyone / @here / rôles seulement s'ils sont écrits dans le template
    body: JSON.stringify({ content, allowed_mentions: { parse: ['everyone', 'roles'] } }),
  });
  if (!res.ok) throw new Error(`Webhook Discord en échec (HTTP ${res.status}) : ${await res.text()}`);
}

async function checkForNewVideos(channelId: string, webhookUrl: string): Promise<void> {
  const videos = await fetchVideos(channelId);

  // Premier passage : on mémorise l'existant sans rien annoncer
  if (!initialized) {
    for (const video of videos) seenVideoIds.add(video.id);
    initialized = true;
    console.log(`[youtube] Suivi actif (${videos.length} vidéos existantes ignorées)`);
    return;
  }

  // Le flux est trié du plus récent au plus ancien : on annonce dans l'ordre chronologique
  const newVideos = videos.filter((v) => !seenVideoIds.has(v.id)).reverse();
  for (const video of newVideos) {
    await postToDiscord(webhookUrl, video);
    seenVideoIds.add(video.id);
    console.log(`[youtube] Annoncée sur Discord : ${video.title} (${video.url})`);
  }
}

/**
 * Lance la surveillance de la chaîne YouTube.
 * Désactivée si YOUTUBE_CHANNEL_ID ou DISCORD_WEBHOOK_URL ne sont pas définis.
 */
export function startYoutubeWatcher(): void {
  const channelId = process.env.YOUTUBE_CHANNEL_ID;
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!channelId || !webhookUrl) {
    console.log('[youtube] YOUTUBE_CHANNEL_ID ou DISCORD_WEBHOOK_URL absent : annonces YouTube désactivées');
    return;
  }

  const run = () => {
    checkForNewVideos(channelId, webhookUrl).catch((err) => {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[youtube]', message);
    });
  };

  run();
  setInterval(run, POLL_INTERVAL_MS);
}
