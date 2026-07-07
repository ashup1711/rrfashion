import { useRef, useEffect } from 'react';
import type { Permission } from '../../types/roles';

interface PermissionMatrixProps {
  permissions: Permission[];
  assignedPermissionIds: string[];
  onChange: (permissionIds: string[]) => void;
  readOnly?: boolean;
}

interface ModuleGroup {
  module: string;
  actions: Array<{
    id: string;
    action: string;
    description?: string;
  }>;
}

const ACTION_LABELS: Record<string, string> = {
  view: 'View',
  create: 'Create',
  edit: 'Edit',
  delete: 'Delete',
  export: 'Export',
};

const PermissionMatrix = ({
  permissions,
  assignedPermissionIds,
  onChange,
  readOnly = false,
}: PermissionMatrixProps) => {
  const moduleGroups: ModuleGroup[] = permissions.reduce(
    (groups: ModuleGroup[], perm) => {
      const existing = groups.find((g) => g.module === perm.module);
      if (existing) {
        existing.actions.push({
          id: perm.id,
          action: perm.action,
          description: perm.description,
        });
      } else {
        groups.push({
          module: perm.module,
          actions: [
            {
              id: perm.id,
              action: perm.action,
              description: perm.description,
            },
          ],
        });
      }
      return groups;
    },
    [],
  );

  const allActions = Array.from(
    new Set(permissions.map((p) => p.action)),
  ).sort();

  const isAssigned = (permId: string) => assignedPermissionIds.includes(permId);

  const togglePermission = (permId: string) => {
    if (readOnly) return;
    if (isAssigned(permId)) {
      onChange(assignedPermissionIds.filter((id) => id !== permId));
    } else {
      onChange([...assignedPermissionIds, permId]);
    }
  };

  const toggleModule = (module: string, checked: boolean) => {
    if (readOnly) return;
    const modulePermIds = permissions
      .filter((p) => p.module === module)
      .map((p) => p.id);

    if (checked) {
      const newIds = [...new Set([...assignedPermissionIds, ...modulePermIds])];
      onChange(newIds);
    } else {
      onChange(
        assignedPermissionIds.filter((id) => !modulePermIds.includes(id)),
      );
    }
  };

  const isModuleFullyAssigned = (module: string) => {
    const modulePerms = permissions.filter((p) => p.module === module);
    return modulePerms.length > 0 && modulePerms.every((p) => isAssigned(p.id));
  };

  const isModulePartiallyAssigned = (module: string) => {
    const modulePerms = permissions.filter((p) => p.module === module);
    return (
      modulePerms.some((p) => isAssigned(p.id)) &&
      !modulePerms.every((p) => isAssigned(p.id))
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border border-gray-200 rounded-lg">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b">
              Module
            </th>
            {allActions.map((action) => (
              <th
                key={action}
                className="px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider border-b"
              >
                {ACTION_LABELS[action] || action}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {moduleGroups.map((group) => (
            <ModuleRow
              key={group.module}
              group={group}
              allActions={allActions}
              isModuleFullyAssigned={isModuleFullyAssigned(group.module)}
              isModulePartiallyAssigned={isModulePartiallyAssigned(group.module)}
              readOnly={readOnly}
              toggleModule={toggleModule}
              togglePermission={togglePermission}
              isAssigned={isAssigned}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};

interface ModuleRowProps {
  group: ModuleGroup;
  allActions: string[];
  isModuleFullyAssigned: boolean;
  isModulePartiallyAssigned: boolean;
  readOnly: boolean;
  toggleModule: (module: string, checked: boolean) => void;
  togglePermission: (permId: string) => void;
  isAssigned: (permId: string) => boolean;
}

const ModuleRow = ({
  group,
  allActions,
  isModuleFullyAssigned,
  isModulePartiallyAssigned,
  readOnly,
  toggleModule,
  togglePermission,
  isAssigned,
}: ModuleRowProps) => {
  const checkboxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = isModulePartiallyAssigned;
    }
  }, [isModulePartiallyAssigned]);

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3 text-sm font-medium text-gray-900 capitalize">
        <label className="flex items-center gap-2 cursor-pointer">
          {!readOnly && (
            <input
              ref={checkboxRef}
              type="checkbox"
              checked={isModuleFullyAssigned}
              onChange={(e) => toggleModule(group.module, e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              aria-label={`Toggle all ${group.module} permissions`}
            />
          )}
          {group.module}
        </label>
      </td>
      {allActions.map((action) => {
        const perm = group.actions.find((a) => a.action === action);
        return (
          <td key={action} className="px-3 py-3 text-center">
            {perm && (
              <input
                type="checkbox"
                checked={isAssigned(perm.id)}
                onChange={() => togglePermission(perm.id)}
                disabled={readOnly}
                title={perm.description || `${group.module}:${action}`}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 disabled:opacity-50"
                aria-label={`${group.module} ${action}`}
              />
            )}
          </td>
        );
      })}
    </tr>
  );
};

export default PermissionMatrix;
