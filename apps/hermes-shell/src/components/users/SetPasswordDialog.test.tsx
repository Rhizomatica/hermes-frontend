import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SetPasswordDialog from './SetPasswordDialog';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
});

describe('SetPasswordDialog', () => {
  it('requires the current password and a matching confirmation', async () => {
    const onSubmit = vi.fn();
    render(
      <SetPasswordDialog
        open
        username="pu2uit"
        requireCurrent
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText('fields.newPassword'), {
      target: { value: 'long-password' },
    });
    fireEvent.change(screen.getByLabelText('fields.confirmPassword'), {
      target: { value: 'different' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'save' }));

    expect(await screen.findByText('validation.currentPassword')).toBeTruthy();
    expect(screen.getByText('validation.passwordMatch')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits a self-service password change', async () => {
    const onSubmit = vi.fn().mockResolvedValue({ ok: true, data: null });
    const onClose = vi.fn();
    render(
      <SetPasswordDialog
        open
        username="pu2uit"
        requireCurrent
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText('fields.currentPassword'), {
      target: { value: 'old-password' },
    });
    fireEvent.change(screen.getByLabelText('fields.newPassword'), {
      target: { value: 'new-password' },
    });
    fireEvent.change(screen.getByLabelText('fields.confirmPassword'), {
      target: { value: 'new-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'save' }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith('old-password', 'new-password'),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('omits the current password for an admin reset', () => {
    render(
      <SetPasswordDialog
        open
        username="pu2uit"
        requireCurrent={false}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.queryByLabelText('fields.currentPassword')).toBeNull();
  });

  it('shows the daemon current-password error', async () => {
    const onSubmit = vi.fn().mockResolvedValue({
      ok: false,
      message: 'Validation failed',
      fieldErrors: { current_password: ['wrong password'] },
    });

    render(
      <SetPasswordDialog
        open
        username="pu2uit"
        requireCurrent
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText('fields.currentPassword'), {
      target: { value: 'wrong' },
    });
    fireEvent.change(screen.getByLabelText('fields.newPassword'), {
      target: { value: 'new-password' },
    });
    fireEvent.change(screen.getByLabelText('fields.confirmPassword'), {
      target: { value: 'new-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'save' }));

    expect(await screen.findByText('wrong password')).toBeTruthy();
  });
});
