import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Newsletter from '../Newsletter';
import { Toaster } from 'sonner';

describe('Newsletter', () => {
  it('renders correctly', () => {
    render(<Newsletter />);
    expect(screen.getByText(/Join Our Newsletter/i)).toBeInTheDocument();
    expect(screen.getByText(/Get 10% OFF/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter your email address/i)).toBeInTheDocument();
  });

  it('handles submission correctly', async () => {
    render(
      <>
        <Toaster />
        <Newsletter />
      </>
    );
    
    const input = screen.getByPlaceholderText(/Enter your email address/i);
    const button = screen.getByRole('button', { name: /subscribe/i });

    fireEvent.change(input, { target: { value: 'test@example.com' } });
    fireEvent.click(button);

    expect(button).toBeDisabled();
    expect(button).toHaveTextContent(/Subscribing.../i);

    await waitFor(() => {
      expect(screen.getByText(/Thank you for subscribing!/i)).toBeInTheDocument();
    }, { timeout: 2000 });

    expect(input).toHaveValue('');
    expect(button).not.toBeDisabled();
    expect(button).toHaveTextContent(/Subscribe/i);
  });
});
