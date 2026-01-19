'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Target,
  DollarSign,
  TrendingDown,
  PiggyBank,
  Calendar,
  CheckCircle,
  Info,
  Sparkles
} from 'lucide-react';
import { useAuth } from '@/lib/contexts/auth-context';
import {
  BUDGET_GOAL_TEMPLATES,
  createGoalFromBudgetTemplate,
  createBudgetGoalLink
} from '@/lib/services/budget-goals-linking-service';
import { getDefaultCategoriesForDomain } from '@/lib/constants/default-categories';
import { createGoal } from '@/lib/services/goals-service';
import { cn } from '@/lib/utils';

interface BudgetGoalLinkerProps {
  onComplete?: () => void;
  className?: string;
}

type LinkType = 'budget_limit' | 'savings_target' | 'spending_reduction' | 'expense_tracking';
type CreationMode = 'template' | 'custom';

export function BudgetGoalLinker({ onComplete, className }: BudgetGoalLinkerProps) {
  const { currentSpace, user } = useAuth();
  const [mode, setMode] = useState<CreationMode>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [linkType, setLinkType] = useState<LinkType>('budget_limit');
  const [customAmount, setCustomAmount] = useState<string>('');
  const [customTitle, setCustomTitle] = useState<string>('');
  const [customDescription, setCustomDescription] = useState<string>('');
  const [targetDate, setTargetDate] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const expenseCategories = getDefaultCategoriesForDomain('expense');

  const linkTypeConfig = {
    budget_limit: {
      title: 'Budget Limit Tracking',
      description: 'Stay within your monthly budget for this category',
      icon: Target,
      color: 'text-blue-600',
      bgColor: 'bg-blue-950',
      example: 'Track spending to not exceed $500/month on groceries'
    },
    savings_target: {
      title: 'Savings Goal',
      description: 'Save a specific amount of money over time',
      icon: PiggyBank,
      color: 'text-green-600',
      bgColor: 'bg-green-950',
      example: 'Save $5,000 for emergency fund by end of year'
    },
    spending_reduction: {
      title: 'Spending Reduction',
      description: 'Reduce spending by a target percentage',
      icon: TrendingDown,
      color: 'text-orange-600',
      bgColor: 'bg-orange-950',
      example: 'Reduce dining expenses by 20% this month'
    },
    expense_tracking: {
      title: 'Expense Tracking',
      description: 'Monitor and track expenses in this category',
      icon: DollarSign,
      color: 'text-purple-600',
      bgColor: 'bg-purple-950',
      example: 'Track all healthcare expenses for tax purposes'
    }
  };

  const handleCreateFromTemplate = async () => {
    if (!currentSpace || !user || !selectedTemplate || !selectedCategory) {
      setError('Please select a template and category');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const amount = customAmount ? parseFloat(customAmount) : undefined;
      const { goal, link } = await createGoalFromBudgetTemplate(
        currentSpace.id,
        selectedTemplate as keyof typeof BUDGET_GOAL_TEMPLATES,
        selectedCategory,
        amount,
        user.id
      );

      onComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create budget goal');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustom = async () => {
    if (!currentSpace || !user || !customTitle || !selectedCategory) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Create the goal
      const goalData = {
        space_id: currentSpace.id,
        title: customTitle,
        description: customDescription,
        category: 'financial',
        status: 'active' as const,
        progress: 0,
        visibility: 'shared' as const,
        priority: 'p2' as const,
        target_date: targetDate || undefined,
        created_by: user.id
      };

      const goal = await createGoal(goalData);

      // Create the budget-goal link
      await createBudgetGoalLink({
        space_id: currentSpace.id,
        goal_id: goal.id,
        budget_category: selectedCategory,
        link_type: linkType,
        target_amount: customAmount ? parseFloat(customAmount) : undefined,
        time_period: 'monthly',
        auto_update: true,
        created_by: user.id
      });

      onComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create budget goal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Mode Selection */}
      <div className="flex gap-2">
        <Button
          variant={mode === 'template' ? 'default' : 'outline'}
          onClick={() => setMode('template')}
          className="flex-1"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Use Template
        </Button>
        <Button
          variant={mode === 'custom' ? 'default' : 'outline'}
          onClick={() => setMode('custom')}
          className="flex-1"
        >
          <Target className="h-4 w-4 mr-2" />
          Custom Goal
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {mode === 'template' ? (
        <div className="space-y-6">
          {/* Template Selection */}
          <div>
            <Label className="text-base font-medium">Choose a Template</Label>
            <p className="text-sm text-muted-foreground mb-4">
              Select a pre-built template to quickly create budget-linked goals
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(BUDGET_GOAL_TEMPLATES).map(([key, template]) => (
                <Card
                  key={key}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    selectedTemplate === key && "ring-2 ring-primary"
                  )}
                  onClick={() => setSelectedTemplate(key)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${linkTypeConfig[template.link_type].bgColor}`}>
                        {(() => {
                          const IconComponent = linkTypeConfig[template.link_type].icon;
                          return <IconComponent className={`h-4 w-4 ${linkTypeConfig[template.link_type].color}`} />;
                        })()}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{template.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          <Badge variant="secondary" className="text-xs">
                            {template.milestones.length} milestones
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {template.link_type.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {selectedTemplate && (
            <>
              {/* Category Selection */}
              <div>
                <Label htmlFor="category">Budget Category</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a budget category" />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseCategories.map((category) => (
                      <SelectItem key={category.name} value={category.name}>
                        <div className="flex items-center gap-2">
                          <span>{category.icon}</span>
                          <span>{category.name}</span>
                          {category.monthly_budget && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              ${category.monthly_budget}/mo
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Amount */}
              <div>
                <Label htmlFor="amount">Custom Amount (optional)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="Enter custom target amount"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Leave empty to use template default or category budget amount
                </p>
              </div>

              {/* Template Preview */}
              {selectedTemplate && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Template Preview</CardTitle>
                    <CardDescription>
                      {BUDGET_GOAL_TEMPLATES[selectedTemplate].description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <p className="text-sm font-medium">Milestones:</p>
                      {BUDGET_GOAL_TEMPLATES[selectedTemplate].milestones.map((milestone, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{milestone.title}</span>
                          <Badge variant="outline" className="text-xs ml-auto">
                            {milestone.target_value}
                            {milestone.type === 'percentage' ? '%' : ''}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Button
                onClick={handleCreateFromTemplate}
                disabled={!selectedTemplate || !selectedCategory || loading}
                className="w-full"
              >
                {loading ? 'Creating Goal...' : 'Create Budget Goal'}
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Link Type Selection */}
          <div>
            <Label className="text-base font-medium">Goal Type</Label>
            <p className="text-sm text-muted-foreground mb-4">
              Choose the type of budget goal you want to create
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(linkTypeConfig).map(([key, config]) => {
                const IconComponent = config.icon;
                return (
                  <Card
                    key={key}
                    className={cn(
                      "cursor-pointer transition-all hover:shadow-md",
                      linkType === key && "ring-2 ring-primary"
                    )}
                    onClick={() => setLinkType(key as LinkType)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${config.bgColor}`}>
                          <IconComponent className={`h-4 w-4 ${config.color}`} />
                        </div>
                        <div>
                          <h4 className="font-medium text-sm">{config.title}</h4>
                          <p className="text-xs text-muted-foreground mt-1">{config.description}</p>
                          <p className="text-xs text-muted-foreground mt-2 italic">{config.example}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Goal Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Goal Title *</Label>
              <Input
                id="title"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Enter goal title"
              />
            </div>
            <div>
              <Label htmlFor="category-custom">Budget Category *</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {expenseCategories.map((category) => (
                    <SelectItem key={category.name} value={category.name}>
                      <div className="flex items-center gap-2">
                        <span>{category.icon}</span>
                        <span>{category.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={customDescription}
              onChange={(e) => setCustomDescription(e.target.value)}
              placeholder="Describe your budget goal"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount-custom">Target Amount</Label>
              <Input
                id="amount-custom"
                type="number"
                step="0.01"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="Enter target amount"
              />
            </div>
            <div>
              <Label htmlFor="target-date">Target Date (optional)</Label>
              <Input
                id="target-date"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Your goal will automatically track progress based on your spending in the selected category.
              Progress updates happen daily and you&apos;ll receive notifications when milestones are reached.
            </AlertDescription>
          </Alert>

          <Button
            onClick={handleCreateCustom}
            disabled={!customTitle || !selectedCategory || loading}
            className="w-full"
          >
            {loading ? 'Creating Goal...' : 'Create Custom Budget Goal'}
          </Button>
        </div>
      )}
    </div>
  );
}
