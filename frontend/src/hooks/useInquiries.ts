import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAll,
  getById,
  assign,
  resolve,
} from '../api/inquiries';
import { QUERY_KEYS } from '../utils/constants';
import type { InquiryFilters } from '../types/inquiry';

export const useInquiries = (filters?: InquiryFilters) => {
  return useQuery({
    queryKey: [QUERY_KEYS.inquiries, filters],
    queryFn: () => getAll(filters),
  });
};

export const useInquiry = (id: string) => {
  return useQuery({
    queryKey: [QUERY_KEYS.inquiry, id],
    queryFn: () => getById(id),
    enabled: !!id,
  });
};

export const useAssignInquiry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      adminId,
    }: {
      id: string;
      adminId: string;
    }) => assign(id, adminId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.inquiries] });
    },
  });
};

export const useResolveInquiry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      notes,
    }: {
      id: string;
      notes: string;
    }) => resolve(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.inquiries] });
    },
  });
};
