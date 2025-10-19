'use client';

import { useState, useEffect } from 'react';
import { User, Search, X, UserCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface SpaceMember {
  id: string;
  user_id: string;
  users: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
  };
}

interface UserPickerProps {
  spaceId: string;
  selectedUserId?: string | null;
  onSelect: (userId: string | null) => void;
  label?: string;
  className?: string;
}

export function UserPicker({
  spaceId,
  selectedUserId,
  onSelect,
  label = 'Assigned to',
  className = '',
}: UserPickerProps) {
  const [members, setMembers] = useState<SpaceMember[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<SpaceMember[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch space members
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        setLoading(true);
        const supabase = createClient();

        const { data, error } = await supabase
          .from('space_members')
          .select(`
            id,
            user_id,
            users!user_id (
              id,
              name,
              email,
              avatar_url
            )
          `)
          .eq('space_id', spaceId);

        if (error) {
          console.error('Error fetching space members:', error);
          return;
        }

        setMembers((data as unknown as SpaceMember[]) || []);
        setFilteredMembers((data as unknown as SpaceMember[]) || []);
      } catch (error) {
        console.error('Error fetching space members:', error);
      } finally {
        setLoading(false);
      }
    };

    if (spaceId) {
      fetchMembers();
    }
  }, [spaceId]);

  // Filter members based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredMembers(members);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = members.filter((member) => {
      const userName = member.users?.name?.toLowerCase() || '';
      const userEmail = member.users?.email?.toLowerCase() || '';
      return userName.includes(query) || userEmail.includes(query);
    });

    setFilteredMembers(filtered);
  }, [searchQuery, members]);

  // Get selected member
  const selectedMember = members.find((m) => m.user_id === selectedUserId);

  // Handle member selection
  const handleSelect = (userId: string | null) => {
    onSelect(userId);
    setIsOpen(false);
    setSearchQuery('');
  };

  // Get initials for avatar fallback
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Label */}
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {label}
      </label>

      {/* Selected User Display / Dropdown Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-left flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        {selectedMember ? (
          <div className="flex items-center gap-3">
            {/* Avatar */}
            {selectedMember.users?.avatar_url ? (
              <img
                src={selectedMember.users.avatar_url}
                alt={selectedMember.users.name}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                {getInitials(selectedMember.users?.name || 'U')}
              </div>
            )}
            <span className="text-gray-900 dark:text-white font-medium">
              {selectedMember.users?.name}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <User className="w-5 h-5" />
            <span>Unassigned</span>
          </div>
        )}

        <UserCheck className="w-5 h-5 text-gray-400" />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Panel */}
          <div className="absolute z-20 mt-2 w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-80 overflow-hidden">
            {/* Search Input */}
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 dark:text-white"
                  autoFocus
                />
              </div>
            </div>

            {/* Members List */}
            <div className="max-h-60 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  Loading members...
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  {searchQuery ? 'No members found' : 'No members in this space'}
                </div>
              ) : (
                <>
                  {/* Unassigned Option */}
                  <button
                    onClick={() => handleSelect(null)}
                    className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                      !selectedUserId ? 'bg-pink-50 dark:bg-pink-900/20' : ''
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                      <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Unassigned
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        No one assigned
                      </p>
                    </div>
                    {!selectedUserId && (
                      <UserCheck className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                    )}
                  </button>

                  {/* Member Options */}
                  {filteredMembers.map((member) => (
                    <button
                      key={member.id}
                      onClick={() => handleSelect(member.user_id)}
                      className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                        selectedUserId === member.user_id
                          ? 'bg-pink-50 dark:bg-pink-900/20'
                          : ''
                      }`}
                    >
                      {/* Avatar */}
                      {member.users?.avatar_url ? (
                        <img
                          src={member.users.avatar_url}
                          alt={member.users.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                          {getInitials(member.users?.name || 'U')}
                        </div>
                      )}

                      {/* User Info */}
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {member.users?.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {member.users?.email}
                        </p>
                      </div>

                      {/* Selected Indicator */}
                      {selectedUserId === member.user_id && (
                        <UserCheck className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                      )}
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
