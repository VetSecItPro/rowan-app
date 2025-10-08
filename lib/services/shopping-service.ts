import { createClient } from '@/lib/supabase/client';

export interface ShoppingItem {
  id: string;
  list_id: string;
  name: string;
  quantity: number;
  unit?: string;
  category?: string;
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
  items?: ShoppingItem[];
  created_by: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface CreateListInput {
  space_id: string;
  title: string;
  description?: string;
  status?: 'active' | 'completed' | 'archived';
}

export interface CreateItemInput {
  list_id: string;
  name: string;
  quantity?: number;
  unit?: string;
  category?: string;
}

export interface ShoppingStats {
  totalLists: number;
  activeLists: number;
  itemsThisWeek: number;
  completedLists: number;
}

export const shoppingService = {
  async getLists(spaceId: string): Promise<ShoppingList[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('shopping_lists')
      .select('*, items:shopping_items(*)')
      .eq('space_id', spaceId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getListById(id: string): Promise<ShoppingList | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('shopping_lists')
      .select('*, items:shopping_items(*)')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async createList(input: CreateListInput & { items?: any }): Promise<ShoppingList> {
    const supabase = createClient();
    // Remove items field if it exists (items are created separately)
    const { items, ...listData } = input as any;

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

  async updateList(id: string, updates: Partial<CreateListInput> & { items?: any }): Promise<ShoppingList> {
    const supabase = createClient();
    // Remove items field if it exists (items are managed separately)
    const { items, ...updateData } = updates as any;
    const finalUpdates: any = { ...updateData };

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
    const { data, error } = await supabase
      .from('shopping_items')
      .insert([{
        ...input,
        quantity: input.quantity || 1,
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
    return this.updateItem(id, { checked } as any);
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
        itemsThisWeek += list.items.filter(item =>
          new Date(item.created_at) >= weekAgo
        ).length;
      }
    });

    return {
      totalLists: lists.length,
      activeLists: lists.filter(l => l.status === 'active').length,
      itemsThisWeek,
      completedLists: lists.filter(l => l.status === 'completed').length,
    };
  },
};
