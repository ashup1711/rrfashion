import { useState } from 'react';
import DataTable from '../../../components/ui/DataTable';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Modal from '../../../components/ui/Modal';
import Badge from '../../../components/ui/Badge';
import {
  useBrands,
  useCreateBrand,
  useUpdateBrand,
  useDeleteBrand,
} from '../../../hooks/useBrands';
import type { Column } from '../../../components/ui/DataTable';
import type { Brand } from '../../../types/brand';

const BrandList = () => {
  const { data: brands, isLoading, error } = useBrands();
  const createBrand = useCreateBrand();
  const updateBrand = useUpdateBrand();
  const deleteBrand = useDeleteBrand();

  const [showModal, setShowModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditingBrand(null);
    setFormName('');
    setFormDescription('');
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (brand: Brand) => {
    setEditingBrand(brand);
    setFormName(brand.name);
    setFormDescription(brand.description || '');
    setFormError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Brand name is required');
      return;
    }
    setSaving(true);
    setFormError('');

    try {
      if (editingBrand) {
        await updateBrand.mutateAsync({
          id: editingBrand.id,
          data: { name: formName, description: formDescription || undefined },
        });
      } else {
        await createBrand.mutateAsync({
          name: formName,
          description: formDescription || undefined,
        });
      }
      setShowModal(false);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Failed to save brand',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this brand?')) return;
    try {
      await deleteBrand.mutateAsync(id);
    } catch {
      // Handle error silently
    }
  };

  const columns: Column<Brand>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (brand) => (
        <span className="font-medium text-gray-900">{brand.name}</span>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (brand) => (
        <span className="text-gray-600 truncate max-w-xs block">
          {brand.description || '—'}
        </span>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (brand) => (
        <Badge variant={brand.isActive ? 'success' : 'danger'}>
          {brand.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (brand) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => openEdit(brand)}>
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(brand.id)}
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
          <h1 className="text-2xl font-bold text-gray-900">Brands</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage product brands
          </p>
        </div>
        <Button onClick={openCreate}>+ Add Brand</Button>
      </div>

      <DataTable
        columns={columns}
        data={brands || []}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        error={error as Error | null}
        emptyTitle="No brands found"
        emptyDescription="Add your first brand to get started"
        emptyAction={<Button onClick={openCreate}>+ Add Brand</Button>}
      />

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingBrand ? 'Edit Brand' : 'Add Brand'}
      >
        {formError && (
          <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {formError}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Brand Name"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            required
            placeholder="e.g. FabIndia"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              rows={3}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder:text-gray-400"
              placeholder="Optional brand description..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={saving}>
              {editingBrand ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default BrandList;
