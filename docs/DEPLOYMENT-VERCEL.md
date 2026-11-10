# Déployer la démo ASSISTCI gratuitement

Vercel héberge le frontend Next.js. L'API est hébergée sur l'offre gratuite de
Render et la base PostgreSQL sur l'offre gratuite de Neon. Aucun service n'est
créé automatiquement : vous devez les ajouter dans vos comptes.

## Limites de la démo gratuite

- L'API Render peut s'endormir après une période d'inactivité ; le premier appel
  suivant peut être lent.
- Le système de fichiers de Render est éphémère. Les téléversements d'images et
  de documents KYC sont désactivés explicitement dans cette configuration.
  N'envoyez pas de documents d'identité à la démo.
- Le service d'IA n'est pas déployé ; l'application utilise ses réponses de
  secours sans recommandations IA.
- Les quotas et conditions des offres gratuites peuvent changer. Vérifiez-les
  auprès de Neon, Render et Vercel avant le déploiement.

Cette configuration est destinée à une démonstration, pas à une exploitation
avec de vrais documents clients.

## 1. Créer la base PostgreSQL sur Neon

1. Créez un projet PostgreSQL sur [Neon](https://neon.tech/) et copiez sa chaîne
   de connexion. Gardez-la secrète et vérifiez qu'elle inclut
   `sslmode=require`.
2. Les migrations sont appliquées automatiquement au démarrage de l'API Render.

## 2. Déployer l'API sur Render

1. Poussez sur GitHub les modifications à déployer.
2. Dans Render, créez un **Blueprint** à partir du dépôt et confirmez
   l'application de `render.yaml`.
3. Pour `DATABASE_URL`, saisissez la chaîne Neon. Pour `CORS_ORIGINS`, saisissez
   l'origine de production Vercel, par exemple `https://assistci.vercel.app`
   (sans chemin final). Vous pourrez ajuster cette valeur après avoir créé le
   projet Vercel si son domaine diffère.
4. Attendez la fin du déploiement et copiez l'URL publique de `assistci-api`.
   Vérifiez `https://<url-api>/api/health` : la réponse doit indiquer
   `"database":"connected"`.

Render génère automatiquement `JWT_SECRET`. Le blueprint désactive aussi les
téléversements côté API.

## 3. Déployer le frontend sur Vercel

1. Importez le dépôt GitHub dans Vercel.
2. Définissez **Root Directory** sur `apps/web` et laissez Vercel détecter Next.js.
   Le projet utilise les workspaces npm et le fichier de verrouillage à la
   racine.
3. Dans les variables d'environnement de production, ajoutez :
   - `NEXT_PUBLIC_API_URL` : URL publique de l'API Render suivie de `/api`,
     par exemple `https://assistci-api.onrender.com/api`.
   - `NEXT_PUBLIC_FILE_UPLOADS_ENABLED` : `false`.
4. Lancez le déploiement Vercel.

Si vous changez une variable `NEXT_PUBLIC_*`, redéployez le frontend pour
l'intégrer au build. Les déploiements de prévisualisation ont une autre origine :
ajoutez-la à `CORS_ORIGINS` sur Render si vous souhaitez les tester.
