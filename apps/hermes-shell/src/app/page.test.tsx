import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { HermesUser } from '@hermes/api';
import AppSelector from './page';

const guardState = vi.hoisted(() => ({
  user: null as HermesUser | null,
}));

const authState = vi.hoisted(() => ({
  logout: vi.fn(),
}));

const themeState = vi.hoisted(() => ({
  theme: 'light' as 'light' | 'dark',
  toggle: vi.fn(),
}));

const localeState = vi.hoisted(() => ({
  locale: 'en' as 'en' | 'pt',
  setLocale: vi.fn(),
}));

const routerState = vi.hoisted(() => ({
  replace: vi.fn(),
}));

vi.mock('@hermes/shared-auth', () => ({
  useAuth: () => ({ logout: authState.logout }),
  useAuthGuard: () => guardState.user,
  useLocale: () => ({ locale: localeState.locale, setLocale: localeState.setLocale }),
}));

vi.mock('@hermes/ui', () => ({
  useTheme: () => ({ theme: themeState.theme, toggle: themeState.toggle }),
  LoadingSpinner: ({ label }: { label?: string }) => <div role="status">{label}</div>,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => routerState,
}));

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('lucide-react', () => ({
  LogOut: () => <span data-testid="icon-logout" />,
  Moon: () => <span data-testid="icon-moon" />,
  Sun: () => <span data-testid="icon-sun" />,
  MapPin: () => <span data-testid="icon-map" />,
  MessagesSquare: () => <span data-testid="icon-chat" />,
}));

vi.mock('@/components/InfoList', () => ({
  default: () => <div data-testid="info-list" />,
}));

function makeUser(overrides: Partial<HermesUser> = {}): HermesUser {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    callsign: 'PU2UIT',
    displayName: 'Matheus Oliveira',
    email: 'matheus@example.com',
    role: 'operator',
    status: 'active',
    avatarPath: null,
    metadata: '{}',
    locale: 'en',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    lastSeenAt: null,
    ...overrides,
  };
}

describe('AppSelector', () => {
  beforeEach(() => {
    guardState.user = null;
    authState.logout.mockReset();
    themeState.theme = 'light';
    themeState.toggle.mockReset();
    localeState.locale = 'en';
    localeState.setLocale.mockReset();
    routerState.replace.mockReset();
  });

  it('shows a loading spinner while the auth guard resolves', () => {
    guardState.user = null;
    render(<AppSelector />);
    expect(screen.getByRole('status')).toBeTruthy();
  });

  it('renders the greeting, initials, and app cards once authenticated', () => {
    guardState.user = makeUser();
    render(<AppSelector />);

    expect(screen.getByText('Matheus Oliveira')).toBeTruthy();
    expect(screen.getByText('PU2UIT')).toBeTruthy();
    expect(screen.getByText('MO')).toBeTruthy();
    expect(screen.getByText('gpsViewer')).toBeTruthy();
    expect(screen.getByText('chat')).toBeTruthy();
    expect(screen.getByTestId('info-list')).toBeTruthy();
  });

  it('links the app cards to the GPS and chat URLs', () => {
    guardState.user = makeUser();
    render(<AppSelector />);

    const gpsUrl = process.env.NEXT_PUBLIC_GPS_URL ?? '/gps';
    const chatUrl = process.env.NEXT_PUBLIC_CHAT_URL ?? '/chat';
    const hrefs = screen.getAllByRole('link').map((l) => l.getAttribute('href'));

    expect(hrefs).toEqual([gpsUrl, chatUrl]);
  });

  it('toggles the theme when the theme button is clicked', () => {
    guardState.user = makeUser();
    render(<AppSelector />);

    fireEvent.click(screen.getByRole('button', { name: 'themeToggle' }));
    expect(themeState.toggle).toHaveBeenCalledTimes(1);
  });

  it('switches locale when the locale button is clicked', () => {
    guardState.user = makeUser();
    render(<AppSelector />);

    fireEvent.click(screen.getByRole('button', { name: 'localeToggle' }));
    expect(localeState.setLocale).toHaveBeenCalledWith('pt');
  });

  it('logs out and redirects to login when logout is clicked', () => {
    guardState.user = makeUser();
    render(<AppSelector />);

    fireEvent.click(screen.getByRole('button', { name: 'logout' }));
    expect(authState.logout).toHaveBeenCalledTimes(1);
    expect(routerState.replace).toHaveBeenCalledWith('/login');
  });
});
