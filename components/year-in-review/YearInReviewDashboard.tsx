'use client';

import { useState, useEffect, memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { logger } from '@/lib/logger';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Target,
  CheckCircle2,
  DollarSign,
  Activity,
  Award,
  Star,
  Trophy,
  Zap,
  Users,
  Clock,
  Download,
  Share2,
  Sparkles
} from 'lucide-react';
import { useAuth } from '@/lib/contexts/auth-context';
import { YearInReviewData } from '@/lib/services/year-in-review-service';
import { SpaceSelector } from '@/components/spaces/SpaceSelector';
import { cn } from '@/lib/utils';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

interface YearInReviewDashboardProps {
  year?: number;
  className?: string;
}

// =====================================================
// YEAR IN REVIEW DASHBOARD
// =====================================================

export const YearInReviewDashboard = memo(function YearInReviewDashboard({ year, className }: YearInReviewDashboardProps) {
  const { currentSpace, spaces, switchSpace, user } = useAuth();
  const [data, setData] = useState<YearInReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(year || new Date().getFullYear());
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch year in review data
  useEffect(() => {
    if (!currentSpace?.id) {
      setLoading(false);
      setError('Please select a space to view your year in review');
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `/api/year-in-review?space_id=${currentSpace.id}&year=${selectedYear}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch year in review data');
        }

        const result = await response.json();
        setData(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentSpace?.id, selectedYear]);

  // Handle export
  const handleExport = async () => {
    if (!currentSpace?.id || !data) return;

    try {
      const response = await fetch('/api/year-in-review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          space_id: currentSpace.id,
          year: selectedYear,
          format: 'pdf'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to export year in review');
      }

      // Handle download (would implement actual file download)
      const result = await response.json();
      logger.info('Export prepared:', { component: 'YearInReviewDashboard', data: result });
    } catch (err) {
      logger.error('Export error:', err, { component: 'YearInReviewDashboard', action: 'component_action' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-muted-foreground">Generating your year in review...</p>
        </div>
      </div>
    );
  }

  // Show the full UI even if there's an error or no data, but with appropriate empty states

  return (
    <div className={cn("space-y-8", className)}>
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Sparkles className="w-8 h-8 text-yellow-500" />
          <h1 className="text-4xl font-bold text-white drop-shadow-lg">
            Your {selectedYear} Year in Review
          </h1>
        </div>

        {/* Space Selector */}
        {currentSpace && spaces.length > 0 && user && (
          <div className="flex justify-center mb-6">
            <SpaceSelector
              spaces={spaces}
              currentSpace={currentSpace}
              onSpaceChange={switchSpace}
              onCreateSpace={() => {}}
              onInvitePartner={() => {}}
              userColorTheme={user.color_theme}
              variant="default"
            />
          </div>
        )}
        {error ? (
          <div className="max-w-2xl mx-auto">
            <p className="text-lg text-muted-foreground mb-2">
              {error}
            </p>
            <p className="text-sm text-muted-foreground">
              {error.includes('space') ?
                'Select a space from the sidebar to view your personalized year in review.' :
                'Here\'s a preview of what your year in review will look like once you have some data.'
              }
            </p>
          </div>
        ) : !data ? (
          <div className="max-w-2xl mx-auto">
            <p className="text-lg text-muted-foreground mb-2">
              Getting ready to load your year in review...
            </p>
            <p className="text-sm text-muted-foreground">
              Here's a preview of what your year in review will look like once you have some data.
            </p>
          </div>
        ) : (
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Celebrating your achievements, growth, and incredible journey this year
          </p>
        )}
        <div className="flex items-center justify-center gap-4">
          <Button
            onClick={handleExport}
            variant="outline"
            className="gap-2"
            disabled={!data || !!error}
          >
            <Download className="w-4 h-4" />
            Export Report
          </Button>
          <Button variant="outline" className="gap-2" disabled={!data || !!error}>
            <Share2 className="w-4 h-4" />
            Share
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <OverviewCard
          icon={CheckCircle2}
          title="Tasks Completed"
          value={data?.overview.tasksCompleted ?? 0}
          subtitle={data ? `${data.overview.averageTasksPerDay.toFixed(1)} per day` : 'No data yet'}
          color="blue"
        />
        <OverviewCard
          icon={Target}
          title="Goals Achieved"
          value={data?.overview.goalsAchieved ?? 0}
          subtitle={data ? `${data.overview.goalCompletionRate.toFixed(1)}% completion rate` : 'No data yet'}
          color="green"
        />
        <OverviewCard
          icon={DollarSign}
          title="Total Expenses"
          value={data ? `$${data.overview.totalExpenses.toLocaleString()}` : '$0'}
          subtitle={data ? `${data.overview.activeDays} active days` : 'No data yet'}
          color="purple"
        />
        <OverviewCard
          icon={Award}
          title="Badges Earned"
          value={data?.overview.badgesEarned ?? 0}
          subtitle={data ? `${data.achievements.milestones.length} milestones` : 'No data yet'}
          color="yellow"
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <OverviewTab data={data} />
        </TabsContent>

        <TabsContent value="achievements" className="space-y-6">
          <AchievementsTab data={data} />
        </TabsContent>

        <TabsContent value="goals" className="space-y-6">
          <GoalsTab data={data} />
        </TabsContent>

        <TabsContent value="expenses" className="space-y-6">
          <ExpensesTab data={data} />
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <InsightsTab data={data} />
        </TabsContent>
      </Tabs>
    </div>
  );
});

// =====================================================
// OVERVIEW CARD COMPONENT
// =====================================================

interface OverviewCardProps {
  icon: React.ComponentType<any>;
  title: string;
  value: string | number;
  subtitle: string;
  color: 'blue' | 'green' | 'purple' | 'yellow';
}

function OverviewCard({ icon: Icon, title, value, subtitle, color }: OverviewCardProps) {
  const colorClasses = {
    blue: 'bg-blue-500 text-white',
    green: 'bg-green-500 text-white',
    purple: 'bg-purple-500 text-white',
    yellow: 'bg-yellow-500 text-white'
  };

  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={cn("p-2 rounded-lg", colorClasses[color])}>
          <Icon className="w-4 h-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

// =====================================================
// EMPTY STATE COMPONENT
// =====================================================
function EmptyStateCard({ title, description, icon: Icon }: { title: string; description: string; icon: React.ComponentType<any> }) {
  return (
    <Card className="text-center py-12">
      <CardContent>
        <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
          <Icon className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

// =====================================================
// TAB COMPONENTS
// =====================================================

function OverviewTab({ data }: { data: YearInReviewData | null }) {
  if (!data) {
    return (
      <EmptyStateCard
        title="No Overview Data Available"
        description="Once you start using Rowan, you'll see beautiful charts and insights about your productivity here."
        icon={Activity}
      />
    );
  }

  const chartColors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6\">
      {/* Monthly Activity Chart */}
      <Card className="col-span-1 lg:col-span-2\">
        <CardHeader>
          <CardTitle>Monthly Activity Overview</CardTitle>
          <CardDescription>Your productivity and activity throughout the year</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.monthlyBreakdown}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="monthName" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="tasksCompleted" stackId="1" stroke={chartColors[0]} fill={chartColors[0]} fillOpacity={0.3} />
              <Area type="monotone" dataKey="goalsAchieved" stackId="1" stroke={chartColors[1]} fill={chartColors[1]} fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Top Categories</CardTitle>
          <CardDescription>Your most active areas this year</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.topCategories.slice(0, 5).map((category, index) => (
              <div key={category.category} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: chartColors[index % chartColors.length] }} />
                  <span className="font-medium capitalize">{category.category}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{category.count}</span>
                  <Badge variant="secondary">{category.percentage}%</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Productivity Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Productivity Insights</CardTitle>
          <CardDescription>Understanding your work patterns</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm">Daily Average</span>
              <span className="font-medium">{data.productivity.averageTasksPerDay.toFixed(1)} tasks</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Most Productive Day</span>
              <span className="font-medium">{data.productivity.mostProductiveDay}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Peak Hour</span>
              <span className="font-medium">{data.productivity.mostProductiveHour}:00</span>
            </div>
          </div>
          <div className="pt-4 border-t">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm">Weekday vs Weekend</span>
            </div>
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Weekdays</span>
                  <span>{data.productivity.weekdayVsWeekend.weekday}%</span>
                </div>
                <Progress value={data.productivity.weekdayVsWeekend.weekday} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Weekends</span>
                  <span>{data.productivity.weekdayVsWeekend.weekend}%</span>
                </div>
                <Progress value={data.productivity.weekdayVsWeekend.weekend} className="h-2" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AchievementsTab({ data }: { data: YearInReviewData | null }) {
  if (!data) {
    return (
      <EmptyStateCard
        title="No Achievements Yet"
        description="Start completing tasks and achieving goals to earn badges and unlock milestones!"
        icon={Trophy}
      />
    );
  }
  return (
    <div className="space-y-6">
      {/* Badges Earned */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Badges Earned This Year
          </CardTitle>
          <CardDescription>Celebrating your accomplishments</CardDescription>
        </CardHeader>
        <CardContent>
          {data.achievements.badgesEarned.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.achievements.badgesEarned.map((badge) => (
                <div key={badge.id} className="p-4 border rounded-lg space-y-2 hover:bg-accent transition-colors">
                  <div className="text-2xl">{badge.icon}</div>
                  <h4 className="font-medium">{badge.title}</h4>
                  <p className="text-sm text-muted-foreground">{badge.description}</p>
                  <p className="text-xs text-muted-foreground">
                    Earned {new Date(badge.earnedAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Award className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>Keep working towards your goals to earn badges!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Milestones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-blue-500" />
            Major Milestones
          </CardTitle>
          <CardDescription>Significant achievements this year</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.achievements.milestones.map((milestone, index) => (
              <div key={index} className="flex items-start gap-4 p-4 border rounded-lg">
                <div className="w-8 h-8 rounded-full bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                  <Star className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">{milestone.title}</h4>
                  <p className="text-sm text-muted-foreground">{milestone.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(milestone.achievedAt).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant="secondary">{milestone.value}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Personal Records */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-500" />
            Personal Records
          </CardTitle>
          <CardDescription>Your best achievements this year</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.achievements.personalRecords.map((record, index) => (
              <div key={index} className="p-4 border rounded-lg text-center space-y-2">
                <div className="text-3xl font-bold text-purple-600">{record.value}</div>
                <div className="text-sm font-medium">{record.title}</div>
                <div className="text-xs text-muted-foreground">{record.description}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function GoalsTab({ data }: { data: YearInReviewData | null }) {
  if (!data) {
    return (
      <EmptyStateCard
        title="No Goals Data Available"
        description="Set some goals to see your progress and achievements throughout the year."
        icon={Target}
      />
    );
  }
  return (
    <div className="space-y-6">
      {/* Goals Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{data.goals.totalGoals}</CardTitle>
            <CardDescription>Total Goals Set</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-green-600">{data.goals.completedGoals}</CardTitle>
            <CardDescription>Goals Achieved</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{data.goals.completionRate.toFixed(1)}%</CardTitle>
            <CardDescription>Success Rate</CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Completion Rate Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Goal Completion Progress</CardTitle>
          <CardDescription>How well you achieved your goals this year</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Overall Completion Rate</span>
                <span>{data.goals.completionRate.toFixed(1)}%</span>
              </div>
              <Progress value={data.goals.completionRate} className="h-3" />
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <div className="text-sm text-muted-foreground">Average Time to Complete</div>
                <div className="font-medium">{data.goals.averageCompletionTime} days</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Goals in Progress</div>
                <div className="font-medium">{data.goals.inProgressGoals}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ExpensesTab({ data }: { data: YearInReviewData | null }) {
  if (!data) {
    return (
      <EmptyStateCard
        title="No Expense Data Available"
        description="Track your expenses to see spending patterns and financial insights in your year in review."
        icon={DollarSign}
      />
    );
  }
  return (
    <div className="space-y-6">
      {/* Expense Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">${data.expenses.totalAmount.toLocaleString()}</CardTitle>
            <CardDescription>Total Spent</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{data.expenses.totalTransactions}</CardTitle>
            <CardDescription>Total Transactions</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">${data.expenses.averagePerMonth.toLocaleString()}</CardTitle>
            <CardDescription>Monthly Average</CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Expense Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Spending Breakdown</CardTitle>
          <CardDescription>Where your money went this year</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>Expense category breakdown will be displayed here when data is available</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InsightsTab({ data }: { data: YearInReviewData | null }) {
  if (!data) {
    return (
      <EmptyStateCard
        title="No Insights Available"
        description="Once you have some activity data, we'll provide personalized insights about your patterns and productivity."
        icon={TrendingUp}
      />
    );
  }
  return (
    <div className="space-y-6">
      {/* Key Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              Your Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.insights.strengths.map((strength, index) => (
                <div key={index} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="capitalize">{strength}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              Growth Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.insights.improvementAreas.map((area, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-blue-500" />
                  <span className="capitalize">{area}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Personal Patterns */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Patterns</CardTitle>
          <CardDescription>Understanding your habits and preferences</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground">Most Productive Month</div>
                <div className="font-medium text-lg">{data.insights.mostProductiveMonth}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Favorite Task Category</div>
                <div className="font-medium text-lg capitalize">{data.insights.favoriteTaskCategory}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Longest Streak</div>
                <div className="font-medium text-lg">{data.insights.longestStreak} days</div>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground">Average Goal Completion</div>
                <div className="font-medium text-lg">{data.insights.averageGoalCompletionTime} days</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Top Spending Category</div>
                <div className="font-medium text-lg capitalize">{data.insights.topSpendingCategory}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Total Time Worked</div>
                <div className="font-medium text-lg">{data.insights.totalTimeWorked} hours</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}