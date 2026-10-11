# ASSISTCI

ASSISTCI est une plateforme de mise en relation entre clients et prestataires de services de proximité, avec un premier focus sur l’assistance automobile à Abidjan.

## Stack proposée

- Frontend : Next.js
- Backend : Node.js + Express.js
- Base de données : PostgreSQL
- IA / ML : Python
- API : REST

## Structure du projet

- `apps/web` : interface web Next.js
- `services/api` : API backend Express
- `services/ai` : service d’IA / ML en Python
- `database` : scripts SQL et schéma

## Démarrage rapide

### 1. Installer les dépendances

```bash
npm install
```

### 2. Démarrer le backend

```bash
npm run api
```

### 3. Démarrer le frontend

```bash
npm run dev
```

### 4. Démarrer le service IA

```bash
cd services/ai
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

## MVP prévu

- inscription / connexion
- gestion de profils
- recherche de prestataires
- création de demande d’intervention
- acceptation / refus de demande
- suivi de statut
- notifications
- avis et réputation
- administration basique
