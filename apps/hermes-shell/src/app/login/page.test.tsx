import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from './page';

const authState = vi.hoisted(() => ({
  login: vi.fn(),
  error: null as string | null,
  isLoading: false,
}));

const routerState = vi.hoisted(() => ({
  replace: vi.fn(),
}));

vi.mock('@hermes/shared-auth', () => ({
  useAuth: () => ({
    login: authState.login,
    error: authState.error,
    isLoading: authState.isLoading,
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => routerState,
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@hermes/ui', () => ({
  ErrorBanner: ({ message }: { message: string }) => <div role="alert">{message}</div>,
  LoadingSpinner: ({ label }: { label?: string }) => <div role="status">{label}</div>,
}));

describe('LoginPage', () => {
  beforeEach(() => {
    authState.login.mockReset();
    authState.error = null;
    authState.isLoading = false;
    routerState.replace.mockReset();
  });

  it('renders the form and disables submit while the fields are empty', () => {
    render(<LoginPage />);

    expect(screen.getByLabelText('callsignLabel')).toBeTruthy();
    expect(screen.getByLabelText('passwordLabel')).toBeTruthy();

    const submit = screen.getByRole('button', { name: 'submit' }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
  });

  it('enables submit only once both fields are filled', () => {
    render(<LoginPage />);

    const submit = screen.getByRole('button', { name: 'submit' }) as HTMLButtonElement;

    fireEvent.change(screen.getByLabelText('callsignLabel'), { target: { value: 'PU2UIT' } });
    expect(submit.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText('passwordLabel'), { target: { value: 'secret' } });
    expect(submit.disabled).toBe(false);
  });

  it('shows a loading spinner while the session is loading', () => {
    authState.isLoading = true;
    render(<LoginPage />);
    expect(screen.getByRole('status')).toBeTruthy();
  });

  it('shows an error banner when the auth context exposes an error', () => {
    authState.error = 'Invalid credentials.';
    render(<LoginPage />);

    const alert = screen.getByRole('alert');
    expect(alert).toBeTruthy();
    expect(alert.textContent).toBe('Invalid credentials.');
  });

  it('submits credentials and navigates to the home page on success', async () => {
    authState.login.mockResolvedValue(undefined);
    const { container } = render(<LoginPage />);

    fireEvent.change(screen.getByLabelText('callsignLabel'), { target: { value: 'PU2UIT' } });
    fireEvent.change(screen.getByLabelText('passwordLabel'), { target: { value: 'secret' } });
    fireEvent.submit(container.querySelector('form')!);

    await waitFor(() => {
      expect(authState.login).toHaveBeenCalledWith('PU2UIT', 'secret');
      expect(routerState.replace).toHaveBeenCalledWith('/');
    });
  });

  it('shows a local error when login rejects', async () => {
    authState.login.mockRejectedValue(new Error('bad credentials'));
    const { container } = render(<LoginPage />);

    fireEvent.change(screen.getByLabelText('callsignLabel'), { target: { value: 'PU2UIT' } });
    fireEvent.change(screen.getByLabelText('passwordLabel'), { target: { value: 'secret' } });
    fireEvent.submit(container.querySelector('form')!);

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toBe('bad credentials');
    });
  });
});
