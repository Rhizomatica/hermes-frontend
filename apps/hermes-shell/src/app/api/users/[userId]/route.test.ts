import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { DELETE, GET, PATCH } from './route';

const api = vi.hoisted(() => ({
  hermesGet: vi.fn(),
  hermesPatch: vi.fn(),
  hermesDelete: vi.fn(),
}));

vi.mock('@hermes/api', () => api);

beforeEach(() => {
  api.hermesGet.mockReset();
  api.hermesPatch.mockReset();
  api.hermesDelete.mockReset();
});

const params = (userId: string) => ({ params: Promise.resolve({ userId }) });

describe('GET /api/users/{userId}', () => {
  it('rejects an invalid id', async () => {
    const response = await GET(
      new NextRequest('http://localhost/api/users/abc'),
      params('abc'),
    );
    expect(response.status).toBe(400);
    expect(api.hermesGet).not.toHaveBeenCalled();
  });

  it('forwards the id and auth', async () => {
    api.hermesGet.mockResolvedValue({ data: { id: 7 }, status: 200 });
    const response = await GET(
      new NextRequest('http://localhost/api/users/7', {
        headers: { cookie: 'hermes_session=t' },
      }),
      params('7'),
    );

    expect(api.hermesGet).toHaveBeenCalledWith(
      '/api/v2/users/7',
      'hermes_session=t',
      undefined,
    );
    expect(response.status).toBe(200);
  });
});

describe('PATCH /api/users/{userId}', () => {
  it('rejects invalid JSON', async () => {
    const response = await PATCH(
      new NextRequest('http://localhost/api/users/7', {
        method: 'PATCH',
        body: '{',
        headers: { 'Content-Type': 'application/json' },
      }),
      params('7'),
    );
    expect(response.status).toBe(400);
    expect(api.hermesPatch).not.toHaveBeenCalled();
  });

  it('forwards the patch', async () => {
    api.hermesPatch.mockResolvedValue({ data: { id: 7 }, status: 200 });
    const response = await PATCH(
      new NextRequest('http://localhost/api/users/7', {
        method: 'PATCH',
        body: JSON.stringify({ display_name: 'New' }),
        headers: { 'Content-Type': 'application/json' },
      }),
      params('7'),
    );

    expect(api.hermesPatch).toHaveBeenCalledWith(
      '/api/v2/users/7',
      { display_name: 'New' },
      undefined,
      undefined,
    );
    expect(response.status).toBe(200);
  });
});

describe('DELETE /api/users/{userId}', () => {
  it('returns 204 without a body', async () => {
    api.hermesDelete.mockResolvedValue({ data: null, status: 204 });
    const response = await DELETE(
      new NextRequest('http://localhost/api/users/7', { method: 'DELETE' }),
      params('7'),
    );

    expect(api.hermesDelete).toHaveBeenCalledWith(
      '/api/v2/users/7',
      undefined,
      undefined,
    );
    expect(response.status).toBe(204);
    expect(await response.text()).toBe('');
  });
});
