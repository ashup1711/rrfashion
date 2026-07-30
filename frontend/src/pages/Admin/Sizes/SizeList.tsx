import { useState } from 'react';
import DataTable from '../../../components/ui/DataTable';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Modal from '../../../components/ui/Modal';
import Badge from '../../../components/ui/Badge';
import {
  useSizes,
  useCreateSize,
  useUpdateSize,
  useDeleteSize,
} from '../../../hooks/useSizes';
import type { Column } from '../../../components/ui/DataTable';
import type { Size } from '../../../types/size';

const SizeList = () => {
  const { data: sizes, isLoading, error } = useSizes();
  const createSize = useCreateSize();
  const updateSize = useUpdateSize();
  const deleteSize = useDeleteSize();

  const [showModal, setShowModal] = useState(false);
  const [editingSize, setEditingSize] = useState<Size | null>(null);
  const [formName, setFormName] = useState('');
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditingSize(null);
    setFormName('');
    setFormSortOrder(0);
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (size: Size) => {
    setEditingSize(size);
    setFormName(size.name);
    setFormSortOrder(size.sortOrder);
    setFormError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Size name is required');
      return;
    }
    setSaving(true);
    setFormError('');

    try {
      if (editingSize) {
        await updateSize.mutateAsync({
          id: editingSize.id,
          data: {
            name: formName,
            sortOrder: formSortOrder || undefined,
          },
        });
      } else {
        await createSize.mutateAsync({
          name: formName,
          sortOrder: formSortOrder || undefined,
        });
      }
      setShowModal(false);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Failed to save size',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this size?')) return;
    try {
      await deleteSize.mutateAsync(id);
    } catch {
      // Handle error silently
    }
  };

  const columns: Column<Size>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (size) => (
        <span className="font-medium text-gray-900">{size.name}</span>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (size) => (
        <Badge variant={size.isActive ? 'success' : 'danger'}>
          {size.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (size) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => openEdit(size)}>
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(size.id)}
            className="text-red-600 hover:text-red-700"
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sizes</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage product sizes for shop filters
          </p>
        </div>
        <Button onClick={openCreate}>+ Add Size</Button>
      </div>

      <DataTable
        columns={columns}
        data={sizes || []}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        error={error as Error | null}
        emptyTitle="No sizes found"
        emptyDescription="Add your first size to get started"
        emptyAction={<Button onClick={openCreate}>+ Add Size</Button>}
      />

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingSize ? 'Edit Size' : 'Add Size'}
      >
        {formError && (
          <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {formError}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Size Name"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            required
            placeholder="e.g. M"
          />
          <Input
            label="Sort Order"
            type="number"
            value={formSortOrder}
            onChange={(e) => setFormSortOrder(Number(e.target.value))}
            placeholder="0"
          />
          <p className="text-xs text-gray-400 -mt-2">
            Lower values appear first in the shop filter.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={saving}>
              {editingSize ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default SizeList;
