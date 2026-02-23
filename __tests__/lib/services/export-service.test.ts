import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  expensesToCSV,
  downloadCSV,
  exportExpenses,
  exportYearlyExpenses,
  exportMonthlyExpenses,
  projectToCSV,
  exportProjectCosts,
  exportCategoryBreakdown,
} from '@/lib/services/export-service';
import type { Expense } from '@/lib/services/expense-service';
import type { Project } from '@/lib/services/project-tracking-service';

// Mock Supabase client
const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

// Mock DOM APIs for download testing
const mockCreateElement = vi.fn();
const mockCreateObjectURL = vi.fn();
const mockRevokeObjectURL = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();

  // Setup DOM mocks
  global.document = {
    createElement: mockCreateElement,
    body: {
      appendChild: vi.fn(),
      removeChild: vi.fn(),
    },
  } as unknown as Document;

  global.URL = {
    createObjectURL: mockCreateObjectURL,
    revokeObjectURL: mockRevokeObjectURL,
  } as unknown as typeof URL;

  global.Blob = vi.fn() as unknown as typeof Blob;
});

describe('export-service', () => {
  describe('expensesToCSV', () => {
    it('should convert expenses to CSV format', () => {
      const expenses: Expense[] = [
        {
          id: '1',
          space_id: 'space-1',
          title: 'Test Expense',
          amount: 100.50,
          category: 'Groceries',
          date: '2024-01-15',
          description: 'Grocery shopping',
          notes: 'Weekly shopping',
          payment_method: 'Credit Card',
          paid_by: 'user-1',
          split_type: 'equal',
          is_recurring: true,
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z',
        },
      ];

      const csv = expensesToCSV(expenses);

      expect(csv).toContain('Date,Description,Category,Amount');
      expect(csv).toContain('2024-01-15');
      expect(csv).toContain('"Grocery shopping"');
      expect(csv).toContain('Groceries');
      expect(csv).toContain('100.50');
      expect(csv).toContain('Credit Card');
      expect(csv).toContain('Yes'); // is_recurring
    });

    it('should escape quotes in descriptions', () => {
      const expenses: Expense[] = [
        {
          id: '1',
          space_id: 'space-1',
          title: 'Test',
          amount: 50,
          category: 'Food',
          date: '2024-01-15',
          description: 'Dinner at "Joe\'s" place',
          notes: null,
          payment_method: null,
          paid_by: null,
          split_type: null,
          is_recurring: false,
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z',
        },
      ];

      const csv = expensesToCSV(expenses);

      expect(csv).toContain('""Joe\'s""'); // Escaped quotes
    });

    it('should handle empty expenses array', () => {
      const csv = expensesToCSV([]);

      expect(csv).toContain('Date,Description,Category,Amount');
      expect(csv.split('\n')).toHaveLength(1); // Only header
    });
  });

  describe('downloadCSV', () => {
    it('should trigger CSV download', () => {
      const mockLink = {
        setAttribute: vi.fn(),
        click: vi.fn(),
        style: {},
      };
      mockCreateElement.mockReturnValue(mockLink);
      mockCreateObjectURL.mockReturnValue('blob:url');

      downloadCSV('test,csv\n1,2', 'test.csv');

      expect(global.Blob).toHaveBeenCalledWith(['test,csv\n1,2'], {
        type: 'text/csv;charset=utf-8;',
      });
      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockLink.setAttribute).toHaveBeenCalledWith('href', 'blob:url');
      expect(mockLink.setAttribute).toHaveBeenCalledWith('download', 'test.csv');
      expect(mockLink.click).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:url');
    });
  });

  describe('exportExpenses', () => {
    it('should export expenses for date range', async () => {
      const mockExpenses = [
        {
          id: '1',
          space_id: 'space-1',
          title: 'Test',
          amount: 100,
          category: 'Food',
          date: '2024-01-15',
          description: 'Test expense',
          notes: null,
          payment_method: 'Cash',
          paid_by: 'user-1',
          split_type: 'equal',
          is_recurring: false,
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z',
        },
      ];

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockExpenses, error: null }),
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery),
      });

      const mockLink = { setAttribute: vi.fn(), click: vi.fn(), style: {} };
      mockCreateElement.mockReturnValue(mockLink);

      await exportExpenses('space-1', '2024-01-01', '2024-01-31');

      expect(mockSupabase.from).toHaveBeenCalledWith('expenses');
      expect(mockQuery.eq).toHaveBeenCalledWith('space_id', 'space-1');
      expect(mockQuery.gte).toHaveBeenCalledWith('date', '2024-01-01');
      expect(mockQuery.lte).toHaveBeenCalledWith('date', '2024-01-31');
      expect(mockLink.setAttribute).toHaveBeenCalledWith(
        'download',
        'expenses_2024-01-01_to_2024-01-31.csv'
      );
    });

    it('should throw error if query fails', async () => {
      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB Error' } }),
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery),
      });

      await expect(exportExpenses('space-1', '2024-01-01', '2024-01-31')).rejects.toThrow();
    });
  });

  describe('exportYearlyExpenses', () => {
    it('should export expenses for entire year', async () => {
      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery),
      });

      const mockLink = { setAttribute: vi.fn(), click: vi.fn(), style: {} };
      mockCreateElement.mockReturnValue(mockLink);

      await exportYearlyExpenses('space-1', 2024);

      expect(mockQuery.gte).toHaveBeenCalledWith('date', '2024-01-01');
      expect(mockQuery.lte).toHaveBeenCalledWith('date', '2024-12-31');
    });
  });

  describe('exportMonthlyExpenses', () => {
    it('should export expenses for month', async () => {
      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery),
      });

      const mockLink = { setAttribute: vi.fn(), click: vi.fn(), style: {} };
      mockCreateElement.mockReturnValue(mockLink);

      await exportMonthlyExpenses('space-1', 2024, 2);

      expect(mockQuery.gte).toHaveBeenCalledWith('date', '2024-02-01');
      expect(mockQuery.lte).toHaveBeenCalledWith('date', '2024-02-29'); // Leap year
    });

    it('should handle non-leap year February', async () => {
      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery),
      });

      const mockLink = { setAttribute: vi.fn(), click: vi.fn(), style: {} };
      mockCreateElement.mockReturnValue(mockLink);

      await exportMonthlyExpenses('space-1', 2023, 2);

      expect(mockQuery.lte).toHaveBeenCalledWith('date', '2023-02-28');
    });
  });

  describe('projectToCSV', () => {
    it('should convert project data to CSV', () => {
      const project: Project = {
        id: 'proj-1',
        space_id: 'space-1',
        name: 'Kitchen Renovation',
        description: 'Renovate kitchen',
        status: 'in-progress',
        priority: 'high',
        start_date: '2024-01-01',
        estimated_completion_date: '2024-06-01',
        actual_completion_date: null,
        estimated_budget: 50000,
        actual_cost: 45000,
        budget_variance: 5000,
        variance_percentage: 10,
        location: 'Kitchen',
        tags: ['renovation'],
        created_by: 'user-1',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const expenses: Expense[] = [
        {
          id: '1',
          space_id: 'space-1',
          title: 'Materials',
          amount: 10000,
          category: 'Materials',
          date: '2024-01-15',
          description: 'Cabinets and countertops',
          notes: null,
          payment_method: 'Check',
          paid_by: null,
          split_type: null,
          is_recurring: false,
          project_id: 'proj-1',
          created_at: '2024-01-15T00:00:00Z',
          updated_at: '2024-01-15T00:00:00Z',
        },
      ];

      const csv = projectToCSV(project, expenses);

      expect(csv).toContain('Project Name,Kitchen Renovation');
      expect(csv).toContain('Status,in-progress');
      expect(csv).toContain('Estimated Budget,$50,000');
      expect(csv).toContain('Actual Cost,$45,000');
      expect(csv).toContain('Cabinets and countertops');
      expect(csv).toContain('Total Expenses');
    });
  });

  describe('exportProjectCosts', () => {
    it('should export project cost report', async () => {
      const mockProject = {
        id: 'proj-1',
        space_id: 'space-1',
        name: 'Test Project',
        description: null,
        status: 'active',
        priority: 'medium',
        start_date: '2024-01-01',
        estimated_completion_date: null,
        actual_completion_date: null,
        estimated_budget: 10000,
        actual_cost: 5000,
        budget_variance: 5000,
        variance_percentage: 50,
        location: null,
        tags: null,
        created_by: 'user-1',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const mockExpenses: Expense[] = [];

      const mockProjectQuery = {
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockProject, error: null }),
      };

      const mockExpenseQuery = {
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockExpenses, error: null }),
      };

      mockSupabase.from
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue(mockProjectQuery),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue(mockExpenseQuery),
        });

      const mockLink = { setAttribute: vi.fn(), click: vi.fn(), style: {} };
      mockCreateElement.mockReturnValue(mockLink);

      await exportProjectCosts('proj-1');

      expect(mockSupabase.from).toHaveBeenCalledWith('projects');
      expect(mockSupabase.from).toHaveBeenCalledWith('expenses');
      expect(mockLink.setAttribute).toHaveBeenCalledWith(
        'download',
        'project_Test_Project_costs.csv'
      );
    });
  });

  describe('exportCategoryBreakdown', () => {
    it('should export expenses grouped by category', async () => {
      const mockExpenses = [
        {
          id: '1',
          space_id: 'space-1',
          title: 'Test 1',
          amount: 100,
          category: 'Food',
          date: '2024-01-15',
          description: 'Food expense',
          notes: null,
          payment_method: 'Cash',
          paid_by: null,
          split_type: null,
          is_recurring: false,
          created_at: '2024-01-15T00:00:00Z',
          updated_at: '2024-01-15T00:00:00Z',
        },
        {
          id: '2',
          space_id: 'space-1',
          title: 'Test 2',
          amount: 50,
          category: 'Food',
          date: '2024-01-16',
          description: 'Another food expense',
          notes: null,
          payment_method: 'Card',
          paid_by: null,
          split_type: null,
          is_recurring: false,
          created_at: '2024-01-16T00:00:00Z',
          updated_at: '2024-01-16T00:00:00Z',
        },
        {
          id: '3',
          space_id: 'space-1',
          title: 'Test 3',
          amount: 200,
          category: 'Transport',
          date: '2024-01-17',
          description: 'Gas',
          notes: null,
          payment_method: 'Cash',
          paid_by: null,
          split_type: null,
          is_recurring: false,
          created_at: '2024-01-17T00:00:00Z',
          updated_at: '2024-01-17T00:00:00Z',
        },
      ];

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockExpenses, error: null }),
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery),
      });

      const mockLink = { setAttribute: vi.fn(), click: vi.fn(), style: {} };
      mockCreateElement.mockReturnValue(mockLink);

      await exportCategoryBreakdown('space-1', '2024-01-01', '2024-01-31');

      expect(mockSupabase.from).toHaveBeenCalledWith('expenses');
      expect(mockLink.click).toHaveBeenCalled();
    });

    it('should handle uncategorized expenses', async () => {
      const mockExpenses = [
        {
          id: '1',
          space_id: 'space-1',
          title: 'Test',
          amount: 100,
          category: null,
          date: '2024-01-15',
          description: 'Uncategorized',
          notes: null,
          payment_method: null,
          paid_by: null,
          split_type: null,
          is_recurring: false,
          created_at: '2024-01-15T00:00:00Z',
          updated_at: '2024-01-15T00:00:00Z',
        },
      ];

      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockExpenses, error: null }),
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery),
      });

      const mockLink = { setAttribute: vi.fn(), click: vi.fn(), style: {} };
      mockCreateElement.mockReturnValue(mockLink);

      await exportCategoryBreakdown('space-1', '2024-01-01', '2024-01-31');

      expect(mockLink.click).toHaveBeenCalled();
    });
  });
});
