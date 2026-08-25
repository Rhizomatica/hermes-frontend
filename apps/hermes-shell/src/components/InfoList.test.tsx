import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import InfoList from './InfoList';

describe('InfoList', () => {
  it('renders the title when provided', () => {
    render(<InfoList title="User Information" items={[]} />);
    expect(screen.getByText('User Information')).toBeTruthy();
  });

  it('omits the title block when no title is provided', () => {
    render(<InfoList items={[{ label: 'Callsign', value: 'PU2UIT' }]} />);
    expect(screen.queryByText('User Information')).toBeNull();
    expect(screen.getByText('Callsign')).toBeTruthy();
  });

  it('renders every item label and value', () => {
    render(
      <InfoList
        items={[
          { label: 'Callsign', value: 'PU2UIT' },
          { label: 'Role', value: 'operator' },
        ]}
      />,
    );

    expect(screen.getByText('Callsign')).toBeTruthy();
    expect(screen.getByText('PU2UIT')).toBeTruthy();
    expect(screen.getByText('Role')).toBeTruthy();
    expect(screen.getByText('operator')).toBeTruthy();
  });

  it('renders ReactNode values', () => {
    render(<InfoList items={[{ label: 'Status', value: <span>online</span> }]} />);
    expect(screen.getByText('online')).toBeTruthy();
  });

  it('renders an empty container when there are no items and no title', () => {
    const { container } = render(<InfoList items={[]} />);
    expect(container.textContent).toBe('');
  });
});
