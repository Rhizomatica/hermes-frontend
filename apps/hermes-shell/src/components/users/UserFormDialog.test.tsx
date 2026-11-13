import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { HermesUser } from '@hermes/api';
import UserFormDialog from './UserFormDialog';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@hermes/ui', () => ({
  LoadingSpinner: () => <span data-testid="spinner" />,
}));

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
});

afterEach(() => {
  vi.clearAllMocks();
});

function makeUser(overrides: Partial<HermesUser> = {}): HermesUser {
  return {
    id: 7,
    username: 'pu2uit',
    display_name: 'Matheus',
    avatar: null,
    role: 'user',
    locale: 'en',
    phone: '123',
    location: 'POA',
    disabled: false,
    lxmf_address: null,
    last_login_at: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('UserFormDialog', () => {
  it('validates required create fields before submitting', async () => {
    const onSubmit = vi.fn();
    render(
      <UserFormDialog
        open
        mode="create"
        canManage
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'save' }));

    expect(await screen.findByText('validation.username')).toBeTruthy();
    expect(screen.getByText('validation.password')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits a create payload and closes on success', async () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn().mockResolvedValue({
      ok: true,
      data: makeUser({ id: 10, username: 'new.user' }),
    });

    render(
      <UserFormDialog
        open
        mode="create"
        canManage
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText('fields.username'), {
      target: { value: 'new.user' },
    });
    fireEvent.change(screen.getByLabelText('fields.password'), {
      target: { value: 'long-password' },
    });
    fireEvent.change(screen.getByLabelText('fields.displayName'), {
      target: { value: 'New User' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'save' }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'new.user',
          password: 'long-password',
          display_name: 'New User',
          role: 'user',
          locale: 'en',
        }),
      ),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('prefills the edit form and submits only editable fields', async () => {
    const user = makeUser();
    const onSubmit = vi.fn().mockResolvedValue({ ok: true, data: user });

    render(
      <UserFormDialog
        open
        mode="edit"
        user={user}
        canManage
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByText('pu2uit')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('fields.location'), {
      target: { value: ' ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'save' }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          display_name: 'Matheus',
          role: 'user',
          locale: 'en',
          location: null,
          disabled: false,
        }),
      ),
    );
  });

  it('shows server field errors without closing', async () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn().mockResolvedValue({
      ok: false,
      message: 'Validation failed',
      fieldErrors: { username: ['reserved'] },
    });

    render(
      <UserFormDialog
        open
        mode="create"
        canManage
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText('fields.username'), {
      target: { value: 'taken' },
    });
    fireEvent.change(screen.getByLabelText('fields.password'), {
      target: { value: 'long-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'save' }));

    expect(await screen.findByText('reserved')).toBeTruthy();
    expect(screen.getByText('Validation failed')).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });
});
