import { useState, useEffect } from 'react';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import type { Coupon, CreateCouponData, UpdateCouponData } from '../../../types/coupon';

interface CouponFormProps {
  editingCoupon: Coupon | null;
  onSave: (
    data: CreateCouponData | UpdateCouponData,
  ) => Promise<void>;
  onCancel: () => void;
}

const CouponForm = ({ editingCoupon, onSave, onCancel }: CouponFormProps) => {
  const [code, setCode] = useState('');
  const [type, setType] = useState<'PERCENT' | 'FLAT'>('PERCENT');
  const [value, setValue] = useState('');
  const [minCartValue, setMinCartValue] = useState('');
  const [maxDiscount, setMaxDiscount] = useState('');
  const [usageLimit, setUsageLimit] = useState('100');
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingCoupon) {
      setCode(editingCoupon.code);
      setType(editingCoupon.type);
      setValue(String(editingCoupon.value));
      setMinCartValue(
        editingCoupon.minCartValue
          ? String(editingCoupon.minCartValue)
          : '',
      );
      setMaxDiscount(
        editingCoupon.maxDiscount
          ? String(editingCoupon.maxDiscount)
          : '',
      );
      setUsageLimit(String(editingCoupon.usageLimit));
      setValidFrom(
        editingCoupon.validFrom
          ? new Date(editingCoupon.validFrom).toISOString().slice(0, 16)
          : '',
      );
      setValidUntil(
        editingCoupon.validUntil
          ? new Date(editingCoupon.validUntil).toISOString().slice(0, 16)
          : '',
      );
      setDescription(editingCoupon.description || '');
    } else {
      setCode('');
      setType('PERCENT');
      setValue('');
      setMinCartValue('');
      setMaxDiscount('');
      setUsageLimit('100');
      setValidFrom('');
      setValidUntil('');
      setDescription('');
    }
    setFormError('');
  }, [editingCoupon]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!code.trim()) {
      setFormError('Coupon code is required');
      return;
    }
    if (!value || Number(value) <= 0) {
      setFormError('Discount value must be greater than 0');
      return;
    }
    if (type === 'PERCENT' && Number(value) > 100) {
      setFormError('Percentage discount cannot exceed 100%');
      return;
    }
    if (!validFrom) {
      setFormError('Start date is required');
      return;
    }
    if (!validUntil) {
      setFormError('Expiry date is required');
      return;
    }

    setSaving(true);
    setFormError('');

    try {
      const data: CreateCouponData | UpdateCouponData = {
        code: code.trim().toUpperCase(),
        type,
        value: Number(value),
        minCartValue: minCartValue
          ? Number(minCartValue)
          : undefined,
        maxDiscount: maxDiscount
          ? Number(maxDiscount)
          : undefined,
        usageLimit: Number(usageLimit),
        validFrom: new Date(validFrom).toISOString(),
        validUntil: new Date(validUntil).toISOString(),
        description: description || undefined,
      };
      await onSave(data);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Failed to save coupon',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {formError && (
        <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {formError}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Coupon Code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          required
          placeholder="e.g. SUMMER50"
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Discount Type
          </label>
          <select
            value={type}
            onChange={(e) =>
              setType(e.target.value as 'PERCENT' | 'FLAT')
            }
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="PERCENT">Percentage (%)</option>
            <option value="FLAT">Fixed Amount (₹)</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Input
          label={type === 'PERCENT' ? 'Discount %' : 'Discount Amount (₹)'}
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          required
          min="0"
          step="0.01"
          placeholder={type === 'PERCENT' ? 'e.g. 20' : 'e.g. 500'}
        />
        <Input
          label="Min Cart Value (₹)"
          type="number"
          value={minCartValue}
          onChange={(e) => setMinCartValue(e.target.value)}
          min="0"
          step="0.01"
          placeholder="Optional"
        />
        <Input
          label="Max Discount (₹)"
          type="number"
          value={maxDiscount}
          onChange={(e) => setMaxDiscount(e.target.value)}
          min="0"
          step="0.01"
          placeholder="Optional"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Input
          label="Usage Limit"
          type="number"
          value={usageLimit}
          onChange={(e) => setUsageLimit(e.target.value)}
          required
          min="1"
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start Date
          </label>
          <input
            type="datetime-local"
            value={validFrom}
            onChange={(e) => setValidFrom(e.target.value)}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Expiry Date
          </label>
          <input
            type="datetime-local"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder:text-gray-400"
          placeholder="Optional description..."
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={saving}>
          {editingCoupon ? 'Update Coupon' : 'Create Coupon'}
        </Button>
      </div>
    </form>
  );
};

export default CouponForm;
