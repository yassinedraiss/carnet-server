# Carnet de bord — Serveur

Petit serveur qui garde ta clé API Anthropic en sécurité et lit tes photos
(compteur, pompe, reçu) pour l'app Carnet de bord.

## Déployer sur Render.com (gratuit)

1. Va sur **render.com**, crée un compte (tu peux te connecter avec GitHub).
2. Mets ce dossier (`carnet-server`) dans un dépôt GitHub :
   - Le plus simple : crée un nouveau dépôt sur github.com, puis glisse-dépose
     tous les fichiers de ce dossier dans l'interface web de GitHub (bouton
     "Add file" → "Upload files").
3. Sur Render, clique **New +** → **Web Service**.
4. Connecte le dépôt GitHub que tu viens de créer.
5. Configure :
   - **Name** : `carnet-server` (ou ce que tu veux)
   - **Region** : la plus proche de toi
   - **Branch** : `main`
   - **Build Command** : `npm install`
   - **Start Command** : `npm start`
   - **Instance Type** : `Free`
6. Dans **Environment Variables**, ajoute :
   - **Key** : `ANTHROPIC_API_KEY`
   - **Value** : ta clé (commence par `sk-ant-...`)
7. Clique **Create Web Service**. Render va installer et démarrer le serveur
   (2-3 minutes).
8. Une fois prêt, Render te donne une URL du type :
   `https://carnet-server-xxxx.onrender.com`
   → **Garde cette URL**, c'est elle qu'il faut coller dans l'app.

## Vérifier que ça marche

Ouvre `https://carnet-server-xxxx.onrender.com/health` dans un navigateur.
Tu dois voir : `{"status":"ok"}`

## Note sur le plan gratuit de Render

Le service gratuit "s'endort" après 15 minutes sans utilisation, et met
5-15 secondes à se réveiller au premier scan après une pause. C'est normal,
pas un bug — le scan suivant est instantané.

## Coût

Render est gratuit. Seul l'appel à l'API Anthropic a un coût, à l'usage
(quelques centimes par scan avec le modèle utilisé ici). Ton crédit de
démarrage Anthropic couvre largement les tests.
