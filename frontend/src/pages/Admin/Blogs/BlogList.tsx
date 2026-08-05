import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DataTable from '../../../components/ui/DataTable';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  adminGetAllBlogs,
  adminDeleteBlog,
} from '../../../api/blog';
import type { Column } from '../../../components/ui/DataTable';
import type { BlogPost } from '../../../types/blog';

const BlogList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useQuery({
    queryKey: ['adminBlogs', page],
    queryFn: () => adminGetAllBlogs(page, 20),
    staleTime: 1000 * 60,
  });

  const deleteMutation = useMutation({
    mutationFn: adminDeleteBlog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminBlogs'] });
    },
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const openCreate = () => {
    navigate('/admin/blogs/new');
  };

  const openEdit = (blog: BlogPost) => {
    navigate(`/admin/blogs/${blog.id}/edit`);
  };

  const handleDeleteClick = (id: string) => {
    setDeletingId(id);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteMutation.mutateAsync(deletingId);
    } catch {
      // Error handled silently
    } finally {
      setShowDeleteConfirm(false);
      setDeletingId(null);
    }
  };

  const columns: Column<BlogPost>[] = [
    {
      key: 'title',
      header: 'Title',
      render: (blog) => (
        <span className="font-medium text-gray-900">{blog.title}</span>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (blog) => (
        blog.category ? <Badge variant="info">{blog.category}</Badge> : <span className="text-gray-400">—</span>
      ),
    },
    {
      key: 'author',
      header: 'Author',
      render: (blog) => (
        <span className="text-gray-600">{blog.author || '—'}</span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (blog) => (
        <span className="text-xs text-gray-500">
          {blog.createdAt ? new Date(blog.createdAt).toLocaleDateString() : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (blog) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => openEdit(blog)}>
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteClick(blog.id)}
            className="text-red-600 hover:text-red-700"
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  const blogItems = data?.items ?? [];
  const meta = data?.meta;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Blogs</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage blog posts displayed on the storefront
          </p>
        </div>
        <Button onClick={openCreate}>+ Create Blog</Button>
      </div>

      <DataTable
        columns={columns}
        data={blogItems}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        error={error as Error | null}
        emptyTitle="No blog posts found"
        emptyDescription="Create your first blog post to display on the storefront"
        emptyAction={<Button onClick={openCreate}>+ Create Blog</Button>}
      />

      {/* Pagination */}
      {meta && meta.total > meta.limit && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-gray-600">
            Showing {(meta.page - 1) * meta.limit + 1}–{Math.min(meta.page * meta.limit, meta.total)} of {meta.total}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={meta.page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={meta.page * meta.limit >= meta.total}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => { setShowDeleteConfirm(false); setDeletingId(null); }}
        onConfirm={handleConfirmDelete}
        title="Delete Blog"
        message="Are you sure you want to delete this blog post? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};

export default BlogList;
