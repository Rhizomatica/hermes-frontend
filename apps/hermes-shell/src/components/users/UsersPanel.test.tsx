import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { HermesUser } from '@hermes/api';
import type { UserMutationResult } from '@/hooks/useUsers';
import UsersPanel from './UsersPanel';

const usersState = vi.hoisted(() => ({
  users: [] as HermesUser[],
  nextCursor: null as string | null,
  loading: false,
  loadingMore: false,
  error: null as string | null,
  refresh: vi.fn(),
  loadMore: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
  setPassword: vi.fn(),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, string>) =>
    values ? `${key}:${JSON.stringify(values)}` : key,
}));

vi.mock('@/hooks/useUsers', () => ({
  useUsers: () => usersState,
}));

vi.mock('@hermes/ui', () => ({
  ConfirmDialog: ({
    open,
    confirmLabel,
    pending,
    onConfirm,
    onCancel,
  }: {
    open: boolean;
    confirmLabel: string;
    pending?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
  }) =>
    open ? (
      <div>
        <button type="button" onClick={onConfirm} disabled={pending}>
          {confirmLabel}
        </button>
        <button type="button" onClick={onCancel} disabled={pending}>
          cancel
        </button>
      </div>
    ) : null,
  ErrorBanner: ({ message }: { message: string }) => <div role="alert">{message}</div>,
  InlineSpinner: () => <span data-testid="spinner" />,
  LoadingSpinner: ({ label }: { label?: string }) => <div role="status">{label}</div>,
  SearchInput: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <input value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

vi.mock('lucide-react', () => ({
  Plus: () => <span data-testid="icon-plus" />,
}));

vi.mock('./UserFormDialog', () => ({
  default: () => null,
}));

vi.mock('./SetPasswordDialog', () => ({
  default: () => null,
}));

vi.mock('./UserList', () => ({
  default: ({
    users,
    onDelete,
  }: {
    users: HermesUser[];
    onDelete: (user: HermesUser) => void;
  }) => (
    <ul>
      {users.map((user) => (
        <li key={user.id}>
          <button type="button" onClick={() => onDelete(user)}>
            delete-{user.username}
          </button>
        </li>
      ))}
    </ul>
  ),
}));

function makeUser(overrides: Partial<HermesUser> = {}): HermesUser {
  return {
    id: 1,
    username: 'root',
    display_name: null,
    avatar: null,
    role: 'admin',
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

const currentUser = makeUser();
const targetUser = makeUser({ id: 7, username: 'pu2uit' });

beforeEach(() => {
  usersState.users = [targetUser];
  usersState.nextCursor = null;
  usersState.loading = false;
  usersState.loadingMore = false;
  usersState.error = null;
  usersState.deleteUser.mockReset();
  usersState.createUser.mockReset();
  usersState.updateUser.mockReset();
  usersState.setPassword.mockReset();
});

describe('UsersPanel', () => {
  it('submits a delete only once while the request is pending', async () => {
    let resolveDelete!: (result: UserMutationResult<null>) => void;
    usersState.deleteUser.mockReturnValue(
      new Promise<UserMutationResult<null>>((resolve) => {
        resolveDelete = resolve;
      }),
    );

    render(<UsersPanel currentUser={currentUser} />);

    fireEvent.click(screen.getByText('delete-pu2uit'));
    const confirm = screen.getByRole('button', { name: 'delete' });
    fireEvent.click(confirm);
    fireEvent.click(confirm);

    expect(usersState.deleteUser).toHaveBeenCalledTimes(1);

    resolveDelete({ ok: true, data: null });
    await waitFor(() =>
      expect(screen.getByText(/deleted:/)).toBeTruthy(),
    );
  });

  it('clears a previous action error when a new action starts', async () => {
    usersState.deleteUser.mockResolvedValue({
      ok: false,
      message: 'Cannot delete the last admin',
      fieldErrors: {},
    });

    render(<UsersPanel currentUser={currentUser} />);

    fireEvent.click(screen.getByText('delete-pu2uit'));
    fireEvent.click(screen.getByRole('button', { name: 'delete' }));

    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toBe(
        'Cannot delete the last admin',
      ),
    );

    fireEvent.click(screen.getByRole('button', { name: 'create' }));

    expect(screen.queryByRole('alert')).toBeNull();
  });
});
