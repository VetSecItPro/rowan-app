import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkGeneralRateLimit } from '@/lib/ratelimit';
import { extractIP } from '@/lib/ratelimit-fallback';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const UpdateMemberRoleSchema = z.object({
  user_id: z.string().uuid(),
  space_id: z.string().uuid(),
  new_role: z.enum(['member', 'admin']),
});

const RemoveMemberSchema = z.object({
  user_id: z.string().uuid(),
  space_id: z.string().uuid(),
});

/**
 * GET /api/spaces/members
 * Get all members of a space
 */
export async function GET(req: NextRequest) {
  try {
    // Rate limiting
    const ip = extractIP(req.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);

    if (!rateLimitSuccess) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Verify authentication
    const supabase = await createClient();
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get space_id from query params
    const { searchParams } = new URL(req.url);
    const spaceId = searchParams.get('space_id');

    if (!spaceId) {
      return NextResponse.json(
        { error: 'space_id is required' },
        { status: 400 }
      );
    }

    // Verify user is a member of this space
    const { data: membership, error: memberError } = await supabase
      .from('space_members')
      .select('role')
      .eq('space_id', spaceId)
      .eq('user_id', session.user.id)
      .single();

    if (memberError || !membership) {
      return NextResponse.json(
        { error: 'You do not have access to this space' },
        { status: 403 }
      );
    }

    // Fetch all members of the space
    // Note: space_members uses composite primary key (space_id, user_id), no id column
    const { data: members, error: fetchError } = await supabase
      .from('space_members')
      .select('user_id, role, joined_at')
      .eq('space_id', spaceId)
      .order('joined_at', { ascending: true });

    if (fetchError) {
      logger.error('Error fetching space members:', fetchError, { component: 'api-route', action: 'api_request' });
      return NextResponse.json(
        { error: 'Failed to fetch space members' },
        { status: 500 }
      );
    }

    // Fetch user details for each member
    const userIds = members.map((m: any) => m.user_id);
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, email, color_theme')
      .in('id', userIds);

    if (usersError) {
      logger.error('Error fetching user details:', usersError, { component: 'api-route', action: 'api_request' });
    }

    // Create a map of user_id to user details
    type UserDetails = { id: string; name: string | null; email: string | null; color_theme: string | null };
    const userMap = new Map<string, UserDetails>(
      (users || []).map((u: UserDetails) => [u.id, u])
    );

    // Transform data for frontend
    // Use user_id as the identifier since space_members has no id column
    const transformedMembers = members.map((member: { user_id: string; role: string; joined_at: string }) => {
      const user = userMap.get(member.user_id);
      return {
        id: member.user_id, // Use user_id as identifier for frontend compatibility
        user_id: member.user_id,
        name: user?.name || 'Unknown',
        email: user?.email || '',
        role: member.role === 'owner' ? 'Admin' : member.role === 'admin' ? 'Admin' : 'Member',
        color_theme: user?.color_theme || 'purple',
        isCurrentUser: member.user_id === session.user.id,
        joined_at: member.joined_at,
      };
    });

    return NextResponse.json({
      success: true,
      data: transformedMembers,
    });
  } catch (error) {
    logger.error('[API] /api/spaces/members error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/spaces/members
 * Update a member's role in the space
 */
export async function PUT(req: NextRequest) {
  try {
    // Rate limiting
    const ip = extractIP(req.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);

    if (!rateLimitSuccess) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Verify authentication
    const supabase = await createClient();
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const validated = UpdateMemberRoleSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validated.error.errors },
        { status: 400 }
      );
    }

    const { user_id: targetUserId, space_id, new_role } = validated.data;

    // Verify current user is an owner or admin of this space
    const { data: currentUserMembership, error: memberError } = await supabase
      .from('space_members')
      .select('role')
      .eq('space_id', space_id)
      .eq('user_id', session.user.id)
      .single();

    if (memberError || !currentUserMembership) {
      return NextResponse.json(
        { error: 'You do not have access to this space' },
        { status: 403 }
      );
    }

    // Only owners and admins can change roles
    if (currentUserMembership.role !== 'owner' && currentUserMembership.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only space owners and admins can change member roles' },
        { status: 403 }
      );
    }

    // Get the target member info (using composite key: space_id + user_id)
    const { data: targetMember, error: targetError } = await supabase
      .from('space_members')
      .select('user_id, role')
      .eq('space_id', space_id)
      .eq('user_id', targetUserId)
      .single();

    if (targetError || !targetMember) {
      return NextResponse.json(
        { error: 'Member not found in this space' },
        { status: 404 }
      );
    }

    // Cannot change the owner's role
    if (targetMember.role === 'owner') {
      return NextResponse.json(
        { error: 'Cannot change the role of the space owner' },
        { status: 403 }
      );
    }

    // Update the member's role (using composite key)
    const { error: updateError } = await supabase
      .from('space_members')
      .update({ role: new_role })
      .eq('space_id', space_id)
      .eq('user_id', targetUserId);

    if (updateError) {
      logger.error('Error updating member role:', updateError, { component: 'api-route', action: 'api_request' });
      return NextResponse.json(
        { error: 'Failed to update member role' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Member role updated successfully',
    });
  } catch (error) {
    logger.error('[API] PUT /api/spaces/members error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/spaces/members
 * Remove a member from the space
 */
export async function DELETE(req: NextRequest) {
  try {
    // Rate limiting
    const ip = extractIP(req.headers);
    const { success: rateLimitSuccess } = await checkGeneralRateLimit(ip);

    if (!rateLimitSuccess) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Verify authentication
    const supabase = await createClient();
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const validated = RemoveMemberSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validated.error.errors },
        { status: 400 }
      );
    }

    const { user_id: targetUserId, space_id } = validated.data;

    // Verify current user is an owner or admin of this space
    const { data: currentUserMembership, error: memberError } = await supabase
      .from('space_members')
      .select('role')
      .eq('space_id', space_id)
      .eq('user_id', session.user.id)
      .single();

    if (memberError || !currentUserMembership) {
      return NextResponse.json(
        { error: 'You do not have access to this space' },
        { status: 403 }
      );
    }

    // Only owners and admins can remove members
    if (currentUserMembership.role !== 'owner' && currentUserMembership.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only space owners and admins can remove members' },
        { status: 403 }
      );
    }

    // Get the target member info (using composite key: space_id + user_id)
    const { data: targetMember, error: targetError } = await supabase
      .from('space_members')
      .select('user_id, role')
      .eq('space_id', space_id)
      .eq('user_id', targetUserId)
      .single();

    if (targetError || !targetMember) {
      return NextResponse.json(
        { error: 'Member not found in this space' },
        { status: 404 }
      );
    }

    // Cannot remove the owner
    if (targetMember.role === 'owner') {
      return NextResponse.json(
        { error: 'Cannot remove the space owner. Transfer ownership first or delete the space.' },
        { status: 403 }
      );
    }

    // Cannot remove yourself (use Leave Space instead)
    if (targetMember.user_id === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot remove yourself. Use "Leave Space" instead.' },
        { status: 400 }
      );
    }

    // Delete the member (using composite key)
    const { error: deleteError } = await supabase
      .from('space_members')
      .delete()
      .eq('space_id', space_id)
      .eq('user_id', targetUserId);

    if (deleteError) {
      logger.error('Error removing member:', deleteError, { component: 'api-route', action: 'api_request' });
      return NextResponse.json(
        { error: 'Failed to remove member' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Member removed successfully',
    });
  } catch (error) {
    logger.error('[API] DELETE /api/spaces/members error:', error, { component: 'api-route', action: 'api_request' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
