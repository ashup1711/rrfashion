import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PromoBanner from '../PromoBanner';
import { FESTIVE_PROMOS } from '../../../utils/constants';

const renderBanner = (now?: Date) =>
  render(
    <MemoryRouter>
      <PromoBanner now={now} />
    </MemoryRouter>,
  );

describe('PromoBanner', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('is hidden when no festive promo is active for the given date', () => {
    const inactive = new Date(`${FESTIVE_PROMOS.diwali.startDate}T00:00:00`);
    inactive.setDate(inactive.getDate() - 7);
    renderBanner(inactive);
    expect(screen.queryByRole('region', { name: /festival promotion/i })).not.toBeInTheDocument();
  });

  it('shows the Diwali promo during its active window', () => {
    const diwali = new Date('2026-11-01T12:00:00');
    renderBanner(diwali);
    const region = screen.getByRole('region', { name: /festival promotion/i });
    expect(region).toBeInTheDocument();
    expect(region.textContent).toMatch(/Diwali Special/i);
    expect(region.textContent).toMatch(/SHINE20/);
    expect(region.textContent).toMatch(/20%/);
  });

  it('shows the Wedding promo during its active window', () => {
    const wedding = new Date('2026-12-15T12:00:00');
    renderBanner(wedding);
    const region = screen.getByRole('region', { name: /festival promotion/i });
    expect(region).toBeInTheDocument();
    expect(region.textContent).toMatch(/Wedding Season Special/i);
    expect(region.textContent).toMatch(/WEDDING10/);
  });

  it('dismisses and persists dismissal for 7 days', () => {
    const diwali = new Date('2026-11-01T12:00:00');
    renderBanner(diwali);
    expect(screen.getByRole('region', { name: /festival promotion/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /dismiss promotion/i }));
    expect(screen.queryByRole('region', { name: /festival promotion/i })).not.toBeInTheDocument();
    expect(localStorage.getItem('promo_banner_dismissed:diwali')).not.toBeNull();

    renderBanner(diwali);
    expect(screen.queryByRole('region', { name: /festival promotion/i })).not.toBeInTheDocument();
  });
});
