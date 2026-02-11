import { createClient } from '@/lib/supabase/client';
import { getCategoryForItem } from '@/lib/constants/shopping-categories';
import type { RealtimeChannel, RealtimePostgresChangesPayload, SupabaseClient } from '@supabase/supabase-js';

export interface ShoppingItem {
  id: string;
  list_id: string;
  name: string;
  quantity: number;
  unit?: string;
  category?: string;
  sort_order?: number;
  assigned_to?: string;
  assignee?: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
  };
  estimated_price?: number;
  actual_price?: number;
  recipe_source_id?: string;
  notes?: string;
  checked: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShoppingList {
  id: string;
  space_id: string;
  title: string;
  description?: string;
  status: 'active' | 'completed' | 'archived';
  store_name?: string;
  estimated_total?: number;
  actual_total?: number;
  budget?: number;
  last_modified_by?: string;
  last_modified_at?: string;
  items?: ShoppingItem[];
  created_by: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  // Sharing properties
  is_public?: boolean;
  share_token?: string;
  shared_at?: string;
}

export interface CreateListInput {
  space_id: string;
  title: string;
  description?: string;
  status?: 'active' | 'completed' | 'archived';
  store_name?: string;
  budget?: number;
}

export interface CreateItemInput {
  list_id: string;
  name: string;
  quantity?: number;
  unit?: string;
  category?: string;
  assigned_to?: string;
}

// For templates - items without list_id
export interface TemplateItemInput {
  name: string;
  quantity?: number;
  unit?: string;
  category?: string;
}

export interface CreateListWithItemsInput extends CreateListInput {
  items?: CreateItemInput[];
}

export interface UpdateListInput extends Partial<CreateListInput> {
  items?: CreateItemInput[];
}

export interface ShoppingStats {
  totalLists: number;
  activeLists: number;
  itemsThisWeek: number;
  completedLists: number;
}

interface ShoppingItemFromDB {
  name: string;
  category: string | null;
  created_at: string;
  list: { space_id: string };
}

const getSupabaseClient = (supabase?: SupabaseClient) => supabase ?? createClient();

/**
 * Shopping Service
 *
 * Manages shopping lists and items with real-time collaboration support.
 * Provides CRUD operations for lists, items, templates, and frequent item suggestions.
 */
