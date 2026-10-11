# syntax=docker/dockerfile:1
FROM node:20-alpine

WORKDIR /app

# Manifestes (workspaces npm) — permet d'installer uniquement les deps de l'API
COPY package.json package-lock.json ./
COPY services/api/package.json ./services/api/
COPY apps/web/package.json ./apps/web/
RUN npm ci --omit=dev --workspace @assistci/api

# Code applicatif + schéma de base (utilisé par les migrations)
COPY services/api ./services/api
COPY database ./database

WORKDIR /app/services/api

# Migrations appliquées à chaque démarrage (idempotentes via la table pgmigrations),
# puis serveur lancé. Le healthcheck est défini dans docker-compose.
CMD ["sh", "-c", "node scripts/migrate.js up && node src/server.js"]
EXPOSE 4001
