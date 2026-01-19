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

interface DailyDigestEmailProps {
  recipientName: string;
  date: string;
  spaceName: string;
  spaceId: string;
  events: CalendarEvent[];
  tasksDue: Task[];
  overdueTasks: Task[];
  meals: Meal[];
  reminders: Reminder[];
  greeting: string;
}

const DailyDigestEmail = ({
  recipientName = 'Partner',
  date = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
  spaceName: _spaceName = 'Your Space',
  spaceId: _spaceId = '',
  events = [],
  tasksDue = [],
  overdueTasks = [],
  meals = [],
  reminders = [],
  greeting = 'Good morning',
}: DailyDigestEmailProps) => {
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

  return (
    <Html>
      <Head />
      <Preview>
        {greeting}, {recipientName}! Here&apos;s your daily briefing for {date}
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
                <Text style={headerTitle}>Rowan Daily Digest</Text>
              </Column>
            </Row>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            <div style={greetingBadge}>
              ☀️ Daily Briefing
            </div>

            <Heading style={h1}>{greeting}, {recipientName}!</Heading>

            <Text style={dateText}>
              {date}
            </Text>

            {!hasContent ? (
              <Section style={emptyCard}>
                <Text style={emptyText}>
                  🎉 You have a clear day ahead! No events, tasks, or reminders scheduled.
                </Text>
              </Section>
            ) : (
              <>
                {/* Overdue Tasks Alert */}
                {overdueTasks.length > 0 && (
                  <Section style={overdueSection}>
                    <div style={sectionHeader}>
                      <span style={sectionIcon}>⚠️</span>
                      <span style={sectionTitle}>Overdue Tasks ({overdueTasks.length})</span>
                    </div>
                    <div style={overdueCard}>
                      {overdueTasks.slice(0, 5).map((task) => (
                        <div key={task.id} style={overdueItem}>
                          <span style={{
                            ...priorityDot,
                            backgroundColor: priorityColors[task.priority] || priorityColors.normal
                          }} />
                          <span style={overdueTitle}>{task.title}</span>
                        </div>
                      ))}
                      {overdueTasks.length > 5 && (
                        <Text style={moreText}>
                          +{overdueTasks.length - 5} more overdue tasks
                        </Text>
                      )}
                    </div>
                  </Section>
                )}

                {/* Today's Events */}
                {events.length > 0 && (
                  <Section style={sectionContainer}>
                    <div style={sectionHeader}>
                      <span style={sectionIcon}>📅</span>
                      <span style={sectionTitle}>Today&apos;s Events ({events.length})</span>
                    </div>
                    <div style={listCard}>
                      {events.slice(0, 5).map((event) => (
                        <div key={event.id} style={listItem}>
                          <div style={eventTime}>
                            {event.all_day ? 'All Day' : formatTime(event.start_time)}
                          </div>
                          <div style={eventDetails}>
                            <span style={eventTitle}>{event.title}</span>
                            {event.location && (
                              <span style={eventLocation}>📍 {event.location}</span>
                            )}
                          </div>
                        </div>
                      ))}
                      {events.length > 5 && (
                        <Text style={moreText}>
                          +{events.length - 5} more events
                        </Text>
                      )}
                    </div>
                  </Section>
                )}

                {/* Tasks Due Today */}
                {tasksDue.length > 0 && (
                  <Section style={sectionContainer}>
                    <div style={sectionHeader}>
                      <span style={sectionIcon}>✅</span>
                      <span style={sectionTitle}>Tasks Due Today ({tasksDue.length})</span>
                    </div>
                    <div style={listCard}>
                      {tasksDue.slice(0, 5).map((task) => (
                        <div key={task.id} style={listItem}>
                          <span style={{
                            ...priorityDot,
                            backgroundColor: priorityColors[task.priority] || priorityColors.normal
                          }} />
                          <span style={taskTitle}>{task.title}</span>
                        </div>
                      ))}
                      {tasksDue.length > 5 && (
                        <Text style={moreText}>
                          +{tasksDue.length - 5} more tasks
                        </Text>
                      )}
                    </div>
                  </Section>
                )}

                {/* Today's Meals */}
                {meals.length > 0 && (
                  <Section style={sectionContainer}>
                    <div style={sectionHeader}>
                      <span style={sectionIcon}>🍽️</span>
                      <span style={sectionTitle}>Today&apos;s Meals</span>
                    </div>
                    <div style={listCard}>
                      {meals.map((meal) => (
                        <div key={meal.id} style={listItem}>
                          <span style={mealEmoji}>{mealEmojis[meal.meal_type] || '🍴'}</span>
                          <div style={mealDetails}>
                            <span style={mealType}>{meal.meal_type.charAt(0).toUpperCase() + meal.meal_type.slice(1)}</span>
                            <span style={mealName}>{meal.recipe_name}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                {/* Reminders */}
                {reminders.length > 0 && (
                  <Section style={sectionContainer}>
                    <div style={sectionHeader}>
                      <span style={sectionIcon}>⏰</span>
                      <span style={sectionTitle}>Reminders ({reminders.length})</span>
                    </div>
                    <div style={listCard}>
                      {reminders.slice(0, 5).map((reminder) => (
                        <div key={reminder.id} style={listItem}>
                          <span style={reminderDot}>•</span>
                          <div style={reminderDetails}>
                            <span style={reminderTitle}>{reminder.title}</span>
                            {reminder.reminder_time && (
                              <span style={reminderTime}>{formatTime(reminder.reminder_time)}</span>
                            )}
                          </div>
                        </div>
                      ))}
                      {reminders.length > 5 && (
                        <Text style={moreText}>
                          +{reminders.length - 5} more reminders
                        </Text>
                      )}
                    </div>
                  </Section>
                )}
              </>
            )}

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
                  <Link href={calendarUrl} style={secondaryLink}>View Calendar</Link>
                  <span style={linkSeparator}>•</span>
                  <Link href={tasksUrl} style={secondaryLink}>View Tasks</Link>
                </Column>
              </Row>
            </Section>

            <Text style={signoffText}>
              Have a great day! 🌟
            </Text>
          </Section>

          {/* Footer */}
          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              You&apos;re receiving this daily digest because you have it enabled in your notification settings.
            </Text>
            <Text style={footerText}>
              <Link href="https://rowanapp.com/settings?tab=notifications" style={link}>
                Manage your notification preferences
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
  backgroundColor: '#059669', // Emerald for morning freshness
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

const greetingBadge = {
  display: 'inline-block',
  padding: '6px 12px',
  backgroundColor: '#ecfdf5',
  color: '#065f46',
  borderRadius: '16px',
  fontSize: '12px',
  fontWeight: '600',
  marginBottom: '16px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
};

const h1 = {
  color: '#1f2937',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '0 0 8px 0',
  lineHeight: '36px',
};

const dateText = {
  color: '#6b7280',
  fontSize: '16px',
  margin: '0 0 24px 0',
};

const emptyCard = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  padding: '32px 24px',
  margin: '24px 0',
  textAlign: 'center' as const,
};

const emptyText = {
  color: '#6b7280',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0',
};

const sectionContainer = {
  margin: '24px 0',
};

const sectionHeader = {
  display: 'flex',
  alignItems: 'center',
  marginBottom: '12px',
};

const sectionIcon = {
  fontSize: '16px',
  marginRight: '8px',
};

const sectionTitle = {
  color: '#374151',
  fontSize: '14px',
  fontWeight: '600',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
};

const listCard = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  padding: '4px 0',
  overflow: 'hidden',
};

const listItem = {
  display: 'flex',
  alignItems: 'center',
  padding: '12px 16px',
  borderBottom: '1px solid #f3f4f6',
};

const overdueSection = {
  margin: '24px 0',
};

const overdueCard = {
  backgroundColor: '#fef2f2',
  border: '1px solid #fecaca',
  borderRadius: '12px',
  padding: '4px 0',
  overflow: 'hidden',
};

const overdueItem = {
  display: 'flex',
  alignItems: 'center',
  padding: '12px 16px',
  borderBottom: '1px solid #fee2e2',
};

const overdueTitle = {
  color: '#991b1b',
  fontSize: '14px',
  fontWeight: '500',
};

const priorityDot = {
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  marginRight: '12px',
  flexShrink: 0,
};

const eventTime = {
  color: '#059669',
  fontSize: '12px',
  fontWeight: '600',
  width: '70px',
  flexShrink: 0,
};

const eventDetails = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '2px',
};

const eventTitle = {
  color: '#1f2937',
  fontSize: '14px',
  fontWeight: '500',
};

const eventLocation = {
  color: '#6b7280',
  fontSize: '12px',
};

const taskTitle = {
  color: '#1f2937',
  fontSize: '14px',
  fontWeight: '500',
};

const mealEmoji = {
  fontSize: '16px',
  marginRight: '12px',
  width: '24px',
  textAlign: 'center' as const,
};

const mealDetails = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '2px',
};

const mealType = {
  color: '#6b7280',
  fontSize: '11px',
  fontWeight: '600',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
};

const mealName = {
  color: '#1f2937',
  fontSize: '14px',
  fontWeight: '500',
};

const reminderDot = {
  color: '#ec4899',
  fontSize: '20px',
  marginRight: '12px',
  lineHeight: '1',
};

const reminderDetails = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '2px',
};

const reminderTitle = {
  color: '#1f2937',
  fontSize: '14px',
  fontWeight: '500',
};

const reminderTime = {
  color: '#6b7280',
  fontSize: '12px',
};

const moreText = {
  color: '#6b7280',
  fontSize: '12px',
  fontStyle: 'italic',
  textAlign: 'center' as const,
  padding: '8px 16px 12px',
  margin: '0',
};

const buttonContainer = {
  margin: '32px 0 24px',
};

const primaryButton = {
  backgroundColor: '#059669',
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

const secondaryButtonRow = {
  marginTop: '16px',
};

const secondaryLink = {
  color: '#059669',
  fontSize: '14px',
  textDecoration: 'underline',
};

const linkSeparator = {
  color: '#d1d5db',
  margin: '0 12px',
};

const signoffText = {
  color: '#6b7280',
  fontSize: '14px',
  textAlign: 'center' as const,
  margin: '0',
};

const link = {
  color: '#059669',
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
