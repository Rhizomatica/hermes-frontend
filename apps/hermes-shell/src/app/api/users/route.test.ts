import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from './route';

const api = vi.hoisted(() => ({
  hermesGet: vi.fn(),
  hermesPost: vi.fn(),
}));

vi.mock('@hermes/api', () => api);

beforeEach(() => {
  api.hermesGet.mockReset();
  api.hermesPost.mockReset();
});

describe('GET /api/users', () => {
  it('forwards pagination and auth to the daemon', async () => {
    api.hermesGet.mockResolvedValue({ data: { data: [] }, status: 200 });
    const request = new NextRequest('http://localhost/api/users?limit=25&cursor=abc', {
      headers: { cookie: 'hermes_session=t', authorization: 'Bearer t' },
    });

    const response = await GET(request);

    expect(api.hermesGet).toHaveBeenCalledWith(
      '/api/v2/users?limit=25&cursor=abc',
      'hermes_session=t',
      'Bearer t',
    );
    expect(response.status).toBe(200);
  });

  it('returns the daemon status and body unchanged', async () => {
    api.hermesGet.mockResolvedValue({
      data: { code: 'forbidden', title: 'Forbidden' },
      status: 403,
    });
    const request = new NextRequest('http://localhost/api/users');

    const response = await GET(request);

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      code: 'forbidden',
      title: 'Forbidden',
    });
  });
});

describe('POST /api/users', () => {
  it('rejects invalid JSON', async () => {
    const request = new NextRequest('http://localhost/api/users', {
      method: 'POST',
      body: '{',
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(api.hermesPost).not.toHaveBeenCalled();
  });

  it('forwards the body and returns 201', async () => {
    api.hermesPost.mockResolvedValue({
      data: { id: 1, username: 'pu2uit' },
      status: 201,
    });
    const request = new NextRequest('http://localhost/api/users', {
      method: 'POST',
      body: JSON.stringify({ username: 'pu2uit', password: 'long-password' }),
      headers: { 'Content-Type': 'application/json', cookie: 'hermes_session=t' },
    });

    const response = await POST(request);

    expect(api.hermesPost).toHaveBeenCalledWith(
      '/api/v2/users',
      { username: 'pu2uit', password: 'long-password' },
      'hermes_session=t',
      undefined,
    );
    expect(response.status).toBe(201);
  });
});
