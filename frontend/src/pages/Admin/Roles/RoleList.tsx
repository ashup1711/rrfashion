import { useState } from 'react';
import DataTable from '../../../components/ui/DataTable';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Modal from '../../../components/ui/Modal';
import Badge from '../../../components/ui/Badge';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import PermissionMatrix from '../../../components/ui/PermissionMatrix';
import {
  useRoles,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
  usePermissions,
  useAssignPermissions,
} from '../../../hooks/useRoles';
import type { Column } from '../../../components/ui/DataTable';
import type { Role } from '../../../types/roles';

const RoleList = () => {
  const { data: roles, isLoading, error } = useRoles();
  const { data: allPermissions } = usePermissions();
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const deleteRole = useDeleteRole();
  const assignPermissions = useAssignPermissions();

  const [showForm, setShowForm] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [assignedPermissionIds, setAssignedPermissionIds] = useState<string[]>([]);

  const openCreateForm = () => {
    setEditingRole(null);
    setFormName('');
    setFormDescription('');
    setFormError('');
    setShowForm(true);
  };

  const openEditForm = (role: Role) => {
    setEditingRole(role);
    setFormName(role.name);
    setFormDescription(role.description || '');
    setFormError('');
    setShowForm(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Role name is required');
      return;
    }
    setSaving(true);
    setFormError('');

    try {
      if (editingRole) {
        await updateRole.mutateAsync({
          id: editingRole.id,
          data: { name: formName, description: formDescription || undefined },
        });
      } else {
        await createRole.mutateAsync({
          name: formName,
          description: formDescription || undefined,
        });
      }
      setShowForm(false);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Failed to save role',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this role?')) return;
    try {
      await deleteRole.mutateAsync(id);
    } catch {
      // Handle error silently
    }
  };

  const openPermissionEditor = (role: Role) => {
    setSelectedRole(role);
    setAssignedPermissionIds(role.permissions?.map((p) => p.id) || []);
    setShowPermissions(true);
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    setSaving(true);
    try {
      await assignPermissions.mutateAsync({
        roleId: selectedRole.id,
        permissionIds: assignedPermissionIds,
      });
      setShowPermissions(false);
    } catch {
      // Handle error silently
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<Role>[] = [
    {
      key: 'name',
      header: 'Role Name',
      render: (role) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900">{role.name}</span>
          {role.isSystem && <Badge variant="info">System</Badge>}
        </div>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (role) => (
        <span className="text-gray-600">{role.description || '—'}</span>
      ),
    },
    {
      key: 'permissions',
      header: 'Permissions',
      render: (role) => (
        <span className="text-gray-600">
          {role.permissions?.length || 0} assigned
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (role) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openPermissionEditor(role)}
          >
            Permissions
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEditForm(role)}
            disabled={role.isSystem}
          >
            Edit
          </Button>
          {!role.isSystem && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(role.id)}
              className="text-red-600 hover:text-red-700"
            >
              Delete
            </Button>
          )}
        </div>
      ),
    },
  ];

  if (isLoading) return <LoadingSpinner size="lg" label="Loading roles..." />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Roles</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage roles and permissions
          </p>
        </div>
        <Button onClick={openCreateForm}>+ Add Role</Button>
      </div>

      <DataTable
        columns={columns}
        data={roles || []}
        keyExtractor={(item) => item.id}
        isLoading={false}
        error={error as Error | null}
        emptyTitle="No roles found"
        emptyDescription="Roles are used to group permissions for admin users"
        emptyAction={<Button onClick={openCreateForm}>+ Add Role</Button>}
      />

      {/* Create/Edit Role Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editingRole ? 'Edit Role' : 'Create Role'}
      >
        {formError && (
          <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {formError}
          </div>
        )}
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <Input
            label="Role Name"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            required
            placeholder="e.g. Store Manager"
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
              placeholder="Optional role description..."
            />
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
              {editingRole ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Permission Editor Modal */}
      {showPermissions && selectedRole && (
        <Modal
          isOpen={showPermissions}
          onClose={() => setShowPermissions(false)}
          title={`Permissions: ${selectedRole.name}`}
        >
          {allPermissions && allPermissions.length > 0 ? (
            <div className="mb-4">
              <PermissionMatrix
                permissions={allPermissions}
                assignedPermissionIds={assignedPermissionIds}
                onChange={setAssignedPermissionIds}
              />
            </div>
          ) : (
            <LoadingSpinner size="sm" />
          )}
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowPermissions(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSavePermissions} isLoading={saving}>
              Save Permissions
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default RoleList;
