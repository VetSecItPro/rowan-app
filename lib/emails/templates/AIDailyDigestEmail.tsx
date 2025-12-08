/**
 * AI-Enhanced Daily Digest Email Template
 * JARVIS-style layout: Conversational narrative intro + structured quick-reference
 */
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

interface CalendarEvent {
  id: string;
  title: string;
  start_time: string;
  end_time?: string;
  location?: string;
  all_day?: boolean;
}

interface Task {
  id: string;
  title: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  due_date?: string;
}

interface Meal {
  id: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  recipe_name: string;
}

interface Reminder {
  id: string;
  title: string;
  reminder_time?: string;
}

interface AIDailyDigestEmailProps {
  recipientName: string;
  date: string;
  spaceName: string;
  spaceId: string;
  events: CalendarEvent[];
  tasksDue: Task[];
  overdueTasks: Task[];
  meals: Meal[];
  reminders: Reminder[];
  narrativeIntro: string;
  closingMessage: string;
  aiGenerated: boolean;
}

const AIDailyDigestEmail = ({
  recipientName = 'Partner',
  date = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
  events = [],
  tasksDue = [],
  overdueTasks = [],
  meals = [],
  reminders = [],
  narrativeIntro = '',
  closingMessage = 'Have a great day!',
  aiGenerated = false,
}: AIDailyDigestEmailProps) => {
  const dashboardUrl = `https://rowanapp.com/dashboard`;
  const calendarUrl = `https://rowanapp.com/calendar`;
  const tasksUrl = `https://rowanapp.com/tasks`;

  const hasContent = events.length > 0 || tasksDue.length > 0 || overdueTasks.length > 0 || meals.length > 0 || reminders.length > 0;

  const priorityColors: Record<string, string> = {
    low: '#10B981',
    normal: '#6366F1',
    high: '#F59E0B',
    urgent: '#EF4444'
  };

  const mealEmojis: Record<string, string> = {
    breakfast: '🌅',
    lunch: '☀️',
    dinner: '🌙',
    snack: '🍎'
  };

  const formatTime = (timeString: string) => {
    try {
      return new Date(timeString).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return timeString;
    }
  };

  // Convert narrative paragraphs to proper HTML
  const formatNarrative = (text: string) => {
    return text.split('\n\n').filter(p => p.trim());
  };

  return (
    <Html>
      <Head />
      <Preview>
        Your AI-powered daily briefing for {date}
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
                <Text style={headerTitle}>Daily Briefing</Text>
              </Column>
              <Column align="right">
                {aiGenerated && (
                  <div style={aiBadge}>
                    <span style={aiBadgeIcon}>✨</span> AI
                  </div>
                )}
              </Column>
            </Row>
          </Section>

          {/* AI Narrative Section */}
          <Section style={narrativeSection}>
            <Text style={dateLabel}>{date}</Text>

            {formatNarrative(narrativeIntro).map((paragraph, index) => (
              <Text key={index} style={narrativeParagraph}>
                {paragraph}
              </Text>
            ))}
          </Section>

          {/* Quick Reference Divider */}
          {hasContent && (
            <Section style={dividerSection}>
              <Row>
                <Column>
                  <Hr style={dividerLine} />
                </Column>
                <Column style={dividerLabelCol}>
                  <Text style={dividerLabel}>QUICK REFERENCE</Text>
                </Column>
                <Column>
                  <Hr style={dividerLine} />
                </Column>
              </Row>
            </Section>
          )}

          {/* Structured Quick Reference */}
          <Section style={content}>
            {/* Overdue Tasks Alert */}
            {overdueTasks.length > 0 && (
              <Section style={overdueSection}>
                <div style={sectionHeader}>
                  <span style={sectionIcon}>⚠️</span>
                  <span style={sectionTitle}>Overdue ({overdueTasks.length})</span>
                </div>
                <div style={overdueCard}>
                  {overdueTasks.slice(0, 5).map((task) => (
                    <div key={task.id} style={compactItem}>
                      <span style={{
                        ...priorityDot,
                        backgroundColor: priorityColors[task.priority] || priorityColors.normal
                      }} />
                      <span style={itemText}>{task.title}</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Today's Schedule - Timeline Format */}
            {events.length > 0 && (
              <Section style={sectionContainer}>
                <div style={sectionHeader}>
                  <span style={sectionIcon}>📅</span>
                  <span style={sectionTitle}>Schedule</span>
                </div>
                <div style={timelineCard}>
                  {events.slice(0, 6).map((event) => (
                    <div key={event.id} style={timelineItem}>
                      <div style={timelineTime}>
                        {event.all_day ? 'All Day' : formatTime(event.start_time)}
                      </div>
                      <div style={timelineDot} />
                      <div style={timelineContent}>
                        <span style={timelineTitle}>{event.title}</span>
                        {event.location && (
                          <span style={timelineLocation}>📍 {event.location}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Tasks Due Today - Compact */}
            {tasksDue.length > 0 && (
              <Section style={sectionContainer}>
                <div style={sectionHeader}>
                  <span style={sectionIcon}>✅</span>
                  <span style={sectionTitle}>Tasks Due</span>
                </div>
                <div style={compactCard}>
                  {tasksDue.slice(0, 5).map((task) => (
                    <div key={task.id} style={compactItem}>
                      <span style={{
                        ...priorityDot,
                        backgroundColor: priorityColors[task.priority] || priorityColors.normal
                      }} />
                      <span style={itemText}>{task.title}</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Meals & Reminders - Side by Side on larger screens */}
            <Row>
              {meals.length > 0 && (
                <Column style={halfColumn}>
                  <Section style={sectionContainer}>
                    <div style={sectionHeader}>
                      <span style={sectionIcon}>🍽️</span>
                      <span style={sectionTitle}>Meals</span>
                    </div>
                    <div style={compactCard}>
                      {meals.map((meal) => (
                        <div key={meal.id} style={compactItem}>
                          <span style={mealEmoji}>{mealEmojis[meal.meal_type]}</span>
                          <span style={itemText}>{meal.recipe_name}</span>
                        </div>
                      ))}
                    </div>
                  </Section>
                </Column>
              )}

              {reminders.length > 0 && (
                <Column style={halfColumn}>
                  <Section style={sectionContainer}>
                    <div style={sectionHeader}>
                      <span style={sectionIcon}>⏰</span>
                      <span style={sectionTitle}>Reminders</span>
                    </div>
                    <div style={compactCard}>
                      {reminders.slice(0, 4).map((reminder) => (
                        <div key={reminder.id} style={compactItem}>
                          <span style={reminderBullet}>•</span>
                          <span style={itemText}>{reminder.title}</span>
                        </div>
                      ))}
                    </div>
                  </Section>
                </Column>
              )}
            </Row>

            {/* Closing Message */}
            <Section style={closingSection}>
              <Text style={closingText}>{closingMessage}</Text>
            </Section>

            {/* Action Buttons */}
            <Section style={buttonContainer}>
              <Row>
                <Column align="center">
                  <Button style={primaryButton} href={dashboardUrl}>
                    Open Dashboard
                  </Button>
                </Column>
              </Row>
              <Row style={secondaryButtonRow}>
                <Column align="center">
                  <Link href={calendarUrl} style={secondaryLink}>Calendar</Link>
                  <span style={linkSeparator}>•</span>
                  <Link href={tasksUrl} style={secondaryLink}>Tasks</Link>
                </Column>
              </Row>
            </Section>
          </Section>

          {/* Footer */}
          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              {aiGenerated ? 'This briefing was personalized by AI.' : ''} You&apos;re receiving this daily digest because you have it enabled in your notification settings.
            </Text>
            <Text style={footerText}>
              <Link href="https://rowanapp.com/settings?tab=notifications" style={link}>
                Manage preferences
              </Link> |{' '}
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

export default AIDailyDigestEmail;

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '0',
  marginBottom: '64px',
  maxWidth: '600px',
  borderRadius: '12px',
  overflow: 'hidden',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
};

const header = {
  padding: '20px 24px',
  backgroundColor: '#1e293b', // Slate dark - sophisticated
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

const aiBadge = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '4px 10px',
  backgroundColor: 'rgba(139, 92, 246, 0.2)',
  borderRadius: '12px',
  fontSize: '11px',
  fontWeight: '600',
  color: '#c4b5fd',
  letterSpacing: '0.5px',
};

const aiBadgeIcon = {
  marginRight: '4px',
};

const narrativeSection = {
  padding: '32px 24px 24px 24px',
  backgroundColor: '#fafbfc',
  borderBottom: '1px solid #e5e7eb',
};

const dateLabel = {
  color: '#6b7280',
  fontSize: '13px',
  fontWeight: '500',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  marginBottom: '16px',
  margin: '0 0 16px 0',
};

const narrativeParagraph = {
  color: '#1f2937',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '0 0 16px 0',
};

const dividerSection = {
  padding: '16px 24px',
};

const dividerLine = {
  borderTop: '1px solid #e5e7eb',
  margin: '0',
};

const dividerLabelCol = {
  padding: '0 16px',
  whiteSpace: 'nowrap' as const,
};

const dividerLabel = {
  color: '#9ca3af',
  fontSize: '10px',
  fontWeight: '600',
  letterSpacing: '1px',
  margin: '0',
};

const content = {
  padding: '0 24px 32px 24px',
};

const sectionContainer = {
  marginBottom: '20px',
};

const sectionHeader = {
  display: 'flex',
  alignItems: 'center',
  marginBottom: '10px',
};

const sectionIcon = {
  fontSize: '14px',
  marginRight: '8px',
};

const sectionTitle = {
  color: '#374151',
  fontSize: '12px',
  fontWeight: '600',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
};

const compactCard = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '10px',
  padding: '8px 12px',
};

const compactItem = {
  display: 'flex',
  alignItems: 'center',
  padding: '6px 0',
};

const overdueSection = {
  marginBottom: '20px',
};

const overdueCard = {
  backgroundColor: '#fef2f2',
  border: '1px solid #fecaca',
  borderRadius: '10px',
  padding: '8px 12px',
};

const priorityDot = {
  width: '6px',
  height: '6px',
  borderRadius: '50%',
  marginRight: '10px',
  flexShrink: 0,
};

const itemText = {
  color: '#374151',
  fontSize: '13px',
};

const mealEmoji = {
  fontSize: '14px',
  marginRight: '10px',
  width: '20px',
};

const reminderBullet = {
  color: '#ec4899',
  fontSize: '18px',
  marginRight: '10px',
  lineHeight: '1',
};

// Timeline styles
const timelineCard = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '10px',
  padding: '12px',
};

const timelineItem = {
  display: 'flex',
  alignItems: 'flex-start',
  padding: '8px 0',
};

const timelineTime = {
  color: '#059669',
  fontSize: '11px',
  fontWeight: '600',
  width: '60px',
  flexShrink: 0,
  paddingTop: '2px',
};

const timelineDot = {
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  backgroundColor: '#d1d5db',
  marginRight: '12px',
  marginTop: '4px',
  flexShrink: 0,
};

const timelineContent = {
  flex: 1,
};

const timelineTitle = {
  color: '#1f2937',
  fontSize: '13px',
  fontWeight: '500',
  display: 'block',
};

const timelineLocation = {
  color: '#6b7280',
  fontSize: '11px',
  display: 'block',
  marginTop: '2px',
};

const halfColumn = {
  width: '50%',
  paddingRight: '8px',
};

const closingSection = {
  textAlign: 'center' as const,
  padding: '24px 0 16px 0',
};

const closingText = {
  color: '#6b7280',
  fontSize: '15px',
  fontStyle: 'italic',
  margin: '0',
};

const buttonContainer = {
  margin: '16px 0 0 0',
};

const primaryButton = {
  backgroundColor: '#1e293b',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 28px',
};

const secondaryButtonRow = {
  marginTop: '12px',
};

const secondaryLink = {
  color: '#6b7280',
  fontSize: '13px',
  textDecoration: 'underline',
};

const linkSeparator = {
  color: '#d1d5db',
  margin: '0 10px',
};

const link = {
  color: '#6b7280',
  textDecoration: 'underline',
};

const hr = {
  borderColor: '#e5e7eb',
  margin: '0',
};

const footer = {
  padding: '20px 24px',
  backgroundColor: '#f9fafb',
};

const footerText = {
  color: '#9ca3af',
  fontSize: '11px',
  lineHeight: '16px',
  margin: '0 0 6px 0',
  textAlign: 'center' as const,
};
