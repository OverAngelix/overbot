FROM node:20-alpine

WORKDIR /app

# Copie les manifestes en premier pour profiter du cache Docker
COPY package*.json ./
RUN npm ci --omit=dev

# Copie le code source
COPY src/ ./src/

# Utilisateur non-root par sécurité
USER node

CMD ["node", "src/index.js"]
