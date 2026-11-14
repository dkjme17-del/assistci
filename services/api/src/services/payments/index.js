const wave = require('./wave');
const httpProvider = require('./httpProvider');
const cash = require('./cash');

const PROVIDERS = {
  wave,
  http: httpProvider,
  cash,
};

// Moyen de paiement -> fournisseur technique.
const PROVIDER_BY_METHOD = {
  wave: 'wave',
  orange_money: 'http',
  mtn_momo: 'http',
  moov_money: 'http',
  card: 'http',
  cash: 'cash',
};

function getProvider(name) {
  return PROVIDERS[name] || null;
}

function resolveProvider(paymentMethod) {
  const name = PROVIDER_BY_METHOD[paymentMethod];
  return name ? getProvider(name) : null;
}

function isMethodAvailable(paymentMethod) {
  const provider = resolveProvider(paymentMethod);
  return Boolean(provider && provider.isConfigured());
}

module.exports = {
  PROVIDER_BY_METHOD,
  getProvider,
  resolveProvider,
  isMethodAvailable,
};
