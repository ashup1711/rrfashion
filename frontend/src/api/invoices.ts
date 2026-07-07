import adminClient from './admin-client';
import type { PaginatedResponse } from '../types/api';
import type { Invoice, InvoiceFilters } from '../types/invoice';

export const getAll = async (
  filters?: InvoiceFilters,
): Promise<PaginatedResponse<Invoice>> => {
  const { data } = await adminClient.get<PaginatedResponse<Invoice>>(
    '/admin/invoices',
    { params: filters },
  );
  return data;
};

export const getById = async (id: string): Promise<Invoice> => {
  const { data } = await adminClient.get<Invoice>(`/admin/invoices/${id}`);
  return data;
};

export const downloadPdf = async (id: string): Promise<Blob> => {
  const { data } = await adminClient.get<Blob>(`/admin/invoices/${id}/pdf`, {
    responseType: 'blob',
  });
  return data;
};

/**
 * Use downloadOrderInvoice from ./orders.ts instead
 * @deprecated Use GET /orders/:orderId/invoice via orders.downloadOrderInvoice
 */
