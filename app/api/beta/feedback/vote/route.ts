import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const voteSchema = z.object({
  feedbackId: z.string().uuid(),
  voteType: z.enum(['up', 'down'])
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    // Verify user is authenticated and is a beta tester
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user is a beta tester
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('is_beta_tester, beta_status')
      .eq('id', user.id)
      .single();

    if (userError || !userData?.is_beta_tester || userData.beta_status !== 'approved') {
      return NextResponse.json(
        { error: 'Beta tester access required' },
        { status: 403 }
      );
    }

    // Validate input
    const validatedData = voteSchema.parse(body);

    // Check if feedback exists
    const { data: feedback, error: feedbackError } = await supabase
      .from('beta_feedback')
      .select('id')
      .eq('id', validatedData.feedbackId)
      .single();

    if (feedbackError || !feedback) {
      return NextResponse.json(
        { error: 'Feedback not found' },
        { status: 404 }
      );
    }

    // Check if user has already voted on this feedback
    const { data: existingVote } = await supabase
      .from('beta_feedback_votes')
      .select('id, vote_type')
      .eq('feedback_id', validatedData.feedbackId)
      .eq('user_id', user.id)
      .single();

    if (existingVote) {
      if (existingVote.vote_type === validatedData.voteType) {
        // User is clicking the same vote - remove the vote
        const { error: deleteError } = await supabase
          .from('beta_feedback_votes')
          .delete()
          .eq('id', existingVote.id);

        if (deleteError) {
          console.error('Error removing vote:', deleteError);
          return NextResponse.json(
            { error: 'Failed to remove vote' },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          message: 'Vote removed',
          action: 'removed'
        });
      } else {
        // User is changing their vote
        const { error: updateError } = await supabase
          .from('beta_feedback_votes')
          .update({ vote_type: validatedData.voteType })
          .eq('id', existingVote.id);

        if (updateError) {
          console.error('Error updating vote:', updateError);
          return NextResponse.json(
            { error: 'Failed to update vote' },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          message: 'Vote updated',
          action: 'updated'
        });
      }
    } else {
      // User is voting for the first time on this feedback
      const { error: insertError } = await supabase
        .from('beta_feedback_votes')
        .insert({
          feedback_id: validatedData.feedbackId,
          user_id: user.id,
          vote_type: validatedData.voteType
        });

      if (insertError) {
        console.error('Error creating vote:', insertError);
        return NextResponse.json(
          { error: 'Failed to create vote' },
          { status: 500 }
        );
      }

      // Log beta tester activity
      await supabase
        .from('beta_tester_activity')
        .insert({
          user_id: user.id,
          activity_type: 'feedback_vote',
          feature_used: `vote_${validatedData.voteType}`,
          device_info: {
            user_agent: request.headers.get('user-agent'),
            feedback_id: validatedData.feedbackId
          }
        });

      return NextResponse.json({
        success: true,
        message: 'Vote created',
        action: 'created'
      });
    }

  } catch (error) {
    console.error('Beta feedback vote error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.issues.map((issue: z.ZodIssue) => issue.message)
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}