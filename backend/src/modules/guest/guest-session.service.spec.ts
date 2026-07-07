import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GuestSessionService } from './guest-session.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('GuestSessionService', () => {
  let service: GuestSessionService;
  let prisma: PrismaService;

  const mockPrisma = {
    guestSession: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string, defaultValue?: unknown) => {
      if (key === 'GUEST_SESSION_TTL_DAYS') return 30;
      return defaultValue;
    }),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GuestSessionService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();
    service = module.get<GuestSessionService>(GuestSessionService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  beforeEach(() => {
    jest.resetAllMocks();
    mockConfigService.get.mockImplementation((key: string, defaultValue?: unknown) => {
      if (key === 'GUEST_SESSION_TTL_DAYS') return 30;
      return defaultValue;
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have prisma service injected', () => {
    expect(prisma).toBeDefined();
  });

  describe('create', () => {
    it('should create a new session with 30 day expiry', async () => {
      mockPrisma.guestSession.create.mockResolvedValue({
        id: 'session-1',
        expiresAt: new Date(),
        lastActivityAt: new Date(),
        createdAt: new Date(),
      });

      const result = await service.create();

      expect(result.guestSessionId).toBeDefined();
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
      expect(mockPrisma.guestSession.create).toHaveBeenCalledWith({
        data: {
          id: expect.any(String),
          expiresAt: expect.any(Date),
          lastActivityAt: expect.any(Date),
        },
      });
    });
  });

  describe('validate', () => {
    it('should return ok=true when session exists and not expired', async () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 60);
      mockPrisma.guestSession.findUnique.mockResolvedValue({
        id: 'session-1',
        expiresAt: futureDate,
        lastActivityAt: new Date(),
        createdAt: new Date(),
      });

      const result = await service.validate('session-1');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.session.id).toBe('session-1');
      }
    });

    it('should return ok=false with not_found when session does not exist', async () => {
      mockPrisma.guestSession.findUnique.mockResolvedValue(null);

      const result = await service.validate('missing');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('not_found');
      }
    });

    it('should return ok=false with expired when session is past expiry', async () => {
      const pastDate = new Date(Date.now() - 1000 * 60);
      mockPrisma.guestSession.findUnique.mockResolvedValue({
        id: 'session-1',
        expiresAt: pastDate,
        lastActivityAt: new Date(),
        createdAt: new Date(),
      });

      const result = await service.validate('session-1');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('expired');
      }
    });
  });

  describe('touch', () => {
    it('should update lastActivityAt and expiresAt', async () => {
      mockPrisma.guestSession.update.mockResolvedValue({});

      await service.touch('session-1');

      expect(mockPrisma.guestSession.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: {
          lastActivityAt: expect.any(Date),
          expiresAt: expect.any(Date),
        },
      });
    });
  });

  describe('getOrCreate', () => {
    it('should return existing session when id is valid', async () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 60);
      mockPrisma.guestSession.findUnique.mockResolvedValue({
        id: 'session-1',
        expiresAt: futureDate,
        lastActivityAt: new Date(),
        createdAt: new Date(),
      });
      mockPrisma.guestSession.update.mockResolvedValue({});

      const result = await service.getOrCreate('session-1');

      expect(result.created).toBe(false);
      expect(result.guestSessionId).toBe('session-1');
      expect(mockPrisma.guestSession.update).toHaveBeenCalled();
    });

    it('should create new session when id is invalid', async () => {
      mockPrisma.guestSession.findUnique.mockResolvedValue(null);
      mockPrisma.guestSession.create.mockResolvedValue({
        id: 'new-session',
        expiresAt: new Date(),
        lastActivityAt: new Date(),
        createdAt: new Date(),
      });

      const result = await service.getOrCreate('missing');

      expect(result.created).toBe(true);
      expect(result.guestSessionId).toBeDefined();
    });

    it('should create new session when no id is provided', async () => {
      mockPrisma.guestSession.create.mockResolvedValue({
        id: 'new-session',
        expiresAt: new Date(),
        lastActivityAt: new Date(),
        createdAt: new Date(),
      });

      const result = await service.getOrCreate();

      expect(result.created).toBe(true);
      expect(mockPrisma.guestSession.create).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete the session by id', async () => {
      mockPrisma.guestSession.delete.mockResolvedValue({});

      await service.delete('session-1');

      expect(mockPrisma.guestSession.delete).toHaveBeenCalledWith({
        where: { id: 'session-1' },
      });
    });
  });

  describe('cleanupExpired', () => {
    it('should return 0/0/0 when no expired sessions exist', async () => {
      mockPrisma.guestSession.findMany.mockResolvedValue([]);

      const result = await service.cleanupExpired(new Date());

      expect(result).toEqual({ sessions: 0, cartItems: 0, wishlistItems: 0 });
      expect(mockPrisma.guestSession.deleteMany).not.toHaveBeenCalled();
    });

    it('should delete expired sessions and report item counts', async () => {
      const now = new Date();
      mockPrisma.guestSession.findMany.mockResolvedValue([
        {
          id: 'session-1',
          expiresAt: new Date(now.getTime() - 1000),
          lastActivityAt: now,
          createdAt: now,
          _count: { cartItems: 2, wishlistItems: 3 },
        },
        {
          id: 'session-2',
          expiresAt: new Date(now.getTime() - 1000),
          lastActivityAt: now,
          createdAt: now,
          _count: { cartItems: 1, wishlistItems: 0 },
        },
      ]);
      mockPrisma.guestSession.deleteMany.mockResolvedValue({ count: 2 });

      const result = await service.cleanupExpired(now);

      expect(result.sessions).toBe(2);
      expect(result.cartItems).toBe(3);
      expect(result.wishlistItems).toBe(3);
      expect(mockPrisma.guestSession.deleteMany).toHaveBeenCalledWith({
        where: { expiresAt: { lt: now } },
      });
    });
  });
});
