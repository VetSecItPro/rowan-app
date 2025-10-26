import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Row,
  Column,
  Heading,
  Text,
  Link,
  Button,
  Hr,
  Img,
} from '@react-email/components';

interface GeneralReminderEmailProps {
  recipientName: string;
  reminderTitle: string;
  reminderDescription?: string;
  reminderType: 'personal' | 'shared' | 'recurring' | 'important';
  dueDate?: string;
  dueTime?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  category?: string;
  spaceId: string;
  reminderId: string;
  spaceName: string;
  createdBy?: string;
}

const GeneralReminderEmail = ({
  recipientName = 'Partner',
  reminderTitle = 'Reminder',
  reminderDescription,
  reminderType = 'personal',
  dueDate,
  dueTime,
  priority = 'normal',
  category,
  spaceId,
  reminderId,
  spaceName = 'Your Space',
  createdBy,
}: GeneralReminderEmailProps) => {
  const priorityColors = {
    low: '#10b981',
    normal: '#6366f1',
    high: '#f59e0b',
    urgent: '#ef4444'
  };

  const priorityLabels = {
    low: 'Low Priority',
    normal: 'Normal Priority',
    high: 'High Priority',
    urgent: 'Urgent'
  };

  const typeEmojis = {
    personal: '📝',
    shared: '👥',
    recurring: '🔄',
    important: '⭐'
  };

  const typeLabels = {
    personal: 'Personal Reminder',
    shared: 'Shared Reminder',
    recurring: 'Recurring Reminder',
    important: 'Important Reminder'
  };

  const reminderUrl = `https://rowanapp.com/spaces/${spaceId}/reminders/${reminderId}`;

  return (
    <Html>
      <Head />
      <Preview>
        Reminder: {reminderTitle}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Row>
              <Column>
                <Img
                  src="https://rowanapp.com/logo.png"
                  width="32"
                  height="32"
                  alt="Rowan"
                  style={logo}
                />
              </Column>
              <Column style={headerText}>
                <Text style={headerTitle}>Rowan</Text>
              </Column>
            </Row>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            <div style={{
              ...typeBadge,
              backgroundColor: priorityColors[priority] + '20',
              color: priorityColors[priority]
            }}>
              {typeEmojis[reminderType]} {typeLabels[reminderType]}
            </div>

            <Heading style={h1}>Don't forget!</Heading>

            <Text style={text}>
              Hi {recipientName},
            </Text>

            <Text style={text}>
              {createdBy && reminderType === 'shared' ? (
                <>You have a reminder from <strong>{createdBy}</strong> in <strong>{spaceName}</strong>.</>
              ) : (
                <>You have a reminder in <strong>{spaceName}</strong>.</>
              )}
            </Text>

            {/* Reminder Card */}
            <Section style={reminderCard}>
              <Row>
                <Column>
                  <div style={{
                    ...priorityBadge,
                    backgroundColor: priorityColors[priority]
                  }}>
                    {priorityLabels[priority]}
                  </div>
                </Column>
              </Row>

              <div style={reminderIcon}>
                {typeEmojis[reminderType]}
              </div>

              <Heading style={reminderTitleStyle}>{reminderTitle}</Heading>

              {reminderDescription && (
                <Text style={reminderDesc}>{reminderDescription}</Text>
              )}

              {/* Reminder Details */}
              <div style={reminderDetails}>
                {(dueDate || dueTime) && (
                  <div style={reminderDetail}>
                    <span style={detailLabel}>📅 Due:</span>
                    <span style={detailValue}>
                      {dueDate}
                      {dueTime && ` at ${dueTime}`}
                    </span>
                  </div>
                )}

                {category && (
                  <div style={reminderDetail}>
                    <span style={detailLabel}>🏷️ Category:</span>
                    <span style={detailValue}>{category}</span>
                  </div>
                )}

                <div style={reminderDetail}>
                  <span style={detailLabel}>🏠 Space:</span>
                  <span style={detailValue}>{spaceName}</span>
                </div>

                {createdBy && reminderType === 'shared' && (
                  <div style={reminderDetail}>
                    <span style={detailLabel}>👤 Created by:</span>
                    <span style={detailValue}>{createdBy}</span>
                  </div>
                )}
              </div>
            </Section>

            {/* Action Buttons */}
            <Section style={buttonContainer}>
              <Button style={{
                ...primaryButton,
                backgroundColor: priorityColors[priority]
              }} href={reminderUrl}>
                View Reminder
              </Button>
            </Section>

            <Text style={text}>
              You can view and manage your reminders in your <Link href={`https://rowanapp.com/spaces/${spaceId}/reminders`} style={link}>reminders section</Link> on Rowan.
            </Text>

            {/* Priority-specific tips */}
            {priority === 'urgent' && (
              <Text style={urgentTip}>
                🚨 <strong>Urgent:</strong> This reminder requires immediate attention!
              </Text>
            )}

            {reminderType === 'recurring' && (
              <Text style={recurringTip}>
                🔄 <strong>Recurring:</strong> This reminder will repeat automatically based on your schedule.
              </Text>
            )}
          </Section>

          {/* Footer */}
          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              You're receiving this email because you have email notifications enabled for general reminders.
            </Text>
            <Text style={footerText}>
              <Link href="https://rowanapp.com/settings" style={link}>
                Manage your notification preferences
              </Link> |
              <Link href="https://rowanapp.com/unsubscribe" style={link}>
                Unsubscribe
              </Link>
            </Text>
            <Text style={footerText}>
              © 2025 Rowan. Made with ❤️ for better relationships.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default GeneralReminderEmail;

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const header = {
  padding: '20px 30px',
  backgroundColor: '#ec4899',
};

const headerText = {
  paddingLeft: '12px',
};

const headerTitle = {
  color: '#ffffff',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0',
  lineHeight: '32px',
};

const logo = {
  borderRadius: '6px',
};

const content = {
  padding: '30px 30px 40px 30px',
};

const typeBadge = {
  display: 'inline-block',
  padding: '6px 12px',
  borderRadius: '16px',
  fontSize: '12px',
  fontWeight: '600',
  marginBottom: '16px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
};

const h1 = {
  color: '#1f2937',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0 0 20px 0',
  lineHeight: '32px',
};

const text = {
  color: '#4b5563',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 16px 0',
};

const reminderCard = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  padding: '24px',
  margin: '24px 0',
  textAlign: 'center' as const,
};

const priorityBadge = {
  display: 'inline-block',
  padding: '4px 12px',
  borderRadius: '16px',
  color: '#ffffff',
  fontSize: '12px',
  fontWeight: '600',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  marginBottom: '16px',
};

const reminderIcon = {
  fontSize: '48px',
  marginBottom: '16px',
};

const reminderTitleStyle = {
  color: '#1f2937',
  fontSize: '22px',
  fontWeight: 'bold',
  margin: '0 0 16px 0',
  lineHeight: '30px',
};

const reminderDesc = {
  color: '#6b7280',
  fontSize: '15px',
  lineHeight: '22px',
  margin: '0 0 20px 0',
};

const reminderDetails = {
  textAlign: 'left' as const,
  maxWidth: '350px',
  margin: '0 auto',
  backgroundColor: '#ffffff',
  border: '1px solid #f3f4f6',
  borderRadius: '8px',
  padding: '16px',
};

const reminderDetail = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '8px 0',
  borderBottom: '1px solid #f9fafb',
};

const detailLabel = {
  color: '#6b7280',
  fontSize: '14px',
  fontWeight: '500',
};

const detailValue = {
  color: '#374151',
  fontSize: '14px',
  fontWeight: '600',
  textAlign: 'right' as const,
  maxWidth: '200px',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const primaryButton = {
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
  lineHeight: '24px',
};

const urgentTip = {
  color: '#ef4444',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '16px 0 0 0',
  backgroundColor: '#fef2f2',
  padding: '12px 16px',
  borderRadius: '8px',
  border: '1px solid #fecaca',
  fontWeight: '500',
};

const recurringTip = {
  color: '#6366f1',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '16px 0 0 0',
  backgroundColor: '#f0f9ff',
  padding: '12px 16px',
  borderRadius: '8px',
  border: '1px solid #bfdbfe',
};

const link = {
  color: '#ec4899',
  textDecoration: 'underline',
};

const hr = {
  borderColor: '#e5e7eb',
  margin: '20px 0',
};

const footer = {
  padding: '0 30px',
};

const footerText = {
  color: '#9ca3af',
  fontSize: '12px',
  lineHeight: '16px',
  margin: '0 0 8px 0',
  textAlign: 'center' as const,
};