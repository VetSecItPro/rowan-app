import { createClient } from '@/lib/supabase/client';
import { getCategoryForItem } from '@/lib/constants/shopping-categories';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

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

export const shoppingService = {
  async getLists(spaceId: string): Promise<ShoppingList[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('shopping_lists')
      .select('*, items:shopping_items(*, assignee:users!shopping_items_assigned_to_fkey(id, name, email, avatar_url))')
      .eq('space_id', spaceId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getListById(id: string): Promise<ShoppingList | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('shopping_lists')
      .select('*, items:shopping_items(*, assignee:users!shopping_items_assigned_to_fkey(id, name, email, avatar_url))')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async createList(input: CreateListWithItemsInput): Promise<ShoppingList> {
    const supabase = createClient();
    // Remove items field if it exists (items are created separately)
    const { items, ...listData } = input;

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

  async updateList(id: string, updates: UpdateListInput): Promise<ShoppingList> {
    const supabase = createClient();
    // Remove items field if it exists (items are managed separately)
    const { items, ...updateData } = updates;
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

  async deleteList(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('shopping_lists')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

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

  async toggleItem(id: string, checked: boolean): Promise<ShoppingItem> {
    const supabase = createClient();
    return this.updateItem(id, { checked } as Partial<CreateItemInput>);
  },

  async deleteItem(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('shopping_items')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getShoppingStats(spaceId: string): Promise<ShoppingStats> {
    const supabase = createClient();
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

  // Real-time subscription for shopping lists
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

  // Real-time subscription for shopping items
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

  // Get frequently purchased items
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

  // Template management
  async getTemplates(spaceId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('shopping_templates')
      .select('*')
      .eq('space_id', spaceId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

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

  async deleteTemplate(id: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from('shopping_templates')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async createListFromTemplate(templateId: string, spaceId: string) {
    const supabase = createClient();

    // Get template
    const { data: template, error: templateError } = await supabase
      .from('shopping_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (templateError) throw templateError;

    // Create list
    const list = await this.createList({
      space_id: spaceId,
      title: template.name,
      description: template.description,
    });

    // Add items
    const items = typeof template.items === 'string' ? JSON.parse(template.items) : template.items;
    for (const item of items) {
      await this.createItem({
        list_id: list.id,
        name: item.name,
        quantity: item.quantity || 1,
        category: item.category,
      });
    }

    return list;
  },
};
