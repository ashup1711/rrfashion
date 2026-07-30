import { useState } from 'react';
import DataTable from '../../../components/ui/DataTable';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import Modal from '../../../components/ui/Modal';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import {
  useReminders,
  useCreateReminder,
  useUpdateReminder,
  useDeleteReminder,
} from '../../../hooks/useReminders';
import ReminderForm from './ReminderForm';
import type { Column } from '../../../components/ui/DataTable';
import type { SiteReminder, CreateSiteReminderData, UpdateSiteReminderData } from '../../../types/reminder';

const ReminderList = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const { data, isLoading, error } = useReminders(page, 20, search || undefined);
  const createReminder = useCreateReminder();
  const updateReminder = useUpdateReminder();
  const deleteReminder = useDeleteReminder();

  const [showModal, setShowModal] = useState(false);
  const [editingReminder, setEditingReminder] = useState<SiteReminder | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const openCreate = () => {
    setEditingReminder(null);
    setShowModal(true);
  };

  const openEdit = (reminder: SiteReminder) => {
    setEditingReminder(reminder);
    setShowModal(true);
  };

  const handleSave = async (formData: CreateSiteReminderData | UpdateSiteReminderData) => {
    if (editingReminder) {
      await updateReminder.mutateAsync({
        id: editingReminder.id,
        data: formData as UpdateSiteReminderData,
      });
    } else {
      await createReminder.mutateAsync(formData as CreateSiteReminderData);
    }
    setShowModal(false);
  };

  const handleDeleteClick = (id: string) => {
    setDeletingId(id);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteReminder.mutateAsync(deletingId);
    } catch {
      // Error handled silently
    } finally {
      setShowDeleteConfirm(false);
      setDeletingId(null);
    }
  };

  const columns: Column<SiteReminder>[] = [
    {
      key: 'title',
      header: 'Title',
      render: (reminder) => (
        <span className="font-medium text-gray-900">{reminder.title}</span>
      ),
    },
    {
      key: 'message',
      header: 'Message',
      render: (reminder) => (
        <span className="text-gray-600 truncate max-w-xs block">
          {reminder.message.length > 80
            ? `${reminder.message.substring(0, 80)}...`
            : reminder.message}
        </span>
      ),
    },
    {
      key: 'dates',
      header: 'Schedule',
      render: (reminder) => (
        <div className="text-xs text-gray-500">
          <p>{new Date(reminder.startDate).toLocaleDateString()}</p>
          <p>→ {new Date(reminder.endDate).toLocaleDateString()}</p>
        </div>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (reminder) => (
        <Badge variant={reminder.isActive ? 'success' : 'danger'}>
          {reminder.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (reminder) => (
        <span className="text-xs text-gray-500">
          {new Date(reminder.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (reminder) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEdit(reminder)}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteClick(reminder.id)}
            className="text-red-600 hover:text-red-700"
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  const reminders = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reminders</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage site-wide reminder banners and announcements
          </p>
        </div>
        <Button onClick={openCreate}>+ Add Reminder</Button>
      </div>

      {/* Search bar */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search reminders..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="block w-full max-w-xs rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      <DataTable
        columns={columns}
        data={reminders}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        error={error as Error | null}
        emptyTitle="No reminders found"
        emptyDescription="Create your first reminder to display on the storefront"
        emptyAction={<Button onClick={openCreate}>+ Add Reminder</Button>}
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

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingReminder ? 'Edit Reminder' : 'Create Reminder'}
      >
        <ReminderForm
          editingReminder={editingReminder}
          onSave={handleSave}
          onCancel={() => setShowModal(false)}
        />
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => { setShowDeleteConfirm(false); setDeletingId(null); }}
        onConfirm={handleConfirmDelete}
        title="Delete Reminder"
        message="Are you sure you want to delete this reminder? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleteReminder.isPending}
      />
    </div>
  );
};

export default ReminderList;
