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
  adminGetAllNews,
  adminDeleteNews,
} from '../../../api/news';
import type { Column } from '../../../components/ui/DataTable';
import type { NewsItem } from '../../../types/news';

const NewsList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useQuery({
    queryKey: ['adminNews', page],
    queryFn: () => adminGetAllNews(page, 20),
    staleTime: 1000 * 60,
  });

  const deleteMutation = useMutation({
    mutationFn: adminDeleteNews,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminNews'] });
    },
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const openCreate = () => {
    navigate('/admin/news/new');
  };

  const openEdit = (news: NewsItem) => {
    navigate(`/admin/news/${news.id}/edit`);
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

  const columns: Column<NewsItem>[] = [
    {
      key: 'title',
      header: 'Title',
      render: (news) => (
        <span className="font-medium text-gray-900">{news.title}</span>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (news) => (
        news.category ? <Badge variant="info">{news.category}</Badge> : <span className="text-gray-400">—</span>
      ),
    },
    {
      key: 'dates',
      header: 'Schedule',
      render: (news) => (
        <div className="text-xs text-gray-500">
          <p>{new Date(news.startDate).toLocaleDateString()}</p>
          <p>→ {new Date(news.endDate).toLocaleDateString()}</p>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (news) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => openEdit(news)}>
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteClick(news.id)}
            className="text-red-600 hover:text-red-700"
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  const newsItems = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">News</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage dynamic news sections displayed on the storefront
          </p>
        </div>
        <Button onClick={openCreate}>+ Create News</Button>
      </div>

      <DataTable
        columns={columns}
        data={newsItems}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        error={error as Error | null}
        emptyTitle="No news items found"
        emptyDescription="Create your first news item to display on the storefront"
        emptyAction={<Button onClick={openCreate}>+ Create News</Button>}
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
        title="Delete News"
        message="Are you sure you want to delete this news item? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};

export default NewsList;
