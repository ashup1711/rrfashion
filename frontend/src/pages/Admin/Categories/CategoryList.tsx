import { useState } from 'react';
import Card from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import {
  useCategoryTree,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from '../../../hooks/useCategories';
import type { Category } from '../../../types/category';

interface TreeNodeProps {
  category: Category;
  onEdit: (cat: Category) => void;
  onAddChild: (parentId: string) => void;
  onDelete: (id: string) => void;
  level: number;
}

const TreeNode = ({ category, onEdit, onAddChild, onDelete, level }: TreeNodeProps) => {
  return (
    <div>
      <div
        className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 rounded-md group"
        style={{ paddingLeft: `${level * 20 + 12}px` }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <span className="text-sm font-medium text-gray-900 truncate">
            {category.name}
          </span>
          <span className="text-xs text-gray-500">({category.slug})</span>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onAddChild(category.id)}
            className="p-1 text-gray-400 hover:text-primary-600 rounded"
            title="Add child category"
            aria-label={`Add child to ${category.name}`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button
            onClick={() => onEdit(category)}
            className="p-1 text-gray-400 hover:text-blue-600 rounded"
            title="Edit category"
            aria-label={`Edit ${category.name}`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(category.id)}
            className="p-1 text-gray-400 hover:text-red-600 rounded"
            title="Delete category"
            aria-label={`Delete ${category.name}`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
      {category.children && category.children.length > 0 && (
        <div>
          {category.children.map((child) => (
            <TreeNode
              key={child.id}
              category={child}
              onEdit={onEdit}
              onAddChild={onAddChild}
              onDelete={onDelete}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const CategoryList = () => {
  const { data: categories, isLoading, error } = useCategoryTree();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [parentId, setParentId] = useState<string | undefined>(undefined);
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const openAddForm = (parentIdValue?: string) => {
    setEditingCategory(null);
    setParentId(parentIdValue);
    setFormName('');
    setFormSlug('');
    setFormDescription('');
    setFormError('');
    setShowForm(true);
  };

  const openEditForm = (category: Category) => {
    setEditingCategory(category);
    setParentId(undefined);
    setFormName(category.name);
    setFormSlug(category.slug);
    setFormDescription(category.description || '');
    setFormError('');
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Name is required');
      return;
    }
    setSaving(true);
    setFormError('');

    try {
      if (editingCategory) {
        await updateCategory.mutateAsync({
          id: editingCategory.id,
          data: {
            name: formName,
            slug: formSlug || undefined,
            description: formDescription || undefined,
          },
        });
      } else {
        await createCategory.mutateAsync({
          name: formName,
          slug: formSlug || undefined,
          description: formDescription || undefined,
          parentId,
        });
      }
      setShowForm(false);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Failed to save category',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    try {
      await deleteCategory.mutateAsync(id);
    } catch {
      // Handle error silently
    }
  };

  if (isLoading) return <LoadingSpinner size="lg" label="Loading categories..." />;

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <p className="text-sm text-red-700">
          Error loading categories: {error.message}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage your category hierarchy
          </p>
        </div>
        <Button onClick={() => openAddForm()}>+ Add Root Category</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Tree */}
        <div className="lg:col-span-2">
          <Card>
            {categories && categories.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {categories.map((cat) => (
                  <TreeNode
                    key={cat.id}
                    category={cat}
                    onEdit={openEditForm}
                    onAddChild={openAddForm}
                    onDelete={handleDelete}
                    level={0}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">
                No categories yet. Add your first root category to get started.
              </p>
            )}
          </Card>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <div>
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {editingCategory ? 'Edit Category' : parentId ? 'Add Child Category' : 'Add Root Category'}
              </h2>

              {formError && (
                <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                  {formError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  placeholder="e.g. Kurtas"
                />
                <Input
                  label="Slug"
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                  placeholder="Auto-generated if empty"
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
                    placeholder="Optional description..."
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" isLoading={saving}>
                    {editingCategory ? 'Update' : 'Create'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryList;
