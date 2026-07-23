import { Link } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';
import { ROUTES } from '../../../utils/constants';
import { formatCurrency } from '../../../utils/formatCurrency';

interface Testimonial {
  id: number;
  name: string;
  photo: string;
  rating: number;
  text: string;
  product?: string;
  productImage?: string;
  productPrice?: number;
  productId?: string;
  location?: string;
  date?: string;
  verified?: boolean;
}

const testimonials: Testimonial[] = [
  {
    id: 1,
    name: 'Priya Sharma',
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80',
    rating: 5,
    text: 'The silk saree I bought for my sister\'s wedding was absolutely gorgeous. The fall and finish were perfect, and I received so many compliments. rrFashion is now my go-to for festive wear!',
    product: 'Banarasi Silk Saree',
    productImage: 'https://images.unsplash.com/photo-1581044777550-4cfa60707c03?auto=format&fit=crop&w=120&h=120&q=80',
    productPrice: 2499,
    productId: 'p-s-1',
    location: 'Mumbai, India',
    date: '2 weeks ago',
    verified: true,
  },
  {
    id: 2,
    name: 'Anika Patel',
    photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&h=150&q=80',
    rating: 5,
    text: 'I rented a lehenga for Diwali and the experience was seamless. The fit was perfect, the fabric was premium, and the COD option made checkout so easy. Will definitely rent again!',
    product: 'Embroidered Lehenga',
    productImage: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=120&h=120&q=80',
    productPrice: 3299,
    productId: 'p-k-1',
    location: 'Ahmedabad, India',
    date: '1 month ago',
    verified: true,
  },
  {
    id: 3,
    name: 'Meera Iyer',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80',
    rating: 4,
    text: 'The cotton kurtis are my everyday favourites now — breathable, well-stitched, and the colours stay bright even after multiple washes. Super fast delivery to Bangalore!',
    product: 'Cotton Floral Kurti',
    productImage: 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?auto=format&fit=crop&w=120&h=120&q=80',
    productPrice: 1599,
    productId: 'p-g-1',
    location: 'Bangalore, India',
    date: '3 weeks ago',
    verified: true,
  },
  {
    id: 4,
    name: 'Kavya Reddy',
    photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80',
    rating: 5,
    text: 'Customer support helped me pick the right jhumka size for my engagement. The silver jhumkas arrived in beautiful packaging and matched my outfit perfectly. Highly recommend!',
    product: 'Silver Jhumka Earrings',
    productImage: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=120&h=120&q=80',
    productPrice: 1899,
    productId: 'p-j-1',
    location: 'Hyderabad, India',
    date: '5 days ago',
    verified: true,
  },
];

const StarRating = ({ rating }: { rating: number }) => {
  return (
    <div className="flex gap-1 mb-4">
      {[...Array(5)].map((_, i) => (
        <svg
          key={i}
          className={`w-5 h-5 ${i < rating ? 'text-primary-500 fill-primary-500' : 'text-neutral-medium fill-neutral-medium'}`}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
        >
          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
        </svg>
      ))}
    </div>
  );
};

const VerifiedBadge = () => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-success/10 text-success text-[10px] font-semibold rounded-full mt-2">
    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
    Verified Purchase
  </span>
);

