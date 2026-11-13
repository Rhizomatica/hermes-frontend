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

const radioState = vi.hoisted(() => ({
  status: null as {
    frequency: number | null;
    mode: string | null;
    tx: boolean | null;
    power: number | null;
  } | null,
}));

const stationState = vi.hoisted(() => ({
  info: {
    stationName: null as string | null,
    domain: null as string | null,
    version: null as string | null,
    uptime: null as number | string | null,
    callsign: null as string | null,
    loading: false,
  },
}));

const infoListProps = vi.hoisted(() => ({
  calls: [] as Array<{ title?: string; items: { label: string; value: unknown }[] }>,
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
  ArrowRight: () => <span data-testid="icon-arrow-right" />,
  Users: () => <span data-testid="icon-users" />,
  UserRound: () => <span data-testid="icon-user" />,
}));

vi.mock('@/hooks/useRadioStatus', () => ({
  useRadioStatus: () => radioState.status,
}));

vi.mock('@/hooks/useStationInfo', () => ({
  useStationInfo: () => stationState.info,
}));

vi.mock('@/components/InfoList', () => ({
  default: (props: { title?: string; items: { label: string; value: unknown }[] }) => {
    infoListProps.calls.push(props);
    return <div data-testid="info-list" />;
  },
}));

function makeUser(overrides: Partial<HermesUser> = {}): HermesUser {
  return {
    id: 1,
    username: 'pu2uit',
    display_name: 'Matheus Oliveira',
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

describe('AppSelector', () => {
  beforeEach(() => {
    guardState.user = null;
    authState.logout.mockReset();
    themeState.theme = 'light';
    themeState.toggle.mockReset();
    localeState.locale = 'en';
    localeState.setLocale.mockReset();
    routerState.replace.mockReset();
    radioState.status = null;
    stationState.info = {
      stationName: null,
      domain: null,
      version: null,
      uptime: null,
      callsign: null,
      loading: false,
    };
    infoListProps.calls = [];
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
    expect(screen.getByText('pu2uit')).toBeTruthy();
    expect(screen.getByText('MO')).toBeTruthy();
    expect(screen.getByText('gpsViewer')).toBeTruthy();
    expect(screen.getByText('chat')).toBeTruthy();
    expect(screen.getAllByTestId('info-list')).toHaveLength(2);
  });

  it('links the app cards to the GPS and chat URLs', () => {
    guardState.user = makeUser();
    render(<AppSelector />);

    const gpsUrl = process.env.NEXT_PUBLIC_GPS_URL ?? '/gps';
    const chatUrl = process.env.NEXT_PUBLIC_CHAT_URL ?? '/chat';
    const hrefs = screen.getAllByRole('link').map((l) => l.getAttribute('href'));

    expect(hrefs).toEqual(['/profile', gpsUrl, chatUrl]);
  });

  it('shows the users card only to admins', () => {
    guardState.user = makeUser({ role: 'admin' });
    render(<AppSelector />);

    const hrefs = screen.getAllByRole('link').map((l) => l.getAttribute('href'));
    expect(hrefs).toContain('/users');
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

  it('renders a radio information group wired to the daemon data', () => {
    guardState.user = makeUser();
    stationState.info = {
      stationName: 'pu2uit-3',
      domain: 'hermes.local',
      version: '1.2.3',
      uptime: 3725,
      callsign: 'PU2UIT',
      loading: false,
    };
    radioState.status = { frequency: 7100000, mode: 'USB', tx: false, power: 50 };

    render(<AppSelector />);

    const radioGroup = infoListProps.calls.find((call) =>
      call.items.some((item) => item.label === 'stationName'),
    );
    expect(radioGroup).toBeTruthy();

    const items = new Map(radioGroup!.items.map((item) => [item.label, item.value]));
    expect(items.get('stationName')).toBe('pu2uit-3');
    expect(items.get('callsign')).toBe('PU2UIT');
    expect(items.get('frequency')).toBe('7.100 MHz');
    expect(items.get('mode')).toBe('USB');
    expect(items.get('power')).toBe('50%');
    expect(items.get('domain')).toBe('hermes.local');
    expect(items.get('version')).toBe('1.2.3');
    expect(items.get('uptime')).toBe('1h 2m');
  });

  it('shows the station name and callsign in the navbar', () => {
    guardState.user = makeUser();
    stationState.info = {
      stationName: 'pu2uit-3',
      domain: null,
      version: null,
      uptime: null,
      callsign: 'PU2UIT',
      loading: false,
    };

    render(<AppSelector />);

    expect(screen.getByText('pu2uit-3 · PU2UIT')).toBeTruthy();
  });
});
