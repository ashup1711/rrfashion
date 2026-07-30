import adminClient from './admin-client';
import apiClient from './client';
import type {
  SiteReminder,
  CreateSiteReminderData,
  UpdateSiteReminderData,
  SiteReminderActive,
  PaginatedResponse,
} from '../types/reminder';

// ── Admin CRUD (uses adminClient) ──

export const getAll = async (
  page = 1,
  limit = 20,
  search?: string,
): Promise<PaginatedResponse<SiteReminder>> => {
  const params: Record<string, string | number> = { page, limit };
  if (search) params.search = search;
  const { data } = await adminClient.get<PaginatedResponse<SiteReminder>>(
    '/admin/reminders',
    { params },
  );
  return data;
};

export const getById = async (id: string): Promise<SiteReminder> => {
  const { data } = await adminClient.get<SiteReminder>(`/admin/reminders/${id}`);
  return data;
};

export const create = async (
  reminderData: CreateSiteReminderData,
): Promise<SiteReminder> => {
  const { data } = await adminClient.post<SiteReminder>(
    '/admin/reminders',
    reminderData,
  );
  return data;
};

export const update = async (
  id: string,
  reminderData: UpdateSiteReminderData,
): Promise<SiteReminder> => {
  const { data } = await adminClient.patch<SiteReminder>(
    `/admin/reminders/${id}`,
    reminderData,
  );
  return data;
};

export const deleteReminder = async (
  id: string,
): Promise<{ message: string }> => {
  const { data } = await adminClient.delete<{ message: string }>(
    `/admin/reminders/${id}`,
  );
  return data;
};

// ── Public (uses apiClient) ──

export const getActiveReminders = async (): Promise<SiteReminderActive[]> => {
  const { data } = await apiClient.get<SiteReminderActive[]>('/reminders/active');
  return data;
};
