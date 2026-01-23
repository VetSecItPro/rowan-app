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

interface EventReminderEmailProps {
  recipientName: string;
  eventTitle: string;
  eventDescription?: string;
  eventDate: string;
  eventTime: string;
  location?: string;
  reminderType: '15min' | '1hour' | '1day';
  eventId: string;
  spaceId: string;
  spaceName: string;
}

const EventReminderEmail = ({
  recipientName = 'Partner',
  eventTitle = 'Upcoming Event',
  eventDescription,
  eventDate = 'Today',
  eventTime = '12:00 PM',
  location,
  reminderType = '1hour',
  eventId,
  spaceId,
  spaceName = 'Your Space',
}: EventReminderEmailProps) => {
  const reminderLabels = {
    '15min': 'in 15 minutes',
    '1hour': 'in 1 hour',
    '1day': 'tomorrow'
  };

  const eventUrl = `https://rowanapp.com/spaces/${spaceId}/calendar/${eventId}`;

  return (
    <Html>
      <Head />
      <Preview>
        Reminder: {eventTitle} starts {reminderLabels[reminderType]}
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
            <div style={reminderBadge}>
              📅 Event Reminder
            </div>

            <Heading style={h1}>Don&apos;t forget!</Heading>

            <Text style={text}>
              Hi {recipientName},
            </Text>

            <Text style={text}>
              Your event <strong>{eventTitle}</strong> starts {reminderLabels[reminderType]}.
            </Text>

            {/* Event Card */}
            <Section style={eventCard}>
              <div style={eventIcon}>📅</div>

              <Heading style={eventTitleStyle}>{eventTitle}</Heading>

              {eventDescription && (
                <Text style={eventDesc}>{eventDescription}</Text>
              )}

              <div style={eventDetails}>
                <div style={eventDetail}>
                  <span style={detailLabel}>📅 Date:</span>
                  <span style={detailValue}>{eventDate}</span>
                </div>

                <div style={eventDetail}>
                  <span style={detailLabel}>🕐 Time:</span>
                  <span style={detailValue}>{eventTime}</span>
                </div>

                {location && (
                  <div style={eventDetail}>
                    <span style={detailLabel}>📍 Location:</span>
                    <span style={detailValue}>{location}</span>
                  </div>
                )}

                <div style={eventDetail}>
                  <span style={detailLabel}>🏠 Space:</span>
                  <span style={detailValue}>{spaceName}</span>
                </div>
              </div>
            </Section>

            {/* Action Buttons */}
            <Section style={buttonContainer}>
              <Button style={primaryButton} href={eventUrl}>
                View Event
              </Button>
            </Section>

            <Text style={text}>
              You can view and manage this event in your <Link href={`https://rowanapp.com/spaces/${spaceId}/calendar`} style={link}>calendar</Link> on Rowan.
            </Text>
          </Section>

          {/* Footer */}
          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              You&apos;re receiving this email because you have email notifications enabled for event reminders.
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

export default EventReminderEmail;

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
  backgroundColor: '#8b5cf6',
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

const reminderBadge = {
  display: 'inline-block',
  padding: '6px 12px',
  backgroundColor: '#fef3c7',
  color: '#92400e',
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

const eventCard = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  padding: '24px',
  margin: '24px 0',
  textAlign: 'center' as const,
};

const eventIcon = {
  fontSize: '32px',
  marginBottom: '12px',
};

const eventTitleStyle = {
  color: '#1f2937',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '0 0 16px 0',
  lineHeight: '28px',
};

const eventDesc = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0 0 20px 0',
};

const eventDetails = {
  textAlign: 'left' as const,
  maxWidth: '300px',
  margin: '0 auto',
};

const eventDetail = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '8px 0',
  borderBottom: '1px solid #f3f4f6',
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
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const primaryButton = {
  backgroundColor: '#8b5cf6',
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

const link = {
  color: '#8b5cf6',
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