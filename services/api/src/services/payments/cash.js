// Paiement en espèces : aucun fournisseur externe.
// L'intention reste en attente jusqu'à confirmation par un administrateur.
const NAME = 'cash';

function isConfigured() {
  return true;
}

async function createCheckout() {
  return {
    providerReference: null,
    checkoutUrl: null,
    status: 'pending',
    metadata: { mode: 'cash' },
  };
}

function verifyWebhook() {
  return false;
}

function parseWebhook() {
  return null;
}

module.exports = { name: NAME, isConfigured, createCheckout, verifyWebhook, parseWebhook };
