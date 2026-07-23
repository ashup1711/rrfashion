import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AnnouncementBar from '../AnnouncementBar';

const renderAnnouncementBar = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <AnnouncementBar />
    </MemoryRouter>,
  );

describe('AnnouncementBar', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders the first announcement message on mount', () => {
    renderAnnouncementBar();
    expect(
      screen.getByText(/free shipping on orders over ₹999/i),
    ).toBeInTheDocument();
  });

  it('rotates messages every 5 seconds', () => {
    vi.useFakeTimers();
    renderAnnouncementBar();

    expect(
      screen.getByText(/free shipping on orders over ₹999/i),
    ).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByText(/cash on delivery available/i)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByText(/first10/i)).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('persists dismissal and does not re-render on remount', () => {
    const { unmount } = renderAnnouncementBar();
    fireEvent.click(screen.getByRole('button', { name: /dismiss announcement/i }));

    expect(localStorage.getItem('announcement_bar_dismissed')).not.toBeNull();

    unmount();
    renderAnnouncementBar();
    expect(screen.queryByText(/free shipping on orders over ₹999/i)).not.toBeInTheDocument();
  });

  it('remains hidden if dismissal was within the 7-day window', () => {
    localStorage.setItem('announcement_bar_dismissed', String(Date.now() - 1000));
    renderAnnouncementBar();
    expect(screen.queryByText(/free shipping on orders over ₹999/i)).not.toBeInTheDocument();
  });

  it('is hidden on /checkout path', () => {
    render(
      <MemoryRouter initialEntries={['/checkout']}>
        <AnnouncementBar />
      </MemoryRouter>,
    );
    expect(screen.queryByText(/free shipping on orders over ₹999/i)).not.toBeInTheDocument();
  });
});
