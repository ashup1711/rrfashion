import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAll,
  getById,
  create,
  update,
  deleteReminder,
  getActiveReminders,
} from '../api/reminders';
import { QUERY_KEYS } from '../utils/constants';
import type { CreateSiteReminderData, UpdateSiteReminderData } from '../types/reminder';

// ── Admin Hooks ──

export const useReminders = (page = 1, limit = 20, search?: string) => {
  return useQuery({
    queryKey: [QUERY_KEYS.reminders, { page, limit, search }],
    queryFn: () => getAll(page, limit, search),
    staleTime: 1000 * 60 * 5,
  });
};

export const useReminder = (id: string) => {
  return useQuery({
    queryKey: [QUERY_KEYS.reminder, id],
    queryFn: () => getById(id),
    enabled: !!id,
  });
};

export const useCreateReminder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSiteReminderData) => create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.reminders] });
    },
  });
};

export const useUpdateReminder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateSiteReminderData;
    }) => update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.reminders] });
    },
  });
};

export const useDeleteReminder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteReminder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.reminders] });
    },
  });
};

// ── Public / Storefront Hooks ──

export const useActiveReminders = () => {
  return useQuery({
    queryKey: [QUERY_KEYS.activeReminders],
    queryFn: getActiveReminders,
    staleTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 60 * 5,
  });
};
