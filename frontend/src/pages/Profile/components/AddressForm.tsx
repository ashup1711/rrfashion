import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import type { UserAddress, CreateAddressData } from '../../../types/address';

const LABEL_OPTIONS = ['Home', 'Work', 'Other'] as const;

interface AddressFormProps {
  initialData?: UserAddress | null;
  onSubmit: (data: CreateAddressData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const AddressForm = ({ initialData, onSubmit, onCancel, isLoading }: AddressFormProps) => {
  const [formData, setFormData] = useState<CreateAddressData>({
    label: 'Home',
    line1: '',
    line2: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    isDefault: false,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof CreateAddressData, string>>>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        label: initialData.label,
        line1: initialData.line1,
        line2: initialData.line2 || '',
        city: initialData.city,
        state: initialData.state,
        pincode: initialData.pincode,
        phone: initialData.phone || '',
        isDefault: initialData.isDefault,
      });
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    // Clear error on change
    if (errors[name as keyof CreateAddressData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof CreateAddressData, string>> = {};
    if (!formData.label.trim()) newErrors.label = 'Label is required';
    if (!formData.line1.trim()) newErrors.line1 = 'Address line 1 is required';
    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (!formData.state.trim()) newErrors.state = 'State is required';
    if (!formData.pincode.trim()) newErrors.pincode = 'Pincode is required';
    else if (!/^\d{6}$/.test(formData.pincode.trim())) newErrors.pincode = 'Enter a valid 6-digit pincode';
    if (formData.phone && !/^\+?\d{10,15}$/.test(formData.phone.trim())) {
      newErrors.phone = 'Enter a valid phone number';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      await onSubmit(formData);
    } catch {
      toast.error('Failed to save address. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="address-label" className="block text-sm font-medium text-gray-700 mb-1">
          Label
        </label>
        <select
          id="address-label"
          name="label"
          value={formData.label}
          onChange={handleChange}
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          aria-label="Address label"
        >
          {LABEL_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      <Input
        label="Address Line 1"
        name="line1"
        value={formData.line1}
        onChange={handleChange}
        placeholder="123 Main Street"
        error={errors.line1}
        required
      />

      <Input
        label="Address Line 2 (Optional)"
        name="line2"
        value={formData.line2}
        onChange={handleChange}
        placeholder="Apartment, suite, etc."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="City"
          name="city"
          value={formData.city}
          onChange={handleChange}
          placeholder="Mumbai"
          error={errors.city}
          required
        />
        <Input
          label="State"
          name="state"
          value={formData.state}
          onChange={handleChange}
          placeholder="Maharashtra"
          error={errors.state}
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Pincode"
          name="pincode"
          value={formData.pincode}
          onChange={handleChange}
          placeholder="400001"
          maxLength={6}
          error={errors.pincode}
          required
        />
        <Input
          label="Phone (Optional)"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          placeholder="+91 98765 43210"
          error={errors.phone}
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          name="isDefault"
          checked={formData.isDefault}
          onChange={handleChange}
          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
        />
        Set as default address
      </label>

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isLoading}>
          {initialData ? 'Update Address' : 'Add Address'}
        </Button>
      </div>
    </form>
  );
};

export default AddressForm;
