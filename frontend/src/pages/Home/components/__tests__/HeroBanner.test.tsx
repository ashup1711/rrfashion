import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import HeroBanner from '../HeroBanner';

describe('HeroBanner', () => {
  it('renders the hero banner section', () => {
    render(<HeroBanner />);
    
    const section = document.querySelector('section');
    expect(section).toBeInTheDocument();
    expect(section?.classList.contains('w-full')).toBe(true);
    expect(section?.classList.contains('h-screen')).toBe(true);
  });

  it('renders the HeroSlider component', () => {
    render(<HeroBanner />);
    
    // Check that HeroSlider is rendered
    const slider = document.querySelector('.hero-slider');
    expect(slider).toBeInTheDocument();
  });

  it('renders all 4 placeholder slides', () => {
    render(<HeroBanner />);
    
    // Check for all eyebrow texts from the 4 slides
    expect(screen.getByText('Limited Edition')).toBeInTheDocument();
    expect(screen.getByText('New Arrivals')).toBeInTheDocument();
    expect(screen.getByText('Timeless Classic')).toBeInTheDocument();
    expect(screen.getByText('Luxury Collection')).toBeInTheDocument();
  });

  it('renders correct CTA text on all slides', () => {
    render(<HeroBanner />);
    
    const ctaButtons = screen.getAllByText('Explore Collection');
    expect(ctaButtons.length).toBeGreaterThan(0);
  });

  it('has correct responsive classes applied', () => {
    render(<HeroBanner />);
    
    const section = document.querySelector('section');
    expect(section?.classList.contains('max-h-[800px]')).toBe(true);
    expect(section?.classList.contains('lg:max-h-[900px]')).toBe(true);
    expect(section?.classList.contains('min-h-[600px]')).toBe(true);
  });

  it('renders all slide images', () => {
    render(<HeroBanner />);
    
    const images = screen.getAllByRole('img');
    expect(images.length).toBe(4);
    
    // Verify images have correct alt text
    expect(images[0]).toHaveAttribute('alt', 'Limited Edition Fashion Collection');
  });

  it('applies overflow-hidden to prevent scrollbars', () => {
    render(<HeroBanner />);
    
    const section = document.querySelector('section');
    expect(section?.classList.contains('overflow-hidden')).toBe(true);
  });
});