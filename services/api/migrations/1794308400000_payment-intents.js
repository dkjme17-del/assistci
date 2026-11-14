// Paiements : intentions de paiement et journal des webhooks (idempotence).

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS payment_intents (
      id SERIAL PRIMARY KEY,
      transaction_id INT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
      provider VARCHAR(30) NOT NULL,
      provider_reference VARCHAR(255),
      checkout_url TEXT,
      status VARCHAR(30) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'expired', 'refunded')),
      amount NUMERIC(10,2) NOT NULL,
      currency VARCHAR(10) NOT NULL DEFAULT 'XOF',
      idempotency_key VARCHAR(120) NOT NULL UNIQUE,
      metadata JSONB,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `);
  pgm.sql('CREATE INDEX IF NOT EXISTS idx_payment_intents_tx ON payment_intents(transaction_id);');
  pgm.sql(
    'CREATE INDEX IF NOT EXISTS idx_payment_intents_reference ON payment_intents(provider, provider_reference);'
  );

  pgm.sql(`
    CREATE TABLE IF NOT EXISTS payment_events (
      id SERIAL PRIMARY KEY,
      provider VARCHAR(30) NOT NULL,
      event_id VARCHAR(255) NOT NULL,
      intent_id INT REFERENCES payment_intents(id) ON DELETE SET NULL,
      payload JSONB,
      processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      UNIQUE (provider, event_id)
    );
  `);
};

exports.down = (pgm) => {
  pgm.sql('DROP TABLE IF EXISTS payment_events;');
  pgm.sql('DROP TABLE IF EXISTS payment_intents;');
};
