import { useState } from 'react';
import { toast } from 'sonner';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import EmptyState from '../../../components/common/EmptyState';
import AddressForm from './AddressForm';
import { useAddresses, useCreateAddress, useUpdateAddress, useDeleteAddress, useSetDefaultAddress } from '../../../hooks/useAddresses';
import type { UserAddress, CreateAddressData } from '../../../types/address';

const AddressList = () => {
  const { data: addresses, isLoading, error } = useAddresses();
  const createAddress = useCreateAddress();
  const updateAddress = useUpdateAddress();
  const deleteAddress = useDeleteAddress();
  const setDefaultAddress = useSetDefaultAddress();

  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<UserAddress | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleSave = async (data: CreateAddressData) => {
    if (editingAddress) {
      await updateAddress.mutateAsync({ id: editingAddress.id, data });
      toast.success('Address updated successfully');
    } else {
      await createAddress.mutateAsync(data);
      toast.success('Address added successfully');
    }
    setShowForm(false);
    setEditingAddress(null);
  };

  const handleEdit = (address: UserAddress) => {
    setEditingAddress(address);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteAddress.mutateAsync(id);
      toast.success('Address deleted');
    } catch {
      toast.error('Failed to delete address');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await setDefaultAddress.mutateAsync(id);
      toast.success('Default address updated');
    } catch {
      toast.error('Failed to set default address');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingAddress(null);
  };

  if (isLoading) {
    return (
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">My Addresses</h3>
        <LoadingSpinner size="sm" label="Loading addresses..." />
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">My Addresses</h3>
        <EmptyState
          title="Could not load addresses"
          description="Something went wrong. Please try again."
        />
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">My Addresses</h3>
        {!showForm && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditingAddress(null);
              setShowForm(true);
            }}
          >
            + Add Address
          </Button>
        )}
      </div>

      {showForm && (
        <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
          <h4 className="text-sm font-semibold text-gray-700 mb-4">
            {editingAddress ? 'Edit Address' : 'Add New Address'}
          </h4>
          <AddressForm
            initialData={editingAddress}
            onSubmit={handleSave}
            onCancel={handleCancel}
            isLoading={createAddress.isPending || updateAddress.isPending}
          />
        </div>
      )}

      {!addresses || addresses.length === 0 ? (
        <EmptyState
          title="No addresses saved"
          description="Add a delivery address for faster checkout."
        />
      ) : (
        <div className="space-y-3">
          {addresses.map((address) => (
            <div
              key={address.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={address.label === 'Home' ? 'info' : address.label === 'Work' ? 'warning' : 'default'}>
                      {address.label}
                    </Badge>
                    {address.isDefault && (
                      <Badge variant="success">Default</Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-900 font-medium">{address.line1}</p>
                  {address.line2 && (
                    <p className="text-sm text-gray-600">{address.line2}</p>
                  )}
                  <p className="text-sm text-gray-600">
                    {address.city}, {address.state} - {address.pincode}
                  </p>
                  {address.phone && (
                    <p className="text-sm text-gray-500 mt-1">Phone: {address.phone}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                {!address.isDefault && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSetDefault(address.id)}
                    isLoading={setDefaultAddress.isPending}
                  >
                    Set as Default
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(address)}
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(address.id)}
                  isLoading={deletingId === address.id}
                  className="text-red-600 hover:text-red-700"
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default AddressList;
