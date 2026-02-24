'use client';

// Force dynamic rendering to prevent useContext errors during static generation
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { CollapsibleStatsGrid } from '@/components/ui/CollapsibleStatsGrid';
import { FeatureGateWrapper } from '@/components/subscription/FeatureGateWrapper';
import { useFeatureGate } from '@/lib/hooks/useFeatureGate';
import { useAuthWithSpaces } from '@/lib/hooks/useAuthWithSpaces';
import { projectsService, type Expense } from '@/lib/services/budgets-service';
import { getReceipts } from '@/lib/services/receipts-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Receipt,
  FileText,
  TrendingUp,
  DollarSign,
  Calendar,
  PlusCircle,
  Scan
} from 'lucide-react';
import { Tooltip } from '@/components/ui/Tooltip';
import { ReceiptScanner } from '@/components/expenses/ReceiptScanner';
import { ReceiptLibrary } from '@/components/expenses/ReceiptLibrary';
import { ExtractedReceiptData, ExpenseSuggestion } from '@/lib/services/receipt-scanning-service';

interface ExpenseSummary {
  total: number;
  thisMonth: number;
  lastMonth: number;
  changePercent: number;
  categories: Record<string, number>;
  receiptCount: number;
}

export default function ExpensesPage() {
  // SECURITY: Check feature access FIRST
  const { hasAccess: _hasAccess, isLoading: _gateLoading } = useFeatureGate('household');
  const { currentSpace } = useAuthWithSpaces();
  const spaceId = currentSpace?.id;

  const [activeTab, setActiveTab] = useState('scanner');
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [recentExpensesList, setRecentExpensesList] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadExpenseData() {
      if (!spaceId) return;

      try {
        setLoading(true);

        const [expenses, receipts] = await Promise.all([
          projectsService.getExpenses(spaceId),
          getReceipts(spaceId).catch(() => []),
        ]);

        // Compute summary from real data
        const now = new Date();
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

        let total = 0;
        let thisMonth = 0;
        let lastMonth = 0;
        const categories: Record<string, number> = {};

        for (const expense of expenses) {
          total += expense.amount;
          const expenseDate = expense.due_date ? new Date(expense.due_date) : new Date(expense.created_at);

          if (expenseDate >= thisMonthStart) {
            thisMonth += expense.amount;
            if (expense.category) {
              categories[expense.category] = (categories[expense.category] || 0) + expense.amount;
            }
          } else if (expenseDate >= lastMonthStart && expenseDate < thisMonthStart) {
            lastMonth += expense.amount;
          }
        }

        const changePercent = lastMonth > 0
          ? ((thisMonth - lastMonth) / lastMonth) * 100
          : 0;

        // This month's receipts
        const monthlyReceipts = receipts.filter((r) => {
          const rDate = new Date(r.created_at);
          return rDate >= thisMonthStart;
        });

        setSummary({
          total,
          thisMonth,
          lastMonth,
          changePercent,
          categories,
          receiptCount: monthlyReceipts.length,
        });

        // Recent expenses (latest 4)
        const sorted = [...expenses].sort((a, b) => {
          const dateA = a.due_date || a.created_at;
          const dateB = b.due_date || b.created_at;
          return new Date(dateB).getTime() - new Date(dateA).getTime();
        });
        setRecentExpensesList(sorted.slice(0, 4));
      } catch (err) {
        logger.error('Failed to load expense data:', err, { component: 'page', action: 'execution' });
      } finally {
        setLoading(false);
      }
    }

    loadExpenseData();
  }, [spaceId]);

  const handleExpenseCreated = (expenseData: ExpenseSuggestion) => {
    logger.info('Expense created:', { component: 'page', data: expenseData });
  };

  const handleReceiptProcessed = (receiptId: string, extractedData: ExtractedReceiptData) => {
    logger.info('Receipt processed:', { component: 'page', data: receiptId, extractedData });
  };

  const handleCreateExpenseFromReceipt = (extractedData: ExtractedReceiptData) => {
    logger.info('Creating expense from receipt data:', { component: 'page', data: extractedData });
    setActiveTab('scanner');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-red-600';
    if (change < 0) return 'text-green-600';
    return 'text-gray-600';
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return '↗';
    if (change < 0) return '↘';
    return '→';
  };

  const hasData = summary && summary.total > 0;

  return (
    <FeatureGateWrapper
      feature="household"
      title="Expense Tracking"
      description="Track your household expenses, scan receipts with AI, and manage your family budget. Upgrade to Pro to unlock this feature."
    >
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Expenses</h1>
          <p className="text-muted-foreground">
            Track your spending and scan receipts automatically
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Manual Expense
          </Button>
          <Button onClick={() => setActiveTab('scanner')}>
            <Scan className="h-4 w-4 mr-2" />
            Scan Receipt
          </Button>
        </div>
      </div>

      {/* Expense Summary Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
          <span className="ml-3 text-gray-400">Loading expenses...</span>
        </div>
      ) : (
        <CollapsibleStatsGrid
          icon={DollarSign}
          title="Expense Stats"
          summary={`${formatCurrency(summary?.thisMonth ?? 0)} this month${summary && summary.receiptCount > 0 ? ` • ${summary.receiptCount} receipts` : ''}`}
          iconGradient="bg-gradient-to-br from-amber-500 to-amber-600"
          gridClassName="grid stats-grid-mobile gap-4"
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary?.total ?? 0)}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary?.thisMonth ?? 0)}</div>
              {summary && summary.lastMonth > 0 ? (
                <p className={`text-xs flex items-center ${getChangeColor(summary.changePercent)}`}>
                  {getChangeIcon(summary.changePercent)} {Math.abs(summary.changePercent).toFixed(1)}% from last month
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">This month&apos;s spending</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top Category</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {summary && Object.keys(summary.categories).length > 0 ? (
                <>
                  <div className="text-2xl font-bold">
                    {Object.entries(summary.categories).sort((a, b) => b[1] - a[1])[0][0]}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(Object.entries(summary.categories).sort((a, b) => b[1] - a[1])[0][1])} this month
                  </p>
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold">—</div>
                  <p className="text-xs text-muted-foreground">No categories yet</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receipts Scanned</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.receiptCount ?? 0}</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>
        </CollapsibleStatsGrid>
      )}

      {/* Category Breakdown */}
      {hasData && Object.keys(summary.categories).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
            <CardDescription>Your top spending categories this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(summary.categories)
                .sort((a, b) => b[1] - a[1])
                .map(([category, amount]) => {
                  const percentage = summary.thisMonth > 0 ? (amount / summary.thisMonth) * 100 : 0;
                  return (
                    <div key={category} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{category}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{formatCurrency(amount)}</span>
                          <Badge variant="secondary" className="text-xs">
                            {percentage.toFixed(1)}%
                          </Badge>
                        </div>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <Tooltip content="Upload and scan receipts with AI" position="bottom">
            <TabsTrigger value="scanner" className="flex items-center gap-2">
              <Scan className="h-4 w-4" />
              Receipt Scanner
            </TabsTrigger>
          </Tooltip>
          <Tooltip content="Browse and search saved receipts" position="bottom">
            <TabsTrigger value="library" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Receipt Library
            </TabsTrigger>
          </Tooltip>
        </TabsList>

        <TabsContent value="scanner" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ReceiptScanner
              onExpenseCreated={handleExpenseCreated}
              onReceiptProcessed={handleReceiptProcessed}
              autoCreateExpense={false}
              className="lg:col-span-2"
            />
          </div>
        </TabsContent>

        <TabsContent value="library" className="space-y-6">
          <ReceiptLibrary
            onCreateExpense={handleCreateExpenseFromReceipt}
          />
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common expense management tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-20 flex-col" onClick={() => setActiveTab('scanner')}>
              <Receipt className="h-6 w-6 mb-2" />
              Scan Receipt
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <PlusCircle className="h-6 w-6 mb-2" />
              Add Expense
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <TrendingUp className="h-6 w-6 mb-2" />
              View Reports
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your latest expense transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-gray-700 rounded-lg h-16"></div>
                </div>
              ))}
            </div>
          ) : recentExpensesList.length > 0 ? (
            <div className="space-y-4">
              {recentExpensesList.map((expense) => (
                <div key={expense.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <Receipt className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{expense.title}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {expense.category && <span>{expense.category}</span>}
                        {expense.category && expense.due_date && <span>•</span>}
                        {expense.due_date && <span>{expense.due_date}</span>}
                        {expense.status && (
                          <>
                            <span>•</span>
                            <Badge variant="secondary" className="text-xs capitalize">
                              {expense.status}
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(expense.amount)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Receipt className="mx-auto h-12 w-12 text-gray-400 mb-3" />
              <p className="text-sm text-muted-foreground">
                No expenses yet. Add your first expense or scan a receipt to get started.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </FeatureGateWrapper>
  );
}
