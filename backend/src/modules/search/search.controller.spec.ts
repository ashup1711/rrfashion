import { Test, TestingModule } from '@nestjs/testing';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

describe('SearchController', () => {
  let controller: SearchController;
  let service: SearchService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SearchController],
      providers: [
        {
          provide: SearchService,
          useValue: {
            search: jest.fn().mockResolvedValue({
              items: [],
              total: 0,
              page: 1,
              limit: 20,
              query: 'test',
            }),
            getAnalytics: jest.fn().mockResolvedValue({
              totalSearches: 0,
              uniqueQueries: 0,
              zeroResultSearches: 0,
              zeroResultRate: 0,
              topQueries: [],
              zeroResultQueries: [],
              from: null,
              to: null,
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<SearchController>(SearchController);
    service = module.get<SearchService>(SearchService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('search', () => {
    it('should return search results', async () => {
      const result = await controller.search({
        q: 'silk',
        page: 1,
        limit: 20,
      });

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.query).toBe('silk');
      expect(service.search).toHaveBeenCalledWith({
        q: 'silk',
        page: 1,
        limit: 20,
      });
    });
  });

  describe('getAnalytics', () => {
    it('should return analytics data', async () => {
      const result = await controller.getAnalytics({});

      expect(result.totalSearches).toBe(0);
      expect(service.getAnalytics).toHaveBeenCalled();
    });
  });
});
