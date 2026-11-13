import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { HermesUser } from '@hermes/api';
import ProfilePage from './page';

const guardState = vi.hoisted(() => ({ user: null as HermesUser | null }));
const profileState = vi.hoisted(() => ({
  user: null as HermesUser | null,
  loading: false,
  error: null as string | null,
  updateProfile: vi.fn(),
  changePassword: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock('@hermes/shared-auth', () => ({
  useAuthGuard: () => guardState.user,
  useLocale: () => ({ locale: 'en' }),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@hermes/ui', () => ({
  LoadingSpinner: ({ label }: { label?: string }) => <div role="status">{label}</div>,
  ErrorBanner: ({ message }: { message: string }) => <div role="alert">{message}</div>,
}));

vi.mock('lucide-react', () => ({
  ChevronLeft: () => <span data-testid="icon-back" />,
  KeyRound: () => <span data-testid="icon-key" />,
}));

vi.mock('@/hooks/useProfile', () => ({
  useProfile: () => profileState,
}));

vi.mock('@/components/users/SetPasswordDialog', () => ({
  default: () => null,
}));

function makeUser(overrides: Partial<HermesUser> = {}): HermesUser {
  return {
    id: 3,
    username: 'pu2uit',
    display_name: 'Matheus',
    avatar: null,
    role: 'user',
    locale: 'en',
    phone: '123',
    location: 'POA',
    disabled: false,
    lxmf_address: null,
    last_login_at: '2026-02-01T10:00:00.000Z',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('ProfilePage', () => {
  beforeEach(() => {
    guardState.user = makeUser();
    profileState.user = makeUser();
    profileState.loading = false;
    profileState.error = null;
    profileState.updateProfile.mockReset();
    profileState.updateProfile.mockResolvedValue({
      ok: true,
      data: makeUser(),
    });
  });

  it('shows a loading spinner while the guard resolves', () => {
    guardState.user = null;
    render(<ProfilePage />);
    expect(screen.getByRole('status')).toBeTruthy();
  });

  it('renders the account information and prefilled fields', () => {
    render(<ProfilePage />);

    expect(screen.getByText('pu2uit')).toBeTruthy();
    expect(screen.getByText('roles.user')).toBeTruthy();
    expect((screen.getByLabelText('fields.displayName') as HTMLInputElement).value).toBe('Matheus');
    expect((screen.getByLabelText('fields.phone') as HTMLInputElement).value).toBe('123');
    expect((screen.getByLabelText('fields.location') as HTMLInputElement).value).toBe('POA');
  });

  it('submits editable fields and shows a success message', async () => {
    render(<ProfilePage />);

    fireEvent.change(screen.getByLabelText('fields.displayName'), {
      target: { value: 'New Name' },
    });
    fireEvent.change(screen.getByLabelText('fields.phone'), {
      target: { value: ' ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'save' }));

    await waitFor(() =>
      expect(profileState.updateProfile).toHaveBeenCalledWith({
        display_name: 'New Name',
        phone: null,
        location: 'POA',
      }),
    );
    expect(await screen.findByText('saved')).toBeTruthy();
  });

  it('shows a profile fetch error', () => {
    profileState.error = 'boom';
    render(<ProfilePage />);
    expect(screen.getByRole('alert').textContent).toContain('boom');
  });
});
