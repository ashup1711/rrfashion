export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  timestamp?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; issue: string }>;
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}
