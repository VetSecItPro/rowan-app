import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createSpace,
  getUserSpaces,
  getSpace,
  getSpaceMembers,
  updateSpace,
  deleteSpace,
  removeMember,
  updateMemberRole,
  leaveSpace,
} from '@/lib/services/spaces-service';

// Mock Supabase client using vi.hoisted to avoid hoisting issues
const { mockSupabase, mockCreateClient } = vi.hoisted(() => {
  const mockSupabase = {
    from: vi.fn(),
  };

  const mockCreateClient = vi.fn(() => mockSupabase);

  return { mockSupabase, mockCreateClient };
});

// Mock dependencies
vi.mock('@/lib/supabase/client', () => ({
  createClient: mockCreateClient,
}));

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

describe('spaces-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createSpace', () => {
    it('should create a new space and add creator as owner', async () => {
      const mockSpace = {
        id: 'space-123',
        name: 'Test Space',
        is_personal: false,
        auto_created: false,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'spaces') {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: mockSpace,
                  error: null,
                }),
              })),
            })),
          };
        }
        if (table === 'space_members') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
      });

      const result = await createSpace('Test Space', 'user-123');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Test Space');
      }
    });

    it('should validate space name', async () => {
      const result = await createSpace('', 'user-123');

      expect(result.success).toBe(false);
    });

    it('should rollback space creation if member insert fails', async () => {
      const mockSpace = {
        id: 'space-123',
        name: 'Test Space',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      const deleteSpy = vi.fn().mockResolvedValue({ error: null });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'spaces') {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: mockSpace,
                  error: null,
                }),
              })),
            })),
            delete: vi.fn(() => ({
              eq: deleteSpy,
            })),
          };
        }
        if (table === 'space_members') {
          return {
            insert: vi.fn().mockResolvedValue({
              error: { message: 'Insert failed' },
            }),
          };
        }
      });

      const result = await createSpace('Test Space', 'user-123');

      expect(result.success).toBe(false);
      expect(deleteSpy).toHaveBeenCalled();
    });
  });

  describe('getUserSpaces', () => {
    it('should return all spaces for a user', async () => {
      const mockSpaces = [
        {
          role: 'owner',
          spaces: {
            id: 'space-1',
            name: 'Space 1',
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z',
          },
        },
        {
          role: 'member',
          spaces: {
            id: 'space-2',
            name: 'Space 2',
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z',
          },
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn().mockResolvedValue({
              data: mockSpaces,
              error: null,
            }),
          })),
        })),
      });

      const result = await getUserSpaces('user-123');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        expect(result.data[0].role).toBe('owner');
      }
    });

    it('should handle database error', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          })),
        })),
      });

      const result = await getUserSpaces('user-123');

      expect(result.success).toBe(false);
    });
  });

  describe('getSpace', () => {
    it('should return space with role when user has access', async () => {
      const mockSpace = {
        id: 'space-123',
        name: 'Test Space',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'space_members') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: { role: 'member' },
                    error: null,
                  }),
                })),
              })),
            })),
          };
        }
        if (table === 'spaces') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: mockSpace,
                  error: null,
                }),
              })),
            })),
          };
        }
      });

      const result = await getSpace('space-123', 'user-123');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('space-123');
        expect(result.data.role).toBe('member');
      }
    });

    it('should fail when user is not a member', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Not found' },
              }),
            })),
          })),
        })),
      });

      const result = await getSpace('space-123', 'user-123');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('do not have access');
      }
    });
  });

  describe('updateSpace', () => {
    it('should update space when user is owner', async () => {
      const updatedSpace = {
        id: 'space-123',
        name: 'Updated Space',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-02T00:00:00Z',
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'space_members') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: { role: 'owner' },
                    error: null,
                  }),
                })),
              })),
            })),
          };
        }
        if (table === 'spaces') {
          return {
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: updatedSpace,
                    error: null,
                  }),
                })),
              })),
            })),
          };
        }
      });

      const result = await updateSpace('space-123', 'user-123', { name: 'Updated Space' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Updated Space');
      }
    });

    it('should fail when user is not owner or admin', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { role: 'member' },
                error: null,
              }),
            })),
          })),
        })),
      });

      const result = await updateSpace('space-123', 'user-123', { name: 'New Name' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('permission');
      }
    });
  });

  describe('deleteSpace', () => {
    it('should delete space when user is owner', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'space_members') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: { role: 'owner' },
                    error: null,
                  }),
                })),
              })),
            })),
          };
        }
        if (table === 'spaces') {
          return {
            delete: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            })),
          };
        }
      });

      const result = await deleteSpace('space-123', 'user-123');

      expect(result.success).toBe(true);
    });

    it('should fail when user is not owner', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { role: 'admin' },
                error: null,
              }),
            })),
          })),
        })),
      });

      const result = await deleteSpace('space-123', 'user-123');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Only the space owner');
      }
    });
  });

  describe('removeMember', () => {
    it('should remove member when user is owner', async () => {
      mockSupabase.from
        .mockReturnValueOnce({
          // First call: check requester role
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { role: 'owner' },
                  error: null,
                }),
              })),
            })),
          })),
        })
        .mockReturnValueOnce({
          // Second call: check target member role
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { role: 'member' },
                  error: null,
                }),
              })),
            })),
          })),
        })
        .mockReturnValueOnce({
          // Third call: delete member
          delete: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            })),
          })),
        });

      const result = await removeMember('space-123', 'user-123', 'user-456');

      expect(result.success).toBe(true);
    });

    it('should fail when trying to remove owner', async () => {
      mockSupabase.from
        .mockReturnValueOnce({
          // First call: check requester role (admin is allowed)
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { role: 'admin' },
                  error: null,
                }),
              })),
            })),
          })),
        })
        .mockReturnValueOnce({
          // Second call: check target member role (is owner, cannot remove)
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { role: 'owner' },
                  error: null,
                }),
              })),
            })),
          })),
        });

      const result = await removeMember('space-123', 'user-123', 'user-456');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Cannot remove the space owner');
      }
    });
  });

  describe('updateMemberRole', () => {
    it('should update member role when user is owner', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { role: 'owner' },
                error: null,
              }),
            })),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })),
        })),
      });

      const result = await updateMemberRole('space-123', 'user-123', 'user-456', 'admin');

      expect(result.success).toBe(true);
    });

    it('should fail when user is not owner', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { role: 'admin' },
                error: null,
              }),
            })),
          })),
        })),
      });

      const result = await updateMemberRole('space-123', 'user-123', 'user-456', 'admin');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Only the space owner');
      }
    });

    it('should fail when trying to change own role as owner', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { role: 'owner' },
                error: null,
              }),
            })),
          })),
        })),
      });

      const result = await updateMemberRole('space-123', 'user-123', 'user-123', 'admin');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Cannot change your own role');
      }
    });
  });

  describe('leaveSpace', () => {
    it('should allow member to leave space', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { role: 'member' },
                error: null,
              }),
            })),
          })),
        })),
        delete: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })),
        })),
      });

      const result = await leaveSpace('space-123', 'user-123');

      expect(result.success).toBe(true);
    });

    it('should fail when owner tries to leave', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { role: 'owner' },
                error: null,
              }),
            })),
          })),
        })),
      });

      const result = await leaveSpace('space-123', 'user-123');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Space owners cannot leave');
      }
    });
  });

  describe('getSpaceMembers', () => {
    it('should return all space members when user has access', async () => {
      const mockMembers = [
        {
          space_id: 'space-123',
          user_id: 'user-1',
          role: 'owner',
          joined_at: '2025-01-01T00:00:00Z',
          users: {
            id: 'user-1',
            name: 'John Doe',
            email: 'john@example.com',
            avatar_url: null,
          },
        },
        {
          space_id: 'space-123',
          user_id: 'user-2',
          role: 'member',
          joined_at: '2025-01-02T00:00:00Z',
          users: {
            id: 'user-2',
            name: 'Jane Doe',
            email: 'jane@example.com',
            avatar_url: null,
          },
        },
      ];

      mockSupabase.from
        .mockReturnValueOnce({
          // First call: check user membership
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { role: 'member' },
                  error: null,
                }),
              })),
            })),
          })),
        })
        .mockReturnValueOnce({
          // Second call: get all members
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn().mockResolvedValue({
                data: mockMembers,
                error: null,
              }),
            })),
          })),
        });

      const result = await getSpaceMembers('space-123', 'user-123');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
      }
    });

    it('should fail when user is not a member', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Not found' },
              }),
            })),
          })),
        })),
      });

      const result = await getSpaceMembers('space-123', 'user-123');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('do not have access');
      }
    });
  });
});
