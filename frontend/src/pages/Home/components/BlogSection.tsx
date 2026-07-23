import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { BlogPost } from '../../../types/blog';

const MOCK_POSTS: BlogPost[] = [
  {
    id: '1',
    title: 'Top 10 Summer Fashion Trends You Can\'t Miss in 2024',
    excerpt: 'Discover the latest trends in ethnic wear that are dominating this summer season...',
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=600&q=80',
    category: 'Fashion Tips',
    date: '2024-06-15',
  },
  {
    id: '2',
    title: 'How to Style Your Kurti for Office Wear',
    excerpt: 'Transform your everyday kurtis into professional office looks with these styling tips...',
    image: 'https://images.unsplash.com/photo-1558171813-4c088753af8f?auto=format&fit=crop&w=600&q=80',
    category: 'Style Guide',
    date: '2024-06-10',
  },
  {
    id: '3',
    title: 'Wedding Season: Saree Trends for 2024',
    excerpt: 'From pastel hues to bold prints, explore the saree trends that are ruling this wedding season...',
    image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80',
    category: 'Wedding',
    date: '2024-06-05',
  },
];

const BlogCard: React.FC<{ post: BlogPost; index: number }> = ({ post, index }) => {
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      className="group"
    >
      <Link to={`/blog/${post.id}`} className="block">
        {/* Image */}
        <div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-4">
          <img
            src={post.image}
            alt={post.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute top-4 left-4">
            <span className="px-3 py-1 bg-white/90 backdrop-blur-sm text-primary-600 text-xs font-semibold rounded-full">
              {post.category}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-2">
          <time className="text-caption text-neutral-dark">{post.date}</time>
          <h3 className="font-display text-lg font-semibold text-neutral-nearBlack group-hover:text-primary-500 transition-colors line-clamp-2">
            {post.title}
          </h3>
          <p className="text-body-small text-neutral-dark line-clamp-2">
            {post.excerpt}
          </p>
        </div>
      </Link>
    </motion.article>
  );
};

const BlogSection: React.FC = () => {
  return (
    <section className="page-section-alt" aria-label="Latest from our blog">
      <div className="container-page section-spacing">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="font-display text-section-title text-neutral-nearBlack mb-4">
            News & Insights
          </h2>
          <p className="text-section-subtitle text-neutral-dark max-w-2xl mx-auto">
            Browse our trending articles: styling tips, fashion trends, and more.
          </p>
        </div>

        {/* Blog Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {MOCK_POSTS.map((post, index) => (
            <BlogCard key={post.id} post={post} index={index} />
          ))}
        </div>

        {/* View All Link */}
        <div className="text-center mt-10">
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 px-6 py-3 border-2 border-primary-500 text-primary-500 font-semibold rounded-full hover:bg-primary-500 hover:text-white transition-all duration-300"
          >
            View All Articles
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default BlogSection;
