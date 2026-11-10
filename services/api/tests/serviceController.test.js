import { vi } from 'vitest';

const db = require('../src/config/db');
const aiService = require('../src/services/aiService');
vi.spyOn(db, 'query');
vi.spyOn(aiService, 'analyzeRequest').mockResolvedValue(null);

const serviceController = require('../src/controllers/serviceController');
const requestController = require('../src/controllers/requestController');

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

describe('serviceController.getProviders', () => {
  beforeEach(() => vi.clearAllMocks());

  it('searches specialties and applies district and availability filters without duplicating providers', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 7, specialties: ['Plomberie'] }] });
    const response = createResponse();

    await serviceController.getProviders({
      query: {
        district: 'Cocody',
        available_only: 'true',
        q: 'Plomberie',
      },
    }, response);

    const [sql, params] = db.query.mock.calls[0];
    expect(sql).toContain('sp.specialties');
    expect(sql).toContain('LEFT JOIN LATERAL');
    expect(sql).toContain('sa.district ILIKE $1');
    expect(sql).toContain('sp.availability = $2');
    expect(sql).toContain(') ILIKE $3');
    expect(params).toEqual(['%Cocody%', true, '%Plomberie%']);
    expect(response.body).toEqual([{ id: 7, specialties: ['Plomberie'] }]);
  });
});

describe('requestController.createRequest', () => {
  beforeEach(() => vi.clearAllMocks());

  it('assigns a request to the selected active provider', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: 22 }] })
      .mockResolvedValueOnce({ rows: [{ id: 101, assigned_provider_id: 22 }] });
    const response = createResponse();

    await requestController.createRequest({
      user: { userId: 1 },
      body: {
        category_id: 2,
        title: 'Réparer une fuite',
        description: 'Fuite sous évier à Cocody',
        provider_id: '22',
      },
    }, response);

    const [insertSql, insertParams] = db.query.mock.calls[1];
    expect(insertSql).toContain('assigned_provider_id');
    expect(insertParams[16]).toBe(22);
    expect(response.statusCode).toBe(201);
    expect(response.body.request.assigned_provider_id).toBe(22);
  });

  it('rejects invalid provider identifiers', async () => {
    const response = createResponse();

    await requestController.createRequest({
      user: { userId: 1 },
      body: {
        category_id: 2,
        title: 'Réparer une fuite',
        description: 'Fuite sous évier',
        provider_id: 'invalid',
      },
    }, response);

    expect(response.statusCode).toBe(400);
    expect(db.query).not.toHaveBeenCalled();
  });
});
