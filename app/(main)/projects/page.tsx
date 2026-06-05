'use client';

// Force dynamic rendering to prevent useContext errors during static generation
export const dynamic = 'force-dynamic';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FolderKanban, Plus, Search } from 'lucide-react';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { CTAButton } from '@/components/ui/EnhancedButton';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { LazyNewProjectModal, LazyConfirmDialog } from '@/lib/utils/lazy-components';
import { useProjectsData } from '@/lib/hooks/useProjectsData';
import { useProjectsModals } from '@/lib/hooks/useProjectsModals';
import { useProjectsHandlers } from '@/lib/hooks/useProjectsHandlers';

// PR14: the budget/bills/expenses/receipts tabs moved to the /budget hub. Old
// deep-links (/projects?tab=budgets etc.) are redirected so bookmarks keep
// working. /projects is now home-renovation projects only.
const TAB_REDIRECTS: Record<string, string> = {
  budgets: '/budget',
  bills: '/budget/bills',
  expenses: '/budget/expenses',
  receipts: '/budget/receipts',
};

const FILTERS: Array<'all' | 'active' | 'completed'> = ['all', 'active', 'completed'];

export default function ProjectsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Redirect legacy budget-tab deep-links to the /budget hub.
  useEffect(() => {
    const tab = searchParams?.get('tab');
    if (tab && TAB_REDIRECTS[tab]) {
      router.replace(TAB_REDIRECTS[tab]);
    }
  }, [searchParams, router]);

  const data = useProjectsData();
  const modals = useProjectsModals();
  const handlers = useProjectsHandlers({
    editingProject: modals.editingProject,
    setEditingProject: modals.setEditingProject,
    confirmDialog: modals.confirmDialog,
    setConfirmDialog: modals.setConfirmDialog,
    loadData: data.loadData,
  });

  const {
    currentSpace,
    loading,
    filteredProjects,
    searchQuery,
    setSearchQuery,
    projectFilter,
    setProjectFilter,
  } = data;

  const {
    isProjectModalOpen,
    editingProject,
    confirmDialog,
    handleCloseProjectModal,
    handleEditProject,
    setIsProjectModalOpen,
    setConfirmDialog,
  } = modals;

  const { handleCreateProject, handleDeleteProject, handleConfirmDelete } = handlers;

  return (
    <FeatureLayout breadcrumbItems={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Projects' }]}>
      <div className="p-4 sm:p-6 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                <FolderKanban className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">Projects</h1>
                <p className="text-gray-400 text-sm">Track your home improvement projects</p>
              </div>
            </div>
            {currentSpace && (
              <CTAButton onClick={() => setIsProjectModalOpen(true)} feature="projects" icon={<Plus className="w-5 h-5" />} className="!rounded-full">
                Create Project
              </CTAButton>
            )}
          </div>

          {/* Search + filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects..."
                aria-label="Search projects"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="flex gap-1 bg-gray-800 border border-gray-700 rounded-xl p-1">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setProjectFilter(f)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                    projectFilter === f ? 'bg-amber-500 text-white' : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="text-center py-12">
              <div className="animate-spin w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-gray-400">Loading projects...</p>
            </div>
          )}

          {/* Empty */}
          {!loading && filteredProjects.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4">
                <FolderKanban className="w-8 h-8 text-amber-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Ready to tackle that project?</h3>
              <p className="text-sm text-gray-400 max-w-sm mb-6">Start tracking your home improvement projects.</p>
              {currentSpace && (
                <CTAButton onClick={() => setIsProjectModalOpen(true)} feature="projects" icon={<Plus className="w-5 h-5" />} className="!rounded-full">
                  Create Project
                </CTAButton>
              )}
            </div>
          )}

          {/* Grid */}
          {!loading && filteredProjects.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
              {filteredProjects.map((project) => (
                <ProjectCard key={project.id} project={project} onEdit={handleEditProject} onDelete={handleDeleteProject} />
              ))}
            </div>
          )}
        </div>
      </div>

      {currentSpace && (
        <LazyNewProjectModal
          isOpen={isProjectModalOpen}
          onClose={handleCloseProjectModal}
          onSave={handleCreateProject}
          editProject={editingProject}
          spaceId={currentSpace.id}
        />
      )}

      <LazyConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, action: 'delete-project', id: '' })}
        onConfirm={handleConfirmDelete}
        title="Delete Project"
        message="Are you sure you want to delete this project? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </FeatureLayout>
  );
}
