import HeroSlider, { Slide } from './HeroSlider';

// Enhanced hero slides with text positioning
const HERO_SLIDES: Slide[] = [
  {
    id: 1,
    image: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=1920&h=1080&fit=crop&q=80&auto=format',
    alt: 'Limited Edition Fashion Collection',
    eyebrow: 'Limited Edition',
    headline: 'Discover Modern\nElegance',
    cta: 'Explore Collection',
    ctaLink: '/shop',
    textPosition: 'left',
  },
  {
    id: 2,
    image: 'https://images.unsplash.com/photo-1490481651871-ab68de25e43f?w=1920&h=1080&fit=crop&q=80&auto=format',
    alt: 'New Arrivals Collection',
    eyebrow: 'New Arrivals',
    headline: 'Crafted with\nCare',
    cta: 'Explore Collection',
    ctaLink: '/shop',
    textPosition: 'center',
  },
  {
    id: 3,
    image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1920&h=1080&fit=crop&q=80&auto=format',
    alt: 'Timeless Classic Collection',
    eyebrow: 'Timeless Classic',
    headline: 'Your Style\nRedefined',
    cta: 'Explore Collection',
    ctaLink: '/shop',
    textPosition: 'left',
  },
  {
    id: 4,
    image: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=1920&h=1080&fit=crop&q=80&auto=format',
    alt: 'Luxury Collection',
    eyebrow: 'Luxury Collection',
    headline: 'Elevate Your\nPresence',
    cta: 'Explore Collection',
    ctaLink: '/shop',
    textPosition: 'center',
  },
];

const HeroBanner = () => {
  return (
    <section
      className="w-full h-screen max-h-[800px] lg:max-h-[900px] min-h-[600px] relative overflow-hidden"
      role="region"
      aria-label="Hero banner"
    >
      <HeroSlider slides={HERO_SLIDES} autoplayDelay={6000} />
    </section>
  );
};

export default HeroBanner;
