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
import { randomUUID } from 'crypto';
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
    try {
      const result = await this.prisma.$queryRaw<Array<{ last_number: number }>>`
        SELECT next_invoice_number(${storeId}::text, ${financialYear}::text) AS last_number
      `;

      const seq = Number(result[0]?.last_number || 1);
      return `${financialYear}/${storeId.slice(0, 8)}/${String(seq).padStart(6, '0')}`;
    } catch (error) {
      this.logger.warn(
        `next_invoice_number function failed, using fallback: ${(error as Error).message}`,
      );
      const fallbackSeq = Math.floor(Math.random() * 900000) + 100000;
      return `${financialYear}/${storeId.slice(0, 8)}/${String(fallbackSeq).padStart(6, '0')}-${randomUUID().slice(0, 4)}`;
    }
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
      user?: { firstName: string; lastName: string; email: string } | null;
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
        financialYear,
        taxableValue,
        cgst,
        sgst,
        igst,
        totalAmount,
        amountInWords,
      } = data;

      // ── PAGE-BREAK TRACKING ───────────────────────────────────
      // Track vertical position for multi-page support
      let currentY = 50;

      const checkPageBreak = (neededHeight: number): void => {
        const pageBottom = doc.page.height - 60; // 60pt bottom margin (footer position)
        if (currentY + neededHeight > pageBottom) {
          doc.addPage();
          currentY = 50; // reset to top margin of new page
        }
      };

      const pageWidth = doc.page.width - 100;
      const leftMargin = 50;
      const rightMargin = doc.page.width - 50;

      // ── HEADER BAR ─────────────────────────────────────────
      doc.rect(leftMargin, 50, pageWidth, 40).fill('#2563EB');
      doc.fill('#FFFFFF').fontSize(20).font('Helvetica-Bold')
        .text('TAX INVOICE', leftMargin, 58, { align: 'center', width: pageWidth });

      doc.moveDown(2);
      currentY = doc.y;

      // ── INVOICE METADATA ──────────────────────────────────
      const metaY = doc.y;
      doc.fill('#000000').fontSize(9).font('Helvetica');

      // Left side: Invoice details
      doc.text(`Invoice #: ${invoiceNumber}`, leftMargin, metaY, { width: pageWidth / 2 });
      doc.text(`Order #: ${order.orderNumber}`, leftMargin, metaY + 13, { width: pageWidth / 2 });

      // Right side: Date & Financial Year
      const rightColX = rightMargin - 200;
      doc.text(`Date: ${order.createdAt.toLocaleDateString('en-IN')}`, rightColX, metaY, { width: 200, align: 'right' });
      doc.text(`Financial Year: ${financialYear}`, rightColX, metaY + 13, { width: 200, align: 'right' });

      doc.moveDown(1.5);
      currentY = doc.y;

      // ── SELLER DETAILS ────────────────────────────────────
      const sectionY = doc.y;
      doc.rect(leftMargin, sectionY, pageWidth, 16).fill('#F3F4F6');
      doc.fill('#000000').fontSize(9).font('Helvetica-Bold')
        .text('SELLER DETAILS', leftMargin + 5, sectionY + 3);

      doc.fill('#000000').fontSize(9).font('Helvetica');
      const sellerContentY = sectionY + 22;
      doc.text(store.name, leftMargin, sellerContentY);
      doc.text(store.address, leftMargin, sellerContentY + 13);
      doc.text(`GSTIN: ${store.gstin}`, leftMargin, sellerContentY + 26);
      doc.text(`State: ${store.state}`, leftMargin, sellerContentY + 39);

      doc.moveDown(5);
      currentY = doc.y;

      // ── BILL TO ───────────────────────────────────────────
      const billSectionY = doc.y + 10;
      doc.rect(leftMargin, billSectionY, pageWidth, 16).fill('#F3F4F6');
      doc.fill('#000000').fontSize(9).font('Helvetica-Bold')
        .text('BILL TO', leftMargin + 5, billSectionY + 3);

      const customerName = order.user
        ? `${order.user.firstName} ${order.user.lastName}`
        : 'Guest';
      const customerEmail = order.user?.email || '';

      doc.fill('#000000').fontSize(9).font('Helvetica');
      const billContentY = billSectionY + 22;
      doc.text(customerName, leftMargin, billContentY);
      doc.text(customerEmail || '', leftMargin, billContentY + 13);

      doc.moveDown(4);
      currentY = doc.y;

      // ── ITEMS TABLE ───────────────────────────────────────
      // Check page break before items table (estimated minimum 200pt)
      checkPageBreak(200);

      const tableTop = doc.y + 10;
      const colWidths = { sno: 30, desc: 180, hsn: 60, qty: 45, rate: 80, amount: 90 };
      const totalColWidth = Object.values(colWidths).reduce((a, b) => a + b, 0);
      const tableStartX = leftMargin + (pageWidth - totalColWidth) / 2;

      // Table header
      let xPos = tableStartX;
      const headerY = tableTop;
      doc.rect(tableStartX, headerY, totalColWidth, 18).fill('#2563EB');
      doc.fill('#FFFFFF').fontSize(8).font('Helvetica-Bold');

      const headers: Array<{ text: string; w: number; align: 'left' | 'center' | 'right' }> = [
        { text: '#', w: colWidths.sno, align: 'center' },
        { text: 'Description', w: colWidths.desc, align: 'left' },
        { text: 'HSN', w: colWidths.hsn, align: 'center' },
        { text: 'Qty', w: colWidths.qty, align: 'center' },
        { text: 'Rate', w: colWidths.rate, align: 'right' },
        { text: 'Amount', w: colWidths.amount, align: 'right' },
      ];

      headers.forEach((h) => {
        doc.text(h.text, xPos, headerY + 4, { width: h.w, align: h.align });
        xPos += h.w;
      });

      currentY = headerY + 18;

      // Table rows
      let rowY = headerY + 18;
      doc.fontSize(8).font('Helvetica');

      for (let i = 0; i < order.items.length; i++) {
        const item = order.items[i];
        const isEven = i % 2 === 0;

        // Check page break every 15 rows
        if (i > 0 && i % 15 === 0) {
          checkPageBreak(16 * Math.min(order.items.length - i, 15) + 200);
          if (currentY < 70) {
            // Re-draw table header on new page
            doc.rect(tableStartX, currentY, totalColWidth, 18).fill('#2563EB');
            doc.fill('#FFFFFF').fontSize(8).font('Helvetica-Bold');
            let xPos2 = tableStartX;
            headers.forEach((h) => {
              doc.text(h.text, xPos2, currentY + 4, { width: h.w, align: h.align });
              xPos2 += h.w;
            });
            currentY += 18;
            rowY = currentY;
          }
        }

        // Alternating row background
        if (isEven) {
          doc.rect(tableStartX, rowY, totalColWidth, 16).fill('#F9FAFB');
        }

        // Row border
        doc.rect(tableStartX, rowY, totalColWidth, 16).stroke('#E5E7EB');

        xPos = tableStartX;
        doc.fill('#000000');
        doc.text(String(i + 1), xPos, rowY + 3, { width: colWidths.sno, align: 'center' });
        xPos += colWidths.sno;
        doc.text(item.product.name, xPos, rowY + 3, { width: colWidths.desc, align: 'left' });
        xPos += colWidths.desc;
        doc.text(item.product.hsnCode || '-', xPos, rowY + 3, { width: colWidths.hsn, align: 'center' });
        xPos += colWidths.hsn;
        doc.text(String(item.quantity), xPos, rowY + 3, { width: colWidths.qty, align: 'center' });
        xPos += colWidths.qty;
        doc.text(`₹${item.unitPrice.toNumber().toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, xPos, rowY + 3, { width: colWidths.rate, align: 'right' });
        xPos += colWidths.rate;
        doc.text(`₹${item.totalPrice.toNumber().toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, xPos, rowY + 3, { width: colWidths.amount, align: 'right' });

        rowY += 16;
        currentY = rowY;
      }

      // Bottom border of table
      doc.rect(tableStartX, rowY - 16, totalColWidth, 16).stroke('#E5E7EB');

      doc.moveDown(1);
      currentY = doc.y;

      // Check page break before tax summary
      checkPageBreak(150);

      // ── TAX SUMMARY ───────────────────────────────────────
      const summaryX = rightMargin - 200;
      const summaryY = rowY + 10;

      doc.fontSize(9).font('Helvetica');
      doc.text('Taxable Value:', summaryX, summaryY, { width: 100, align: 'left' });
      doc.text(`₹${taxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, summaryX + 100, summaryY, { width: 100, align: 'right' });

      let nextY = summaryY + 14;
      if (cgst > 0) {
        doc.text('CGST (9%):', summaryX, nextY, { width: 100, align: 'left' });
        doc.text(`₹${cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, summaryX + 100, nextY, { width: 100, align: 'right' });
        nextY += 14;
      }
      if (sgst > 0) {
        doc.text('SGST (9%):', summaryX, nextY, { width: 100, align: 'left' });
        doc.text(`₹${sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, summaryX + 100, nextY, { width: 100, align: 'right' });
        nextY += 14;
      }
      if (igst > 0) {
        doc.text('IGST:', summaryX, nextY, { width: 100, align: 'left' });
        doc.text(`₹${igst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, summaryX + 100, nextY, { width: 100, align: 'right' });
        nextY += 14;
      }

      // Divider line
      doc.moveTo(summaryX, nextY).lineTo(rightMargin, nextY).stroke('#E5E7EB');
      nextY += 6;

      // Total row
      doc.rect(summaryX, nextY, 200, 20).fill('#F3F4F6');
      doc.fill('#000000').fontSize(11).font('Helvetica-Bold');
      doc.text('TOTAL:', summaryX + 5, nextY + 4, { width: 95, align: 'left' });
      doc.text(`₹${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, summaryX + 95, nextY + 4, { width: 100, align: 'right' });

      doc.moveDown(3);
      currentY = doc.y;

      // ── AMOUNT IN WORDS ──────────────────────────────────
      const wordsY = nextY + 30;
      doc.fill('#000000').fontSize(9).font('Helvetica-Bold')
        .text('Amount in Words:', leftMargin, wordsY);
      doc.font('Helvetica').fontSize(9)
        .text(amountInWords, leftMargin, wordsY + 14);

      doc.moveDown(2);
      currentY = doc.y;

      // Check page break before bank details
      checkPageBreak(100);

      // ── BANK DETAILS ──────────────────────────────────────
      const bankY = doc.y + 10;
      doc.rect(leftMargin, bankY, pageWidth, 16).fill('#F3F4F6');
      doc.fill('#000000').fontSize(9).font('Helvetica-Bold')
        .text('BANK DETAILS', leftMargin + 5, bankY + 3);

      doc.font('Helvetica').fontSize(8);
      doc.text('Bank Name: XXXXX Bank', leftMargin, bankY + 22);
      doc.text('Account No: XXXXXXXXXXXX', leftMargin + 200, bankY + 22);
      doc.text('IFSC Code: XXXXXXXXXX', leftMargin, bankY + 35);
      doc.text('Branch: XXXXXXX', leftMargin + 200, bankY + 35);

      doc.moveDown(3);
      currentY = doc.y;

      // Check page break before terms & conditions
      checkPageBreak(60);

      // ── TERMS & CONDITIONS ────────────────────────────────
      const termsY = doc.y + 10;
      doc.fontSize(9).font('Helvetica-Bold').text('Terms & Conditions:', leftMargin, termsY);
      doc.fontSize(8).font('Helvetica');
      doc.text('1. Payment due within 30 days from the date of invoice.', leftMargin, termsY + 14);
      doc.text('2. Subject to local jurisdiction.', leftMargin, termsY + 26);

      doc.moveDown(2);

      // ── FOOTER ────────────────────────────────────────────
      const footerY = doc.page.height - 60;
      doc.fontSize(8).font('Helvetica-Oblique').fill('#6B7280')
        .text('This is a computer-generated invoice. No signature required.', leftMargin, footerY, { align: 'center', width: pageWidth });

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
      const pageWidth = doc.page.width - 100;
      const leftMargin = 50;

      // ── HEADER BAR ─────────────────────────────────────────
      doc.rect(leftMargin, 50, pageWidth, 40).fill('#DC2626');
      doc.fill('#FFFFFF').fontSize(20).font('Helvetica-Bold')
        .text('CREDIT NOTE', leftMargin, 58, { align: 'center', width: pageWidth });

      doc.moveDown(2);

      // ── METADATA ──────────────────────────────────────────
      const metaY = doc.y;
      doc.fill('#000000').fontSize(10).font('Helvetica');
      doc.text(`Credit Note #: ${creditNoteNumber}`, leftMargin, metaY);
      doc.text(`Original Invoice #: ${parentInvoice.invoiceNumber}`, leftMargin, metaY + 14);
      doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, leftMargin, metaY + 28);

      doc.moveDown(3);

      // ── CUSTOMER DETAILS ──────────────────────────────────
      const custY = doc.y;
      doc.rect(leftMargin, custY, pageWidth, 16).fill('#F3F4F6');
      doc.fill('#000000').fontSize(10).font('Helvetica-Bold')
        .text('CUSTOMER DETAILS', leftMargin + 5, custY + 3);

      doc.fontSize(9).font('Helvetica');
      doc.text(`Name: ${parentInvoice.billingName}`, leftMargin, custY + 22);
      try {
        const addr = JSON.parse(parentInvoice.billingAddress);
        doc.text(`Address: ${addr.line1 || ''}${addr.city ? ', ' + addr.city : ''}${addr.state ? ', ' + addr.state : ''}`, leftMargin, custY + 36);
      } catch {
        doc.text(`Address: ${parentInvoice.billingAddress}`, leftMargin, custY + 36);
      }

      doc.moveDown(3);

      // ── REFUND DETAILS ────────────────────────────────────
      const refundY = doc.y + 10;
      doc.rect(leftMargin, refundY, pageWidth, 16).fill('#F3F4F6');
      doc.fill('#000000').fontSize(10).font('Helvetica-Bold')
        .text('REFUND DETAILS', leftMargin + 5, refundY + 3);

      doc.fontSize(9).font('Helvetica');
      doc.text(`Refund Amount: ₹${refundAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, leftMargin, refundY + 22);
      doc.text(`Amount in Words: ${amountInWords}`, leftMargin, refundY + 36);
      if (reason) {
        doc.text(`Reason: ${reason}`, leftMargin, refundY + 50);
      }

      doc.moveDown(3);

      // ── FOOTER ────────────────────────────────────────────
      const footerY = doc.page.height - 60;
      doc.fontSize(8).font('Helvetica-Oblique').fill('#6B7280')
        .text('This is a computer-generated credit note. No signature required.',
          leftMargin, footerY, { align: 'center', width: pageWidth });

      doc.end();
    });
  }
}
