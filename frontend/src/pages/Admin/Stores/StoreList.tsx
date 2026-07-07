import { useState } from 'react';
import DataTable from '../../../components/ui/DataTable';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Modal from '../../../components/ui/Modal';
import Badge from '../../../components/ui/Badge';
import {
  useStores,
  useCreateStore,
  useUpdateStore,
} from '../../../hooks/useStores';
import type { Column } from '../../../components/ui/DataTable';
import type { StoreLocation } from '../../../types/store';

interface FormData {
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  gstin: string;
  phone: string;
}

const emptyForm: FormData = {
  name: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  gstin: '',
  phone: '',
};

const StoreList = () => {
  const { data: stores, isLoading, error } = useStores();
  const createStore = useCreateStore();
  const updateStore = useUpdateStore();

  const [showForm, setShowForm] = useState(false);
  const [editingStore, setEditingStore] = useState<StoreLocation | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const openCreateForm = () => {
    setEditingStore(null);
    setFormData(emptyForm);
    setFormError('');
    setShowForm(true);
  };

  const openEditForm = (store: StoreLocation) => {
    setEditingStore(store);
    setFormData({
      name: store.name,
      address: store.address,
      city: store.city || '',
      state: store.state,
      pincode: store.pincode || '',
      gstin: store.gstin,
      phone: store.phone || '',
    });
    setFormError('');
    setShowForm(true);
  };

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.address.trim() || !formData.gstin.trim()) {
      setFormError('Name, address, and GSTIN are required');
      return;
    }
    setSaving(true);
    setFormError('');

    try {
      if (editingStore) {
        await updateStore.mutateAsync({
          id: editingStore.id,
          data: {
            name: formData.name,
            address: formData.address,
            city: formData.city || undefined,
            state: formData.state || undefined,
            pincode: formData.pincode || undefined,
            gstin: formData.gstin,
            phone: formData.phone || undefined,
          },
        });
      } else {
        await createStore.mutateAsync({
          name: formData.name,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          gstin: formData.gstin,
          phone: formData.phone,
        } as any);
      }
      setShowForm(false);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Failed to save store',
      );
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<StoreLocation>[] = [
    {
      key: 'name',
      header: 'Store Name',
      render: (store) => (
        <span className="font-medium text-gray-900">{store.name}</span>
      ),
    },
    {
      key: 'city',
      header: 'City',
      render: (store) => (
        <span className="text-gray-700">{store.city || '—'}</span>
      ),
    },
    {
      key: 'state',
      header: 'State',
      render: (store) => (
        <span className="text-gray-700">{store.state}</span>
      ),
    },
    {
      key: 'gstin',
      header: 'GSTIN',
      render: (store) => (
        <span className="text-gray-600 font-mono text-xs">{store.gstin}</span>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (store) => (
        <span className="text-gray-700">{store.phone || '—'}</span>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (store) => (
        <Badge variant={store.isActive ? 'success' : 'danger'}>
          {store.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (store) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEditForm(store)}
          >
            Edit
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stores</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage store locations
          </p>
        </div>
        <Button onClick={openCreateForm}>+ Add Store</Button>
      </div>

      <DataTable
        columns={columns}
        data={stores || []}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        error={error as Error | null}
        emptyTitle="No stores found"
        emptyDescription="Add your first store location"
        emptyAction={<Button onClick={openCreateForm}>+ Add Store</Button>}
      />

      {/* Create/Edit Store Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editingStore ? 'Edit Store' : 'Add Store'}
      >
        {formError && (
          <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {formError}
          </div>
        )}
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <Input
            label="Store Name"
            name="name"
            value={formData.name}
            onChange={handleFormChange}
            required
            placeholder="e.g. Main Store — Surat"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleFormChange}
              required
              rows={2}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder:text-gray-400"
              placeholder="Full street address..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="City"
              name="city"
              value={formData.city}
              onChange={handleFormChange}
              placeholder="Surat"
            />
            <Input
              label="State"
              name="state"
              value={formData.state}
              onChange={handleFormChange}
              placeholder="Gujarat"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Pincode"
              name="pincode"
              value={formData.pincode}
              onChange={handleFormChange}
              placeholder="395001"
            />
            <Input
              label="Phone"
              name="phone"
              value={formData.phone}
              onChange={handleFormChange}
              placeholder="+91 9876543210"
            />
          </div>
          <Input
            label="GSTIN"
            name="gstin"
            value={formData.gstin}
            onChange={handleFormChange}
            required
            placeholder="24ABCDE1234F1Z5"
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={saving}>
              {editingStore ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default StoreList;
