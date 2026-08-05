import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getBlogs } from '../../../api/blog';
import type { BlogPost } from '../../../types/blog';

const BlogCard: React.FC<{ post: BlogPost; index: number }> = ({ post, index }) => {
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      className="group"
    >
      <Link to={post.slug ? `/blog/${post.slug}` : `/blog/${post.id}`} className="block">
        <div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-4">
           <img
              src={post.imageUrl}
              alt={post.title}
             className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
             loading="lazy"
           />
           <div className="absolute top-4 left-4">
              <span className="px-3 py-1 bg-white/90 backdrop-blur-sm text-primary-600 text-xs font-semibold rounded-full">
                {post.category ?? 'General'}
              </span>
           </div>
        </div>

        <div className="space-y-2">
           <time className="text-caption text-neutral-dark">{new Date(post.date).toLocaleDateString()}</time>
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

const BlogSkeleton: React.FC = () => (
  <div className="animate-pulse">
    <div className="aspect-[4/3] rounded-xl bg-gray-200 mb-4" />
    <div className="space-y-2">
      <div className="h-3 bg-gray-200 rounded w-1/4" />
      <div className="h-5 bg-gray-200 rounded w-3/4" />
      <div className="h-4 bg-gray-200 rounded w-full" />
      <div className="h-4 bg-gray-200 rounded w-2/3" />
    </div>
  </div>
);

const BlogSection: React.FC = () => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['blogs', { page: 1, limit: 3 }],
    queryFn: () => getBlogs({ page: 1, limit: 3 }),
    staleTime: 1000 * 60 * 5,
    retry: 2,
    retryDelay: 1000,
    onError: () => toast.error('Failed to load blog posts.'),
  });

  const posts = (data?.data ?? []).map((post) => ({
    ...post,
    date: post.publishedAt || post.createdAt,
  }));

  return (
    <section className="page-section-alt" aria-label="Latest from our blog">
      <div className="container-page section-spacing">
        <div className="text-center mb-12">
          <h2 className="font-display text-section-title text-neutral-nearBlack mb-4">
            News & Insights
          </h2>
          <p className="text-section-subtitle text-neutral-dark max-w-2xl mx-auto">
            Browse our trending articles: styling tips, fashion trends, and more.
          </p>
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <BlogSkeleton key={i} />
            ))}
          </div>
        )}

        {error && !isLoading && (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">Failed to load blog posts. Please try again.</p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {!isLoading && !error && posts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600">No blog posts published yet. Check back soon!</p>
          </div>
        )}

        {!isLoading && !error && posts.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {posts.map((post, index) => (
                <BlogCard key={post.id} post={post} index={index} />
              ))}
            </div>

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
          </>
        )}
      </div>
    </section>
  );
};

export default BlogSection;
