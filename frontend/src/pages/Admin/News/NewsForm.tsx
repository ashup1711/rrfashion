import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import Button from '../../../components/ui/Button';
import { adminGetAllNews, adminCreateNews, adminUpdateNews, type CreateNewsData, type UpdateNewsData } from '../../../api/news';
import type { NewsItem } from '../../../types/news';

const NewsFormPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const isEdit = !!id && id !== 'new';

  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [category, setCategory] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: existingNews } = useQuery({
    queryKey: ['adminNewsItem', id],
    queryFn: async () => {
      const res = await adminGetAllNews(1, 100);
      return res.data.find((n: NewsItem) => n.id === id);
    },
    enabled: isEdit,
  });

  useEffect(() => {
    if (existingNews) {
      setTitle(existingNews.title);
      setExcerpt(existingNews.excerpt);
      setContent(existingNews.content || '');
      setImageUrl(existingNews.imageUrl || '');
      setLinkUrl(existingNews.linkUrl || '');
      setLinkText(existingNews.linkText || '');
      setCategory(existingNews.category || '');
      setStartDate(existingNews.startDate ? new Date(existingNews.startDate).toISOString().slice(0, 16) : '');
      setEndDate(existingNews.endDate ? new Date(existingNews.endDate).toISOString().slice(0, 16) : '');
    }
  }, [existingNews]);

  const createMutation = useMutation({
    mutationFn: adminCreateNews,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminNews'] });
      toast.success('News item created successfully');
      navigate('/admin/news');
    },
    onError: (err: Error) => {
      setFormError(err.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateNewsData) => adminUpdateNews(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminNews'] });
      toast.success('News item updated successfully');
      navigate('/admin/news');
    },
    onError: (err: Error) => {
      setFormError(err.message);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) { setFormError('Title is required'); return; }
    if (!excerpt.trim()) { setFormError('Excerpt is required'); return; }
    if (!startDate) { setFormError('Start date is required'); return; }
    if (!endDate) { setFormError('End date is required'); return; }
    if (new Date(endDate) <= new Date(startDate)) { setFormError('End date must be after start date'); return; }

    setSaving(true);
    setFormError('');

    const data: CreateNewsData = {
      title: title.trim(),
      excerpt: excerpt.trim(),
      content: content.trim() || undefined,
      imageUrl: imageUrl.trim() || undefined,
      linkUrl: linkUrl.trim() || undefined,
      linkText: linkText.trim() || undefined,
      category: category.trim() || undefined,
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
    };

    try {
      if (isEdit) {
        await updateMutation.mutateAsync(data);
      } else {
        await createMutation.mutateAsync(data);
      }
    } catch {
      // Handled by mutation
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{isEdit ? 'Edit News' : 'Create News'}</h1>
        <Button variant="outline" onClick={() => navigate('/admin/news')}>Cancel</Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
        {formError && (
          <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">{formError}</div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Excerpt</label>
          <textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={2} required
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Content (optional)</label>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Image URL (optional)</label>
          <input type="text" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Link URL (optional)</label>
            <input type="text" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Link Text (optional)</label>
            <input type="text" value={linkText} onChange={(e) => setLinkText(e.target.value)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category (optional)</label>
          <input type="text" value={category} onChange={(e) => setCategory(e.target.value)}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => navigate('/admin/news')}>Cancel</Button>
          <Button type="submit" isLoading={saving}>{isEdit ? 'Update News' : 'Create News'}</Button>
        </div>
      </form>
    </div>
  );
};

export default NewsFormPage;
