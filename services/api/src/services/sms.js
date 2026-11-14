const { config } = require('../config/env');
const logger = require('../config/logger');

// Envoi de SMS : passerelle HTTP configurable, console en développement.
async function sendSms({ to, message }) {
  if (config.sms.provider === 'http') {
    if (!config.sms.url) {
      throw new Error('SMS_HTTP_URL est requis lorsque SMS_PROVIDER=http');
    }

    const response = await fetch(config.sms.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.sms.token ? { Authorization: `Bearer ${config.sms.token}` } : {}),
      },
      body: JSON.stringify({ to, message }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`Échec d'envoi SMS (${response.status}) ${detail}`);
    }
    return;
  }

  if (config.isProduction) {
    throw new Error('SMS_PROVIDER=console est interdit en production');
  }

  logger.info({ to, message }, 'SMS simulé (console)');
}

module.exports = { sendSms };
