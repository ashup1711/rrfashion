import { useState } from 'react';
import DataTable from '../../../components/ui/DataTable';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Modal from '../../../components/ui/Modal';
import {
  useAdminUsers,
  useCreateAdminUser,
  useUpdateAdminUser,
} from '../../../hooks/useAdminUsers';
import { useRoles } from '../../../hooks/useRoles';
import { useAuthStore } from '../../../store/authStore';
import type { Column } from '../../../components/ui/DataTable';
import type { AdminUser } from '../../../types/admin';

interface FormData {
  name: string;
  email: string;
  password: string;
  roleId: string;
}

const emptyForm: FormData = {
  name: '',
  email: '',
  password: '',
  roleId: '',
};

const UserList = () => {
  const { data: usersData, isLoading, error } = useAdminUsers();
  const { data: roles } = useRoles();
  const createUser = useCreateAdminUser();
  const updateUser = useUpdateAdminUser();
  const currentUser = useAuthStore((state) => state.adminUser);

  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const filteredUsers = usersData?.items?.filter((user) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      user.name.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower)
    );
  });

  const openCreateForm = () => {
    setEditingUser(null);
    setFormData(emptyForm);
    setFormError('');
    setShowForm(true);
  };

  const openEditForm = (user: AdminUser) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      roleId: user.roleId,
    });
    setFormError('');
    setShowForm(true);
  };

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.roleId) {
      setFormError('Name, email, and role are required');
      return;
    }
    if (!editingUser && !formData.password) {
      setFormError('Password is required for new users');
      return;
    }
    setSaving(true);
    setFormError('');

    try {
      if (editingUser) {
        await updateUser.mutateAsync({
          id: editingUser.id,
          data: {
            name: formData.name,
            email: formData.email,
            password: formData.password || undefined,
            roleId: formData.roleId,
          },
        });
      } else {
        await createUser.mutateAsync({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          roleId: formData.roleId,
        });
      }
      setShowForm(false);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Failed to save user',
      );
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<AdminUser>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (user) => (
        <div>
          <p className="font-medium text-gray-900">{user.name}</p>
          <p className="text-xs text-gray-500">{user.email}</p>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (user) => (
        <span className="text-gray-700">{user.role?.name || '—'}</span>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (user) => {
        const isSelf = currentUser?.id === user.id;
        return (
          <div className="flex items-center gap-2">
            <button
              type="button"
              role="switch"
              aria-checked={user.isActive}
              aria-label={`${user.isActive ? 'Deactivate' : 'Activate'} ${user.name}`}
              disabled={isSelf}
              onClick={async () => {
                if (!window.confirm(`${isSelf ? 'You cannot deactivate yourself.' : `Are you sure you want to ${user.isActive ? 'deactivate' : 'activate'} ${user.name}?`}`)) return;
                try {
                  await updateUser.mutateAsync({
                    id: user.id,
                    data: { isActive: !user.isActive },
                  });
                } catch {
                  // Handle error silently
                }
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                user.isActive
                  ? 'bg-green-500'
                  : 'bg-gray-300'
              } ${isSelf ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  user.isActive ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-xs font-medium ${user.isActive ? 'text-green-700' : 'text-gray-500'}`}>
              {user.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'lastLoginAt',
      header: 'Last Login',
      render: (user) => (
        <span className="text-gray-600">
          {user.lastLoginAt
            ? new Date(user.lastLoginAt).toLocaleDateString()
            : 'Never'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (user) => {
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openEditForm(user)}
            >
              Edit
            </Button>
          </div>
        );
      },
    },
  ];

  const users = filteredUsers || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Users</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage staff accounts
          </p>
        </div>
        <Button onClick={openCreateForm}>+ Add User</Button>
      </div>

      <div className="mb-4">
        <Input
          placeholder="Search users by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <DataTable
        columns={columns}
        data={users}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        error={error as Error | null}
        emptyTitle="No admin users found"
        emptyDescription={
          search
            ? 'Try adjusting your search'
            : 'Add your first admin user'
        }
        emptyAction={
          !search ? <Button onClick={openCreateForm}>+ Add User</Button> : undefined
        }
      />

      {/* Create/Edit User Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editingUser ? 'Edit User' : 'Add User'}
      >
        {formError && (
          <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {formError}
          </div>
        )}
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <Input
            label="Full Name"
            name="name"
            value={formData.name}
            onChange={handleFormChange}
            required
            placeholder="e.g. John Doe"
          />
          <Input
            label="Email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleFormChange}
            required
            placeholder="john@rrfashion.com"
          />
          <Input
            label={editingUser ? 'New Password (leave empty to keep)' : 'Password'}
            type="password"
            name="password"
            value={formData.password}
            onChange={handleFormChange}
            required={!editingUser}
            placeholder={
              editingUser ? 'Leave empty to keep current' : 'Min 6 characters'
            }
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              name="roleId"
              value={formData.roleId}
              onChange={handleFormChange}
              required
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Select role</option>
              {roles?.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={saving}>
              {editingUser ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default UserList;
