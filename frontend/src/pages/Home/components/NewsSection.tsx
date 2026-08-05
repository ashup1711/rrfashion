import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { getActiveNews } from '../../../api/news';
import type { NewsItem } from '../../../types/news';

const NewsCard: React.FC<{ news: NewsItem; index: number }> = ({ news, index }) => (
  <motion.article
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay: index * 0.1, duration: 0.5 }}
    className="group"
  >
    <a
      href={news.linkUrl || '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="block"
    >
      <div className="relative aspect-[16/10] rounded-xl overflow-hidden mb-4">
        <img
          src={news.imageUrl || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=600&q=80'}
          alt={news.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        {news.category && (
          <div className="absolute top-4 left-4">
            <span className="px-3 py-1 bg-white/90 backdrop-blur-sm text-primary-600 text-xs font-semibold rounded-full">
              {news.category}
            </span>
          </div>
        )}
      </div>
      <div className="space-y-2">
        <h3 className="font-display text-lg font-semibold text-neutral-nearBlack group-hover:text-primary-500 transition-colors line-clamp-2">
          {news.title}
        </h3>
        <p className="text-body-small text-neutral-dark line-clamp-2">
          {news.excerpt}
        </p>
        {news.linkUrl && (
          <span className="inline-flex items-center gap-1 text-primary-500 text-sm font-medium mt-2">
            {news.linkText || 'Read More'}
            <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </span>
        )}
      </div>
    </a>
  </motion.article>
);

const NewsSkeleton: React.FC = () => (
  <div className="animate-pulse">
    <div className="aspect-[16/10] rounded-xl bg-gray-200 mb-4" />
    <div className="space-y-2">
      <div className="h-4 bg-gray-200 rounded w-3/4" />
      <div className="h-3 bg-gray-200 rounded w-full" />
      <div className="h-3 bg-gray-200 rounded w-2/3" />
    </div>
  </div>
);

const NewsSection: React.FC = () => {
  const { data: news, isLoading, error } = useQuery({
    queryKey: ['activeNews'],
    queryFn: getActiveNews,
    staleTime: 1000 * 60 * 5,
  });

  if (error) {
    console.error('NewsSection failed to load:', error);
    return null;
  }

  if (isLoading) {
    return (
      <section className="page-section" aria-label="Latest news">
        <div className="container-page section-spacing">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <NewsSkeleton key={i} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!news || news.length === 0) return null;

  return (
    <section className="page-section" aria-label="Latest news">
      <div className="container-page section-spacing">
        <div className="text-center mb-12">
          <h2 className="font-display text-section-title text-neutral-nearBlack mb-4">
            Latest News
          </h2>
          <p className="text-section-subtitle text-neutral-dark max-w-2xl mx-auto">
            Stay updated with our latest announcements and offers.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {news.map((item, index) => (
            <NewsCard key={item.id} news={item} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default NewsSection;
