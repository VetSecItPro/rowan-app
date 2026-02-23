import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createInvitation,
  getInvitationByToken,
  acceptInvitation,
  cancelInvitation,
  getPendingInvitations,
  resendInvitation,
  cleanupExpiredInvitations,
} from '@/lib/services/invitations-service';

// Mock Supabase using vi.hoisted to avoid hoisting issues
const { mockSupabase, mockCreateClient } = vi.hoisted(() => {
  const mockSupabase: any = {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(),
          })),
          single: vi.fn(),
          order: vi.fn(() => ({
            // for getPendingInvitations
          })),
        })),
        single: vi.fn(),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(),
        })),
        lt: vi.fn(() => ({
          select: vi.fn(),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(),
      })),
    })),
  };

  const mockCreateClient = vi.fn(async () => mockSupabase);

  return { mockSupabase, mockCreateClient };
});

vi.mock('@/lib/supabase/server', () => ({
  createClient: mockCreateClient,
}));

describe('invitations-service', () => {
  // Use valid UUIDs for tests
  const VALID_SPACE_ID = '123e4567-e89b-12d3-a456-426614174000';
  const VALID_USER_ID = '123e4567-e89b-12d3-a456-426614174001';
  const VALID_INV_ID = '123e4567-e89b-12d3-a456-426614174002';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createInvitation', () => {
    it('should create an invitation when user is owner', async () => {
      const mockInvitation = {
        id: VALID_INV_ID,
        space_id: VALID_SPACE_ID,
        email: 'test@example.com',
        invited_by: VALID_USER_ID,
        token: 'test-token',
        status: 'pending',
        role: 'member',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
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
        if (table === 'space_invitations') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    single: vi.fn().mockResolvedValue({
                      data: null,
                      error: { code: 'PGRST116' },
                    }),
                  })),
                })),
              })),
            })),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: mockInvitation,
                  error: null,
                }),
              })),
            })),
          };
        }
      });

      const result = await createInvitation(VALID_SPACE_ID, 'test@example.com', VALID_USER_ID, 'member');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('test@example.com');
        expect(result.data.status).toBe('pending');
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

      const result = await createInvitation(VALID_SPACE_ID, 'test@example.com', VALID_USER_ID);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('permission');
      }
    });

    it('should fail when invitation already exists', async () => {
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
        if (table === 'space_invitations') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    single: vi.fn().mockResolvedValue({
                      data: { id: 'existing-inv' },
                      error: null,
                    }),
                  })),
                })),
              })),
            })),
          };
        }
      });

      const result = await createInvitation(VALID_SPACE_ID, 'test@example.com', VALID_USER_ID);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('already been sent');
      }
    });

    it('should validate email format', async () => {
      const result = await createInvitation('space-456', 'invalid-email', 'user-123');

      expect(result.success).toBe(false);
    });
  });

  describe('getInvitationByToken', () => {
    it('should return invitation when token is valid', async () => {
      const mockInvitation = {
        id: 'inv-123',
        space_id: 'space-456',
        email: 'test@example.com',
        status: 'pending',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        spaces: { id: 'space-456', name: 'Test Space' },
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: mockInvitation,
              error: null,
            }),
          })),
        })),
      });

      const result = await getInvitationByToken('valid-token');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('pending');
      }
    });

    it('should fail when token is invalid', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' },
            }),
          })),
        })),
      });

      const result = await getInvitationByToken('invalid-token');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Invalid invitation token');
      }
    });

    it('should fail when invitation is expired', async () => {
      const expiredInvitation = {
        id: 'inv-123',
        status: 'pending',
        expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: expiredInvitation,
              error: null,
            }),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      });

      const result = await getInvitationByToken('expired-token');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('expired');
      }
    });

    it('should fail when invitation is not pending', async () => {
      const acceptedInvitation = {
        id: 'inv-123',
        status: 'accepted',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: acceptedInvitation,
              error: null,
            }),
          })),
        })),
      });

      const result = await getInvitationByToken('accepted-token');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('already been accepted');
      }
    });
  });

  describe('acceptInvitation', () => {
    it('should accept invitation and add user to space', async () => {
      const mockInvitation = {
        id: 'inv-123',
        space_id: 'space-456',
        email: 'test@example.com',
        status: 'pending',
        role: 'member',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        spaces: { id: 'space-456', name: 'Test Space' },
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'space_invitations') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: mockInvitation,
                  error: null,
                }),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            })),
          };
        }
        if (table === 'space_members') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { code: 'PGRST116' },
                  }),
                })),
              })),
            })),
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
      });

      const result = await acceptInvitation('valid-token', 'user-123');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.spaceId).toBe('space-456');
      }
    });

    it('should fail when user is already a member', async () => {
      const mockInvitation = {
        id: 'inv-123',
        space_id: 'space-456',
        email: 'test@example.com',
        status: 'pending',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        spaces: { id: 'space-456', name: 'Test Space' },
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'space_invitations') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: mockInvitation,
                  error: null,
                }),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            })),
          };
        }
        if (table === 'space_members') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: { user_id: 'user-123' },
                    error: null,
                  }),
                })),
              })),
            })),
          };
        }
      });

      const result = await acceptInvitation('valid-token', 'user-123');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('already a member');
      }
    });
  });

  describe('cancelInvitation', () => {
    it('should cancel invitation when user is owner', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'space_invitations') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { space_id: 'space-456', status: 'pending' },
                  error: null,
                }),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            })),
          };
        }
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
      });

      const result = await cancelInvitation('inv-123', 'user-123');

      expect(result.success).toBe(true);
    });

    it('should fail when user is not owner or admin', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'space_invitations') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { space_id: 'space-456', status: 'pending' },
                  error: null,
                }),
              })),
            })),
          };
        }
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
      });

      const result = await cancelInvitation('inv-123', 'user-123');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('permission');
      }
    });
  });

  describe('getPendingInvitations', () => {
    it('should return pending invitations for space members', async () => {
      const mockInvitations = [
        {
          id: 'inv-1',
          email: 'user1@example.com',
          status: 'pending',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 'inv-2',
          email: 'user2@example.com',
          status: 'pending',
          expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        },
      ];

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
        if (table === 'space_invitations') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  order: vi.fn().mockResolvedValue({
                    data: mockInvitations,
                    error: null,
                  }),
                })),
              })),
            })),
            update: vi.fn(() => ({
              in: vi.fn().mockResolvedValue({ error: null }),
            })),
          };
        }
      });

      const result = await getPendingInvitations('space-456', 'user-123');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.length).toBe(2);
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

      const result = await getPendingInvitations('space-456', 'user-123');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('do not have access');
      }
    });
  });

  describe('cleanupExpiredInvitations', () => {
    it('should update expired invitations', async () => {
      mockSupabase.from.mockReturnValue({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            lt: vi.fn(() => ({
              select: vi.fn().mockResolvedValue({
                error: null,
                count: 5,
              }),
            })),
          })),
        })),
      });

      const result = await cleanupExpiredInvitations();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.count).toBe(5);
      }
    });

    it('should cleanup for specific space when provided', async () => {
      mockSupabase.from.mockReturnValue({
        update: vi.fn(() => ({
          eq: vi.fn((field: string, value: string) => {
            if (field === 'status') {
              return {
                lt: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    select: vi.fn().mockResolvedValue({
                      error: null,
                      count: 2,
                    }),
                  })),
                })),
              };
            }
            return {
              lt: vi.fn(() => ({
                select: vi.fn().mockResolvedValue({
                  error: null,
                  count: 2,
                }),
              })),
            };
          }),
        })),
      });

      const result = await cleanupExpiredInvitations('space-456');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.count).toBe(2);
      }
    });
  });
});
