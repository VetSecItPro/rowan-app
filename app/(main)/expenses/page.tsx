'use client';

// Force dynamic rendering to prevent useContext errors during static generation
export const dynamic = 'force-dynamic';

import { useState } from 'react';
// Using native HTML elements and existing components
import { EnhancedButton } from '@/components/ui/EnhancedButton';
import { FeatureGateWrapper } from '@/components/subscription/FeatureGateWrapper';
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
}

export default function ExpensesPage() {
  const [activeTab, setActiveTab] = useState('scanner');
  const [recentExpenses] = useState<ExpenseSummary>({
    total: 2847.32,
    thisMonth: 1205.49,
    lastMonth: 1641.83,
    changePercent: -26.6,
    categories: {
      'Groceries': 485.20,
      'Dining': 320.15,
      'Transportation': 180.50,
      'Healthcare': 125.30,
      'Shopping': 94.34
    }
  });

  const handleExpenseCreated = (expenseData: ExpenseSuggestion) => {
    console.log('Expense created:', expenseData);
    // TODO: Integrate with actual expense creation
    // This would typically call the expense service to create the expense
  };

  const handleReceiptProcessed = (receiptId: string, extractedData: ExtractedReceiptData) => {
    console.log('Receipt processed:', receiptId, extractedData);
    // Could show success message, refresh data, etc.
  };

  const handleCreateExpenseFromReceipt = (extractedData: ExtractedReceiptData) => {
    console.log('Creating expense from receipt data:', extractedData);
    // Switch to scanner tab and pre-fill with data
    setActiveTab('scanner');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return '↗';
    if (change < 0) return '↘';
    return '→';
  };

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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(recentExpenses.total)}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(recentExpenses.thisMonth)}</div>
            <p className={`text-xs flex items-center ${getChangeColor(recentExpenses.changePercent)}`}>
              {getChangeIcon(recentExpenses.changePercent)} {Math.abs(recentExpenses.changePercent)}% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Category</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Groceries</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(recentExpenses.categories['Groceries'])} this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receipts Scanned</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">23</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Spending by Category</CardTitle>
          <CardDescription>Your top spending categories this month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(recentExpenses.categories).map(([category, amount]) => {
              const percentage = (amount / recentExpenses.thisMonth) * 100;
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
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
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
            <Button variant="outline" className="h-20 flex-col">
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
          <div className="space-y-4">
            {[
              { merchant: 'Whole Foods Market', amount: 87.32, category: 'Groceries', date: '2024-10-18', method: 'receipt_scan' },
              { merchant: 'Shell Gas Station', amount: 45.20, category: 'Transportation', date: '2024-10-17', method: 'manual' },
              { merchant: 'Starbucks Coffee', amount: 12.95, category: 'Dining', date: '2024-10-17', method: 'receipt_scan' },
              { merchant: 'CVS Pharmacy', amount: 23.45, category: 'Healthcare', date: '2024-10-16', method: 'receipt_scan' },
            ].map((expense, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-full">
                    {expense.method === 'receipt_scan' ? (
                      <Receipt className="h-4 w-4 text-primary" />
                    ) : (
                      <PlusCircle className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{expense.merchant}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{expense.category}</span>
                      <span>•</span>
                      <span>{expense.date}</span>
                      {expense.method === 'receipt_scan' && (
                        <>
                          <span>•</span>
                          <Badge variant="secondary" className="text-xs">Scanned</Badge>
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
        </CardContent>
      </Card>
    </div>
    </FeatureGateWrapper>
  );
}
