import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import IntlProvider from './IntlProvider';

// Mutable locale so individual tests can assert both language bundles.
const localeState = vi.hoisted(() => ({ current: 'en' as 'en' | 'pt' }));

vi.mock('@hermes/shared-auth', () => ({
  useLocale: () => ({ locale: localeState.current }),
}));

vi.mock('next-intl', () => ({
  NextIntlClientProvider: ({
    children,
    locale,
    messages,
  }: {
    children: ReactNode;
    locale: string;
    messages: unknown;
  }) => (
    <div
      data-testid="intl"
      data-locale={locale}
      data-has-messages={String(Boolean(messages))}
    >
      {children}
    </div>
  ),
}));

describe('IntlProvider', () => {
  it('forwards the active locale and message bundle to NextIntlClientProvider', () => {
    localeState.current = 'en';
    render(
      <IntlProvider>
        <span>child</span>
      </IntlProvider>,
    );

    expect(screen.getByText('child')).toBeTruthy();
    expect(screen.getByTestId('intl').getAttribute('data-locale')).toBe('en');
    expect(screen.getByTestId('intl').getAttribute('data-has-messages')).toBe('true');
  });

  it('switches the forwarded locale when the user is in Portuguese', () => {
    localeState.current = 'pt';
    render(
      <IntlProvider>
        <span>child</span>
      </IntlProvider>,
    );

    expect(screen.getByTestId('intl').getAttribute('data-locale')).toBe('pt');
  });
});
