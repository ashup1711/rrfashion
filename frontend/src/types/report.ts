export interface ReportExport {
  id: string;
  reportType: string;
  format: 'PDF' | 'XLSX';
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  fileUrl?: string;
  parameters?: Record<string, unknown>;
  errorMessage?: string;
  requestedById?: string;
  requestedBy?: {
    id: string;
    name: string;
    email: string;
  };
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExportRequest {
  reportType: string;
  format: 'PDF' | 'XLSX';
  parameters?: Record<string, unknown>;
}
