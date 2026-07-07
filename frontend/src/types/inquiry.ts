export interface Inquiry {
  id: string;
  userId?: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  status: 'OPEN' | 'ASSIGNED' | 'RESOLVED' | 'CLOSED';
  assignedToId?: string;
  assignedTo?: {
    id: string;
    name: string;
    email: string;
  };
  resolutionNotes?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InquiryFilters {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  assignedToId?: string;
}
