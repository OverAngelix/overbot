import { requireEnv } from './env.js';

// Sous-ensemble des champs Helix utilisés par le bot
export interface HelixStream {
  id: string;
  user_login: string;
  user_name: string;
  game_name: string;
  title: string;
  viewer_count: number;
  started_at: string;
}

export interface HelixUser {
  id: string;
  login: string;
  display_name: string;
}

interface HelixResponse<T> {
  data?: T[];
}

function headers(): Record<string, string> {
  return {
    'Client-Id': requireEnv('TWITCH_CLIENT_ID'),
    Authorization: `Bearer ${requireEnv('TWITCH_ACCESS_TOKEN')}`,
  };
}

async function helixGetFirst<T>(path: string): Promise<T | null> {
  const res = await fetch(`https://api.twitch.tv/helix/${path}`, { headers: headers() });
  const data = (await res.json()) as HelixResponse<T>;
  return data.data?.[0] ?? null;
}

// Retourne les infos du stream en cours, ou null si hors ligne
export function getStream(channelName: string): Promise<HelixStream | null> {
  return helixGetFirst<HelixStream>(`streams?user_login=${encodeURIComponent(channelName)}`);
}

// Retourne les infos d'un utilisateur Twitch
export function getUser(username: string): Promise<HelixUser | null> {
  return helixGetFirst<HelixUser>(`users?login=${encodeURIComponent(username)}`);
}

// Formate une durée en millisecondes → "2h 34m" ou "45m"
export function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
