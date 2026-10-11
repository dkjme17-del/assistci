# ASSISTCI — Guide d'exploitation (ops)

## Architecture

| Service | Technologie | Rôle |
| --- | --- | --- |
| `web` | Next.js 14 (standalone) | Front, sert aussi `/api` en relais Caddy → `api` |
| `api` | Node.js 20 + Express | API REST, auth JWT, migrations |
| `db` | PostgreSQL 16 (optionnel) | Conteneur local ; en prod on utilise une base managée (Neon) |
| `ai` | Python 3.12 + FastAPI | Enrichissement des demandes + classement des prestataires |
| `caddy` | Caddy 2 | Reverse-proxy + TLS automatique |

Le front appelle l'API via une URL relative (`/api`) : Caddy route `/api/*` vers `api:4001`, le reste vers `web:3001`. Aucun CORS nécessaire en production.

## Développement local

```bash
npm install                                # install toutes les workspaces
npm run migrate:api                        # applique les migrations (base locale)
npm run api                                # API sur :4001 (--watch)
npm run dev                                # front sur :3001
npm run ai                                 # service IA sur :8000 (venv requis)
npm run test:api                           # tests vitest + supertest
```

Variables attendues à la racine (fichier `services/api/.env`, voir `.env.example`) :
- Base : `DATABASE_URL` (chaîne complète, ex. Neon, **prioritaire**) — sinon `PGHOST`,
  `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`.
- `JWT_SECRET`, `AI_SERVICE_URL`.

## Base de données

ASSISTCI est conçu pour une base managée (Neon) : mettre la chaîne de connexion dans
`DATABASE_URL` (avec `sslmode=require`). Le schéma et le compte admin sont créés par les
migrations au premier démarrage (ou via `npm run migrate:api`).

Pas de Neon / besoin d'une Postgres locale auto-hébergée :
`docker compose -f docker-compose.yml -f docker-compose.db.yml up -d` (ajoute le service `db`
et fait attendre l'API qu'il soit healthy).

## Déploiement sur VPS (Docker Compose + Caddy)

### 1. Prérequis

- VPS Linux (Debian/Ubuntu recommandé), Docker + plugin Compose.
- Un domaine pointé vers le VPS (`A` record, ex. `assistci.ci`).

### 2. Variables d'environnement

```bash
cp .env.example .env
# Renseigner alors : DOMAIN, DATABASE_URL (Neon) ou PGPASSWORD, JWT_SECRET
# (openssl rand -base64 48), CORS_ORIGINS, NEXT_PUBLIC_API_URL
```

`JWT_SECRET` : valeur unique générée, **jamais** la valeur par défaut (le refus de démarrage
en production est volontaire si le secret fait moins de 32 caractères).

### 3. Premier lancement

```bash
docker compose up -d --build
docker compose ps        # tous les conteneurs doivent être "healthy" / "running"
```

Au premier démarrage :
1. `api` applique automatiquement les migrations (table `pgmigrations`) puis démarre.
   Le schéma et le compte admin sont créés sur la base (Neon ou Postgres locale).
2. `caddy` obtient le certificat TLS pour `DOMAIN`.

### 4. Premières opérations de sécurité

- Changer le mot de passe admin : connexion avec `admin@assistci.ci` / `Admin123!`
  (compte créé UNIQUEMENT s'il n'existe pas), puis mise à jour du mot de passe.
- Vérifier : `https://<domaine>/api/health` → `"database":"connected"`.

### 5. Démarrage local de la stack (sans TLS)

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

## Mise à jour de l'application

```bash
git pull
docker compose build
docker compose up -d
# Les migrations non appliquées sont exécutées au redémarrage de l'API.
```

## Sauvegardes de la base

Base managée (Neon) — sauvegarde :
```bash
pg_dump "$DATABASE_URL" > backup_$(date +%F_%H%M).sql
```
Restore :
```bash
psql "$DATABASE_URL" < backup_2026-10-11_1200.sql
```

Postgres auto-hébergée (compose `db`) :
```bash
docker compose exec -T db pg_dump -U postgres assistci_db > backup_$(date +%F_%H%M).sql
docker compose exec -T db psql -U postgres -d assistci_db < backup_2026-10-11_1200.sql
```

Sauvegarde automatique (cron) :
```cron
0 2 * * * pg_dump "$(grep ^DATABASE_URL /opt/assistci/.env | cut -d= -f2-)" > /var/backups/assistci_$(date +\%F).sql && find /var/backups -name 'assistci_*.sql' -mtime +14 -delete
```

## Journalisation et dépannage

- Logs : `docker compose logs -f api` (JSON ligne par ligne via pino) / `logs -f web` / `logs -f db`.
- Santé : `docker compose ps` ; API : `curl -s https://<domaine>/api/health`.
- Erreur typique « JWT_SECRET » : exécuter `openssl rand -base64 48`, mettre dans `.env`, `docker compose up -d`.
- Migration bloquée : `docker compose exec api node scripts/migrate.js up --log` puis consulter les logs pour l'erreur SQL.
- Redémarrage des services : `docker compose restart api` (le réseau interne n'est pas affecté).

## Sécurité (liste de contrôle)

- `JWT_SECRET` unique ≥ 32 caractères (sinon l'API refuse de démarrer en production).
- `PGPASSWORD` fort, base non exposée sur Internet (seul Caddy publie 80/443).
- CORS : restreindre `CORS_ORIGINS` au domaine réel si l'API est appelée directement (non via `/api` relatif).
- Rate-limit global sur `/api` + limite renforcée sur `/api/auth` (anti-abus de connexion).
- Le compte admin par défaut doit changer de mot de passe au premier lancement.