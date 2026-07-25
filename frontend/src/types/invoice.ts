export type InvoiceType = 'INVOICE' | 'CREDIT_NOTE' | 'DEBIT_NOTE';

export interface Invoice {
  id: string;
  orderId: string;
  invoiceNumber: string;
  storeId: string;
  financialYear: string;
  type: InvoiceType;
  parentInvoiceId?: string;
  pdfUrl: string;
  pdfStorageKey?: string;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalAmount: number;
  amountInWords?: string;
  billingName: string;
  billingAddress: string;
  billingGstin?: string;
  billingState: string;
  shippingState?: string;
  eInvoiceIrn?: string;
  eInvoiceAckDate?: string;
  eInvoiceStatus?: string;
  createdAt: string;
  order?: {
    id: string;
    orderNumber: string;
    totalAmount: number;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
  };
  items?: InvoiceItem[];
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface InvoiceFilters {
  page?: number;
  limit?: number;
  type?: string;
  storeId?: string;
  search?: string;
}