const Testimonials = () => {
  return (
    <section className="page-section-alt overflow-hidden" role="region" aria-label="Customer testimonials">
      <div className="container mx-auto px-4 md:px-8">
        <div className="text-center mb-12">
          <h2 className="text-section-title font-display text-neutral-nearBlack mb-4">
            What Our Customers Say
          </h2>
          <p className="text-section-subtitle text-neutral-dark max-w-2xl mx-auto">
            Real stories from our community about their experiences with our products and services.
          </p>
        </div>

        <Swiper
          modules={[Autoplay, Pagination, Navigation]}
          spaceBetween={30}
          slidesPerView={1}
          loop={true}
          autoplay={{
            delay: 5000,
            disableOnInteraction: false,
            pauseOnMouseEnter: true,
          }}
          pagination={{
            clickable: true,
            dynamicBullets: true,
          }}
          navigation={{
            nextEl: '.testimonials-next',
            prevEl: '.testimonials-prev',
          }}
          breakpoints={{
            320: {
              slidesPerView: 1.2,
              spaceBetween: 16,
              centeredSlides: true,
            },
            640: {
              slidesPerView: 2,
              spaceBetween: 24,
              centeredSlides: false,
            },
            1024: {
              slidesPerView: 3,
              spaceBetween: 30,
              centeredSlides: false,
            },
          }}
          className="testimonials-slider !pb-16"
        >
          {testimonials.map((testimonial) => (
            <SwiperSlide key={testimonial.id}>
              <div className="bg-neutral-white p-8 rounded-xl shadow-md h-full flex flex-col items-center text-center transition-transform duration-300 hover:-translate-y-2">
                <div className="relative mb-6">
                  <img
                    src={testimonial.photo}
                    alt={testimonial.name}
                    className="w-20 h-20 rounded-full object-cover border-4 border-primary-100 shadow-sm"
                  />
                  <div className="absolute -bottom-2 -right-2 bg-primary-500 text-white rounded-full p-1.5 shadow-sm">
                    <svg
                      className="w-3 h-3 fill-current"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                    >
                      <path d="M14.017 21L14.017 18C14.017 16.895 14.912 16 16.017 16H19.017V14C19.017 11.239 16.778 9 14.017 9V7C17.883 7 21.017 10.134 21.017 14V21H14.017ZM3.017 21L3.017 18C3.017 16.895 3.912 16 5.017 16H8.017V14C8.017 11.239 5.778 9 3.017 9V7C6.883 7 10.017 10.134 10.017 14V21H3.017Z" />
                    </svg>
                  </div>
                </div>

                <StarRating rating={testimonial.rating} />

                <p className="text-body text-neutral-dark mb-6 italic relative flex-grow">
                  "{testimonial.text}"
                </p>

                <div className="mt-auto w-full">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <h4 className="font-display font-semibold text-neutral-nearBlack text-lg">
                      {testimonial.name}
                    </h4>
                    {testimonial.location && (
                      <span className="text-caption text-neutral-dark">• {testimonial.location}</span>
                    )}
                  </div>
                  
                  {testimonial.verified && <VerifiedBadge />}
                  
                  {testimonial.date && (
                    <span className="block text-caption text-neutral-dark mt-1">{testimonial.date}</span>
                  )}

                  {testimonial.product && testimonial.productId && testimonial.productImage && testimonial.productPrice !== undefined && (
                    <Link
                      to={ROUTES.PRODUCT_DETAIL(testimonial.productId)}
                      className="mt-3 flex items-center gap-3 p-2 rounded-lg border border-neutral-medium bg-neutral-white hover:border-primary-500 hover:shadow-sm transition-all group"
                      aria-label={`View ${testimonial.product}`}
                    >
                      <img
                        src={testimonial.productImage}
                        alt={testimonial.product}
                        className="w-10 h-10 rounded object-cover flex-shrink-0"
                        loading="lazy"
                      />
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-caption text-neutral-nearBlack font-semibold truncate">
                          {testimonial.product}
                        </p>
                        <p className="text-caption text-primary-500 font-medium">
                          {formatCurrency(testimonial.productPrice)}
                        </p>
                      </div>
                      <svg
                        className="w-4 h-4 text-neutral-dark group-hover:text-primary-500 group-hover:translate-x-0.5 transition-all flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  )}
                </div>
              </div>
            </SwiperSlide>
          ))}

          {/* Navigation Arrows */}
          <div className="flex justify-center gap-4 mt-8">
            <button
              type="button"
              className="testimonials-prev w-12 h-12 bg-neutral-white text-neutral-nearBlack rounded-full flex items-center justify-center transition-all duration-300 shadow-sm hover:shadow-md border border-neutral-medium hover:bg-primary-50"
              aria-label="Previous testimonial"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <button
              type="button"
              className="testimonials-next w-12 h-12 bg-neutral-white text-neutral-nearBlack rounded-full flex items-center justify-center transition-all duration-300 shadow-sm hover:shadow-md border border-neutral-medium hover:bg-primary-50"
              aria-label="Next testimonial"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
        </Swiper>
      </div>

      <style>{`
        .testimonials-slider .swiper-pagination {
          bottom: 0 !important;
        }
        
        .testimonials-slider .swiper-pagination-bullet {
          width: 10px;
          height: 10px;
          background-color: var(--primary-300, #D4CCC0);
          opacity: 1;
          transition: all 0.3s ease;
        }

        .testimonials-slider .swiper-pagination-bullet-active {
          background-color: var(--primary-500, #9A8573);
          width: 24px;
          border-radius: 5px;
        }
      `}</style>
    </section>
  );
};

export default Testimonials;
