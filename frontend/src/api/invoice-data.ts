import apiClient from './client';
import type { InvoiceData } from '../types/invoiceData';

export const getInvoiceData = async (orderId: string): Promise<InvoiceData> => {
  const { data } = await apiClient.get<InvoiceData>(`/invoices/order/${orderId}/data`);
  return data;
};
