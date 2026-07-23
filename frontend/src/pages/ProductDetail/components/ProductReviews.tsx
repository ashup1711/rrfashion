import { useState, useCallback } from 'react';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import { useReviews, useCreateReview } from '../../../hooks/useReviews';
import { useAuthStore } from '../../../store/authStore';

interface ProductReviewsProps {
  productId: string;
}

const ProductReviews = ({ productId }: ProductReviewsProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const { data: reviewsData, isLoading } = useReviews(productId);
  const createReviewMutation = useCreateReview();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const reviews = reviewsData?.items || [];
  const approvedReviews = reviews.filter((r) => r.status === 'APPROVED');

  const averageRating =
    approvedReviews.length > 0
      ? (approvedReviews.reduce((acc, r) => acc + r.rating, 0) / approvedReviews.length).toFixed(1)
      : '0.0';

  // REQ-FE-003: stabilize the close handler reference so useFocusTrap does not re-run
  // its effect on every render (which steals focus from inputs)
  const closeModal = useCallback(() => setIsModalOpen(false), []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createReviewMutation.mutateAsync({
        productId,
        rating,
        comment,
      });
      closeModal();
      setComment('');
      setRating(5);
    } catch {
      // handled by mutation
    }
  };

  return (
    <section className="mt-12 pt-8 border-t border-gray-200">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Customer Reviews</h2>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg
                  key={star}
                  className={`w-5 h-5 ${
                    star <= Math.round(Number(averageRating))
                      ? 'text-yellow-400'
                      : 'text-gray-300'
                  }`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <span className="text-lg font-semibold text-gray-900">{averageRating} out of 5</span>
            <span className="text-sm text-gray-500">({approvedReviews.length} verified reviews)</span>
          </div>
        </div>

        <Button
          variant="primary"
          onClick={() => {
            if (!isAuthenticated) {
              alert('Please login to write a review');
              return;
            }
            setIsModalOpen(true);
          }}
        >
          Write a Review
        </Button>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-gray-500">Loading reviews...</div>
      ) : approvedReviews.length === 0 ? (
        <Card>
          <div className="py-8 text-center text-gray-500">
            No approved reviews yet. Be the first to review this product!
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {approvedReviews.map((review) => (
            <Card key={review.id}>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-semibold text-primary">
                    {review.user?.firstName?.[0] || 'U'}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-900">
                      {review.user ? `${review.user.firstName} ${review.user.lastName}` : 'Customer'}
                    </h4>
                    <span className="text-xs text-gray-500">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg
                        key={star}
                        className={`w-4 h-4 ${
                          star <= review.rating ? 'text-yellow-400' : 'text-gray-300'
                        }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="mt-2 text-sm text-gray-700">{review.comment}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Write Review Modal */}
      {/* REQ-FE-001: Order Item ID input REMOVED — reviews are now direct */}
      <Modal isOpen={isModalOpen} onClose={closeModal} title="Write a Product Review">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  className="focus:outline-none"
                >
                  <svg
                    className={`w-7 h-7 ${
                      star <= rating ? 'text-yellow-400' : 'text-gray-300'
                    }`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Review Comment</label>
            <textarea
              required
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What did you like or dislike about this product?"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary text-sm"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" disabled={createReviewMutation.isPending}>
              {createReviewMutation.isPending ? 'Submitting...' : 'Submit Review'}
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
};

export default ProductReviews;
