import { vi } from 'vitest';

const db = require('../src/config/db');
vi.spyOn(db, 'query');

const requestController = require('../src/controllers/requestController');
const messageController = require('../src/controllers/messageController');
const transactionController = require('../src/controllers/transactionController');

function createResponse() {
  const response = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  return response;
}

const requestRow = {
  id: 5,
  client_id: 2,
  assigned_provider_id: null,
  status: 'created',
  city: 'Abidjan',
  district: 'Cocody',
};

describe('getRequestById — contrôle d’accès', () => {
  beforeEach(() => {
    db.query.mockReset();
    db.query.mockResolvedValue({ rows: [] });
  });

  it('refuse un client qui n’est pas le propriétaire (403)', async () => {
    db.query.mockResolvedValueOnce({ rows: [requestRow] });
    const response = createResponse();

    await requestController.getRequestById(
      { user: { userId: 1, role: 'client' }, params: { id: '5' } },
      response
    );

    expect(response.statusCode).toBe(403);
    expect(db.query).toHaveBeenCalledTimes(1);
  });

  it('autorise le client propriétaire', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [requestRow] })
      .mockResolvedValueOnce({ rows: [{ ...requestRow, category_name: 'Plomberie' }] })
      .mockResolvedValueOnce({ rows: [{ id: 3, provider_id: 9 }] })
      .mockResolvedValueOnce({ rows: [] });

    const response = createResponse();

    await requestController.getRequestById(
      { user: { userId: 2, role: 'client' }, params: { id: '5' } },
      response
    );

    expect(response.statusCode).toBe(200);
    expect(response.body.proposals).toHaveLength(1);
  });

  it('retourne 404 si la demande n’existe pas', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });
    const response = createResponse();

    await requestController.getRequestById(
      { user: { userId: 1, role: 'client' }, params: { id: '999' } },
      response
    );

    expect(response.statusCode).toBe(404);
  });
});

describe('messages — contrôle d’accès', () => {
  beforeEach(() => {
    db.query.mockReset();
    db.query.mockResolvedValue({ rows: [] });
  });

  it('refuse la lecture à un utilisateur hors conversation (403)', async () => {
    db.query.mockResolvedValueOnce({ rows: [requestRow] });
    const response = createResponse();

    await messageController.getMessages(
      { user: { userId: 1, role: 'client' }, params: { id: '5' } },
      response
    );

    expect(response.statusCode).toBe(403);
  });

  it('autorise le prestataire assigné à lire les messages', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ ...requestRow, assigned_provider_id: 9, status: 'accepted' }] })
      .mockResolvedValueOnce({ rows: [{ id: 9 }] })
      .mockResolvedValueOnce({ rows: [{ id: 1, content: 'Bonjour' }] });

    const response = createResponse();

    await messageController.getMessages(
      { user: { userId: 42, role: 'provider' }, params: { id: '5' } },
      response
    );

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveLength(1);
  });

  it('refuse l’envoi si aucun prestataire n’est assigné', async () => {
    db.query.mockResolvedValueOnce({ rows: [requestRow] });
    const response = createResponse();

    await messageController.sendMessage(
      { user: { userId: 2, role: 'client' }, params: { id: '5' }, body: { content: 'Bonjour' } },
      response
    );

    expect(response.statusCode).toBe(400);
  });

  it('envoie au prestataire assigné (et non à soi-même)', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ ...requestRow, assigned_provider_id: 9, status: 'accepted' }] })
      .mockResolvedValueOnce({ rows: [{ user_id: 77 }] })
      .mockResolvedValueOnce({
        rows: [{ id: 1, request_id: 5, sender_id: 2, receiver_id: 77, content: 'Bonjour' }],
      })
      .mockResolvedValueOnce({ rows: [{ first_name: 'Client', role: 'client' }] });

    const response = createResponse();

    await messageController.sendMessage(
      { user: { userId: 2, role: 'client' }, params: { id: '5' }, body: { content: 'Bonjour' } },
      response
    );

    const insertCall = db.query.mock.calls[2];
    expect(insertCall[1][2]).toBe(77);
    expect(response.statusCode).toBe(201);
  });
});

describe('transactions — validation du paiement', () => {
  beforeEach(() => {
    db.query.mockReset();
    db.query.mockResolvedValue({ rows: [] });
  });

  it('interdit au client de confirmer son propre paiement (403)', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ client_id: 2, payment_status: 'pending' }] });
    const response = createResponse();

    await transactionController.updateTransactionStatus(
      { user: { userId: 2, role: 'client' }, params: { id: '1' }, body: { payment_status: 'completed' } },
      response
    );

    expect(response.statusCode).toBe(403);
    expect(db.query).toHaveBeenCalledTimes(1);
  });

  it('autorise le client à annuler son paiement en attente', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ client_id: 2, payment_status: 'pending' }] })
      .mockResolvedValueOnce({ rows: [{ id: 1, payment_status: 'failed' }] });

    const response = createResponse();

    await transactionController.updateTransactionStatus(
      { user: { userId: 2, role: 'client' }, params: { id: '1' }, body: { payment_status: 'failed' } },
      response
    );

    expect(response.statusCode).toBe(200);
    expect(response.body.transaction.payment_status).toBe('failed');
  });

  it('autorise un admin à confirmer un paiement', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ client_id: 2, payment_status: 'pending' }] })
      .mockResolvedValueOnce({ rows: [{ id: 1, payment_status: 'completed' }] });

    const response = createResponse();

    await transactionController.updateTransactionStatus(
      { user: { userId: 1, role: 'admin' }, params: { id: '1' }, body: { payment_status: 'completed' } },
      response
    );

    expect(response.statusCode).toBe(200);
    expect(response.body.transaction.payment_status).toBe('completed');
  });
});
