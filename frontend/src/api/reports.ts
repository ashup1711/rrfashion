import adminClient from './admin-client';
import type { ReportExport, ExportRequest } from '../types/report';

export const requestExport = async (
  exportData: ExportRequest,
): Promise<ReportExport> => {
  const { data } = await adminClient.post<ReportExport>(
    '/analytics/export',
    exportData,
  );
  return data;
};

export const getStatus = async (id: string): Promise<ReportExport> => {
  const { data } = await adminClient.get<ReportExport>(
    `/analytics/export/${id}`,
  );
  return data;
};

export const download = async (id: string): Promise<Blob> => {
  const { data } = await adminClient.get<Blob>(
    `/analytics/export/${id}/download`,
    { responseType: 'blob' },
  );
  return data;
};
