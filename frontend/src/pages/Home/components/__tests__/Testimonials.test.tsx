import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Testimonials from '../Testimonials';

const renderTestimonials = () => render(<MemoryRouter><Testimonials /></MemoryRouter>);

describe('Testimonials', () => {
  it('renders section title and subtitle', () => {
    renderTestimonials();
    expect(screen.getByText('What Our Customers Say')).toBeInTheDocument();
    expect(screen.getByText(/Real stories from our community/i)).toBeInTheDocument();
  });

  it('renders testimonial cards with Indian names', () => {
    renderTestimonials();

    const images = screen.getAllByRole('img');
    expect(images.length).toBeGreaterThanOrEqual(4);

    expect(screen.getByText('Priya Sharma')).toBeInTheDocument();
    expect(screen.getByText('Anika Patel')).toBeInTheDocument();
  });

  it('renders ratings for testimonials', () => {
    renderTestimonials();

    const stars = document.querySelectorAll('svg path[d^="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"]');
    expect(stars.length).toBeGreaterThan(0);
  });

  it('renders navigation buttons', () => {
    renderTestimonials();
    const prevButton = document.querySelector('.testimonials-prev');
    const nextButton = document.querySelector('.testimonials-next');
    expect(prevButton).toBeInTheDocument();
    expect(nextButton).toBeInTheDocument();
  });

  it('renders product card links to product detail', () => {
    renderTestimonials();
    const productLinks = screen.getAllByRole('link', { name: /View /i });
    expect(productLinks.length).toBeGreaterThan(0);
    productLinks.forEach((link) => {
      expect(link.getAttribute('href')).toMatch(/^\/products\//);
    });
  });

  it('renders formatted INR prices for purchased products', () => {
    renderTestimonials();
    expect(screen.getAllByText(/₹/).length).toBeGreaterThan(0);
  });

  it('applies page-section-alt background token', () => {
    const { container } = renderTestimonials();
    const section = container.querySelector('section');
    expect(section?.classList.contains('page-section-alt')).toBe(true);
  });
});
