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

interface DigestNotification {
  id: string;
  type: 'task' | 'event' | 'message' | 'shopping' | 'meal' | 'reminder';
  title: string;
  content: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  spaceName: string;
  url: string;
  timestamp: string;
}

interface DailyDigestEmailProps {
  recipientName: string;
  digestDate: string;
  digestType: 'daily' | 'weekly';
  notifications: DigestNotification[];
  totalCount: number;
  unreadTasksCount: number;
  upcomingEventsCount: number;
  unreadMessagesCount: number;
}

const DailyDigestEmail = ({
  recipientName = 'Partner',
  digestDate = 'Today',
  digestType = 'daily',
  notifications = [],
  totalCount = 0,
  unreadTasksCount = 0,
  upcomingEventsCount = 0,
  unreadMessagesCount = 0,
}: DailyDigestEmailProps) => {
  const typeEmojis = {
    task: '✅',
    event: '📅',
    message: '💬',
    shopping: '🛒',
    meal: '🍽️',
    reminder: '📝'
  };

  const typeColors = {
    task: '#6366f1',
    event: '#8b5cf6',
    message: '#10b981',
    shopping: '#059669',
    meal: '#f59e0b',
    reminder: '#ec4899'
  };

  const priorityColors = {
    low: '#10b981',
    normal: '#6366f1',
    high: '#f59e0b',
    urgent: '#ef4444'
  };

  // Group notifications by type
  const groupedNotifications = notifications.reduce((acc, notification) => {
    if (!acc[notification.type]) acc[notification.type] = [];
    acc[notification.type].push(notification);
    return acc;
  }, {} as Record<string, DigestNotification[]>);

  const dashboardUrl = 'https://rowanapp.com/dashboard';

  return (
    <Html>
      <Head />
      <Preview>
        Your {digestType} digest - {totalCount} notification{totalCount !== 1 ? 's' : ''} from Rowan
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
            <div style={digestBadge}>
              📊 {digestType.charAt(0).toUpperCase() + digestType.slice(1)} Digest
            </div>

            <Heading style={h1}>Your {digestType} summary</Heading>

            <Text style={text}>
              Hi {recipientName},
            </Text>

            <Text style={text}>
              Here's your {digestType} digest for {digestDate} with {totalCount} notification{totalCount !== 1 ? 's' : ''} from your Rowan spaces.
            </Text>

            {/* Quick Stats */}
            <Section style={statsCard}>
              <Heading style={statsTitle}>Quick Overview</Heading>
              <div style={statsGrid}>
                <div style={statItem}>
                  <div style={statNumber}>{unreadTasksCount}</div>
                  <div style={statLabel}>New Tasks</div>
                </div>
                <div style={statItem}>
                  <div style={statNumber}>{upcomingEventsCount}</div>
                  <div style={statLabel}>Upcoming Events</div>
                </div>
                <div style={statItem}>
                  <div style={statNumber}>{unreadMessagesCount}</div>
                  <div style={statLabel}>New Messages</div>
                </div>
                <div style={statItem}>
                  <div style={statNumber}>{totalCount}</div>
                  <div style={statLabel}>Total Notifications</div>
                </div>
              </div>
            </Section>

            {/* Notifications by Type */}
            {Object.entries(groupedNotifications).map(([type, typeNotifications]) => (
              <Section key={type} style={notificationSection}>
                <div style={{
                  ...sectionHeader,
                  borderLeftColor: typeColors[type as keyof typeof typeColors]
                }}>
                  <div style={sectionIcon}>
                    {typeEmojis[type as keyof typeof typeEmojis]}
                  </div>
                  <Heading style={sectionTitle}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                    {type === 'task' && 's'}
                    {type === 'event' && 's'}
                    {type === 'message' && 's'}
                    {type === 'reminder' && 's'}
                    <span style={sectionCount}>({typeNotifications.length})</span>
                  </Heading>
                </div>

                <div style={notificationsList}>
                  {typeNotifications.slice(0, 5).map((notification) => (
                    <div key={notification.id} style={notificationItem}>
                      <div style={notificationContent}>
                        <div style={notificationHeader}>
                          <Text style={notificationTitle}>
                            {notification.title}
                          </Text>
                          <div style={{
                            ...priorityDot,
                            backgroundColor: priorityColors[notification.priority]
                          }} />
                        </div>
                        <Text style={notificationText}>
                          {notification.content}
                        </Text>
                        <div style={notificationMeta}>
                          <span style={notificationSpace}>📍 {notification.spaceName}</span>
                          <span style={notificationTime}>{notification.timestamp}</span>
                        </div>
                      </div>
                      <Link href={notification.url} style={notificationLink}>
                        View →
                      </Link>
                    </div>
                  ))}

                  {typeNotifications.length > 5 && (
                    <Text style={moreNotificationsText}>
                      + {typeNotifications.length - 5} more {type} notification{typeNotifications.length - 5 > 1 ? 's' : ''}
                    </Text>
                  )}
                </div>
              </Section>
            ))}

            {/* No Notifications State */}
            {totalCount === 0 && (
              <Section style={emptyState}>
                <div style={emptyIcon}>🎉</div>
                <Heading style={emptyTitle}>All caught up!</Heading>
                <Text style={emptyText}>
                  You have no new notifications. Enjoy your {digestType === 'daily' ? 'day' : 'week'}!
                </Text>
              </Section>
            )}

            {/* Action Button */}
            <Section style={buttonContainer}>
              <Button style={primaryButton} href={dashboardUrl}>
                View Dashboard
              </Button>
            </Section>

            <Text style={text}>
              You can manage all your notifications and spaces on your <Link href={dashboardUrl} style={link}>Rowan dashboard</Link>.
            </Text>
          </Section>

          {/* Footer */}
          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              You're receiving this {digestType} digest because you have digest notifications enabled.
            </Text>
            <Text style={footerText}>
              <Link href="https://rowanapp.com/settings" style={link}>
                Change digest frequency
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

export default DailyDigestEmail;

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
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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

const digestBadge = {
  display: 'inline-block',
  padding: '6px 12px',
  backgroundColor: '#eef2ff',
  color: '#6366f1',
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

const statsCard = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '12px',
  padding: '24px',
  margin: '24px 0',
};

const statsTitle = {
  color: '#1f2937',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 16px 0',
  textAlign: 'center' as const,
};

const statsGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: '16px',
  textAlign: 'center' as const,
};

const statItem = {
  padding: '12px',
};

const statNumber = {
  color: '#1f2937',
  fontSize: '24px',
  fontWeight: 'bold',
  lineHeight: '32px',
};

const statLabel = {
  color: '#6b7280',
  fontSize: '12px',
  fontWeight: '500',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
};

const notificationSection = {
  margin: '32px 0',
};

const sectionHeader = {
  display: 'flex',
  alignItems: 'center',
  padding: '16px 20px',
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  borderLeft: '4px solid',
  marginBottom: '12px',
};

const sectionIcon = {
  fontSize: '20px',
  marginRight: '12px',
};

const sectionTitle = {
  color: '#1f2937',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0',
  flex: '1',
};

const sectionCount = {
  color: '#6b7280',
  fontWeight: '400',
  marginLeft: '8px',
};

const notificationsList = {
  space: '12px',
};

const notificationItem = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  padding: '16px',
  backgroundColor: '#ffffff',
  border: '1px solid #f3f4f6',
  borderRadius: '8px',
  marginBottom: '8px',
};