export const shoppingService = {
  /**
   * Retrieves all shopping lists for a space with their items.
   * @param spaceId - The space identifier
   * @param supabaseClient - Optional Supabase client for server-side usage
   * @returns Array of shopping lists with nested items and assignee details
   * @throws Error if database query fails
   */
  async getLists(spaceId: string, supabaseClient?: SupabaseClient): Promise<ShoppingList[]> {
    const supabase = getSupabaseClient(supabaseClient);
    const { data, error } = await supabase
      .from('shopping_lists')
      .select('*, items:shopping_items(*, assignee:users!shopping_items_assigned_to_fkey(id, name, email, avatar_url))')
      .eq('space_id', spaceId)
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) throw error;
    return data || [];
  },

  /**
   * Retrieves a single shopping list by ID with all items.
   * @param id - The shopping list identifier
   * @param supabaseClient - Optional Supabase client for server-side usage
   * @returns The shopping list with items, or null if not found
   * @throws Error if database query fails
   */
  async getListById(id: string, supabaseClient?: SupabaseClient): Promise<ShoppingList | null> {
    const supabase = getSupabaseClient(supabaseClient);
    const { data, error } = await supabase
      .from('shopping_lists')
      .select('*, items:shopping_items(*, assignee:users!shopping_items_assigned_to_fkey(id, name, email, avatar_url))')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Creates a new shopping list.
   * @param input - List creation data including space_id, title, and optional fields
   * @param supabaseClient - Optional Supabase client for server-side usage
   * @returns The newly created shopping list
   * @throws Error if database insert fails
   */
  async createList(input: CreateListWithItemsInput, supabaseClient?: SupabaseClient): Promise<ShoppingList> {
    const supabase = getSupabaseClient(supabaseClient);
    // Remove items field if it exists (items are created separately)
    const listData = { ...input };
    delete (listData as { items?: unknown }).items;

    const { data, error } = await supabase
      .from('shopping_lists')
      .insert([{
        ...listData,
        status: listData.status || 'active',
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Updates an existing shopping list.
   * Automatically manages completed_at timestamp based on status changes.
   * @param id - The shopping list identifier
   * @param updates - Partial list data to update
   * @param supabaseClient - Optional Supabase client for server-side usage
   * @returns The updated shopping list
   * @throws Error if database update fails
   */
  async updateList(id: string, updates: UpdateListInput, supabaseClient?: SupabaseClient): Promise<ShoppingList> {
    const supabase = getSupabaseClient(supabaseClient);
    // Remove items field if it exists (items are managed separately)
    const updateData = { ...updates };
    delete (updateData as { items?: unknown }).items;
    const finalUpdates: Record<string, unknown> = { ...updateData };

    if (updateData.status === 'completed' && !finalUpdates.completed_at) {
      finalUpdates.completed_at = new Date().toISOString();
    }

    if (updateData.status && updateData.status !== 'completed') {
      finalUpdates.completed_at = null;
    }

    const { data, error } = await supabase
      .from('shopping_lists')
      .update(finalUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Deletes a shopping list and all associated items.
   * @param id - The shopping list identifier
   * @param supabaseClient - Optional Supabase client for server-side usage
   * @throws Error if database delete fails
   */
  async deleteList(id: string, supabaseClient?: SupabaseClient): Promise<void> {
    const supabase = getSupabaseClient(supabaseClient);
    const { error } = await supabase
      .from('shopping_lists')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Creates a new shopping item with auto-categorization.
   * @param input - Item creation data including list_id and name
   * @returns The newly created shopping item
   * @throws Error if database insert fails
   */
  async createItem(input: CreateItemInput): Promise<ShoppingItem> {
    const supabase = createClient();

    // Auto-categorize if no category provided
    const category = input.category || getCategoryForItem(input.name);

    const { data, error } = await supabase
      .from('shopping_items')
      .insert([{
        ...input,
        quantity: input.quantity || 1,
        category,
        checked: false,
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Updates an existing shopping item.
   * @param id - The shopping item identifier
   * @param updates - Partial item data to update
   * @returns The updated shopping item
   * @throws Error if database update fails
   */
  async updateItem(id: string, updates: Partial<CreateItemInput>): Promise<ShoppingItem> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('shopping_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Toggles the checked status of a shopping item.
   * @param id - The shopping item identifier
   * @param checked - The new checked state
   * @returns The updated shopping item
   */
  async toggleItem(id: string, checked: boolean): Promise<ShoppingItem> {
    return this.updateItem(id, { checked } as Partial<CreateItemInput>);
  },

  /**
   * Deletes a shopping item.
   * @param id - The shopping item identifier
   * @throws Error if database delete fails
   */
  async deleteItem(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('shopping_items')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Retrieves shopping statistics for a space.
   * @param spaceId - The space identifier
   * @returns Statistics including total lists, active lists, items this week, and completed lists
   */
  async getShoppingStats(spaceId: string): Promise<ShoppingStats> {
    const lists = await this.getLists(spaceId);
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    let itemsThisWeek = 0;
    lists.forEach(list => {
      if (list.items) {
        itemsThisWeek += list.items
          .filter(item => new Date(item.created_at) >= weekAgo)
          .length; // Count items, not quantities
      }
    });

    return {
      totalLists: lists.length,
      activeLists: lists.filter(l => l.status === 'active').length,
      itemsThisWeek,
      completedLists: lists.filter(l => l.status === 'completed').length,
    };
  },

  /**
   * Subscribes to real-time shopping list changes for a space.
   * @param spaceId - The space identifier
   * @param callback - Function called when lists change (INSERT/UPDATE/DELETE)
   * @returns RealtimeChannel for unsubscription
   */
  subscribeToLists(spaceId: string, callback: (payload: RealtimePostgresChangesPayload<{[key: string]: unknown}>) => void): RealtimeChannel {
    const supabase = createClient();

    const channel = supabase
      .channel(`shopping_lists:${spaceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shopping_lists',
          filter: `space_id=eq.${spaceId}`,
        },
        callback
      )
      .subscribe();

    return channel;
  },

  /**
   * Subscribes to real-time shopping item changes for a list.
   * @param listId - The shopping list identifier
   * @param callback - Function called when items change (INSERT/UPDATE/DELETE)
   * @returns RealtimeChannel for unsubscription
   */
  subscribeToItems(listId: string, callback: (payload: RealtimePostgresChangesPayload<{[key: string]: unknown}>) => void): RealtimeChannel {
    const supabase = createClient();

    const channel = supabase
      .channel(`shopping_items:${listId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shopping_items',
          filter: `list_id=eq.${listId}`,
        },
        callback
      )
      .subscribe();

    return channel;
  },

  /**
   * Retrieves frequently purchased items from the last 30 days.
   * Used for quick-add suggestions in the shopping UI.
   * @param spaceId - The space identifier
   * @param limit - Maximum number of items to return (default: 20)
   * @returns Array of items with name, purchase count, and category
   * @throws Error if database query fails
   */
  async getFrequentItems(spaceId: string, limit = 20): Promise<{ name: string; count: number; category: string }[]> {
    const supabase = createClient();

    // Get all items from this space's lists (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await supabase
      .from('shopping_items')
      .select('name, category, created_at, list:shopping_lists!list_id!inner(space_id)')
      .eq('list.space_id', spaceId)
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (error) throw error;
    if (!data) return [];

    // Count occurrences of each item name (case-insensitive)
    const itemCounts = new Map<string, { count: number; category: string }>();

    data.forEach((item: ShoppingItemFromDB) => {
      const normalizedName = item.name.trim().toLowerCase();
      const existing = itemCounts.get(normalizedName);

      if (existing) {
        existing.count++;
      } else {
        itemCounts.set(normalizedName, {
          count: 1,
          category: item.category || 'other',
        });
      }
    });

    // Convert to array and sort by frequency
    const frequentItems = Array.from(itemCounts.entries())
      .map(([name, data]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1), // Capitalize first letter
        count: data.count,
        category: data.category,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    return frequentItems;
  },

  /**
   * Retrieves all shopping templates for a space.
   * @param spaceId - The space identifier
   * @returns Array of shopping templates
   * @throws Error if database query fails
   */
  async getTemplates(spaceId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('shopping_templates')
      .select('id, space_id, name, description, items, created_at, updated_at')
      .eq('space_id', spaceId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Creates a new shopping template for reusable lists.
   * @param spaceId - The space identifier
   * @param name - Template name
   * @param description - Template description
   * @param items - Array of template items
   * @returns The newly created template
   * @throws Error if database insert fails
   */
  async createTemplate(spaceId: string, name: string, description: string, items: TemplateItemInput[]) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('shopping_templates')
      .insert([{
        space_id: spaceId,
        name,
        description,
        items: JSON.stringify(items),
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Deletes a shopping template.
   * @param id - The template identifier
   * @throws Error if database delete fails
   */
  async deleteTemplate(id: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from('shopping_templates')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Creates a new shopping list from a template.
   * Copies the template name, description, and all items to a new active list.
   * @param templateId - The template identifier
   * @param spaceId - The space identifier
   * @returns The newly created shopping list
   * @throws Error if template not found or database operation fails
   */
  async createListFromTemplate(templateId: string, spaceId: string) {
    const supabase = createClient();

    // Get template
    const { data: template, error: templateError } = await supabase
      .from('shopping_templates')
      .select('id, space_id, name, description, items, created_at, updated_at')
      .eq('id', templateId)
      .single();

    if (templateError) throw templateError;

    // Create list
    const list = await this.createList({
      space_id: spaceId,
      title: template.name,
      description: template.description,
    });

    // Batch insert all template items at once (FIX-036: eliminates N+1)
    const items = typeof template.items === 'string' ? JSON.parse(template.items) : template.items;
    if (items && items.length > 0) {
      const itemRows = items.map((item: TemplateItemInput) => ({
        list_id: list.id,
        name: item.name,
        quantity: item.quantity || 1,
        category: item.category || getCategoryForItem(item.name),
        checked: false,
      }));

      const { error: itemsError } = await supabase
        .from('shopping_items')
        .insert(itemRows);

      if (itemsError) throw itemsError;
    }

    return list;
  },
};
