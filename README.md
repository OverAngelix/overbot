# Overbot — Bot Twitch

Bot Twitch personnel basé sur [TMI.js](https://tmijs.com/), écrit en TypeScript (Node.js 20).

---

## Installation

```bash
cd server
npm install
```

---

## Configuration

Copie le fichier d'exemple et remplis les valeurs :

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `TWITCH_CLIENT_ID` | Client ID de ton app Twitch ([dev.twitch.tv/console](https://dev.twitch.tv/console)) |
| `TWITCH_CLIENT_SECRET` | Client Secret de ton app Twitch |
| `TWITCH_REDIRECT_URI` | `http://localhost:3000/auth/callback` (doit correspondre à la console Twitch) |
| `TWITCH_CHANNEL` | Nom de ton channel (sans le `#`) |
| `TWITCH_BOT_USERNAME` | Nom d'utilisateur du bot |
| `TWITCH_ACCESS_TOKEN` | Rempli automatiquement par `npm run get-token` |
| `TWITCH_REFRESH_TOKEN` | Rempli automatiquement par `npm run get-token` |
| `DISCORD_URL` | Lien de ton serveur Discord |
| `YOUTUBE_CHANNEL_ID` | *(optionnel)* ID de ta chaîne YouTube (`UC…`), pour les annonces Discord |
| `DISCORD_WEBHOOK_URL` | *(optionnel)* URL du webhook du salon Discord où annoncer les vidéos |
| `YOUTUBE_DISCORD_MESSAGE` | *(optionnel)* Message d'annonce, `{title}` et `{url}` sont remplacés |

---

## Génération du token OAuth

```bash
npm run get-token
```

Le script ouvre ton navigateur sur la page d'autorisation Twitch, puis écrit automatiquement `TWITCH_ACCESS_TOKEN` et `TWITCH_REFRESH_TOKEN` dans ton `.env`.

> À relancer si tu modifies les scopes.

---

## Lancement

```bash
npm run dev        # développement (tsx, rechargement auto)
npm run build      # compile le TypeScript dans dist/
npm start          # production (lance dist/index.js)
npm run typecheck  # vérification des types (src + scripts)
```

---

## Commandes chat

| Commande | Accès | Description |
|---|---|---|
| `!ping` | Tous | Répond "Pong !" |
| `!bonjour` / `!hello` | Tous | Message de bienvenue |
| `!uptime` | Tous | Durée du live en cours et jeu joué |
| `!discord` | Tous | Poste le lien du serveur Discord |
| `!so <pseudo>` | Mods / Broadcaster | Shoutout vers un autre streamer avec lien et jeu en cours |
| `!commandes` | Tous | Liste toutes les commandes disponibles |

---

## Modération automatique

Le bot analyse chaque message en temps réel.

| Détection | Action |
|---|---|
| URL vers un domaine de spam connu (Streamboo, viewbotting…) | **Ban permanent** |
| URL + mot-clé suspect (`free viewer`, `sub4sub`, `follow me`…) | **Timeout 10 minutes** |

Les **mods**, **VIPs** et le **broadcaster** ne sont jamais concernés.

Pour ajouter des domaines ou mots-clés, édite `src/moderation.ts` :
- `SPAM_DOMAINS` → ban immédiat
- `SUSPICIOUS_KEYWORDS` → timeout 10 min

---

## Raids

Quand le channel reçoit un raid avec **2 viewers ou plus**, le bot déclenche automatiquement un `!so` vers le raideur.

Le seuil est configurable dans `src/index.ts` :
```ts
if (viewers >= 2) { ... }
```

---

## Alertes subs

Le bot remercie automatiquement dans le chat (fichier `src/subs.ts`) :

| Événement | Exemple de message |
|---|---|
| Nouveau sub | `Merci @Pseudo pour le sub ! <3` |
| Resub | `Merci @Pseudo pour le resub — 12 mois ! <3` |
| Gift de plusieurs subs | `@Pseudo offre 5 subs à la commu ! Merci énormément <3` |
| Gift à une personne | `@Pseudo offre un sub à @Destinataire ! Merci <3` |

Lors d'un gift groupé, seul le message global est posté (pas un message par destinataire).

---

## Annonces YouTube sur Discord

Toutes les **10 minutes**, le bot lit le flux RSS public de la chaîne YouTube (`YOUTUBE_CHANNEL_ID`) et poste chaque nouvelle vidéo dans un salon Discord via un webhook (`DISCORD_WEBHOOK_URL`). Fichier : `src/youtube.ts`.

- **Webhook** : sur Discord, *Modifier le salon > Intégrations > Webhooks > Nouveau webhook*, puis *Copier l'URL du webhook*.
- **ID de chaîne** : YouTube Studio > *Paramètres > Chaîne > Paramètres avancés* (commence par `UC`).
- **Message** : par défaut juste le lien de la vidéo (Discord affiche l'aperçu avec le titre et la miniature). Personnalisable avec `YOUTUBE_DISCORD_MESSAGE`, par ex. `@everyone Nouvelle VOD : {title} {url}`.

Au démarrage, les vidéos déjà en ligne sont mémorisées sans être annoncées, pour éviter les doublons. Conséquence : une vidéo publiée pendant que le bot est éteint ne sera pas annoncée.

Si une des deux variables est absente, la fonctionnalité est simplement désactivée.

---

## Refresh du token

Le token OAuth Twitch expire après **4 heures**. Le bot le rafraîchit automatiquement toutes les **3h30** sans interruption.

- En local : le nouveau token est écrit dans le `.env`
- En production (`NODE_ENV=production`) : seul `process.env` est mis à jour (filesystem non utilisé)

Au démarrage, le bot vérifie aussi la validité du token et le rafraîchit si nécessaire.

---

## Structure du projet

```
server/
├── src/
│   ├── index.ts          # Point d'entrée, connexion TMI, events
│   ├── auth.ts           # Gestion OAuth (refresh, validation)
│   ├── env.ts            # Lecture des variables d'environnement obligatoires
│   ├── twitch-api.ts     # Appels à l'API Helix (stream, user)
│   ├── moderation.ts     # Détection spam et actions
│   ├── subs.ts           # Alertes subs / resubs / gifts
│   ├── youtube.ts        # Annonces Discord des nouvelles vidéos YouTube
│   └── commands.ts       # Gestionnaire de commandes
├── scripts/
│   └── get-token.ts      # Génération du token OAuth
├── dist/                 # JS compilé (généré par npm run build, non versionné)
├── tsconfig.json
├── .env.example
└── package.json
```
