import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import { getInvoiceData } from '../../../api/invoice-data';
import { downloadOrderInvoice } from '../../../api/orders';
import { formatCurrency } from '../../../utils/formatCurrency';

interface InvoicePreviewProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
}

const InvoicePreview: React.FC<InvoicePreviewProps> = ({ isOpen, onClose, orderId }) => {
  const { data: invoice, isLoading, error } = useQuery({
    queryKey: ['invoiceData', orderId],
    queryFn: () => getInvoiceData(orderId),
    enabled: isOpen && !!orderId,
  });

  const [downloading, setDownloading] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const blob = await downloadOrderInvoice(orderId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoice?.orderNumber || orderId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Invoice">
      <div className="print:hidden flex items-center gap-2 mb-4">
        <Button variant="outline" size="sm" onClick={handlePrint}>
          Print
        </Button>
        <Button variant="outline" size="sm" onClick={handleDownloadPdf} isLoading={downloading}>
          Download PDF
        </Button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <svg className="w-8 h-8 text-primary-500 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      )}

      {error && (
        <div className="text-center py-8 text-red-600">
          Failed to load invoice data. Please try again.
        </div>
      )}

      {invoice && (
        <div className="invoice-content text-sm print:bg-white print:text-black" id="invoice-print">
          <div className="text-center border-b border-gray-200 pb-4 mb-4">
            <h2 className="text-xl font-bold text-gray-900">{invoice.store.name}</h2>
            <p className="text-gray-600">{invoice.store.address}</p>
            <p className="text-gray-600">{invoice.store.city}, {invoice.store.state} - {invoice.store.pincode}</p>
            <p className="text-gray-600">GSTIN: {invoice.store.gstin}</p>
            <p className="text-gray-600">Phone: {invoice.store.phone}{invoice.store.email && ` | Email: ${invoice.store.email}`}</p>
          </div>

          <div className="flex justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">TAX INVOICE</h3>
              <p className="text-gray-600">Invoice #: {invoice.invoiceNumber}</p>
              <p className="text-gray-600">Date: {new Date(invoice.date).toLocaleDateString('en-IN')}</p>
            </div>
            <div className="text-right">
              <p className="text-gray-600">Order #: {invoice.orderNumber}</p>
            </div>
          </div>

          <div className="mb-4 p-3 bg-gray-50 rounded">
            <h4 className="font-semibold text-gray-900 mb-1">Bill To:</h4>
            <p className="text-gray-700">{invoice.customer.name}</p>
            {invoice.customer.email && <p className="text-gray-600">{invoice.customer.email}</p>}
            <p className="text-gray-600">Phone: {invoice.customer.phone}</p>
            {Object.entries(invoice.customer.address).map(([key, value]) => (
              <p key={key} className="text-gray-600">{value}</p>
            ))}
          </div>

          <table className="w-full mb-4 border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-200 px-2 py-1 text-left">#</th>
                <th className="border border-gray-200 px-2 py-1 text-left">Product</th>
                <th className="border border-gray-200 px-2 py-1 text-left">HSN</th>
                <th className="border border-gray-200 px-2 py-1 text-center">Qty</th>
                <th className="border border-gray-200 px-2 py-1 text-right">Rate</th>
                <th className="border border-gray-200 px-2 py-1 text-right">CGST</th>
                <th className="border border-gray-200 px-2 py-1 text-right">SGST</th>
                <th className="border border-gray-200 px-2 py-1 text-right">IGST</th>
                <th className="border border-gray-200 px-2 py-1 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item: { productName: string; hsnCode: string | null; quantity: number; unitPrice: number; totalPrice: number; cgstAmount: number; sgstAmount: number; igstAmount: number }, idx: number) => (
                <tr key={idx}>
                  <td className="border border-gray-200 px-2 py-1">{idx + 1}</td>
                  <td className="border border-gray-200 px-2 py-1">{item.productName}</td>
                  <td className="border border-gray-200 px-2 py-1">{item.hsnCode || '-'}</td>
                  <td className="border border-gray-200 px-2 py-1 text-center">{item.quantity}</td>
                  <td className="border border-gray-200 px-2 py-1 text-right">{formatCurrency(item.unitPrice)}</td>
                  <td className="border border-gray-200 px-2 py-1 text-right">{formatCurrency(item.cgstAmount)}</td>
                  <td className="border border-gray-200 px-2 py-1 text-right">{formatCurrency(item.sgstAmount)}</td>
                  <td className="border border-gray-200 px-2 py-1 text-right">{formatCurrency(item.igstAmount)}</td>
                  <td className="border border-gray-200 px-2 py-1 text-right">{formatCurrency(item.totalPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end mb-4">
            <div className="w-64 space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600">Taxable Value:</span>
                <span className="text-gray-900">{formatCurrency(invoice.taxableValue)}</span>
              </div>
              {invoice.totalCgst > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">CGST:</span>
                  <span className="text-gray-900">{formatCurrency(invoice.totalCgst)}</span>
                </div>
              )}
              {invoice.totalSgst > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">SGST:</span>
                  <span className="text-gray-900">{formatCurrency(invoice.totalSgst)}</span>
                </div>
              )}
              {invoice.totalIgst > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">IGST:</span>
                  <span className="text-gray-900">{formatCurrency(invoice.totalIgst)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-gray-200 pt-1 font-bold">
                <span>Total:</span>
                <span>{formatCurrency(invoice.totalAmount)}</span>
              </div>
            </div>
          </div>

          <div className="mb-4 p-2 bg-gray-50 rounded">
            <span className="font-semibold">Amount in Words: </span>
            <span>{invoice.amountInWords}</span>
          </div>

          <div className="text-center text-xs text-gray-500 border-t border-gray-200 pt-4">
            <p>This is a computer-generated invoice and does not require a signature.</p>
            <p>Thank you for shopping with {invoice.store.name}!</p>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default InvoicePreview;
