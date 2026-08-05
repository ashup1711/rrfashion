export interface InvoiceData {
  id: string;
  invoiceNumber: string;
  orderId: string;
  orderNumber: string;
  date: string;
  store: {
    name: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    gstin: string;
    phone: string;
    email: string;
  };
  customer: {
    name: string;
    email?: string;
    phone: string;
    address: Record<string, string>;
  };
  items: Array<{
    productName: string;
    hsnCode: string | null;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
  }>;
  taxableValue: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalAmount: number;
  amountInWords: string;
}
