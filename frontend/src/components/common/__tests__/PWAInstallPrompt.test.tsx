import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PWAInstallPrompt from '../PWAInstallPrompt';

const renderPWA = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <PWAInstallPrompt />
    </MemoryRouter>,
  );

describe('PWAInstallPrompt', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders nothing initially', () => {
    renderPWA();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('renders the install prompt after beforeinstallprompt fires and dwell time elapses', () => {
    vi.useFakeTimers();
    renderPWA();

    act(() => {
      const event = new Event('beforeinstallprompt');
      window.dispatchEvent(event);
    });

    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(30000);
    });

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText(/install rr fashion/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /install/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /not now/i })).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('persists dismissal to localStorage on Not now click', () => {
    vi.useFakeTimers();
    renderPWA();

    act(() => {
      window.dispatchEvent(new Event('beforeinstallprompt'));
      vi.advanceTimersByTime(30000);
    });

    fireEvent.click(screen.getByRole('button', { name: /not now/i }));

    expect(localStorage.getItem('pwa_install_dismissed')).not.toBeNull();
    vi.useRealTimers();
  });

  it('does not show the prompt before dwell time elapses', () => {
    vi.useFakeTimers();
    renderPWA();

    act(() => {
      window.dispatchEvent(new Event('beforeinstallprompt'));
      vi.advanceTimersByTime(29000);
    });

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it('is hidden on /checkout path', () => {
    render(
      <MemoryRouter initialEntries={['/checkout']}>
        <PWAInstallPrompt />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('invokes the deferred prompt when Install is clicked', () => {
    vi.useFakeTimers();
    const promptMock = vi.fn().mockResolvedValue(undefined);
    const userChoiceMock = vi.fn().mockResolvedValue({ outcome: 'accepted' });
    renderPWA();

    act(() => {
      const event = new Event('beforeinstallprompt') as Event & {
        prompt: typeof promptMock;
        userChoice: typeof userChoiceMock;
      };
      event.prompt = promptMock;
      event.userChoice = userChoiceMock;
      window.dispatchEvent(event);
      vi.advanceTimersByTime(30000);
    });

    expect(screen.getByRole('status')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /install/i }));

    expect(promptMock).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
