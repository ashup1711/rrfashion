import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { adminSwitchTenant } from '../../api/admin-auth';
import { useAdminStore } from '../../store/adminStore';

export function TenantSwitcher() {
  const { tenants, activeTenantId, setTenants } = useAdminStore();
  const queryClient = useQueryClient();
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (tenants.length === 0) return null;

  const active = tenants.find((t) => t.id === activeTenantId) ?? tenants[0];

  if (tenants.length === 1) {
    return (
      <span className="text-sm font-medium text-gray-700" data-testid="tenant-name">
        {active.name}
      </span>
    );
  }

  const handleChange = async (tenantId: string) => {
    if (tenantId === active.id) return;
    setSwitching(true);
    setError(null);
    try {
      const result = await adminSwitchTenant(tenantId);
      setTenants(result.tenants, result.activeTenantId);
      queryClient.clear();
    } catch {
      setError('Could not switch business');
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="tenant-switcher" className="sr-only">
        Active business
      </label>
      <select
        id="tenant-switcher"
        data-testid="tenant-switcher"
        value={active.id}
        disabled={switching}
        onChange={(e) => handleChange(e.target.value)}
        className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        {tenants.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
