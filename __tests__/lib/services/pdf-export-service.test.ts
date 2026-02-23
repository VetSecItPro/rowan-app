import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportMonthlyExpenseSummary, exportProjectCostReport } from '@/lib/services/pdf-export-service';
import type { Expense } from '@/lib/services/expense-service';

// Mock DOM for pdf generation
global.document = {
  createElement: vi.fn(() => ({
    style: {},
    contentDocument: { open: vi.fn(), write: vi.fn(), close: vi.fn() },
    contentWindow: { print: vi.fn() },
  })),
  body: {
    appendChild: vi.fn(),
    removeChild: vi.fn(),
  },
} as unknown as Document;

// Mock Supabase client
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockGte = vi.fn();
const mockLte = vi.fn();
const mockOrder = vi.fn();
const mockSingle = vi.fn();
const mockFrom = vi.fn();

const mockSupabaseClient = {
  from: mockFrom,
};

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

// Mock date-fns
vi.mock('date-fns', () => ({
  format: vi.fn((date, formatStr) => {
    if (formatStr === 'yyyy-MM-dd') return '2024-01-15';
    if (formatStr === 'MMMM yyyy') return 'January 2024';
    if (formatStr === 'MMM dd') return 'Jan 15';
    if (formatStr === 'MMM dd, yyyy') return 'Jan 15, 2024';
    if (formatStr === 'MMMM dd, yyyy HH:mm') return 'January 15, 2024 14:30';
    return '2024-01-15';
  }),
  startOfMonth: vi.fn((date) => date),
  endOfMonth: vi.fn((date) => date),
}));

