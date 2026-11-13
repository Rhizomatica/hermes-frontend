import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { HermesUser } from '@hermes/api';
import UsersPage from './page';

const guardState = vi.hoisted(() => ({ user: null as HermesUser | null }));

vi.mock('@hermes/shared-auth', () => ({
  useAuthGuard: () => guardState.user,
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@hermes/ui', () => ({
  LoadingSpinner: ({ label }: { label?: string }) => <div role="status">{label}</div>,
}));

vi.mock('lucide-react', () => ({
  ChevronLeft: () => <span data-testid="icon-back" />,
}));

vi.mock('@/components/users/UsersPanel', () => ({
  default: ({ currentUser }: { currentUser: HermesUser }) => (
    <div data-testid="users-panel">{currentUser.username}</div>
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

describe('UsersPage', () => {
  it('shows a loading spinner while the guard resolves', () => {
    guardState.user = null;
    render(<UsersPage />);
    expect(screen.getByRole('status')).toBeTruthy();
  });

  it('renders the panel for an admin', () => {
    guardState.user = makeUser();
    render(<UsersPage />);
    expect(screen.getByTestId('users-panel')).toBeTruthy();
    expect(screen.getByText('root')).toBeTruthy();
  });

  it('shows a forbidden state for a non-admin', () => {
    guardState.user = makeUser({ role: 'operator' });
    render(<UsersPage />);
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.queryByTestId('users-panel')).toBeNull();
  });
});
