import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { HermesUser } from '@hermes/api';
import { useUsers } from './useUsers';

function makeUser(overrides: Partial<HermesUser> = {}): HermesUser {
  return {
    id: 1,
    username: 'pu2uit',
    display_name: 'Matheus',
    avatar: null,
    role: 'operator',
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

describe('useUsers', () => {
  it('loads the first page', async () => {
    const user = makeUser();
    fetchMock.mockResolvedValueOnce(response({ data: [user] }));

    const { result } = renderHook(() => useUsers());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.users).toEqual([user]);
    expect(result.current.error).toBeNull();
  });

  it('fills users with an empty list when the daemon returns none', async () => {
    fetchMock.mockResolvedValueOnce(response({ data: [] }));
    const { result } = renderHook(() => useUsers());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.users).toEqual([]);
  });

  it('loads and appends the next page', async () => {
    fetchMock
      .mockResolvedValueOnce(
        response({ data: [makeUser({ id: 1 })], next_cursor: 'next' }),
      )
      .mockResolvedValueOnce(response({ data: [makeUser({ id: 2 })] }));

    const { result } = renderHook(() => useUsers());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.loadMore();
    });

    expect(result.current.users.map((u) => u.id)).toEqual([1, 2]);
    expect(result.current.nextCursor).toBeNull();
  });

  it('keeps previous data and reports an error when a refresh fails', async () => {
    fetchMock
      .mockResolvedValueOnce(response({ data: [makeUser()] }))
      .mockResolvedValueOnce(
        response({ code: 'internal', title: 'Internal error' }, 500),
      );

    const { result } = renderHook(() => useUsers());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.users).toHaveLength(1);
    expect(result.current.error).toBe('Internal error');
  });

  it('creates a user and refreshes the list', async () => {
    const created = makeUser({ id: 9, username: 'new.user' });
    fetchMock
      .mockResolvedValueOnce(response({ data: [] }))
      .mockResolvedValueOnce(response(created, 201))
      .mockResolvedValueOnce(response({ data: [created] }));

    const { result } = renderHook(() => useUsers());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let mutation;
    await act(async () => {
      mutation = await result.current.createUser({
        username: 'new.user',
        password: 'long-password',
      });
    });

    expect(mutation).toEqual({ ok: true, data: created });
    expect(result.current.users).toEqual([created]);
    expect(fetchMock).toHaveBeenCalledWith('/api/users', expect.objectContaining({ method: 'POST' }));
  });

  it('returns field errors when a create is rejected', async () => {
    fetchMock
      .mockResolvedValueOnce(response({ data: [] }))
      .mockResolvedValueOnce(
        response(
          {
            code: 'invalid',
            title: 'Validation failed',
            errors: { username: ['reserved'] },
          },
          422,
        ),
      );

    const { result } = renderHook(() => useUsers());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let mutation;
    await act(async () => {
      mutation = await result.current.createUser({
        username: 'root',
        password: 'long-password',
      });
    });

    expect(mutation).toEqual({
      ok: false,
      message: 'Validation failed',
      fieldErrors: { username: ['reserved'] },
    });
  });

  it('replaces a user after an update', async () => {
    const user = makeUser();
    const updated = makeUser({ display_name: 'New name' });
    fetchMock
      .mockResolvedValueOnce(response({ data: [user] }))
      .mockResolvedValueOnce(response(updated));

    const { result } = renderHook(() => useUsers());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.updateUser(1, { display_name: 'New name' });
    });

    expect(result.current.users[0].display_name).toBe('New name');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/users/1',
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('removes a user after a delete', async () => {
    const user = makeUser();
    fetchMock
      .mockResolvedValueOnce(response({ data: [user] }))
      .mockResolvedValueOnce(response(null, 204));

    const { result } = renderHook(() => useUsers());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let mutation;
    await act(async () => {
      mutation = await result.current.deleteUser(1);
    });

    expect(mutation).toEqual({ ok: true, data: null });
    expect(result.current.users).toEqual([]);
  });

  it('changes a password with PUT', async () => {
    fetchMock
      .mockResolvedValueOnce(response({ data: [] }))
      .mockResolvedValueOnce(response(null, 204));

    const { result } = renderHook(() => useUsers());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let mutation;
    await act(async () => {
      mutation = await result.current.setPassword(1, {
        new_password: 'new-long-password',
      });
    });

    expect(mutation).toEqual({ ok: true, data: null });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/users/1/password',
      expect.objectContaining({ method: 'PUT' }),
    );
  });
});