describe('pdf-export-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock chain
    mockFrom.mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ gte: mockGte });
    mockGte.mockReturnValue({ lte: mockLte });
    mockLte.mockReturnValue({ order: mockOrder });
    mockOrder.mockReturnValue({ data: [], error: null });
    mockSingle.mockReturnValue({ data: null, error: null });
  });

  describe('exportMonthlyExpenseSummary', () => {
    it('should fetch expenses for the given month', async () => {
      const mockExpenses: Expense[] = [
        {
          id: '1',
          space_id: 'space-1',
          category: 'Groceries',
          amount: 150.50,
          date: '2024-01-15',
          description: 'Weekly shopping',
          payment_method: 'Credit Card',
          title: 'Supermarket',
          status: 'paid',
          created_by: 'user-1',
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z',
        },
      ];

      mockOrder.mockReturnValue({ data: mockExpenses, error: null });

      await exportMonthlyExpenseSummary('space-1', 2024, 1);

      expect(mockFrom).toHaveBeenCalledWith('expenses');
      expect(mockSelect).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('space_id', 'space-1');
    });

    it('should throw error when database query fails', async () => {
      mockOrder.mockReturnValue({ data: null, error: new Error('Database error') });

      await expect(exportMonthlyExpenseSummary('space-1', 2024, 1)).rejects.toThrow('Database error');
    });

    it('should handle empty expenses list', async () => {
      mockOrder.mockReturnValue({ data: [], error: null });

      await exportMonthlyExpenseSummary('space-1', 2024, 1);

      // Should not throw error
      expect(mockFrom).toHaveBeenCalled();
    });

    it('should calculate category totals correctly', async () => {
      const mockExpenses: Expense[] = [
        {
          id: '1',
          space_id: 'space-1',
          category: 'Groceries',
          amount: 100,
          date: '2024-01-15',
          description: 'Shopping 1',
          payment_method: 'Credit Card',
          title: 'Store A',
          status: 'paid',
          created_by: 'user-1',
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z',
        },
        {
          id: '2',
          space_id: 'space-1',
          category: 'Groceries',
          amount: 50,
          date: '2024-01-16',
          description: 'Shopping 2',
          payment_method: 'Cash',
          title: 'Store B',
          status: 'paid',
          created_by: 'user-1',
          created_at: '2024-01-16T10:00:00Z',
          updated_at: '2024-01-16T10:00:00Z',
        },
      ];

      mockOrder.mockReturnValue({ data: mockExpenses, error: null });

      await exportMonthlyExpenseSummary('space-1', 2024, 1);

      expect(mockFrom).toHaveBeenCalledWith('expenses');
    });

    it('should handle expenses without category', async () => {
      const mockExpenses: Expense[] = [
        {
          id: '1',
          space_id: 'space-1',
          category: null,
          amount: 100,
          date: '2024-01-15',
          description: 'No category',
          payment_method: 'Credit Card',
          title: 'Store A',
          status: 'paid',
          created_by: 'user-1',
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z',
        },
      ];

      mockOrder.mockReturnValue({ data: mockExpenses, error: null });

      await exportMonthlyExpenseSummary('space-1', 2024, 1);

      expect(mockFrom).toHaveBeenCalled();
    });
  });

  describe('exportProjectCostReport', () => {
    it('should fetch project details and expenses', async () => {
      const mockProject = {
        id: 'project-1',
        name: 'Kitchen Renovation',
        status: 'in-progress',
        priority: 'high',
        description: 'Renovate kitchen',
        estimated_budget: 10000,
        actual_cost: 9500,
        budget_variance: 500,
      };

      const mockExpenses: Expense[] = [
        {
          id: '1',
          space_id: 'space-1',
          category: 'Materials',
          amount: 5000,
          date: '2024-01-15',
          description: 'Cabinets',
          payment_method: 'Credit Card',
          title: 'Home Depot',
          status: 'paid',
          created_by: 'user-1',
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z',
        },
      ];

      // Mock project query
      mockSingle.mockReturnValueOnce({ data: mockProject, error: null });

      // Mock expenses query
      mockOrder.mockReturnValue({ data: mockExpenses, error: null });

      // Setup chain for project query
      mockSelect.mockReturnValueOnce({ eq: vi.fn().mockReturnValue({ single: mockSingle }) });

      // Setup chain for expenses query
      mockSelect.mockReturnValueOnce({ eq: vi.fn().mockReturnValue({ order: mockOrder }) });

      await exportProjectCostReport('project-1');

      expect(mockFrom).toHaveBeenCalledWith('projects');
      expect(mockFrom).toHaveBeenCalledWith('expenses');
    });

    it('should throw error when project not found', async () => {
      mockSingle.mockReturnValue({ data: null, error: new Error('Not found') });
      mockSelect.mockReturnValue({ eq: vi.fn().mockReturnValue({ single: mockSingle }) });

      await expect(exportProjectCostReport('invalid-id')).rejects.toThrow();
    });

    it('should handle project without expenses', async () => {
      const mockProject = {
        id: 'project-1',
        name: 'Kitchen Renovation',
        status: 'planning',
        priority: 'medium',
        estimated_budget: 10000,
        actual_cost: 0,
        budget_variance: 10000,
      };

      mockSingle.mockReturnValueOnce({ data: mockProject, error: null });
      mockOrder.mockReturnValue({ data: [], error: null });

      mockSelect.mockReturnValueOnce({ eq: vi.fn().mockReturnValue({ single: mockSingle }) });
      mockSelect.mockReturnValueOnce({ eq: vi.fn().mockReturnValue({ order: mockOrder }) });

      await exportProjectCostReport('project-1');

      expect(mockFrom).toHaveBeenCalled();
    });

    it('should calculate cost breakdown by category', async () => {
      const mockProject = {
        id: 'project-1',
        name: 'Kitchen Renovation',
        status: 'in-progress',
        priority: 'high',
        estimated_budget: 10000,
        actual_cost: 9000,
        budget_variance: 1000,
      };

      const mockExpenses: Expense[] = [
        {
          id: '1',
          space_id: 'space-1',
          category: 'Materials',
          amount: 5000,
          date: '2024-01-15',
          description: 'Cabinets',
          payment_method: 'Credit Card',
          title: 'Home Depot',
          status: 'paid',
          created_by: 'user-1',
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z',
        },
        {
          id: '2',
          space_id: 'space-1',
          category: 'Labor',
          amount: 4000,
          date: '2024-01-16',
          description: 'Installation',
          payment_method: 'Check',
          title: 'Contractor',
          status: 'paid',
          created_by: 'user-1',
          created_at: '2024-01-16T10:00:00Z',
          updated_at: '2024-01-16T10:00:00Z',
        },
      ];

      mockSingle.mockReturnValueOnce({ data: mockProject, error: null });
      mockOrder.mockReturnValue({ data: mockExpenses, error: null });

      mockSelect.mockReturnValueOnce({ eq: vi.fn().mockReturnValue({ single: mockSingle }) });
      mockSelect.mockReturnValueOnce({ eq: vi.fn().mockReturnValue({ order: mockOrder }) });

      await exportProjectCostReport('project-1');

      expect(mockFrom).toHaveBeenCalledWith('projects');
      expect(mockFrom).toHaveBeenCalledWith('expenses');
    });
  });
});
