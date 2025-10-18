import { Text, Link, Section } from '@react-email/components';
import * as React from 'react';
import BaseTemplate from './BaseTemplate';

interface NewMessageEmailProps {
  senderName: string;
  senderAvatar?: string;
  messagePreview: string;
  conversationTitle?: string;
  isDirectMessage: boolean;
  messageCount?: number;
  spaceName: string;
  userName: string;
  messageUrl: string;
  unsubscribeUrl?: string;
}

export const NewMessageEmail = ({
  senderName,
  senderAvatar,
  messagePreview,
  conversationTitle,
  isDirectMessage,
  messageCount = 1,
  spaceName,
  userName,
  messageUrl,
  unsubscribeUrl,
}: NewMessageEmailProps) => {
  const getTitle = () => {
    if (messageCount > 1) {
      return `${messageCount} new messages`;
    }
    return isDirectMessage ? 'New direct message' : 'New message';
  };

  const getPreviewText = () => {
    if (messageCount > 1) {
      return `${messageCount} new messages from ${senderName}`;
    }
    return `${senderName}: ${messagePreview.substring(0, 100)}${messagePreview.length > 100 ? '...' : ''}`;
  };

  return (
    <BaseTemplate
      previewText={getPreviewText()}
      title={getTitle()}
      spaceName={spaceName}
      userName={userName}
      actionButton={{
        text: 'View Message',
        url: messageUrl,
      }}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Text style={introText}>
        {messageCount > 1 ? (
          <>
            <strong>{senderName}</strong> sent {messageCount} messages{' '}
            {conversationTitle && !isDirectMessage && (
              <>in <strong>{conversationTitle}</strong></>
            )}
            {isDirectMessage && <>to you</>}.
          </>
        ) : (
          <>
            <strong>{senderName}</strong> sent you a{' '}
            {isDirectMessage ? 'direct message' : 'message'}
            {conversationTitle && !isDirectMessage && (
              <> in <strong>{conversationTitle}</strong></>
            )}.
          </>
        )}
      </Text>

      <Section style={messageCard}>
        <div style={messageHeader}>
          <div style={senderInfo}>
            {senderAvatar && (
              <img
                src={senderAvatar}
                alt={senderName}
                style={avatar}
              />
            )}
            <div>
              <Text style={senderNameText}>{senderName}</Text>
              {conversationTitle && !isDirectMessage && (
                <Text style={conversationText}>in {conversationTitle}</Text>
              )}
            </div>
          </div>

          {isDirectMessage && (
            <span style={directMessageBadge}>Direct Message</span>
          )}
        </div>

        <Section style={messageContent}>
          {messageCount > 1 ? (
            <Text style={multipleMessagesText}>
              {messageCount} new messages. The latest:
            </Text>
          ) : null}

          <Text style={messageText}>
            "{messagePreview}"
          </Text>
        </Section>
      </Section>

      <Text style={footerNote}>
        You can reply and view the full conversation in your{' '}
        <Link href={messageUrl.replace(/\/[^\/]*$/, '')} style={link}>
          messages
        </Link>
        .
      </Text>
    </BaseTemplate>
  );
};

export default NewMessageEmail;

// Styles
const introText = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 24px',
};

const messageCard = {
  backgroundColor: '#f0fdf4',
  border: '1px solid #22c55e',
  borderRadius: '8px',
  padding: '20px',
  margin: '20px 0',
};

const messageHeader = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: '16px',
};

const senderInfo = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
};

const avatar = {
  width: '40px',
  height: '40px',
  borderRadius: '50%',
  objectFit: 'cover' as const,
};

const senderNameText = {
  color: '#166534',
  fontSize: '16px',
  fontWeight: 'bold',
  lineHeight: '20px',
  margin: '0',
};

const conversationText = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '16px',
  margin: '2px 0 0',
};

const directMessageBadge = {
  backgroundColor: '#22c55e',
  color: '#ffffff',
  padding: '4px 8px',
  borderRadius: '4px',
  fontSize: '12px',
  fontWeight: '500',
  display: 'inline-block',
};

const messageContent = {
  borderTop: '1px solid #bbf7d0',
  paddingTop: '16px',
};

const multipleMessagesText = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0 0 8px',
  fontStyle: 'italic',
};

const messageText = {
  color: '#166534',
  fontSize: '15px',
  lineHeight: '22px',
  margin: '0',
  fontStyle: 'italic',
  padding: '12px',
  backgroundColor: 'rgba(34, 197, 94, 0.1)',
  borderRadius: '6px',
  borderLeft: '3px solid #22c55e',
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