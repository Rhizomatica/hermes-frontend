import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { PUT } from './route';

const api = vi.hoisted(() => ({
  hermesPut: vi.fn(),
}));

vi.mock('@hermes/api', () => api);

beforeEach(() => {
  api.hermesPut.mockReset();
});

const params = (userId: string) => ({ params: Promise.resolve({ userId }) });

describe('PUT /api/users/{userId}/password', () => {
  it('rejects an invalid id', async () => {
    const response = await PUT(
      new NextRequest('http://localhost/api/users/abc/password', {
        method: 'PUT',
        body: JSON.stringify({ new_password: 'long-password' }),
      }),
      params('abc'),
    );

    expect(response.status).toBe(400);
    expect(api.hermesPut).not.toHaveBeenCalled();
  });

  it('rejects an id that is not a safe integer', async () => {
    const response = await PUT(
      new NextRequest('http://localhost/api/users/999999999999999999999/password', {
        method: 'PUT',
        body: JSON.stringify({ new_password: 'long-password' }),
      }),
      params('999999999999999999999'),
    );

    expect(response.status).toBe(400);
    expect(api.hermesPut).not.toHaveBeenCalled();
  });

  it('rejects invalid JSON', async () => {
    const response = await PUT(
      new NextRequest('http://localhost/api/users/7/password', {
        method: 'PUT',
        body: '{',
        headers: { 'Content-Type': 'application/json' },
      }),
      params('7'),
    );

    expect(response.status).toBe(400);
    expect(api.hermesPut).not.toHaveBeenCalled();
  });

  it('forwards the body and returns 204 without a body', async () => {
    api.hermesPut.mockResolvedValue({ data: null, status: 204 });
    const response = await PUT(
      new NextRequest('http://localhost/api/users/7/password', {
        method: 'PUT',
        body: JSON.stringify({
          current_password: 'old-password',
          new_password: 'new-long-password',
        }),
        headers: { 'Content-Type': 'application/json', cookie: 'hermes_session=t' },
      }),
      params('7'),
    );

    expect(api.hermesPut).toHaveBeenCalledWith(
      '/api/v2/users/7/password',
      { current_password: 'old-password', new_password: 'new-long-password' },
      'hermes_session=t',
      undefined,
    );
    expect(response.status).toBe(204);
    expect(await response.text()).toBe('');
  });
});
