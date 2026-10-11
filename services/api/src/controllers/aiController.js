const aiService = require('../services/aiService');

// Proxy : analyse en langage naturel d'une demande de dépannage
async function analyzeRequest(req, res) {
  try {
    const { message, location } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Le message à analyser est obligatoire' });
    }

    const analysis = await aiService.analyzeRequest(message, location || null);
    if (!analysis) {
      return res.status(503).json({ error: 'Le service IA est momentanément indisponible' });
    }

    return res.json(analysis);
  } catch (error) {
    console.error('Erreur analyzeRequest:', error);
    return res.status(500).json({ error: 'Erreur lors de l’analyse IA' });
  }
}

// Proxy : classement des prestataires fournis par le moteur IA
async function rankProviders(req, res) {
  try {
    const { request_district, breakdown_type, urgency = 'normal', providers } = req.body;
    if (!Array.isArray(providers)) {
      return res.status(400).json({ error: 'La liste des prestataires (providers) est obligatoire' });
    }

    const ranking = await aiService.rankProviders({
      request_district: request_district || 'Abidjan',
      breakdown_type: breakdown_type || 'other',
      urgency,
      providers,
    });

    if (!ranking) {
      return res.status(503).json({ error: 'Le service IA est momentanément indisponible' });
    }

    return res.json(ranking);
  } catch (error) {
    console.error('Erreur rankProviders:', error);
    return res.status(500).json({ error: 'Erreur lors du classement IA' });
  }
}

module.exports = {
  analyzeRequest,
  rankProviders,
};
