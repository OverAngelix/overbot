# Overbot — Bot Twitch

Bot Twitch personnel basé sur [TMI.js](https://tmijs.com/) et Node.js 20.

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
npm run dev    # développement (rechargement auto)
npm start      # production
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

Pour ajouter des domaines ou mots-clés, édite `src/moderation.js` :
- `SPAM_DOMAINS` → ban immédiat
- `SUSPICIOUS_KEYWORDS` → timeout 10 min

---

## Raids

Quand le channel reçoit un raid avec **2 viewers ou plus**, le bot déclenche automatiquement un `!so` vers le raideur.

Le seuil est configurable dans `src/index.js` :
```js
if (viewers >= 2) { ... }
```

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
│   ├── index.js          # Point d'entrée, connexion TMI, events
│   ├── auth.js           # Gestion OAuth (refresh, validation)
│   ├── twitch-api.js     # Appels à l'API Helix (stream, user)
│   ├── moderation.js     # Détection spam et actions
│   └── commands/
│       └── index.js      # Gestionnaire de commandes
├── scripts/
│   └── get-token.js      # Génération du token OAuth
├── .env.example
└── package.json
```
