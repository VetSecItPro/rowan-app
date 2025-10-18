import { Text, Link } from '@react-email/components';
import * as React from 'react';
import BaseTemplate from './BaseTemplate';

interface TaskAssignmentEmailProps {
  taskTitle: string;
  taskDescription?: string;
  assignedBy: string;
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  spaceName: string;
  userName: string;
  taskUrl: string;
  unsubscribeUrl?: string;
}

export const TaskAssignmentEmail = ({
  taskTitle,
  taskDescription,
  assignedBy,
  dueDate,
  priority = 'medium',
  spaceName,
  userName,
  taskUrl,
  unsubscribeUrl,
}: TaskAssignmentEmailProps) => {
  const priorityColors = {
    low: '#10b981',
    medium: '#3b82f6',
    high: '#f59e0b',
    urgent: '#ef4444',
  };

  const priorityLabels = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    urgent: 'Urgent',
  };

  return (
    <BaseTemplate
      previewText={`New task assigned: ${taskTitle}`}
      title="New Task Assignment"
      spaceName={spaceName}
      userName={userName}
      actionButton={{
        text: 'View Task',
        url: taskUrl,
      }}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Text style={introText}>
        <strong>{assignedBy}</strong> has assigned you a new task in <strong>{spaceName}</strong>.
      </Text>

      <div style={taskCard}>
        <div style={taskHeader}>
          <Text style={taskTitle}>{taskTitle}</Text>
          <span
            style={{
              ...priorityBadge,
              backgroundColor: priorityColors[priority],
            }}
          >
            {priorityLabels[priority]} Priority
          </span>
        </div>

        {taskDescription && (
          <Text style={taskDescription}>{taskDescription}</Text>
        )}

        {dueDate && (
          <Text style={dueDateText}>
            <strong>Due:</strong> {new Date(dueDate).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
        )}
      </div>

      <Text style={footerNote}>
        You can view all your tasks and update their status in your{' '}
        <Link href={taskUrl} style={link}>
          task dashboard
        </Link>
        .
      </Text>
    </BaseTemplate>
  );
};

export default TaskAssignmentEmail;

// Styles
const introText = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 24px',
};

const taskCard = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '20px',
  margin: '20px 0',
};

const taskHeader = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: '12px',
};

const taskTitle = {
  color: '#111827',
  fontSize: '18px',
  fontWeight: 'bold',
  lineHeight: '24px',
  margin: '0',
  flex: '1',
};

const priorityBadge = {
  color: '#ffffff',
  padding: '4px 8px',
  borderRadius: '4px',
  fontSize: '12px',
  fontWeight: '500',
  display: 'inline-block',
  marginLeft: '12px',
};

const taskDescription = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '12px 0 0',
};

const dueDateText = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '12px 0 0',
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