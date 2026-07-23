import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Footer from '../Footer';

const renderFooter = () => render(<MemoryRouter><Footer /></MemoryRouter>);

describe('Footer', () => {
  it('renders correctly with new background color', () => {
    const { container } = renderFooter();
    const footer = container.querySelector('footer');
    expect(footer).toHaveClass('bg-neutral-nearBlack');
  });

  it('renders Surat address', () => {
    renderFooter();
    expect(screen.getByText(/Shipping from Surat/i)).toBeInTheDocument();
    expect(screen.getByText(/Gujarat, India/i)).toBeInTheDocument();
  });

  it('renders the GSTIN line in the Contact section', () => {
    renderFooter();
    expect(screen.getByText(/GSTIN:/i)).toBeInTheDocument();
    expect(screen.getByText(/24XXXXX0000X1Z5/)).toBeInTheDocument();
  });

  it('renders festive newsletter copy', () => {
    renderFooter();
    expect(
      screen.getByText(/Subscribe for exclusive offers, new collection alerts, and Diwali\/Navratri specials/i),
    ).toBeInTheDocument();
  });

  it('renders Indian contact phone', () => {
    renderFooter();
    const phoneLink = screen.getByRole('link', { name: /\+91 97254 08903/ });
    expect(phoneLink).toHaveAttribute('href', 'tel:+919725408903');
  });

  it('renders payment icons', () => {
    renderFooter();
    expect(screen.getByAltText('Visa')).toBeInTheDocument();
    expect(screen.getByAltText('Mastercard')).toBeInTheDocument();
    expect(screen.getByAltText('UPI')).toBeInTheDocument();
    expect(screen.getByAltText('Razorpay')).toBeInTheDocument();
    expect(screen.getByText('GPay')).toBeInTheDocument();
    expect(screen.getByText('Apple Pay')).toBeInTheDocument();
  });

  it('renders Useful Links as routable Links', () => {
    renderFooter();
    const faqLinks = screen.getAllByRole('link', { name: /^FAQ$/ });
    expect(faqLinks.length).toBeGreaterThan(0);
    faqLinks.forEach((link) => {
      expect(link).toHaveAttribute('href', '/faq');
    });
  });

  it('renders social media icons', () => {
    renderFooter();
    expect(screen.getByLabelText('Facebook')).toBeInTheDocument();
    expect(screen.getByLabelText('Instagram')).toBeInTheDocument();
    expect(screen.getByLabelText('Twitter')).toBeInTheDocument();
    expect(screen.getByLabelText('Pinterest')).toBeInTheDocument();
  });

  it('toggles sections on mobile', () => {
    renderFooter();
    const aboutButton = screen.getByRole('button', { name: /About/i });

    const aboutContent = screen.getByText('Our Story').closest('div');
    expect(aboutContent).toHaveClass('max-h-0');

    fireEvent.click(aboutButton);
    expect(aboutContent).toHaveClass('max-h-96');
  });

  it('handles newsletter subscription', async () => {
    renderFooter();
    const emailInput = screen.getByLabelText(/Email address for newsletter subscription/i);
    const subscribeButton = screen.getByRole('button', { name: /Subscribe/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(subscribeButton);

    expect(screen.getByText(/Subscribing.../i)).toBeInTheDocument();

    const successMessage = await screen.findByText(/Success! You're on the list./i);
    expect(successMessage).toBeInTheDocument();
  });

  it('shows error for invalid email', () => {
    renderFooter();
    const emailInput = screen.getByLabelText(/Email address for newsletter subscription/i);
    const subscribeButton = screen.getByRole('button', { name: /Subscribe/i });

    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.click(subscribeButton);

    expect(screen.getByText(/Please enter a valid email address/i)).toBeInTheDocument();
  });
});
