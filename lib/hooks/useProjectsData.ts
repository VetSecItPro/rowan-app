'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuthWithSpaces } from '@/lib/hooks/useAuthWithSpaces';
import { projectsOnlyService } from '@/lib/services/projects-service';
import type { Project } from '@/lib/services/project-tracking-service';
import { createClient } from '@/lib/supabase/client';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

// ─── Return interface ─────────────────────────────────────────────────────────
//
// PR14: this hook was the conflated projects + budget data layer. The budget
// half (expenses, bills, budgets, templates) now lives in useBudgetData and the
// /budget hub. What remains is home-renovation projects only.

export interface UseProjectsDataReturn {
  currentSpace: ReturnType<typeof useAuthWithSpaces>['currentSpace'];
  user: ReturnType<typeof useAuthWithSpaces>['user'];

  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  loading: boolean;

  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  projectFilter: 'all' | 'active' | 'completed';
  setProjectFilter: React.Dispatch<React.SetStateAction<'all' | 'active' | 'completed'>>;

  filteredProjects: Project[];

  loadData: () => Promise<void>;
}

/** Loads and manages household (home-renovation) projects with search + filter. */
export function useProjectsData(): UseProjectsDataReturn {
  const { currentSpace, user } = useAuthWithSpaces();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState<'all' | 'active' | 'completed'>('all');

  // ─── Data loading ─────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!currentSpace || !user) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setProjects(await projectsOnlyService.getProjects(currentSpace.id));
    } catch (error) {
      logger.error('Failed to load projects:', error, { component: 'use-projects-data', action: 'load' });
    } finally {
      setLoading(false);
    }
  }, [currentSpace, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── Realtime: projects only ──────────────────────────────────────────────

  useEffect(() => {
    if (!currentSpace) return;
    const supabase = createClient();
    const spaceFilter = `space_id=eq.${currentSpace.id}`;

    const channel = supabase
      .channel(`projects:${currentSpace.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'projects', filter: spaceFilter },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          setProjects(prev => [payload.new as Project, ...prev]);
        })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'projects', filter: spaceFilter },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          const updated = payload.new as Project;
          setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
        })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'projects', filter: spaceFilter },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          const deletedId = (payload.old as { id: string }).id;
          setProjects(prev => prev.filter(p => p.id !== deletedId));
        })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentSpace]);

  // ─── Computed ─────────────────────────────────────────────────────────────

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      if (projectFilter === 'active') return p.status !== 'completed';
      if (projectFilter === 'completed') return p.status === 'completed';
      return true;
    });
  }, [projects, searchQuery, projectFilter]);

  return {
    currentSpace,
    user,
    projects,
    setProjects,
    loading,
    searchQuery,
    setSearchQuery,
    projectFilter,
    setProjectFilter,
    filteredProjects,
    loadData,
  };
}
