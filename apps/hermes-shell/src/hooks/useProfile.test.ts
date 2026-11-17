import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { HermesUser } from '@hermes/api';
import { useProfile } from './useProfile';

function makeUser(overrides: Partial<HermesUser> = {}): HermesUser {
  return {
    id: 3,
    username: 'pu2uit',
    display_name: 'Matheus',
    avatar: null,
    role: 'user',
    locale: 'en',
    phone: null,
    location: null,
    disabled: false,
    lxmf_address: null,
    last_login_at: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function response(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useProfile', () => {
  it('does not fetch when the id is null', async () => {
    const { result } = renderHook(() => useProfile(null));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.user).toBeNull();
  });

  it('loads a profile', async () => {
    const user = makeUser();
    fetchMock.mockResolvedValueOnce(response(user));

    const { result } = renderHook(() => useProfile(3));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toEqual(user);
    expect(result.current.error).toBeNull();
  });

  it('reports a fetch problem', async () => {
    fetchMock.mockResolvedValueOnce(
      response({ code: 'forbidden', title: 'Forbidden', detail: 'no' }, 403),
    );

    const { result } = renderHook(() => useProfile(3));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeNull();
    expect(result.current.error).toBe('no');
  });

  it('updates the profile and keeps the result', async () => {
    const user = makeUser();
    const updated = makeUser({ display_name: 'New name' });
    fetchMock
      .mockResolvedValueOnce(response(user))
      .mockResolvedValueOnce(response(updated));

    const { result } = renderHook(() => useProfile(3));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let mutation;
    await act(async () => {
      mutation = await result.current.updateProfile({ display_name: 'New name' });
    });

    expect(mutation).toEqual({ ok: true, data: updated });
    expect(result.current.user).toEqual(updated);
  });

  it('returns field errors from a rejected update', async () => {
    fetchMock
      .mockResolvedValueOnce(response(makeUser()))
      .mockResolvedValueOnce(
        response(
          {
            code: 'invalid',
            title: 'Validation failed',
            errors: { phone: ['too long'] },
          },
          422,
        ),
      );

    const { result } = renderHook(() => useProfile(3));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let mutation;
    await act(async () => {
      mutation = await result.current.updateProfile({ phone: 'x' });
    });

    expect(mutation).toEqual({
      ok: false,
      message: 'Validation failed',
      fieldErrors: { phone: ['too long'] },
    });
  });

  it('changes the password', async () => {
    fetchMock
      .mockResolvedValueOnce(response(makeUser()))
      .mockResolvedValueOnce(response(null, 204));

    const { result } = renderHook(() => useProfile(3));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let mutation;
    await act(async () => {
      mutation = await result.current.changePassword({
        current_password: 'old',
        new_password: 'new-long-password',
      });
    });

    expect(mutation).toEqual({ ok: true, data: null });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/users/3/password',
      expect.objectContaining({ method: 'PUT' }),
    );
  });
});
