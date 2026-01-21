'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { logger } from '@/lib/logger';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Target,
  GitBranch,
  Zap,
  Shield,
  Ban,
  Eye,
  EyeOff
} from 'lucide-react';
import {
  goalDependenciesService,
  type DependencyTreeNode,
  type GoalDependencyStats
} from '@/lib/services/goal-dependencies-service';
import { type Goal } from '@/lib/services/goals-service';

interface DependencyVisualizationProps {
  spaceId: string;
  goals: Goal[];
  className?: string;
  onGoalClick?: (goal: Goal) => void;
}

interface GoalNode extends Goal {
  dependencies: DependencyTreeNode[];
  dependents: DependencyTreeNode[];
  x: number;
  y: number;
  level: number;
}

const DEPENDENCY_COLORS = {
  prerequisite: 'text-blue-600 bg-blue-900/30',
  trigger: 'text-green-600 bg-green-900/30',
  blocking: 'text-red-600 bg-red-900/30'
};

const DEPENDENCY_ICONS = {
  prerequisite: Shield,
  trigger: Zap,
  blocking: Ban
};

const calculateTreePositions = (nodes: GoalNode[]) => {
  // Simple tree layout: arrange goals in levels based on dependency depth
  const levels: GoalNode[][] = [];

  // Calculate levels (goals with no dependencies are level 0)
  nodes.forEach(node => {
    node.level = node.dependencies.length === 0 ? 0 : 1;

    if (!levels[node.level]) {
      levels[node.level] = [];
    }
    levels[node.level].push(node);
  });

  // Position nodes in each level
  levels.forEach((levelNodes, level) => {
    levelNodes.forEach((node, index) => {
      node.x = (index + 1) * (300 / (levelNodes.length + 1));
      node.y = level * 150 + 50;
    });
  });
};

const calculateNetworkPositions = (nodes: GoalNode[]) => {
  // Simple circular layout for network view
  const radius = Math.min(200, nodes.length * 30);
  const angleStep = (2 * Math.PI) / nodes.length;

  nodes.forEach((node, index) => {
    const angle = index * angleStep;
    node.x = 250 + radius * Math.cos(angle);
    node.y = 250 + radius * Math.sin(angle);
  });
};

const calculatePositions = (nodes: GoalNode[], mode: 'tree' | 'network') => {
  if (mode === 'tree') {
    calculateTreePositions(nodes);
  } else {
    calculateNetworkPositions(nodes);
  }
};

