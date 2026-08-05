import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import Button from '../../../components/ui/Button';
import { adminCreateBlog, adminUpdateBlog, type CreateBlogData, type UpdateBlogData } from '../../../api/blog';

const BlogFormPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const isEdit = !!id && id !== 'new';

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [author, setAuthor] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const generateSlug = (text: string) =>
    text.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');

  const createMutation = useMutation({
    mutationFn: adminCreateBlog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminBlogs'] });
      toast.success('Blog post created successfully');
      navigate('/admin/blogs');
    },
    onError: (err: Error) => {
      setFormError(err.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateBlogData) => adminUpdateBlog(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminBlogs'] });
      toast.success('Blog post updated successfully');
      navigate('/admin/blogs');
    },
    onError: (err: Error) => {
      setFormError(err.message);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) { setFormError('Title is required'); return; }
    if (!slug.trim()) { setFormError('Slug is required'); return; }
    if (!excerpt.trim()) { setFormError('Excerpt is required'); return; }
    if (!content.trim()) { setFormError('Content is required'); return; }

    setSaving(true);
    setFormError('');

    const data: CreateBlogData = {
      title: title.trim(),
      slug: slug.trim(),
      excerpt: excerpt.trim(),
      content: content.trim(),
      imageUrl: imageUrl.trim() || undefined,
      category: category.trim() || undefined,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      author: author.trim() || undefined,
      isPublished,
      publishedAt: isPublished ? new Date().toISOString() : undefined,
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
        <h1 className="text-2xl font-bold text-gray-900">{isEdit ? 'Edit Blog' : 'Create Blog'}</h1>
        <Button variant="outline" onClick={() => navigate('/admin/blogs')}>Cancel</Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
        {formError && (
          <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">{formError}</div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input type="text" value={title} onChange={(e) => { setTitle(e.target.value); if (!isEdit && !slug) setSlug(generateSlug(e.target.value)); }} required
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
          <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} required
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Excerpt</label>
          <textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={2} required
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={8} required
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Image URL (optional)</label>
          <input type="text" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category (optional)</label>
            <input type="text" value={category} onChange={(e) => setCategory(e.target.value)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Author (optional)</label>
            <input type="text" value={author} onChange={(e) => setAuthor(e.target.value)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
          <input type="text" value={tags} onChange={(e) => setTags(e.target.value)}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
        </div>

        <div className="flex items-center gap-2">
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} className="sr-only peer" />
            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600" />
          </label>
          <span className="text-sm text-gray-700">Publish immediately</span>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => navigate('/admin/blogs')}>Cancel</Button>
          <Button type="submit" isLoading={saving}>{isEdit ? 'Update Blog' : 'Create Blog'}</Button>
        </div>
      </form>
    </div>
  );
};

export default BlogFormPage;