const notificationContent = {
  flex: '1',
};

const notificationHeader = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '4px',
};

const notificationTitle = {
  color: '#1f2937',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0',
};

const priorityDot = {
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  marginLeft: '8px',
};

const notificationText = {
  color: '#6b7280',
  fontSize: '13px',
  lineHeight: '18px',
  margin: '0 0 8px 0',
};

const notificationMeta = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '11px',
  color: '#9ca3af',
};

const notificationSpace = {
  fontWeight: '500',
};

const notificationTime = {
  fontStyle: 'italic',
};

const notificationLink = {
  color: '#6366f1',
  fontSize: '12px',
  fontWeight: '600',
  textDecoration: 'none',
  marginLeft: '12px',
  whiteSpace: 'nowrap' as const,
};

const moreNotificationsText = {
  color: '#6b7280',
  fontSize: '12px',
  fontStyle: 'italic',
  textAlign: 'center' as const,
  margin: '12px 0 0 0',
};

const emptyState = {
  textAlign: 'center' as const,
  padding: '48px 24px',
  backgroundColor: '#f9fafb',
  borderRadius: '12px',
  margin: '24px 0',
};

const emptyIcon = {
  fontSize: '48px',
  marginBottom: '16px',
};

const emptyTitle = {
  color: '#1f2937',
  fontSize: '20px',
  fontWeight: '600',
  margin: '0 0 8px 0',
};

const emptyText = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '0',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const primaryButton = {
  backgroundColor: '#6366f1',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 32px',
  lineHeight: '24px',
};

const link = {
  color: '#6366f1',
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