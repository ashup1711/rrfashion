export interface SiteReminder {
  id: string;
  title: string;
  message: string;
  linkUrl?: string | null;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSiteReminderData {
  title: string;
  message: string;
  linkUrl?: string;
  startDate: string;
  endDate: string;
  isActive?: boolean;
}

export interface UpdateSiteReminderData {
  title?: string;
  message?: string;
  linkUrl?: string;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}

export interface SiteReminderActive {
  id: string;
  title: string;
  message: string;
  linkUrl?: string | null;
  startDate: string;
  endDate: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}
