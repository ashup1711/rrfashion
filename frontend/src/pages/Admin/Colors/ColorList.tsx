import { useState } from 'react';
import DataTable from '../../../components/ui/DataTable';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Modal from '../../../components/ui/Modal';
import Badge from '../../../components/ui/Badge';
import {
  useColors,
  useCreateColor,
  useUpdateColor,
  useDeleteColor,
} from '../../../hooks/useColors';
import type { Column } from '../../../components/ui/DataTable';
import type { Color } from '../../../types/color';

const ColorList = () => {
  const { data: colors, isLoading, error } = useColors();
  const createColor = useCreateColor();
  const updateColor = useUpdateColor();
  const deleteColor = useDeleteColor();

  const [showModal, setShowModal] = useState(false);
  const [editingColor, setEditingColor] = useState<Color | null>(null);
  const [formName, setFormName] = useState('');
  const [formHexCode, setFormHexCode] = useState('');
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditingColor(null);
    setFormName('');
    setFormHexCode('');
    setFormSortOrder(0);
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (color: Color) => {
    setEditingColor(color);
    setFormName(color.name);
    setFormHexCode(color.hexCode);
    setFormSortOrder(color.sortOrder);
    setFormError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Color name is required');
      return;
    }
    if (!formHexCode.trim()) {
      setFormError('Hex code is required');
      return;
    }
    setSaving(true);
    setFormError('');

    try {
      if (editingColor) {
        await updateColor.mutateAsync({
          id: editingColor.id,
          data: {
            name: formName,
            hexCode: formHexCode,
            sortOrder: formSortOrder || undefined,
          },
        });
      } else {
        await createColor.mutateAsync({
          name: formName,
          hexCode: formHexCode,
          sortOrder: formSortOrder || undefined,
        });
      }
      setShowModal(false);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Failed to save color',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this color?')) return;
    try {
      await deleteColor.mutateAsync(id);
    } catch {
      // Handle error silently
    }
  };

  const columns: Column<Color>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (color) => (
        <span className="font-medium text-gray-900">{color.name}</span>
      ),
    },
    {
      key: 'hexCode',
      header: 'Hex Code',
      render: (color) => (
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded border border-gray-300"
            style={{ backgroundColor: color.hexCode }}
          />
          <span className="text-gray-600 font-mono text-sm">{color.hexCode}</span>
        </div>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (color) => (
        <Badge variant={color.isActive ? 'success' : 'danger'}>
          {color.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (color) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => openEdit(color)}>
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(color.id)}
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
          <h1 className="text-2xl font-bold text-gray-900">Colors</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage product colors for shop filters
          </p>
        </div>
        <Button onClick={openCreate}>+ Add Color</Button>
      </div>

      <DataTable
        columns={columns}
        data={colors || []}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        error={error as Error | null}
        emptyTitle="No colors found"
        emptyDescription="Add your first color to get started"
        emptyAction={<Button onClick={openCreate}>+ Add Color</Button>}
      />

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingColor ? 'Edit Color' : 'Add Color'}
      >
        {formError && (
          <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {formError}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Color Name"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            required
            placeholder="e.g. Navy Blue"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hex Code
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={formHexCode || '#000000'}
                onChange={(e) => setFormHexCode(e.target.value)}
                className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
              />
              <Input
                value={formHexCode}
                onChange={(e) => setFormHexCode(e.target.value)}
                required
                placeholder="#000080"
                className="flex-1 font-mono"
              />
            </div>
          </div>
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
              {editingColor ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ColorList;
