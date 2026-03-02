function headers() {
  return {
    'Client-Id': process.env.TWITCH_CLIENT_ID,
    'Authorization': `Bearer ${process.env.TWITCH_ACCESS_TOKEN}`,
  };
}

// Retourne les infos du stream en cours, ou null si hors ligne
export async function getStream(channelName) {
  const res = await fetch(
    `https://api.twitch.tv/helix/streams?user_login=${encodeURIComponent(channelName)}`,
    { headers: headers() }
  );
  const data = await res.json();
  return data.data?.[0] ?? null;
}

// Retourne les infos d'un utilisateur Twitch
export async function getUser(username) {
  const res = await fetch(
    `https://api.twitch.tv/helix/users?login=${encodeURIComponent(username)}`,
    { headers: headers() }
  );
  const data = await res.json();
  return data.data?.[0] ?? null;
}

// Formate une durée en millisecondes → "2h 34m" ou "45m"
export function formatDuration(ms) {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
