import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { InvoicesService } from './invoices.service';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../storage/storage.service';

describe('InvoicesService', () => {
  let service: InvoicesService;

  const mockPrisma = {} as any;
  const mockStorageService = {
    upload: jest.fn(),
    getPublicUrl: jest.fn().mockReturnValue('https://example.com/invoice.pdf'),
  };
  const mockConfigService = {
    get: jest.fn().mockReturnValue(null),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: StorageService, useValue: mockStorageService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();
    service = module.get<InvoicesService>(InvoicesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
