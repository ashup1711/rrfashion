import React, { useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Navigation, A11y } from 'swiper/modules';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../../utils/constants';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

interface ProductTag {
  id: string;
  name: string;
  price: number;
  x: number; // percentage from left
  y: number; // percentage from top
}

interface LookbookItem {
  id: string;
  image: string;
  title: string;
  products: ProductTag[];
}

const mockLookbook: LookbookItem[] = [
  {
    id: 'look-1',
    image: 'https://images.unsplash.com/photo-1581044777550-4cfa60707c03?auto=format&fit=crop&q=80&w=800',
    title: 'Festive Edit',
    products: [
      { id: 'p-1', name: 'Premium Silk Saree', price: 4500, x: 30, y: 40 },
      { id: 'p-2', name: 'Gold Plated Necklace', price: 1200, x: 50, y: 25 },
    ],
  },
  {
    id: 'look-2',
    image: 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?auto=format&fit=crop&q=80&w=800',
    title: 'Sangeet Ready',
    products: [
      { id: 'p-3', name: 'Cotton Floral Kurti', price: 1800, x: 60, y: 50 },
    ],
  },
  {
    id: 'look-3',
    image: 'https://images.unsplash.com/photo-1595967783875-c371f35d8049?auto=format&fit=crop&q=80&w=800',
    title: 'Wedding Guest',
    products: [
      { id: 'p-4', name: 'Embroidered Leheriya', price: 3200, x: 40, y: 60 },
      { id: 'p-5', name: 'Silver Jhumkas', price: 850, x: 65, y: 30 },
    ],
  },
  {
    id: 'look-4',
    image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&q=80&w=800',
    title: 'Indo-Western',
    products: [
      { id: 'p-6', name: 'Fusion Jacket', price: 2500, x: 50, y: 45 },
    ],
  },
];

const ProductTagComponent: React.FC<{ tag: ProductTag }> = ({ tag }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div 
      className="absolute z-20 group"
      style={{ left: `${tag.x}%`, top: `${tag.y}%` }}
    >
      {/* The Pin */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className="w-4 h-4 rounded-full bg-white shadow-lg border-2 border-primary-500 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center transition-transform hover:scale-125 focus:outline-none"
        aria-label={`View ${tag.name}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse"></span>
      </button>

      {/* The Tooltip */}
      <div 
        className={`absolute bottom-6 left-1/2 -translate-x-1/2 bg-white rounded-lg shadow-xl p-3 w-40 transition-all duration-300 pointer-events-none transform ${
          isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
        } ${isOpen ? 'pointer-events-auto' : ''}`}
      >
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-3 h-3 bg-white rotate-45"></div>
        <h4 className="text-caption font-bold text-primary-900 mb-1">{tag.name}</h4>
        <p className="text-caption text-primary-600 mb-2">₹{tag.price.toLocaleString()}</p>
        <Link 
          to={ROUTES.PRODUCT_DETAIL(tag.id)}
          className="text-[10px] text-primary-500 font-bold uppercase tracking-widest hover:text-primary-600 underline"
        >
          View Product
        </Link>
      </div>
    </div>
  );
};

const LookbookItemComponent: React.FC<{ item: LookbookItem }> = ({ item }) => {
  return (
    <div className="relative group overflow-hidden rounded-xl aspect-[3/4] bg-neutral-medium">
      <img
        src={item.image}
        alt={item.title}
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-primary-950/60 to-transparent opacity-60 group-hover:opacity-90 transition-opacity duration-300"></div>

      <div className="absolute bottom-6 left-6 right-6">
        <h3 className="text-white font-display text-xl md:text-2xl drop-shadow-md">
          {item.title}
        </h3>
      </div>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <Link
          to={ROUTES.SHOP}
          className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white text-neutral-nearBlack px-6 py-3 rounded-full font-semibold hover:bg-primary-500 hover:text-white transition-colors pointer-events-auto focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary-950"
          aria-label={`Shop the look: ${item.title}`}
        >
          Shop the Look
        </Link>
      </div>

      {item.products.map(tag => (
        <ProductTagComponent key={tag.id} tag={tag} />
      ))}
    </div>
  );
};

const Lookbook: React.FC = () => {
  return (
    <section className="py-page-section bg-primary-50" role="region" aria-label="Shop the look">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-section-title font-display text-primary-900 mb-2">Shop The Look</h2>
          <p className="text-section-subtitle text-primary-600">Lifestyle inspiration for your wardrobe</p>
        </div>

        {/* Desktop Grid */}
        <div className="hidden md:grid grid-cols-4 gap-6">
          {mockLookbook.map(item => (
            <LookbookItemComponent key={item.id} item={item} />
          ))}
        </div>

        {/* Mobile Carousel */}
        <div className="md:hidden -mx-4">
          <Swiper
            modules={[Pagination, Navigation, A11y]}
            spaceBetween={20}
            slidesPerView={1.2}
            centeredSlides={true}
            pagination={{ clickable: true }}
            className="lookbook-swiper pb-12"
          >
            {mockLookbook.map(item => (
              <SwiperSlide key={item.id}>
                <div className="px-2">
                  <LookbookItemComponent item={item} />
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>
    </section>
  );
};

export default Lookbook;
