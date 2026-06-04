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

  // Phase 11.1: the member cap is the SPACE OWNER's tier, resolved via the
  // get_user_subscription_tier RPC. The gate counts current members + pending
  // invitations. These tests drive the full gate path with a queue-based mock.
  describe('createInvitation — maxUsers cap (Phase 11.1)', () => {
    const SPACE = '123e4567-e89b-12d3-a456-426614174000';
    const INVITER = '123e4567-e89b-12d3-a456-426614174001';

    const mockInvitation = {
      id: '123e4567-e89b-12d3-a456-426614174002',
      space_id: SPACE,
      email: 'new@example.com',
      invited_by: INVITER,
      token: 't',
      status: 'pending',
      role: 'member',
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    // Queue-based mock: each terminal resolution (single() or an awaited count
    // query) shifts the next response for that table, in call order.
    function flexibleSupabase(opts: {
      members: Array<Record<string, unknown>>;
      invitations: Array<Record<string, unknown>>;
      rpcTier: string;
    }) {
      const queues: Record<string, Array<Record<string, unknown>>> = {
        space_members: [...opts.members],
        space_invitations: [...opts.invitations],
      };
      const makeChain = (table: string) => {
        const next = () => (queues[table].length ? queues[table].shift() : { data: null, error: null });
        const chain: Record<string, unknown> = {};
        chain.select = vi.fn(() => chain);
        chain.eq = vi.fn(() => chain);
        chain.order = vi.fn(() => chain);
        chain.single = vi.fn(() => Promise.resolve(next()));
        chain.insert = vi.fn(() => ({
          select: vi.fn(() => ({ single: vi.fn(() => Promise.resolve(next())) })),
        }));
        // thenable so awaited count queries (await ...select(count).eq()) resolve
        chain.then = (resolve: (v: unknown) => unknown) => resolve(next());
        return chain;
      };
      return {
        from: vi.fn((table: string) => makeChain(table)),
        rpc: vi.fn(() => Promise.resolve({ data: opts.rpcTier, error: null })),
      };
    }

    it('rejects an invite when a Plus household is at its 2-member cap', async () => {
      mockCreateClient.mockResolvedValueOnce(flexibleSupabase({
        members: [
          { data: { role: 'owner' } },          // inviter membership check
          { data: { user_id: 'owner-1' } },      // owner lookup
          { count: 2 },                          // member count
        ],
        invitations: [
          { data: null, error: { code: 'PGRST116' } }, // no existing invite
          { count: 0 },                                // pending count
        ],
        rpcTier: 'plus',
      }) as never);

      const result = await createInvitation(SPACE, 'new@example.com', INVITER);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toContain('member limit');
    });

    it('rejects an invite when a Free household is at its 2-member cap', async () => {
      // Free tier (Phase 11.6 teaser) also enforces maxUsers=2. Without this the
      // free plan would be an unlimited-seat household for $0.
      mockCreateClient.mockResolvedValueOnce(flexibleSupabase({
        members: [{ data: { role: 'owner' } }, { data: { user_id: 'owner-1' } }, { count: 2 }],
        invitations: [{ data: null, error: { code: 'PGRST116' } }, { count: 0 }],
        rpcTier: 'free',
      }) as never);

      const result = await createInvitation(SPACE, 'new@example.com', INVITER);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toContain('member limit');
    });

    it('rejects when a Family household is at its 6-member cap', async () => {
      mockCreateClient.mockResolvedValueOnce(flexibleSupabase({
        members: [{ data: { role: 'owner' } }, { data: { user_id: 'owner-1' } }, { count: 6 }],
        invitations: [{ data: null, error: { code: 'PGRST116' } }, { count: 0 }],
        rpcTier: 'family',
      }) as never);

      const result = await createInvitation(SPACE, 'new@example.com', INVITER);
      expect(result.success).toBe(false);
    });

    it('counts pending invitations toward the cap', async () => {
      // Plus cap = 2. 1 member + 1 pending invite => projected 2 => rejected.
      mockCreateClient.mockResolvedValueOnce(flexibleSupabase({
        members: [{ data: { role: 'owner' } }, { data: { user_id: 'owner-1' } }, { count: 1 }],
        invitations: [{ data: null, error: { code: 'PGRST116' } }, { count: 1 }],
        rpcTier: 'plus',
      }) as never);

      const result = await createInvitation(SPACE, 'new@example.com', INVITER);
      expect(result.success).toBe(false);
    });

    it('allows an invite when a Family household is under the cap', async () => {
      mockCreateClient.mockResolvedValueOnce(flexibleSupabase({
        members: [{ data: { role: 'owner' } }, { data: { user_id: 'owner-1' } }, { count: 3 }],
        invitations: [
          { data: null, error: { code: 'PGRST116' } }, // no existing
          { count: 0 },                                // pending count
          { data: mockInvitation, error: null },       // insert result
        ],
        rpcTier: 'family',
      }) as never);

      const result = await createInvitation(SPACE, 'new@example.com', INVITER);
      expect(result.success).toBe(true);
    });

    it('allows owner-tier spaces without a cap (maxUsers = -1)', async () => {
      // Owner tier skips the count queries entirely.
      mockCreateClient.mockResolvedValueOnce(flexibleSupabase({
        members: [{ data: { role: 'owner' } }, { data: { user_id: 'owner-1' } }],
        invitations: [
          { data: null, error: { code: 'PGRST116' } },
          { data: mockInvitation, error: null },
        ],
        rpcTier: 'owner',
      }) as never);

      const result = await createInvitation(SPACE, 'new@example.com', INVITER);
      expect(result.success).toBe(true);
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
