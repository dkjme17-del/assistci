const { config } = require('../config/env');
const logger = require('../config/logger');

// Envoi d'email : Resend (HTTP) en production, console en développement.
async function sendMail({ to, subject, text, html }) {
  if (config.email.provider === 'resend') {
    if (!config.email.apiKey) {
      throw new Error('RESEND_API_KEY est requis lorsque EMAIL_PROVIDER=resend');
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.email.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: config.email.from,
        to: [to],
        subject,
        text,
        html,
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`Échec d'envoi Resend (${response.status}) ${detail}`);
    }
    return;
  }

  if (config.isProduction) {
    throw new Error('EMAIL_PROVIDER=console est interdit en production');
  }

  logger.info({ to, subject, text }, 'Email simulé (console)');
}

module.exports = { sendMail };
