import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../../../prisma/prisma.service';
import { StorageService } from '../../../storage/storage.service';
import { AnalyticsService } from '../analytics.service';

@Processor('report-export')
export class ExportProcessor extends WorkerHost {
  private readonly logger = new Logger(ExportProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly analytics: AnalyticsService,
  ) {
    super();
  }

  async process(
    job: Job<{
      reportId: string;
      reportType: string;
      format: 'pdf' | 'xlsx';
      parameters: Record<string, unknown>;
    }>,
  ): Promise<void> {
    const { reportId, reportType, format, parameters } = job.data;
    this.logger.log(`Processing export: ${reportType} (${format})`);

    try {
      const data = await this.analytics.exportData(reportType, format, parameters);

      const key = `exports/${reportType}_${reportId}.${format}`;

      if (format === 'pdf') {
        const buffer = await this.generatePdf(reportType, data);
        await this.storage.upload(key, buffer, 'application/pdf');
      } else {
        const buffer = await this.generateExcel(reportType, data);
        await this.storage.upload(
          key,
          buffer,
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        );
      }

      const fileUrl = this.storage.getPublicUrl(key);

      await this.prisma.reportExport.update({
        where: { id: reportId },
        data: { status: 'COMPLETED', fileUrl, completedAt: new Date() },
      });

      this.logger.log(`Export complete: ${fileUrl}`);
    } catch (error) {
      this.logger.error(`Export failed: ${reportType}`, error);
      await this.prisma.reportExport.update({
        where: { id: reportId },
        data: { status: 'FAILED', errorMessage: (error as Error).message },
      });
    }
  }

  private async generatePdf(reportType: string, data: unknown): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(18).font('Helvetica-Bold').text(`Report: ${reportType}`, { align: 'center' });
      doc.moveDown();
      doc
        .fontSize(10)
        .font('Helvetica')
        .text(JSON.stringify(data, null, 2), { align: 'left' });
      doc.end();
    });
  }

  private async generateExcel(reportType: string, data: unknown): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(reportType);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = Array.isArray(data) ? data : (data as any)?.items || [];
    if (rows.length > 0) {
      const headers = Object.keys(rows[0]);
      sheet.addRow(headers);
      for (const row of rows) {
        sheet.addRow(headers.map((h) => row[h]));
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
