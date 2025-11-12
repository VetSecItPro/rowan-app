'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Target,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Plus,
  AlertTriangle,
  CheckCircle,
  PiggyBank,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Link as LinkIcon
} from 'lucide-react';
import { useAuth } from '@/lib/contexts/auth-context';
import {
  BudgetProgress,
  SavingsGoalProgress,
  getBudgetProgressWithGoals,
  calculateSavingsGoalProgress,
  autoUpdateBudgetGoalProgress
} from '@/lib/services/budget-goals-linking-service';
import { Goal } from '@/lib/services/goals-service';
import { BudgetGoalLinker } from './BudgetGoalLinker';
import { cn } from '@/lib/utils';

interface BudgetGoalsDashboardProps {
  className?: string;
}

export function BudgetGoalsDashboard({ className }: BudgetGoalsDashboardProps) {
  const { currentSpace } = useAuth();
  const [budgetProgress, setBudgetProgress] = useState<BudgetProgress[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoalProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLinker, setShowLinker] = useState(false);
  const [activeTab, setActiveTab] = useState('budget');

  // Load data
  useEffect(() => {
    const loadData = async () => {
      if (!currentSpace) return;

      try {
        setLoading(true);

        // Auto-update progress first
        await autoUpdateBudgetGoalProgress(currentSpace.id);

        // Get budget progress with linked goals
        const progress = await getBudgetProgressWithGoals(currentSpace.id);
        setBudgetProgress(progress);

        // Get savings goal progress for financial goals
        const allLinkedGoals = progress.flatMap(p => p.linked_goals);
        const savingsPromises = allLinkedGoals
          .filter(goal => goal.category === 'financial')
          .map(goal => calculateSavingsGoalProgress(currentSpace.id, goal.id));

        const savingsResults = await Promise.all(savingsPromises);
        setSavingsGoals(savingsResults.filter(Boolean) as SavingsGoalProgress[]);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load budget goals data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentSpace]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusColor = (status: 'on_track' | 'warning' | 'over_budget') => {
    switch (status) {
      case 'on_track': return 'text-green-600 bg-green-50 dark:bg-green-950';
      case 'warning': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950';
      case 'over_budget': return 'text-red-600 bg-red-50 dark:bg-red-950';
    }
  };

  const getStatusIcon = (status: 'on_track' | 'warning' | 'over_budget') => {
    switch (status) {
      case 'on_track': return CheckCircle;
      case 'warning': return AlertTriangle;
      case 'over_budget': return TrendingUp;
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p>Loading budget goals...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Budget & Goals</h2>
          <p className="text-muted-foreground">
            Track your financial progress and stay within budget limits
          </p>
        </div>
        <Dialog open={showLinker} onOpenChange={setShowLinker}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Link Budget Goal
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Budget-Linked Goal</DialogTitle>
              <DialogDescription>
                Connect your budget categories with trackable goals for better financial management
              </DialogDescription>
            </DialogHeader>
            <BudgetGoalLinker onComplete={() => setShowLinker(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="budget" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Budget Progress
          </TabsTrigger>
          <TabsTrigger value="savings" className="flex items-center gap-2">
            <PiggyBank className="h-4 w-4" />
            Savings Goals
          </TabsTrigger>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Overview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="budget" className="space-y-4">
          {budgetProgress.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Budget Categories</h3>
                <p className="text-muted-foreground mb-4">
                  Set up budget categories and link them to goals to track your financial progress
                </p>
                <Button onClick={() => setShowLinker(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Budget Goal
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {budgetProgress.map((progress) => {
                const StatusIcon = getStatusIcon(progress.status);

                return (
                  <Card key={progress.category}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{progress.category}</CardTitle>
                        <Badge variant="secondary" className={getStatusColor(progress.status)}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {progress.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Budget Progress */}
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span>Spent: {formatCurrency(progress.spent)}</span>
                          <span>Budget: {formatCurrency(progress.budgeted)}</span>
                        </div>
                        <Progress
                          value={Math.min(100, progress.percentage_spent)}
                          className="h-2"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>{progress.percentage_spent.toFixed(1)}% used</span>
                          <span>{formatCurrency(progress.remaining)} left</span>
                        </div>
                      </div>

                      {/* Linked Goals */}
                      {progress.linked_goals.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                            <LinkIcon className="h-3 w-3" />
                            Linked Goals ({progress.linked_goals.length})
                          </h4>
                          <div className="space-y-2">
                            {progress.linked_goals.map((goal) => (
                              <div key={goal.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{goal.title}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {goal.progress}% complete
                                  </p>
                                </div>
                                <Progress value={goal.progress} className="w-16 h-1" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {progress.linked_goals.length === 0 && (
                        <div className="text-center py-2">
                          <p className="text-xs text-muted-foreground mb-2">No linked goals</p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowLinker(true)}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Link Goal
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="savings" className="space-y-4">
          {savingsGoals.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <PiggyBank className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Savings Goals</h3>
                <p className="text-muted-foreground mb-4">
                  Create savings goals to track your progress toward financial targets
                </p>
                <Button onClick={() => setShowLinker(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Savings Goal
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savingsGoals.map((savings) => (
                <Card key={savings.goal_id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PiggyBank className="h-5 w-5" />
                      Savings Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Progress */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Saved: {formatCurrency(savings.saved_amount)}</span>
                        <span>Target: {formatCurrency(savings.target_amount)}</span>
                      </div>
                      <Progress value={savings.progress_percentage} className="h-3" />
                      <p className="text-xs text-muted-foreground mt-1">
                        {savings.progress_percentage.toFixed(1)}% complete
                      </p>
                    </div>

                    <Separator />

                    {/* Monthly Contribution */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Monthly Need</p>
                        <p className="font-medium">{formatCurrency(savings.monthly_contribution_needed)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Target Date</p>
                        <p className="font-medium">
                          {new Date(savings.projected_completion_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-2">
                      {savings.on_track ? (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-green-600">On track</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          <span className="text-sm text-yellow-600">Needs attention</span>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="overview" className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Budget Categories</p>
                    <p className="text-xl font-bold">{budgetProgress.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Linked Goals</p>
                    <p className="text-xl font-bold">
                      {budgetProgress.reduce((total, p) => total + p.linked_goals.length, 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">On Track</p>
                    <p className="text-xl font-bold">
                      {budgetProgress.filter(p => p.status === 'on_track').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Need Attention</p>
                    <p className="text-xl font-bold">
                      {budgetProgress.filter(p => p.status !== 'on_track').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Budget Goal Insights</CardTitle>
              <CardDescription>Key insights about your budget and goal performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {budgetProgress.map((progress) => (
                  <div key={progress.category} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-full">
                        <DollarSign className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{progress.category}</p>
                        <p className="text-sm text-muted-foreground">
                          {progress.percentage_spent.toFixed(1)}% of budget used
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(progress.spent)}</p>
                      <p className="text-sm text-muted-foreground">
                        of {formatCurrency(progress.budgeted)}
                      </p>
                    </div>
                  </div>
                ))}

                {budgetProgress.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground">
                    <p>No budget data available</p>
                    <p className="text-sm">Create budget-linked goals to see insights here</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}