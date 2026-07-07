import {
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../storage/storage.service';
import { numberToWordsInr } from '../../common/utils/number-to-words.util';
import { GenerateInvoiceDto } from './dto/generate-invoice.dto';
import { CreateCreditNoteDto } from './dto/credit-note.dto';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly config: ConfigService,
  ) {}

  async generate(dto: GenerateInvoiceDto) {
    const { orderId, storeId: explicitStoreId } = dto;

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: { select: { name: true, hsnCode: true } },
          },
        },
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const storeId = explicitStoreId || order.storeId;
    if (!storeId) {
      throw new BadRequestException('Store ID is required');
    }

    const store = await this.prisma.storeLocation.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    const financialYear = this.getFinancialYear();
    const invoiceNumber = await this.nextInvoiceNumber(storeId, financialYear);

    const billingState = store.state;
    const shippingState = billingState;

    let taxableValue = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;

    for (const item of order.items) {
      taxableValue += item.unitPrice.toNumber() * item.quantity;
      totalCgst += item.cgstAmount?.toNumber() || 0;
      totalSgst += item.sgstAmount?.toNumber() || 0;
      totalIgst += item.igstAmount?.toNumber() || 0;
    }

    const totalAmount = taxableValue + totalCgst + totalSgst + totalIgst;
    const amountInWords = numberToWordsInr(totalAmount);

    const key = `invoices/${storeId}/${financialYear}/${invoiceNumber}.pdf`;

    const pdfBuffer = await this.generatePdf({
      invoiceNumber,
      store,
      order,
      financialYear,
      taxableValue,
      cgst: totalCgst,
      sgst: totalSgst,
      igst: totalIgst,
      totalAmount,
      amountInWords,
    });

    await this.storage.upload(key, pdfBuffer, 'application/pdf');
    const pdfUrl = this.storage.getPublicUrl(key);

    const customerName = order.user ? `${order.user.firstName} ${order.user.lastName}` : 'Guest';
    const billingAddress = JSON.stringify(order.shippingAddress || {});

    const invoice = await this.prisma.invoice.create({
      data: {
        orderId,
        invoiceNumber,
        storeId,
        financialYear,
        type: 'INVOICE',
        pdfUrl,
        pdfStorageKey: key,
        taxableValue,
        cgst: totalCgst,
        sgst: totalSgst,
        igst: totalIgst,
        totalAmount,
        amountInWords,
        billingName: customerName,
        billingAddress,
        billingState,
        shippingState,
      },
    });

    return invoice;
  }

  async createCreditNote(dto: CreateCreditNoteDto) {
    const { invoiceId, refundAmount } = dto;

    const parentInvoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!parentInvoice) {
      throw new NotFoundException('Invoice not found');
    }

    const financialYear = this.getFinancialYear();
    const creditNoteNumber = await this.nextInvoiceNumber(parentInvoice.storeId, financialYear);
    const amountInWords = numberToWordsInr(refundAmount);

    const key = `invoices/${parentInvoice.storeId}/${financialYear}/${creditNoteNumber}.pdf`;

    const pdfBuffer = await this.generateCreditNotePdf({
      creditNoteNumber,
      parentInvoice,
      refundAmount,
      amountInWords,
      reason: dto.reason,
    });

    await this.storage.upload(key, pdfBuffer, 'application/pdf');
    const pdfUrl = this.storage.getPublicUrl(key);

    const invoice = await this.prisma.invoice.create({
      data: {
        orderId: parentInvoice.orderId,
        invoiceNumber: creditNoteNumber,
        storeId: parentInvoice.storeId,
        financialYear,
        type: 'CREDIT_NOTE',
        parentInvoiceId: parentInvoice.id,
        pdfUrl,
        pdfStorageKey: key,
        taxableValue: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
        totalAmount: refundAmount,
        amountInWords,
        billingName: parentInvoice.billingName,
        billingAddress: parentInvoice.billingAddress,
        billingState: parentInvoice.billingState,
        shippingState: parentInvoice.shippingState,
      },
    });

    return invoice;
  }

  async findAllAdmin(params: {
    page?: number;
    limit?: number;
    type?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (params.type) {
      where.type = params.type;
    }

    if (params.startDate || params.endDate) {
      const createdAt: Record<string, Date> = {};
      if (params.startDate) createdAt.gte = new Date(params.startDate);
      if (params.endDate) createdAt.lte = new Date(params.endDate);
      where.createdAt = createdAt;
    }

    if (params.search) {
      where.OR = [
        { invoiceNumber: { contains: params.search, mode: 'insensitive' } },
        { billingName: { contains: params.search, mode: 'insensitive' } },
        { order: { user: { email: { contains: params.search, mode: 'insensitive' } } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              totalAmount: true,
              user: { select: { id: true, firstName: true, lastName: true, email: true } },
            },
          },
          store: { select: { id: true, name: true } },
          parentInvoice: { select: { id: true, invoiceNumber: true } },
          childInvoices: { select: { id: true, invoiceNumber: true, type: true } },
        },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getById(id: string, userId?: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        order: { include: { items: true } },
        childInvoices: true,
        parentInvoice: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Ownership check: only the order owner or an admin should access invoice data
    if (userId && invoice.order.userId !== userId) {
      throw new UnauthorizedException('You do not have access to this invoice');
    }

    return invoice;
  }

  async getByIdAdmin(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            items: true,
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
        store: { select: { id: true, name: true, state: true, gstin: true } },
        childInvoices: true,
        parentInvoice: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }

  async getPdfForOrderAdmin(orderId: string): Promise<{ buffer: Buffer; filename: string }> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const invoice = await this.prisma.invoice.findFirst({
      where: { orderId, type: 'INVOICE' },
      orderBy: { createdAt: 'desc' },
    });

    if (!invoice) {
      throw new NotFoundException('No invoice found for this order');
    }

    let buffer: Buffer | null = null;
    try {
      const urlParts = invoice.pdfUrl.split('/');
      const invoicesIndex = urlParts.indexOf('invoices');
      if (invoicesIndex >= 0) {
        const key = urlParts.slice(invoicesIndex).join('/');
        buffer = await this.storage.download(key);
      }
    } catch {
      buffer = await this.storage.download(invoice.pdfUrl);
    }

    if (!buffer) {
      throw new NotFoundException('Invoice PDF file not found in storage');
    }

    const filename = `invoice-${invoice.invoiceNumber}.pdf`;

    return { buffer, filename };
  }

  async getPdfForOrder(
    orderId: string,
    userId: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { userId: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.userId !== userId) {
      throw new UnauthorizedException('This order does not belong to you');
    }

    const invoice = await this.prisma.invoice.findFirst({
      where: { orderId, type: 'INVOICE' },
      orderBy: { createdAt: 'desc' },
    });

    if (!invoice) {
      throw new NotFoundException('No invoice found for this order');
    }

    let buffer: Buffer | null = null;
    try {
      const urlParts = invoice.pdfUrl.split('/');
      const invoicesIndex = urlParts.indexOf('invoices');
      if (invoicesIndex >= 0) {
        const key = urlParts.slice(invoicesIndex).join('/');
        buffer = await this.storage.download(key);
      }
    } catch {
      buffer = await this.storage.download(invoice.pdfUrl);
    }

    if (!buffer) {
      throw new NotFoundException('Invoice PDF file not found in storage');
    }

    const filename = `invoice-${invoice.invoiceNumber}.pdf`;

    return { buffer, filename };
  }

  async getByOrder(orderId: string, userId?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { userId: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Ownership check: only the order owner or an admin should access invoice data
    if (userId && order.userId !== userId) {
      throw new UnauthorizedException("You do not have access to this order's invoices");
    }

    return this.prisma.invoice.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async nextInvoiceNumber(storeId: string, financialYear: string): Promise<string> {
    const result = await this.prisma.$queryRaw<Array<{ last_number: number }>>`
      SELECT next_invoice_number(${storeId}::text, ${financialYear}::text) AS last_number
    `;

    const seq = Number(result[0]?.last_number || 1);
    return `${financialYear}/${storeId.slice(0, 8)}/${String(seq).padStart(6, '0')}`;
  }

  private getFinancialYear(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    if (month >= 4) {
      return `${year}-${(year + 1).toString().slice(2)}`;
    }
    return `${year - 1}-${year.toString().slice(2)}`;
  }

  private async generatePdf(data: {
    invoiceNumber: string;
    store: { name: string; address: string; gstin: string; state: string };
    order: {
      orderNumber: string;
      createdAt: Date;
      items: Array<{
        id: string;
        product: { name: string; hsnCode: string | null };
        quantity: number;
        unitPrice: { toNumber(): number };
        totalPrice: { toNumber(): number };
      }>;
    };
    financialYear: string;
    taxableValue: number;
    cgst: number;
    sgst: number;
    igst: number;
    totalAmount: number;
    amountInWords: string;
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const {
        invoiceNumber,
        store,
        order,
        taxableValue,
        cgst,
        sgst,
        igst,
        totalAmount,
        amountInWords,
      } = data;
      const pageWidth = doc.page.width - 100;

      doc.fontSize(20).font('Helvetica-Bold').text('TAX INVOICE', { align: 'center' });
      doc.moveDown(0.5);

      doc.fontSize(10).font('Helvetica');
      doc.text(`Invoice #: ${invoiceNumber}`, { align: 'left' });
      doc.text(`Order #: ${order.orderNumber}`, { align: 'left' });
      doc.text(`Date: ${order.createdAt.toLocaleDateString('en-IN')}`, { align: 'left' });
      doc.moveDown(0.5);

      doc.font('Helvetica-Bold').text('Seller:');
      doc.font('Helvetica');
      doc.text(store.name);
      doc.text(store.address);
      doc.text(`GSTIN: ${store.gstin}`);
      doc.text(`State: ${store.state}`);
      doc.moveDown(0.5);

      doc.font('Helvetica-Bold').text('Items:');
      doc.moveDown(0.3);

      const tableTop = doc.y;
      doc.fontSize(9).font('Helvetica-Bold');
      doc.text('#', 50, tableTop, { width: 30 });
      doc.text('Item', 80, tableTop, { width: 200 });
      doc.text('HSN', 280, tableTop, { width: 80 });
      doc.text('Qty', 330, tableTop, { width: 40, align: 'right' });
      doc.text('Rate', 370, tableTop, { width: 70, align: 'right' });
      doc.text('Amount', 440, tableTop, { width: 90, align: 'right' });

      doc
        .moveTo(50, doc.y + 3)
        .lineTo(pageWidth + 50, doc.y + 3)
        .stroke();
      doc.moveDown(0.5);

      doc.font('Helvetica').fontSize(9);
      let rowY = doc.y;

      for (let i = 0; i < order.items.length; i++) {
        const item = order.items[i];
        doc.text(String(i + 1), 50, rowY, { width: 30 });
        doc.text(item.product.name, 80, rowY, { width: 200 });
        doc.text(item.product.hsnCode || '-', 280, rowY, { width: 80 });
        doc.text(String(item.quantity), 330, rowY, { width: 40, align: 'right' });
        doc.text(`₹${item.unitPrice.toNumber().toFixed(2)}`, 370, rowY, {
          width: 70,
          align: 'right',
        });
        doc.text(`₹${item.totalPrice.toNumber().toFixed(2)}`, 440, rowY, {
          width: 90,
          align: 'right',
        });
        rowY = doc.y + 15;
        doc.y = rowY;
      }

      doc
        .moveTo(50, doc.y)
        .lineTo(pageWidth + 50, doc.y)
        .stroke();
      doc.moveDown(0.5);

      doc.font('Helvetica-Bold').fontSize(10);
      doc.text(`Taxable Value: ₹${taxableValue.toFixed(2)}`, { align: 'right' });
      if (cgst > 0) doc.text(`CGST: ₹${cgst.toFixed(2)}`, { align: 'right' });
      if (sgst > 0) doc.text(`SGST: ₹${sgst.toFixed(2)}`, { align: 'right' });
      if (igst > 0) doc.text(`IGST: ₹${igst.toFixed(2)}`, { align: 'right' });
      doc.moveDown(0.3);
      doc.fontSize(12).text(`Total: ₹${totalAmount.toFixed(2)}`, { align: 'right' });
      doc.moveDown(0.3);
      doc
        .fontSize(9)
        .font('Helvetica')
        .text(`Amount in words: ${amountInWords}`, { align: 'right' });

      doc.moveDown(1);
      doc
        .fontSize(8)
        .font('Helvetica')
        .text(`This is a computer-generated invoice. No signature required.`, { align: 'center' });

      doc.end();
    });
  }

  private async generateCreditNotePdf(data: {
    creditNoteNumber: string;
    parentInvoice: { invoiceNumber: string; billingName: string; billingAddress: string };
    refundAmount: number;
    amountInWords: string;
    reason?: string;
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const { creditNoteNumber, parentInvoice, refundAmount, amountInWords, reason } = data;

      doc.fontSize(20).font('Helvetica-Bold').text('CREDIT NOTE', { align: 'center' });
      doc.moveDown(0.5);

      doc.fontSize(10).font('Helvetica');
      doc.text(`Credit Note #: ${creditNoteNumber}`, { align: 'left' });
      doc.text(`Original Invoice #: ${parentInvoice.invoiceNumber}`, { align: 'left' });
      doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, { align: 'left' });
      doc.moveDown(0.5);

      doc.font('Helvetica-Bold').text('Customer:');
      doc.font('Helvetica');
      doc.text(parentInvoice.billingName);
      doc.text(parentInvoice.billingAddress);
      doc.moveDown(0.5);

      doc.font('Helvetica-Bold').text('Refund Details:');
      doc.font('Helvetica');
      doc.text(`Refund Amount: ₹${refundAmount.toFixed(2)}`);
      doc.text(`Amount in words: ${amountInWords}`);
      if (reason) {
        doc.text(`Reason: ${reason}`);
      }

      doc.moveDown(1);
      doc
        .fontSize(8)
        .font('Helvetica')
        .text(`This is a computer-generated credit note. No signature required.`, {
          align: 'center',
        });

      doc.end();
    });
  }
}
