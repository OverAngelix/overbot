// Lit une variable d'environnement obligatoire (erreur explicite si absente).
export function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Variable d'environnement manquante : ${key}`);
  }
  return value;
}
