import { useState } from 'react';
import DataTable from '../../../components/ui/DataTable';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import Modal from '../../../components/ui/Modal';
import {
  useCoupons,
  useCreateCoupon,
  useUpdateCoupon,
  useDeleteCoupon,
} from '../../../hooks/useCoupons';
import CouponForm from './CouponForm';
import type { Column } from '../../../components/ui/DataTable';
import type { Coupon, CreateCouponData, UpdateCouponData } from '../../../types/coupon';

const CouponList = () => {
  const { data: coupons, isLoading, error } = useCoupons();
  const createCoupon = useCreateCoupon();
  const updateCoupon = useUpdateCoupon();
  const deleteCoupon = useDeleteCoupon();

  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

  const openCreate = () => {
    setEditingCoupon(null);
    setShowModal(true);
  };

  const openEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setShowModal(true);
  };

  const handleSave = async (
    data: CreateCouponData | UpdateCouponData,
  ) => {
    if (editingCoupon) {
      await updateCoupon.mutateAsync({
        id: editingCoupon.id,
        data: data as UpdateCouponData,
      });
    } else {
      await createCoupon.mutateAsync(data as CreateCouponData);
    }
    setShowModal(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this coupon?'))
      return;
    try {
      await deleteCoupon.mutateAsync(id);
    } catch {
      // Handle error silently
    }
  };

  const handleToggleActive = async (coupon: Coupon) => {
    try {
      await updateCoupon.mutateAsync({
        id: coupon.id,
        data: { isActive: !coupon.isActive },
      });
    } catch {
      // Handle error silently
    }
  };

  const columns: Column<Coupon>[] = [
    {
      key: 'code',
      header: 'Code',
      render: (coupon) => (
        <span className="font-mono font-bold text-gray-900">
          {coupon.code}
        </span>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (coupon) => (
        <Badge variant="info">
          {coupon.type === 'PERCENT' ? 'Percentage' : 'Fixed'}
        </Badge>
      ),
    },
    {
      key: 'value',
      header: 'Value',
      render: (coupon) => (
        <span className="font-medium">
          {coupon.type === 'PERCENT'
            ? `${coupon.value}%`
            : `₹${coupon.value.toLocaleString()}`}
        </span>
      ),
    },
    {
      key: 'usage',
      header: 'Usage',
      render: (coupon) => (
        <span className="text-gray-600">
          {coupon.usedCount}/{coupon.usageLimit}
        </span>
      ),
    },
    {
      key: 'minCart',
      header: 'Min Cart',
      render: (coupon) => (
        <span className="text-gray-600">
          {coupon.minCartValue
            ? `₹${coupon.minCartValue.toLocaleString()}`
            : '—'}
        </span>
      ),
    },
    {
      key: 'dates',
      header: 'Valid',
      render: (coupon) => (
        <div className="text-xs text-gray-500">
          <p>{new Date(coupon.validFrom).toLocaleDateString()}</p>
          <p>→ {new Date(coupon.validUntil).toLocaleDateString()}</p>
        </div>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (coupon) => (
        <button
          onClick={() => handleToggleActive(coupon)}
          className="focus:outline-none"
          aria-label={`Toggle ${coupon.code} status`}
        >
          <Badge
            variant={coupon.isActive ? 'success' : 'danger'}
          >
            {coupon.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </button>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (coupon) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEdit(coupon)}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(coupon.id)}
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
          <h1 className="text-2xl font-bold text-gray-900">Coupons</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage discount coupons and promotions
          </p>
        </div>
        <Button onClick={openCreate}>+ Add Coupon</Button>
      </div>

      <DataTable
        columns={columns}
        data={coupons || []}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        error={error as Error | null}
        emptyTitle="No coupons found"
        emptyDescription="Create your first coupon to start offering discounts"
        emptyAction={<Button onClick={openCreate}>+ Add Coupon</Button>}
      />

      {/* Create/Edit Coupon Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingCoupon ? 'Edit Coupon' : 'Create Coupon'}
      >
        <CouponForm
          editingCoupon={editingCoupon}
          onSave={handleSave}
          onCancel={() => setShowModal(false)}
        />
      </Modal>
    </div>
  );
};

export default CouponList;
