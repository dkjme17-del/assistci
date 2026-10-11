const { config } = require('../config/env');
const logger = require('../config/logger');

const AI_SERVICE_URL = config.ai.url;
const AI_TIMEOUT_MS = config.ai.timeoutMs;

async function callAi(path, payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const response = await fetch(`${AI_SERVICE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Réponse IA ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

// Analyse en langage naturel d'une demande de dépannage
async function analyzeRequest(message, location = null) {
  if (!message || !message.trim()) return null;
  try {
    return await callAi('/analyze-request', { message, location });
  } catch (error) {
    logger.warn({ err: error.message }, 'Service IA indisponible (analyze-request)');
    return null;
  }
}

// Classement / recommandation des prestataires pour une demande
async function rankProviders(payload) {
  try {
    return await callAi('/rank-providers', payload);
  } catch (error) {
    logger.warn({ err: error.message }, 'Service IA indisponible (rank-providers)');
    return null;
  }
}

module.exports = {
  AI_SERVICE_URL,
  analyzeRequest,
  rankProviders,
};
