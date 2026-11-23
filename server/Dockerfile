# ── Build : compile le TypeScript ────────────
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# ── Runtime : uniquement le JS compilé ───────
FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist

USER node

CMD ["node", "dist/index.js"]
