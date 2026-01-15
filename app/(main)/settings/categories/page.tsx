'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Tag,
  FolderPlus,
  TrendingUp,
  BarChart3,
  PieChart,
  DollarSign,
  Target,
  CheckSquare,
  Info
} from 'lucide-react';
import { CategoryManager } from '@/components/categories/CategoryManager';

export default function CategoriesSettingsPage() {
  const [selectedDomain, setSelectedDomain] = useState<'expense' | 'task' | 'goal' | 'universal'>('expense');

  const domainConfig = {
    expense: {
      title: 'Expense Categories',
      description: 'Organize your expenses for better budget tracking',
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-950',
      features: ['Monthly budgets', 'Spending analytics', 'Receipt categorization', 'Expense reporting']
    },
    task: {
      title: 'Task Categories',
      description: 'Categorize tasks for better productivity',
      icon: CheckSquare,
      color: 'text-blue-600',
      bgColor: 'bg-blue-950',
      features: ['Task filtering', 'Productivity analytics', 'Project organization', 'Time tracking']
    },
    goal: {
      title: 'Goal Categories',
      description: 'Group goals by life areas and priorities',
      icon: Target,
      color: 'text-purple-600',
      bgColor: 'bg-purple-950',
      features: ['Progress tracking', 'Achievement badges', 'Goal analytics', 'Milestone organization']
    },
    universal: {
      title: 'Universal Categories',
      description: 'Cross-feature categories for consistent organization',
      icon: Tag,
      color: 'text-orange-600',
      bgColor: 'bg-orange-950',
      features: ['Priority levels', 'Project grouping', 'Routine identification', 'Cross-feature filtering']
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Categories & Tags</h1>
        <p className="text-muted-foreground">
          Organize your expenses, tasks, and goals with custom categories and tags
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {(Object.keys(domainConfig) as Array<keyof typeof domainConfig>).map((domain) => {
          const config = domainConfig[domain];
          const IconComponent = config.icon;
          const isSelected = selectedDomain === domain;

          return (
            <Card
              key={domain}
              className={`cursor-pointer transition-all hover:shadow-md ${
                isSelected ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setSelectedDomain(domain)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 rounded-lg ${config.bgColor}`}>
                    <IconComponent className={`h-5 w-5 ${config.color}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-sm">{config.title}</h3>
                    <p className="text-xs text-muted-foreground capitalize">{domain}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{config.description}</p>
                <div className="flex flex-wrap gap-1">
                  {config.features.slice(0, 2).map((feature, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {feature}
                    </Badge>
                  ))}
                  {config.features.length > 2 && (
                    <Badge variant="outline" className="text-xs">
                      +{config.features.length - 2}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Categories help organize items within each feature, while tags provide cross-feature labeling and filtering.
          You can create custom categories or use our default templates to get started quickly.
        </AlertDescription>
      </Alert>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Manager */}
        <div className="lg:col-span-2">
          <CategoryManager
            domain={selectedDomain}
            showTags={true}
            showBudgets={selectedDomain === 'expense'}
          />
        </div>

        {/* Side Panel */}
        <div className="space-y-6">
          {/* Domain Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                {(() => {
                  const IconComponent = domainConfig[selectedDomain].icon;
                  return <IconComponent className="h-4 w-4" />;
                })()}
                {domainConfig[selectedDomain].title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {domainConfig[selectedDomain].description}
              </p>
              <div>
                <h4 className="font-medium text-sm mb-2">Features</h4>
                <ul className="space-y-1">
                  {domainConfig[selectedDomain].features.map((feature, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Quick Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Total Categories</span>
                  <Badge variant="secondary">0</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Total Tags</span>
                  <Badge variant="secondary">0</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Most Used Category</span>
                  <span className="text-sm text-muted-foreground">-</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Active This Month</span>
                  <span className="text-sm text-muted-foreground">-</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Pro Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div>
                  <h4 className="font-medium">Use Default Templates</h4>
                  <p className="text-muted-foreground text-xs">
                    Save time by starting with our pre-built category sets
                  </p>
                </div>
                <Separator />
                <div>
                  <h4 className="font-medium">Set Monthly Budgets</h4>
                  <p className="text-muted-foreground text-xs">
                    Add budgets to expense categories for automatic tracking
                  </p>
                </div>
                <Separator />
                <div>
                  <h4 className="font-medium">Use Tags for Filtering</h4>
                  <p className="text-muted-foreground text-xs">
                    Tags work across all features for flexible organization
                  </p>
                </div>
                <Separator />
                <div>
                  <h4 className="font-medium">Color Coding</h4>
                  <p className="text-muted-foreground text-xs">
                    Consistent colors help with quick visual identification
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}