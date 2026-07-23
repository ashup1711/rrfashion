import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import HeroSlider, { Slide } from '../HeroSlider';

describe('HeroSlider', () => {
  const mockSlides: Slide[] = [
    {
      id: 1,
      image: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=1920&h=1080&fit=crop',
      alt: 'Test Slide 1',
      eyebrow: 'Limited Edition',
      headline: 'Test Headline',
      cta: 'Explore Collection',
      ctaLink: '/shop',
    },
    {
      id: 2,
      image: 'https://images.unsplash.com/photo-1490481651871-ab68de25e43f?w=1920&h=1080&fit=crop',
      alt: 'Test Slide 2',
      eyebrow: 'New Arrivals',
      headline: 'Another Headline',
      cta: 'Shop Now',
      ctaLink: '/shop',
    },
  ];

  it('renders all slides', () => {
    render(<HeroSlider slides={mockSlides} />);

    // Check that all slide images are rendered
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(2);
    expect(images[0]).toHaveAttribute('alt', 'Test Slide 1');
    expect(images[1]).toHaveAttribute('alt', 'Test Slide 2');
  });

  it('marks the first slide image as high priority (LCP)', () => {
    render(<HeroSlider slides={mockSlides} />);
    const images = screen.getAllByRole('img');
    expect(images[0]).toHaveAttribute('fetchpriority', 'high');
    expect(images[0]).toHaveAttribute('loading', 'eager');
  });

  it('keeps subsequent slide images lazy', () => {
    render(<HeroSlider slides={mockSlides} />);
    const images = screen.getAllByRole('img');
    expect(images[1]).toHaveAttribute('loading', 'lazy');
  });

  it('renders eyebrow text for each slide', () => {
    render(<HeroSlider slides={mockSlides} />);
    
    expect(screen.getByText('Limited Edition')).toBeInTheDocument();
    expect(screen.getByText('New Arrivals')).toBeInTheDocument();
  });

  it('renders headline text for each slide', () => {
    render(<HeroSlider slides={mockSlides} />);
    
    expect(screen.getByText('Test Headline')).toBeInTheDocument();
    expect(screen.getByText('Another Headline')).toBeInTheDocument();
  });

  it('renders CTA buttons with correct links', () => {
    render(<HeroSlider slides={mockSlides} />);
    
    const ctaButtons = screen.getAllByText(/Explore Collection|Shop Now/);
    expect(ctaButtons).toHaveLength(2);
    expect(ctaButtons[0].closest('a')).toHaveAttribute('href', '/shop');
    expect(ctaButtons[1].closest('a')).toHaveAttribute('href', '/shop');
  });

  it('renders navigation arrows', () => {
    render(<HeroSlider slides={mockSlides} />);
    
    // Check for previous/next buttons by their SVG icons
    const prevButton = document.querySelector('.hero-prev');
    const nextButton = document.querySelector('.hero-next');
    
    expect(prevButton).toBeInTheDocument();
    expect(nextButton).toBeInTheDocument();
  });

  it('applies correct responsive classes', () => {
    render(<HeroSlider slides={mockSlides} />);
    
    // Check that text containers have responsive padding
    const textContainer = document.querySelector('.max-w-xl');
    expect(textContainer).toBeInTheDocument();
    expect(textContainer?.classList.contains('animate-fade-in-delayed')).toBe(true);
  });

  it('handles empty slides array gracefully', () => {
    const { container } = render(<HeroSlider slides={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders gradient overlay on each slide', () => {
    render(<HeroSlider slides={mockSlides} />);
    
    const overlays = document.querySelectorAll('.bg-gradient-to-b');
    expect(overlays.length).toBeGreaterThan(0);
  });
});