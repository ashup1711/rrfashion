import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  requestExport,
  getStatus,
  download,
} from '../api/reports';
import { QUERY_KEYS } from '../utils/constants';
import type { ExportRequest } from '../types/report';

export const useRequestExport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ExportRequest) => requestExport(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.reports],
      });
    },
  });
};

export const useExportStatus = (id: string) => {
  return useQuery({
    queryKey: [QUERY_KEYS.report, id],
    queryFn: () => getStatus(id),
    enabled: !!id,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.status === 'COMPLETED' || data?.status === 'FAILED') {
        return false;
      }
      return 5000;
    },
  });
};

export const useDownloadExport = () => {
  return useMutation({
    mutationFn: (id: string) => download(id),
  });
};
