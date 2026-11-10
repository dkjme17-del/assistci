import { vi } from 'vitest';

const db = require('../src/config/db');
vi.spyOn(db, 'query');

const liveLocationController = require('../src/controllers/liveLocationController');

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

describe('live locations access and sharing', () => {
  beforeEach(() => {
    db.query.mockReset();
    db.query.mockResolvedValue({ rows: [] });
  });

  it('refuses location access to a client who does not own the request', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{
        id: 12,
        client_id: 8,
        assigned_provider_id: 4,
        status: 'accepted',
        city: 'Abidjan',
        district: 'Cocody',
      }],
    });
    const response = createResponse();

    await liveLocationController.getLiveLocations(
      { user: { userId: 99, role: 'client' }, params: { id: '12' } },
      response
    );

    expect(response.statusCode).toBe(403);
    expect(db.query).toHaveBeenCalledTimes(1);
  });

  it('lets the assigned provider update only their own shared location', async () => {
    db.query
      .mockResolvedValueOnce({
        rows: [{
          id: 12,
          client_id: 8,
          assigned_provider_id: 4,
          status: 'in_progress',
          city: 'Abidjan',
          district: 'Cocody',
        }],
      })
      .mockResolvedValueOnce({ rows: [{ id: 4 }] })
      .mockResolvedValueOnce({
        rows: [{ latitude: '5.34', longitude: '-4.02', updated_at: '2026-11-10T10:00:00Z' }],
      });
    const response = createResponse();

    await liveLocationController.updateLiveLocation(
      {
        user: { userId: 42, role: 'provider' },
        params: { id: '12' },
        body: { latitude: 5.34, longitude: -4.02 },
      },
      response
    );

    expect(db.query.mock.calls[2][0]).toContain('ON CONFLICT (request_id, user_id)');
    expect(db.query.mock.calls[2][1]).toEqual(['12', 42, 5.34, -4.02]);
    expect(response.statusCode).toBe(200);
    expect(response.body.location).toMatchObject({ latitude: 5.34, longitude: -4.02 });
  });

  it('returns only the latest positions shared by the two assigned participants', async () => {
    db.query
      .mockResolvedValueOnce({
        rows: [{
          id: 12,
          client_id: 8,
          assigned_provider_id: 4,
          status: 'accepted',
          city: 'Abidjan',
          district: 'Cocody',
        }],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{
          client_latitude: '5.34',
          client_longitude: '-4.02',
          client_updated_at: '2026-11-10T10:00:00Z',
          provider_latitude: null,
          provider_longitude: null,
          provider_updated_at: null,
        }],
      });
    const response = createResponse();

    await liveLocationController.getLiveLocations(
      { user: { userId: 8, role: 'client' }, params: { id: '12' } },
      response
    );

    expect(response.statusCode).toBe(200);
    expect(response.body.client).toMatchObject({ latitude: 5.34, longitude: -4.02 });
    expect(response.body.provider).toBeNull();
    expect(response.body.expires_after_seconds).toBe(90);
  });

  it('does not allow location sharing before a proposal is accepted', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{
        id: 12,
        client_id: 8,
        assigned_provider_id: null,
        status: 'proposal_received',
        city: 'Abidjan',
        district: 'Cocody',
      }],
    });
    const response = createResponse();

    await liveLocationController.updateLiveLocation(
      {
        user: { userId: 8, role: 'client' },
        params: { id: '12' },
        body: { latitude: 5.34, longitude: -4.02 },
      },
      response
    );

    expect(response.statusCode).toBe(409);
    expect(db.query).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid coordinates before saving a location', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{
        id: 12,
        client_id: 8,
        assigned_provider_id: 4,
        status: 'accepted',
        city: 'Abidjan',
        district: 'Cocody',
      }],
    });
    const response = createResponse();

    await liveLocationController.updateLiveLocation(
      {
        user: { userId: 8, role: 'client' },
        params: { id: '12' },
        body: { latitude: 95, longitude: -4.02 },
      },
      response
    );

    expect(response.statusCode).toBe(400);
    expect(db.query).toHaveBeenCalledTimes(1);
  });

  it('deletes only the caller’s location when sharing is stopped', async () => {
    db.query
      .mockResolvedValueOnce({
        rows: [{
          id: 12,
          client_id: 8,
          assigned_provider_id: 4,
          status: 'accepted',
          city: 'Abidjan',
          district: 'Cocody',
        }],
      })
      .mockResolvedValueOnce({ rows: [{ id: 4 }] })
      .mockResolvedValueOnce({ rows: [] });
    const response = createResponse();

    await liveLocationController.stopLiveLocation(
      { user: { userId: 42, role: 'provider' }, params: { id: '12' } },
      response
    );

    expect(db.query.mock.calls[2][0]).toContain('DELETE FROM request_live_locations');
    expect(db.query.mock.calls[2][1]).toEqual(['12', 42]);
    expect(response.statusCode).toBe(200);
  });
});
