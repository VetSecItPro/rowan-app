import { createClient } from '@/lib/supabase/client';
import { sanitizeSearchInput } from '@/lib/utils/input-sanitization';

// ==================== TYPES ====================

export type ProjectStatus = 'planning' | 'in-progress' | 'on-hold' | 'completed' | 'cancelled';
export type ProjectPriority = 'low' | 'medium' | 'high' | 'urgent';
export type PhotoType = 'before' | 'during' | 'after' | 'progress' | 'receipt' | 'damage';

export interface Project {
  id: string;
  space_id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  priority: ProjectPriority;
  start_date: string | null;
  estimated_completion_date: string | null;
  actual_completion_date: string | null;
  estimated_budget: number | null;
  actual_cost: number;
  budget_variance: number;
  variance_percentage: number;
  location: string | null;
  tags: string[] | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Vendor {
  id: string;
  space_id: string;
  name: string;
  company_name: string | null;
  trade: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
  license_number: string | null;
  insurance_verified: boolean;
  rating: number | null;
  notes: string | null;
  is_preferred: boolean;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectLineItem {
  id: string;
  project_id: string;
  vendor_id: string | null;
  category: string;
  description: string;
  quantity: number;
  unit_price: number | null;
  estimated_cost: number;
  actual_cost: number;
  is_paid: boolean;
  paid_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectPhoto {
  id: string;
  project_id: string;
  title: string | null;
  description: string | null;
  photo_url: string;
  photo_type: PhotoType;
  taken_date: string;
  display_order: number;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectInput {
  space_id: string;
  name: string;
  description?: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  start_date?: string;
  estimated_completion_date?: string;
  estimated_budget?: number;
  location?: string;
  tags?: string[];
  created_by: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  start_date?: string;
  estimated_completion_date?: string;
  actual_completion_date?: string;
  estimated_budget?: number;
  location?: string;
  tags?: string[];
}

export interface CreateVendorInput {
  space_id: string;
  name: string;
  company_name?: string;
  trade?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  license_number?: string;
  insurance_verified?: boolean;
  rating?: number;
  notes?: string;
  is_preferred?: boolean;
  is_active?: boolean;
  created_by: string;
}

export interface CreateLineItemInput {
  project_id: string;
  vendor_id?: string;
  category: string;
  description: string;
  quantity?: number;
  unit_price?: number;
  estimated_cost: number;
  notes?: string;
}

export interface CreatePhotoInput {
  project_id: string;
  title?: string;
  description?: string;
  photo_url: string;
  photo_type?: PhotoType;
  taken_date?: string;
  display_order?: number;
  uploaded_by: string;
}

// ==================== PROJECTS ====================

/**
 * Gets all projects for a space
 */
export async function getProjects(spaceId: string): Promise<Project[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('space_id', spaceId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Gets a single project by ID
 */
export async function getProject(projectId: string): Promise<Project | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Creates a new project
 */
export async function createProject(input: CreateProjectInput): Promise<Project> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('projects')
    .insert([input])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Updates a project
 */
export async function updateProject(
  projectId: string,
  updates: UpdateProjectInput
): Promise<Project> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', projectId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Deletes a project
 */
export async function deleteProject(projectId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from('projects').delete().eq('id', projectId);

  if (error) throw error;
}

/**
 * Gets project summary with counts
 */
export async function getProjectSummary(projectId: string): Promise<Record<string, unknown> | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('project_summary')
    .select('*')
    .eq('project_id', projectId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Gets projects by status
 */
export async function getProjectsByStatus(
  spaceId: string,
  status: ProjectStatus
): Promise<Project[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('space_id', spaceId)
    .eq('status', status)
    .order('priority', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Gets projects over budget
 */
export async function getProjectsOverBudget(spaceId: string): Promise<Project[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('space_id', spaceId)
    .lt('budget_variance', 0)
    .order('budget_variance', { ascending: true });

  if (error) throw error;
  return data || [];
}

// ==================== VENDORS ====================

/**
 * Gets all vendors for a space
 */
export async function getVendors(spaceId: string): Promise<Vendor[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('space_id', spaceId)
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Gets a single vendor by ID
 */
export async function getVendor(vendorId: string): Promise<Vendor | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('id', vendorId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Creates a new vendor
 */
export async function createVendor(input: CreateVendorInput): Promise<Vendor> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('vendors')
    .insert([input])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Updates a vendor
 */
export async function updateVendor(
  vendorId: string,
  updates: Partial<Vendor>
): Promise<Vendor> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('vendors')
    .update(updates)
    .eq('id', vendorId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Deletes a vendor
 */
export async function deleteVendor(vendorId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from('vendors').delete().eq('id', vendorId);

  if (error) throw error;
}

/**
 * Gets preferred vendors
 */
export async function getPreferredVendors(spaceId: string): Promise<Vendor[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('space_id', spaceId)
    .eq('is_preferred', true)
    .eq('is_active', true)
    .order('rating', { ascending: false, nullsFirst: false });

  if (error) throw error;
  return data || [];
}

/**
 * Gets vendor spend summary
 */
export async function getVendorSpendSummary(vendorId: string): Promise<Record<string, unknown> | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('vendor_spend_summary')
    .select('*')
    .eq('vendor_id', vendorId)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // Ignore "no rows" error
  return data;
}

/**
 * Gets vendors by trade
 */
export async function getVendorsByTrade(spaceId: string, trade: string): Promise<Vendor[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('space_id', spaceId)
    .ilike('trade', `%${sanitizeSearchInput(trade)}%`)
    .eq('is_active', true)
    .order('rating', { ascending: false, nullsFirst: false });

  if (error) throw error;
  return data || [];
}

// ==================== LINE ITEMS ====================

/**
 * Gets all line items for a project
 */
export async function getProjectLineItems(projectId: string): Promise<ProjectLineItem[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('project_line_items')
    .select('*')
    .eq('project_id', projectId)
    .order('category', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Creates a new line item
 */
export async function createLineItem(input: CreateLineItemInput): Promise<ProjectLineItem> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('project_line_items')
    .insert([input])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Updates a line item
 */
export async function updateLineItem(
  lineItemId: string,
  updates: Partial<ProjectLineItem>
): Promise<ProjectLineItem> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('project_line_items')
    .update(updates)
    .eq('id', lineItemId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Deletes a line item
 */
export async function deleteLineItem(lineItemId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from('project_line_items').delete().eq('id', lineItemId);

  if (error) throw error;
}

/**
 * Gets cost breakdown by category
 */
export async function getProjectCostBreakdown(projectId: string): Promise<Record<string, unknown>[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('project_cost_breakdown')
    .select('*')
    .eq('project_id', projectId)
    .order('total_estimated', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Marks a line item as paid
 */
export async function markLineItemPaid(lineItemId: string, paidDate?: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('project_line_items')
    .update({
      is_paid: true,
      paid_date: paidDate || new Date().toISOString().split('T')[0],
    })
    .eq('id', lineItemId);

  if (error) throw error;
}

// ==================== PHOTOS ====================

/**
 * Gets all photos for a project
 */
export async function getProjectPhotos(projectId: string): Promise<ProjectPhoto[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('project_photos')
    .select('*')
    .eq('project_id', projectId)
    .order('display_order', { ascending: true })
    .order('taken_date', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Creates a new project photo
 */
export async function createProjectPhoto(input: CreatePhotoInput): Promise<ProjectPhoto> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('project_photos')
    .insert([input])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Updates a photo
 */
export async function updateProjectPhoto(
  photoId: string,
  updates: Partial<ProjectPhoto>
): Promise<ProjectPhoto> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('project_photos')
    .update(updates)
    .eq('id', photoId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Deletes a photo
 */
export async function deleteProjectPhoto(photoId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from('project_photos').delete().eq('id', photoId);

  if (error) throw error;
}

/**
 * Gets photos by type
 */
export async function getProjectPhotosByType(
  projectId: string,
  photoType: PhotoType
): Promise<ProjectPhoto[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('project_photos')
    .select('*')
    .eq('project_id', projectId)
    .eq('photo_type', photoType)
    .order('taken_date', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Reorders photos
 */
export async function reorderPhotos(photoIds: string[]): Promise<void> {
  const supabase = createClient();

  // Update display_order for each photo
  const updates = photoIds.map((photoId, index) => ({
    id: photoId,
    display_order: index,
  }));

  for (const update of updates) {
    await supabase
      .from('project_photos')
      .update({ display_order: update.display_order })
      .eq('id', update.id);
  }
}

// ==================== STATISTICS ====================

/**
 * Gets project statistics for a space
 */
export async function getProjectStats(spaceId: string): Promise<{
  total_projects: number;
  active_projects: number;
  completed_projects: number;
  total_estimated_budget: number;
  total_actual_cost: number;
  total_variance: number;
  projects_over_budget: number;
  projects_under_budget: number;
  avg_variance_percentage: number;
}> {
  const supabase = createClient();

  const { data: projects, error } = await supabase
    .from('projects')
    .select('status, estimated_budget, actual_cost, budget_variance')
    .eq('space_id', spaceId);

  if (error) throw error;

  type ProjectBudgetData = Pick<Project, 'status' | 'estimated_budget' | 'actual_cost' | 'budget_variance'>;
  const typedProjects = projects as ProjectBudgetData[] | null;

  const stats = {
    total_projects: typedProjects?.length || 0,
    active_projects: typedProjects?.filter((p: ProjectBudgetData) => p.status === 'in-progress').length || 0,
    completed_projects: typedProjects?.filter((p: ProjectBudgetData) => p.status === 'completed').length || 0,
    total_estimated_budget: typedProjects?.reduce((sum: number, p: ProjectBudgetData) => sum + (p.estimated_budget || 0), 0) || 0,
    total_actual_cost: typedProjects?.reduce((sum: number, p: ProjectBudgetData) => sum + p.actual_cost, 0) || 0,
    total_variance: typedProjects?.reduce((sum: number, p: ProjectBudgetData) => sum + p.budget_variance, 0) || 0,
    projects_over_budget: typedProjects?.filter((p: ProjectBudgetData) => p.budget_variance < 0).length || 0,
    projects_under_budget: typedProjects?.filter((p: ProjectBudgetData) => p.budget_variance > 0).length || 0,
    avg_variance_percentage: typedProjects?.length && typedProjects.length > 0 ?
      (typedProjects.reduce((sum: number, p: ProjectBudgetData) => sum + Math.abs(p.budget_variance || 0), 0) / typedProjects.length) /
      (typedProjects.reduce((sum: number, p: ProjectBudgetData) => sum + (p.estimated_budget || 1), 0) / typedProjects.length) * 100 : 0,
  };

  return stats;
}

/**
 * Links an expense to a project
 */
export async function linkExpenseToProject(
  expenseId: string,
  projectId: string,
  vendorId?: string,
  lineItemId?: string
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('expenses')
    .update({
      project_id: projectId,
      vendor_id: vendorId || null,
      line_item_id: lineItemId || null,
    })
    .eq('id', expenseId);

  if (error) throw error;
}

/**
 * Gets expenses for a project
 */
export async function getProjectExpenses(projectId: string): Promise<Record<string, unknown>[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('project_id', projectId)
    .order('date', { ascending: false });

  if (error) throw error;
  return data || [];
}
