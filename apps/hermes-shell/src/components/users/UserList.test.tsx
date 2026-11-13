import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { HermesUser } from '@hermes/api';
import UserList from './UserList';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('lucide-react', () => ({
  Pencil: () => <span data-testid="icon-edit" />,
  KeyRound: () => <span data-testid="icon-password" />,
  Trash2: () => <span data-testid="icon-delete" />,
}));

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

describe('UserList', () => {
  it('renders the display name, username, role and locale', () => {
    render(
      <UserList
        users={[makeUser()]}
        currentUserId={null}
        canManage
        onEdit={vi.fn()}
        onSetPassword={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText('Matheus')).toBeTruthy();
    expect(screen.getByText('pu2uit · roles.operator · en')).toBeTruthy();
  });

  it('falls back to the username when display_name is empty', () => {
    render(
      <UserList
        users={[makeUser({ display_name: '' })]}
        currentUserId={null}
        canManage
        onEdit={vi.fn()}
        onSetPassword={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText('pu2uit')).toBeTruthy();
  });

  it('marks the current user', () => {
    render(
      <UserList
        users={[makeUser()]}
        currentUserId={1}
        canManage
        onEdit={vi.fn()}
        onSetPassword={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText('badges.you')).toBeTruthy();
  });

  it('disables all mutating actions for root', () => {
    render(
      <UserList
        users={[makeUser({ id: 2, username: 'root' })]}
        currentUserId={null}
        canManage
        onEdit={vi.fn()}
        onSetPassword={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText('badges.root')).toBeTruthy();
    expect(screen.getByLabelText('actions.editAria').hasAttribute('disabled')).toBe(true);
    expect(screen.getByLabelText('actions.passwordAria').hasAttribute('disabled')).toBe(true);
    expect(screen.getByLabelText('actions.deleteAria').hasAttribute('disabled')).toBe(true);
  });

  it('calls the row actions', () => {
    const onEdit = vi.fn();
    const onSetPassword = vi.fn();
    const onDelete = vi.fn();
    const user = makeUser();

    render(
      <UserList
        users={[user]}
        currentUserId={null}
        canManage
        onEdit={onEdit}
        onSetPassword={onSetPassword}
        onDelete={onDelete}
      />,
    );

    fireEvent.click(screen.getByLabelText('actions.editAria'));
    fireEvent.click(screen.getByLabelText('actions.passwordAria'));
    fireEvent.click(screen.getByLabelText('actions.deleteAria'));

    expect(onEdit).toHaveBeenCalledWith(user);
    expect(onSetPassword).toHaveBeenCalledWith(user);
    expect(onDelete).toHaveBeenCalledWith(user);
  });

  it('hides actions when canManage is false', () => {
    render(
      <UserList
        users={[makeUser()]}
        currentUserId={null}
        canManage={false}
        onEdit={vi.fn()}
        onSetPassword={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.queryByLabelText('actions.editAria')).toBeNull();
  });
});
