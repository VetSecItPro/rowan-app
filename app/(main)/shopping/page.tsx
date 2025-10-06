'use client';

import { useState, useEffect } from 'react';
import { ShoppingCart, Search, Plus, List, CheckCircle2, Clock, Package } from 'lucide-react';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { ShoppingListCard } from '@/components/shopping/ShoppingListCard';
import { NewShoppingListModal } from '@/components/shopping/NewShoppingListModal';
import { useAuth } from '@/lib/contexts/mock-auth-context';
import { shoppingService, ShoppingList, CreateListInput } from '@/lib/services/shopping-service';

export default function ShoppingPage() {
  const { currentSpace } = useAuth();
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [filteredLists, setFilteredLists] = useState<ShoppingList[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingList, setEditingList] = useState<ShoppingList | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [stats, setStats] = useState({
    totalLists: 0,
    activeLists: 0,
    itemsThisWeek: 0,
    completedLists: 0,
  });

  useEffect(() => {
    loadLists();
  }, [currentSpace.id]);

  useEffect(() => {
    let filtered = lists;
    if (searchQuery) {
      filtered = filtered.filter(l =>
        l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    setFilteredLists(filtered);
  }, [lists, searchQuery]);

  async function loadLists() {
    try {
      setLoading(true);
      const [listsData, statsData] = await Promise.all([
        shoppingService.getLists(currentSpace.id),
        shoppingService.getShoppingStats(currentSpace.id),
      ]);
      setLists(listsData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load shopping lists:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateList(listData: CreateListInput) {
    try {
      if (editingList) {
        await shoppingService.updateList(editingList.id, listData);
      } else {
        await shoppingService.createList(listData);
      }
      loadLists();
      setEditingList(null);
    } catch (error) {
      console.error('Failed to save list:', error);
    }
  }

  async function handleDeleteList(listId: string) {
    if (!confirm('Are you sure you want to delete this list?')) return;
    try {
      await shoppingService.deleteList(listId);
      loadLists();
    } catch (error) {
      console.error('Failed to delete list:', error);
    }
  }

  async function handleToggleItem(itemId: string, checked: boolean) {
    try {
      await shoppingService.toggleItem(itemId, checked);
      loadLists();
    } catch (error) {
      console.error('Failed to toggle item:', error);
    }
  }

  function handleEditList(list: ShoppingList) {
    setEditingList(list);
    setIsModalOpen(true);
  }

  function handleCloseModal() {
    setIsModalOpen(false);
    setEditingList(null);
  }

  return (
    <FeatureLayout breadcrumbItems={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Shopping Lists' }]}>
      <div className="p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-shopping flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-shopping bg-clip-text text-transparent">Shopping Lists</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Collaborative shopping made easy</p>
              </div>
            </div>
            <button onClick={() => setIsModalOpen(true)} className="px-6 py-3 shimmer-bg text-white rounded-lg hover:opacity-90 transition-all shadow-lg flex items-center gap-2">
              <Plus className="w-5 h-5" />
              New List
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium">Total Lists</h3>
                <div className="w-12 h-12 bg-gradient-shopping rounded-xl flex items-center justify-center"><List className="w-6 h-6 text-white" /></div>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalLists}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium">Active Lists</h3>
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center"><Clock className="w-6 h-6 text-white" /></div>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.activeLists}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium">Items This Week</h3>
                <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center"><Package className="w-6 h-6 text-white" /></div>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.itemsThisWeek}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-600 dark:text-gray-400 font-medium">Completed Lists</h3>
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center"><CheckCircle2 className="w-6 h-6 text-white" /></div>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.completedLists}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input type="text" placeholder="Search lists..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">All Lists ({filteredLists.length})</h2>
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
                <p className="mt-4 text-gray-600 dark:text-gray-400">Loading lists...</p>
              </div>
            ) : filteredLists.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">No lists found</p>
                <p className="text-gray-500 dark:text-gray-500 mb-6">{searchQuery ? 'Try adjusting your search' : 'Create your first shopping list!'}</p>
                {!searchQuery && (
                  <button onClick={() => setIsModalOpen(true)} className="px-6 py-3 shimmer-bg text-white rounded-lg hover:opacity-90 transition-all shadow-lg inline-flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    Create List
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredLists.map((list) => (
                  <ShoppingListCard key={list.id} list={list} onEdit={handleEditList} onDelete={handleDeleteList} onToggleItem={handleToggleItem} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <NewShoppingListModal isOpen={isModalOpen} onClose={handleCloseModal} onSave={handleCreateList} editList={editingList} spaceId={currentSpace.id} />
    </FeatureLayout>
  );
}
