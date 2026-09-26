// Serveur "Carnet de bord" — garde la clé API Anthropic en sécurité.
// L'app (PWA / APK) envoie une photo ici, ce serveur appelle Claude
// avec la clé secrète (jamais exposée au téléphone), et renvoie les
// valeurs lues (compteur, quantité, prix).

const express = require('express');
const multer = require('multer');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.ANTHROPIC_API_KEY;

if (!API_KEY) {
  console.error('ERREUR: la variable d\'environnement ANTHROPIC_API_KEY est manquante.');
  console.error('Ajoute-la dans les "Environment Variables" de ton service Render.');
  process.exit(1);
}

const anthropic = new Anthropic({ apiKey: API_KEY });

const app = express();
app.use(cors()); // autorise l'app mobile/PWA à appeler ce serveur depuis n'importe où
app.use(express.json({ limit: '2mb' }));

// Upload en mémoire, limite 8 Mo par photo (largement suffisant après compression côté app)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

const PROMPTS = {
  compteur: "Regarde cette photo d'un compteur kilométrique (odomètre) de voiture. Lis le nombre total de kilomètres affiché. Réponds avec UN SEUL objet JSON, rien avant, rien après, pas de phrase, pas de ```markdown```. Format exact: {\"compteur\": 123456} ou {\"compteur\": null} si illisible.",
  pompe: "Regarde cette photo de l'écran d'une pompe à essence ou gasoil. Elle affiche normalement la quantité en litres, le prix total, et/ou le prix au litre. Réponds avec UN SEUL objet JSON, rien avant, rien après, pas de phrase, pas de ```markdown```. Format exact: {\"quantite\": 12.34, \"prix\": 123.45, \"prixLitre\": 14.68} — utilise null pour toute valeur non visible, et le point comme séparateur décimal.",
  recu: "Regarde cette photo d'un reçu ou bon de paiement de carburant. Réponds avec UN SEUL objet JSON, rien avant, rien après, pas de phrase, pas de ```markdown```. Format exact: {\"quantite\": 12.34, \"prix\": 123.45} — utilise null pour toute valeur non visible, et le point comme séparateur décimal."
};

function extractJson(text) {
  if (!text) return null;
  let cleaned = text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');
  try { return JSON.parse(cleaned); } catch (e) {}
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch (e) {}
  }
  return null;
}

app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'carnet-server' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/scan/:kind', upload.single('photo'), async (req, res) => {
  const kind = req.params.kind;
  if (!PROMPTS[kind]) {
    return res.status(400).json({ error: 'bad_kind', message: 'Type inconnu: ' + kind });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'no_photo', message: 'Aucune photo reçue.' });
  }

  const mediaType = req.file.mimetype && req.file.mimetype.startsWith('image/') ? req.file.mimetype : 'image/jpeg';
  const base64Image = req.file.buffer.toString('base64');

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Image } },
            { type: 'text', text: PROMPTS[kind] }
          ]
        }
      ]
    });

    const text = message.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('');

    const parsed = extractJson(text);
    if (!parsed) {
      return res.status(502).json({ error: 'bad_response', message: 'Réponse IA non exploitable.', raw: text.slice(0, 200) });
    }
    res.json(parsed);
  } catch (err) {
    console.error('Anthropic API error:', err.message || err);
    res.status(500).json({ error: 'api_error', message: err.message || String(err) });
  }
});

app.listen(PORT, () => {
  console.log('Carnet-server démarré sur le port ' + PORT);
});