export function DependencyVisualization({ spaceId, goals, className = '', onGoalClick }: DependencyVisualizationProps) {
  const [stats, setStats] = useState<GoalDependencyStats | null>(null);
  const [goalNodes, setGoalNodes] = useState<GoalNode[]>([]);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);
  const [viewMode, setViewMode] = useState<'tree' | 'network'>('tree');

  const loadDependencyData = useCallback(async () => {
    try {
      setLoading(true);

      // Load stats
      const statsData = await goalDependenciesService.getDependencyStats(spaceId);
      setStats(statsData);

      // Filter goals based on showCompleted
      const filteredGoals = showCompleted
        ? goals
        : goals.filter(g => g.status !== 'completed');

      // Load dependency trees for each goal
      const nodes: GoalNode[] = [];

      for (const goal of filteredGoals) {
        const [dependencies, dependents] = await Promise.all([
          goalDependenciesService.getGoalDependencies(goal.id),
          goalDependenciesService.getDependentGoals(goal.id)
        ]);

        // Convert to tree nodes
        const dependencyNodes: DependencyTreeNode[] = dependencies.map(dep => ({
          goal_id: goal.id,
          goal_title: goal.title,
          depends_on_goal_id: dep.depends_on_goal_id,
          depends_on_title: filteredGoals.find(g => g.id === dep.depends_on_goal_id)?.title || 'Unknown',
          dependency_type: dep.dependency_type,
          completion_threshold: dep.completion_threshold,
          status: dep.status,
          depth: 1
        }));

        const dependentNodes: DependencyTreeNode[] = dependents.map(dep => ({
          goal_id: dep.goal_id,
          goal_title: filteredGoals.find(g => g.id === dep.goal_id)?.title || 'Unknown',
          depends_on_goal_id: goal.id,
          depends_on_title: goal.title,
          dependency_type: dep.dependency_type,
          completion_threshold: dep.completion_threshold,
          status: dep.status,
          depth: 1
        }));

        nodes.push({
          ...goal,
          dependencies: dependencyNodes,
          dependents: dependentNodes,
          x: 0,
          y: 0,
          level: 0
        });
      }

      setGoalNodes(nodes);
    } catch (err) {
      logger.error('Failed to load dependency data:', err, { component: 'DependencyVisualization', action: 'component_action' });
    } finally {
      setLoading(false);
    }
  }, [goals, showCompleted, spaceId]);

  useEffect(() => {
    loadDependencyData();
  }, [loadDependencyData]);

  const positionedNodes = useMemo(() => {
    const nodes = goalNodes.map(node => ({ ...node }));
    calculatePositions(nodes, viewMode);
    return nodes;
  }, [goalNodes, viewMode]);

  const getGoalStatusIcon = (goal: Goal) => {
    switch (goal.status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'paused':
        return <Clock className="w-5 h-5 text-orange-600" />;
      case 'cancelled':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Target className="w-5 h-5 text-blue-600" />;
    }
  };

  const getDependencyStatusColor = (status: string) => {
    switch (status) {
      case 'satisfied':
        return 'text-green-600';
      case 'bypassed':
        return 'text-orange-600';
      default:
        return 'text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className={`bg-gray-800 rounded-xl p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-700 rounded w-1/3"></div>
          <div className="h-64 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-800 rounded-xl border border-gray-700 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <GitBranch className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                Goal Dependencies
              </h3>
              <p className="text-sm text-gray-400">
                Visualize relationships between your goals
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              {showCompleted ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showCompleted ? 'Hide' : 'Show'} Completed
            </button>

            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as 'tree' | 'network')}
              className="px-3 py-2 text-sm bg-gray-700 border border-gray-600 rounded-lg"
            >
              <option value="tree">Tree View</option>
              <option value="network">Network View</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-400">
                {stats.total_dependencies}
              </div>
              <div className="text-sm text-gray-400">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">
                {stats.satisfied_dependencies}
              </div>
              <div className="text-sm text-gray-400">Satisfied</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-400">
                {stats.blocked_goals}
              </div>
              <div className="text-sm text-gray-400">Blocked</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">
                {stats.unlockable_goals}
              </div>
              <div className="text-sm text-gray-400">Unlockable</div>
            </div>
          </div>
        )}
      </div>

      {/* Visualization */}
      <div className="p-6">
        {positionedNodes.length === 0 ? (
          <div className="text-center py-12">
            <GitBranch className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-white mb-2">
              No Dependencies Found
            </h4>
            <p className="text-gray-400">
              Start connecting your goals with dependencies to see the visualization here
            </p>
          </div>
        ) : (
          <div className="relative overflow-hidden">
            <svg
              width="100%"
              height="400"
              viewBox="0 0 500 400"
              className="border border-gray-600 rounded-lg bg-gray-700"
            >
              {/* Dependency Lines */}
              {positionedNodes.map(node =>
                node.dependencies.map(dep => {
                  const dependsOnNode = positionedNodes.find(n => n.id === dep.depends_on_goal_id);
                  if (!dependsOnNode) return null;

                  const Icon = DEPENDENCY_ICONS[dep.dependency_type];

                  return (
                    <g key={`${node.id}-${dep.depends_on_goal_id}`}>
                      {/* Connection Line */}
                      <line
                        x1={dependsOnNode.x}
                        y1={dependsOnNode.y}
                        x2={node.x}
                        y2={node.y}
                        stroke={dep.status === 'satisfied' ? '#10b981' : '#6b7280'}
                        strokeWidth="2"
                        strokeDasharray={dep.status === 'pending' ? '5,5' : 'none'}
                        markerEnd="url(#arrowhead)"
                      />

                      {/* Dependency Type Icon */}
                      <foreignObject
                        x={(dependsOnNode.x + node.x) / 2 - 10}
                        y={(dependsOnNode.y + node.y) / 2 - 10}
                        width="20"
                        height="20"
                      >
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${DEPENDENCY_COLORS[dep.dependency_type]}`}>
                          <Icon className="w-3 h-3" />
                        </div>
                      </foreignObject>
                    </g>
                  );
                })
              )}

              {/* Arrow Marker Definition */}
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon
                    points="0 0, 10 3.5, 0 7"
                    fill="#6b7280"
                  />
                </marker>
              </defs>

              {/* Goal Nodes */}
              {positionedNodes.map(node => (
                <g key={node.id}>
                  {/* Goal Circle */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r="25"
                    fill={selectedGoalId === node.id ? '#6366f1' : '#f3f4f6'}
                    stroke={node.status === 'completed' ? '#10b981' : '#6b7280'}
                    strokeWidth="2"
                    className="cursor-pointer"
                    onClick={() => {
                      setSelectedGoalId(selectedGoalId === node.id ? null : node.id);
                      if (onGoalClick) {
                        onGoalClick(node);
                      }
                    }}
                  />

                  {/* Goal Icon */}
                  <foreignObject
                    x={node.x - 10}
                    y={node.y - 10}
                    width="20"
                    height="20"
                    className="pointer-events-none"
                  >
                    <div className="w-5 h-5 flex items-center justify-center">
                      {getGoalStatusIcon(node)}
                    </div>
                  </foreignObject>

                  {/* Goal Label */}
                  <text
                    x={node.x}
                    y={node.y + 40}
                    textAnchor="middle"
                    className="text-xs fill-gray-300 pointer-events-none"
                    style={{ fontSize: '10px' }}
                  >
                    {node.title.length > 15 ? `${node.title.substring(0, 15)}...` : node.title}
                  </text>
                </g>
              ))}
            </svg>

            {/* Selected Goal Details */}
            {selectedGoalId && (
              <div className="mt-6 bg-gray-700 rounded-lg p-4">
                {(() => {
                  const selectedGoal = positionedNodes.find(n => n.id === selectedGoalId);
                  if (!selectedGoal) return null;

                  return (
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        {getGoalStatusIcon(selectedGoal)}
                        <h4 className="text-lg font-semibold text-white">
                          {selectedGoal.title}
                        </h4>
                        <span className="text-sm text-gray-400">
                          {selectedGoal.progress}% complete
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Dependencies */}
                        <div>
                          <h5 className="font-medium text-white mb-2">
                            Dependencies ({selectedGoal.dependencies.length})
                          </h5>
                          {selectedGoal.dependencies.length === 0 ? (
                            <p className="text-sm text-gray-400">No dependencies</p>
                          ) : (
                            <div className="space-y-2">
                              {selectedGoal.dependencies.map(dep => {
                                const Icon = DEPENDENCY_ICONS[dep.dependency_type];
                                return (
                                  <div key={dep.depends_on_goal_id} className="flex items-center gap-2 text-sm">
                                    <Icon className="w-4 h-4 text-gray-400" />
                                    <span className="flex-1">{dep.depends_on_title}</span>
                                    <span className={`text-xs ${getDependencyStatusColor(dep.status)}`}>
                                      {dep.status}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Dependents */}
                        <div>
                          <h5 className="font-medium text-white mb-2">
                            Dependents ({selectedGoal.dependents.length})
                          </h5>
                          {selectedGoal.dependents.length === 0 ? (
                            <p className="text-sm text-gray-400">No dependents</p>
                          ) : (
                            <div className="space-y-2">
                              {selectedGoal.dependents.map(dep => {
                                const Icon = DEPENDENCY_ICONS[dep.dependency_type];
                                return (
                                  <div key={dep.goal_id} className="flex items-center gap-2 text-sm">
                                    <Icon className="w-4 h-4 text-gray-400" />
                                    <span className="flex-1">{dep.goal_title}</span>
                                    <span className={`text-xs ${getDependencyStatusColor(dep.status)}`}>
                                      {dep.status}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
