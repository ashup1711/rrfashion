import adminClient from './admin-client';

export interface PosSyncConflict {
  id: string;
  deviceUuid: string;
  storeId: string;
  clientUuid: string;
  entity: string;
  data: unknown;
  error: string;
  status: string;
  resolvedAt?: string;
  createdAt: string;
}

export interface ConflictsResponse {
  conflicts: PosSyncConflict[];
}

export const getConflicts = async (params?: { storeId?: string; status?: string }): Promise<ConflictsResponse> => {
  const { data } = await adminClient.get<ConflictsResponse>('/pos/conflicts', { params });
  return data;
};

export const resolveConflict = async (id: string): Promise<{ resolved: boolean }> => {
  const { data } = await adminClient.patch<{ resolved: boolean }>(`/pos/conflicts/${id}/resolve`);
  return data;
};
