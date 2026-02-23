import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRedis = vi.hoisted(() => ({
  get: vi.fn(),
  setex: vi.fn(),
  del: vi.fn(),
  scan: vi.fn(),
}));

// Set env vars BEFORE the module loads so `hasRedisConfig` is truthy
vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://fake-redis.upstash.io');
vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'fake-token');

vi.mock('@upstash/redis', () => ({
  Redis: {
    fromEnv: vi.fn(() => mockRedis),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
  },
}));

// Import after env and mocks are set
const {
  getCached,
  setCache,
  invalidateCache,
  invalidateAdminCache,
  withCache,
  ADMIN_CACHE_TTL,
  ADMIN_CACHE_KEYS,
} = await import('@/lib/services/admin-cache-service');

describe('admin-cache-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCached', () => {
    it('should retrieve cached data with prefix', async () => {
      const mockData = { stats: { users: 100 } };
      mockRedis.get.mockResolvedValue(mockData);

      const result = await getCached('test-key');

      expect(mockRedis.get).toHaveBeenCalledWith('rowan:admin:test-key');
      expect(result).toEqual(mockData);
    });

    it('should return null on cache miss', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await getCached('missing-key');

      expect(result).toBeNull();
    });

    it('should return null on Redis error', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis error'));

      const result = await getCached('error-key');

      expect(result).toBeNull();
    });
  });

  describe('setCache', () => {
    it('should set cache with TTL', async () => {
      const data = { test: 'value' };
      await setCache('test-key', data, 300);

      expect(mockRedis.setex).toHaveBeenCalledWith('rowan:admin:test-key', 300, data);
    });

    it('should not throw on Redis error', async () => {
      mockRedis.setex.mockRejectedValue(new Error('Redis error'));

      await expect(setCache('test-key', {}, 300)).resolves.toBeUndefined();
    });
  });

  describe('invalidateCache', () => {
    it('should delete cache key', async () => {
      await invalidateCache('test-key');

      expect(mockRedis.del).toHaveBeenCalledWith('rowan:admin:test-key');
    });

    it('should not throw on Redis error', async () => {
      mockRedis.del.mockRejectedValue(new Error('Redis error'));

      await expect(invalidateCache('test-key')).resolves.toBeUndefined();
    });
  });

  describe('invalidateAdminCache', () => {
    it('should invalidate all admin cache keys', async () => {
      mockRedis.scan
        .mockResolvedValueOnce([10, ['rowan:admin:key1', 'rowan:admin:key2']])
        .mockResolvedValueOnce([0, ['rowan:admin:key3']]);

      await invalidateAdminCache();

      expect(mockRedis.scan).toHaveBeenCalledWith(0, { match: 'rowan:admin:*', count: 100 });
      expect(mockRedis.del).toHaveBeenCalledWith('rowan:admin:key1', 'rowan:admin:key2', 'rowan:admin:key3');
    });

    it('should handle empty cache', async () => {
      mockRedis.scan.mockResolvedValue([0, []]);

      await invalidateAdminCache();

      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('should not throw on Redis error', async () => {
      mockRedis.scan.mockRejectedValue(new Error('Redis error'));

      await expect(invalidateAdminCache()).resolves.toBeUndefined();
    });
  });

  describe('withCache', () => {
    it('should return cached value if available', async () => {
      const cachedData = { result: 'cached' };
      mockRedis.get.mockResolvedValue(cachedData);

      const fn = vi.fn();
      const result = await withCache('test-key', fn, { ttl: 60 });

      expect(result).toEqual(cachedData);
      expect(fn).not.toHaveBeenCalled();
    });

    it('should execute function and cache result on cache miss', async () => {
      const freshData = { result: 'fresh' };
      mockRedis.get.mockResolvedValue(null);

      const fn = vi.fn().mockResolvedValue(freshData);
      const result = await withCache('test-key', fn, { ttl: 60 });

      expect(fn).toHaveBeenCalled();
      expect(mockRedis.setex).toHaveBeenCalledWith('rowan:admin:test-key', 60, freshData);
      expect(result).toEqual(freshData);
    });

    it('should skip cache if skipCache option is true', async () => {
      const freshData = { result: 'fresh' };
      const fn = vi.fn().mockResolvedValue(freshData);

      const result = await withCache('test-key', fn, { skipCache: true });

      expect(mockRedis.get).not.toHaveBeenCalled();
      expect(fn).toHaveBeenCalled();
      expect(result).toEqual(freshData);
    });

    it('should use default TTL of 60 seconds', async () => {
      mockRedis.get.mockResolvedValue(null);
      const fn = vi.fn().mockResolvedValue({ test: 'data' });

      await withCache('test-key', fn);

      expect(mockRedis.setex).toHaveBeenCalledWith(expect.any(String), 60, expect.any(Object));
    });
  });

  describe('ADMIN_CACHE_TTL constants', () => {
    it('should have correct TTL values', () => {
      expect(ADMIN_CACHE_TTL.dashboardStats).toBe(300);
      expect(ADMIN_CACHE_TTL.usersList).toBe(600);
      expect(ADMIN_CACHE_TTL.analytics).toBe(900);
      expect(ADMIN_CACHE_TTL.auditTrail).toBe(120);
    });
  });

  describe('ADMIN_CACHE_KEYS', () => {
    it('should generate correct cache keys', () => {
      expect(ADMIN_CACHE_KEYS.dashboardStats).toBe('dashboard:stats');
      expect(ADMIN_CACHE_KEYS.usersList(1, 20)).toBe('users:list:1:20');
      expect(ADMIN_CACHE_KEYS.betaRequests(2, 'approved')).toBe('beta:requests:2:approved');
      expect(ADMIN_CACHE_KEYS.betaRequests(1, null)).toBe('beta:requests:1:all');
      expect(ADMIN_CACHE_KEYS.analytics('7d')).toBe('analytics:7d');
    });
  });
});
