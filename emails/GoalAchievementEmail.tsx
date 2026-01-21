/* eslint-disable react/no-unescaped-entities */

import { Text, Link, Section } from '@react-email/components';
import * as React from 'react';
import BaseTemplate from './BaseTemplate';

interface GoalAchievementEmailProps {
  achievementType: 'goal_completed' | 'milestone_reached' | 'streak_milestone';
  goalTitle: string;
  milestoneTitle?: string;
  completedBy: string;
  completionDate: string;
  streakCount?: number;
  nextMilestone?: string;
  spaceName: string;
  userName: string;
  goalUrl: string;
  unsubscribeUrl?: string;
}

export const GoalAchievementEmail = ({
  achievementType,
  goalTitle,
  milestoneTitle,
  completedBy,
  completionDate,
  streakCount,
  nextMilestone,
  spaceName,
  userName,
  goalUrl,
  unsubscribeUrl,
}: GoalAchievementEmailProps) => {
  const getTitle = () => {
    switch (achievementType) {
      case 'goal_completed':
        return '🎉 Goal Completed!';
      case 'milestone_reached':
        return '🎯 Milestone Achieved!';
      case 'streak_milestone':
        return `🔥 ${streakCount}-Day Streak!`;
      default:
        return '🎉 Achievement Unlocked!';
    }
  };

  const getPreviewText = () => {
    switch (achievementType) {
      case 'goal_completed':
        return `${completedBy} completed the goal: ${goalTitle}`;
      case 'milestone_reached':
        return `${completedBy} reached a milestone: ${milestoneTitle}`;
      case 'streak_milestone':
        return `${completedBy} is on a ${streakCount}-day streak with ${goalTitle}`;
      default:
        return `Great progress on ${goalTitle}`;
    }
  };

  const getCelebrationEmoji = () => {
    switch (achievementType) {
      case 'goal_completed':
        return '🎉🎊✨';
      case 'milestone_reached':
        return '🎯🌟💪';
      case 'streak_milestone':
        return '🔥⚡🚀';
      default:
        return '🎉✨🌟';
    }
  };

  return (
    <BaseTemplate
      previewText={getPreviewText()}
      title={getTitle()}
      spaceName={spaceName}
      userName={userName}
      actionButton={{
        text: 'View Achievement',
        url: goalUrl,
      }}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Section style={celebrationHeader}>
        <Text style={emojiText}>{getCelebrationEmoji()}</Text>
        <Text style={celebrationText}>
          {achievementType === 'goal_completed' && 'Congratulations! A goal has been completed.'}
          {achievementType === 'milestone_reached' && 'Awesome! A milestone has been reached.'}
          {achievementType === 'streak_milestone' && `Amazing consistency! A ${streakCount}-day streak!`}
        </Text>
      </Section>

      <Section style={achievementCard}>
        <Text style={achieverText}>
          <strong>{completedBy}</strong> {userName === completedBy ? '(You!)' : ''}
        </Text>

        {achievementType === 'goal_completed' && (
          <Text style={achievementDetails}>
            Successfully completed the goal: <strong>"{goalTitle}"</strong>
          </Text>
        )}

        {achievementType === 'milestone_reached' && (
          <>
            <Text style={achievementDetails}>
              Reached milestone: <strong>"{milestoneTitle}"</strong>
            </Text>
            <Text style={goalReference}>
              Goal: <strong>"{goalTitle}"</strong>
            </Text>
          </>
        )}

        {achievementType === 'streak_milestone' && (
          <Text style={achievementDetails}>
            Maintained a <strong>{streakCount}-day consecutive streak</strong> on{' '}
            <strong>"{goalTitle}"</strong>
          </Text>
        )}

        <Text style={completionDateText}>
          Completed on {new Date(completionDate).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </Text>
      </Section>

      {nextMilestone && (
        <Section style={nextMilestoneCard}>
          <Text style={nextMilestoneTitle}>🎯 Next Milestone</Text>
          <Text style={nextMilestoneText}>{nextMilestone}</Text>
        </Section>
      )}

      {userName === completedBy ? (
        <Text style={personalMessage}>
          Congratulations on your achievement! Keep up the fantastic work and maintain this momentum.
        </Text>
      ) : (
        <Text style={teamMessage}>
          Join us in celebrating {completedBy}'s success! Great teamwork makes achievements like this possible.
        </Text>
      )}

      <Text style={footerNote}>
        View all achievements and goal progress in your{' '}
        <Link href={goalUrl.replace(/\/[^\/]*$/, '')} style={link}>
          goals dashboard
        </Link>
        .
      </Text>
    </BaseTemplate>
  );
};

export default GoalAchievementEmail;

// Styles
const celebrationHeader = {
  textAlign: 'center' as const,
  padding: '20px 0',
  backgroundColor: '#fef3c7',
  borderRadius: '8px',
  margin: '0 0 24px',
};

const emojiText = {
  fontSize: '32px',
  margin: '0 0 8px',
  lineHeight: '1',
};

const celebrationText = {
  color: '#92400e',
  fontSize: '18px',
  fontWeight: 'bold',
  lineHeight: '24px',
  margin: '0',
};

const achievementCard = {
  backgroundColor: '#f0f9ff',
  border: '2px solid #3b82f6',
  borderRadius: '12px',
  padding: '24px',
  margin: '24px 0',
  textAlign: 'center' as const,
};

const achieverText = {
  color: '#1e40af',
  fontSize: '20px',
  fontWeight: 'bold',
  lineHeight: '28px',
  margin: '0 0 16px',
};

const achievementDetails = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '8px 0',
};

const goalReference = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '4px 0',
};

const completionDateText = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '16px 0 0',
  fontStyle: 'italic',
};

const nextMilestoneCard = {
  backgroundColor: '#fef7ff',
  border: '1px solid #d946ef',
  borderRadius: '8px',
  padding: '16px',
  margin: '20px 0',
};

const nextMilestoneTitle = {
  color: '#a21caf',
  fontSize: '16px',
  fontWeight: 'bold',
  lineHeight: '20px',
  margin: '0 0 8px',
};

const nextMilestoneText = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0',
};

const personalMessage = {
  color: '#059669',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '24px 0',
  textAlign: 'center' as const,
  fontWeight: '500',
};

const teamMessage = {
  color: '#7c3aed',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '24px 0',
  textAlign: 'center' as const,
  fontWeight: '500',
};

const footerNote = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '24px 0 0',
};

const link = {
  color: '#3b82f6',
  textDecoration: 'underline',
};
