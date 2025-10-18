import { Text, Link, Section, Row, Column } from '@react-email/components';
import * as React from 'react';
import BaseTemplate from './BaseTemplate';

interface EventReminderEmailProps {
  eventTitle: string;
  eventDescription?: string;
  startTime: string;
  endTime?: string;
  location?: string;
  isAllDay?: boolean;
  organizer: string;
  reminderType: 'now' | '15min' | '1hour' | '1day';
  spaceName: string;
  userName: string;
  eventUrl: string;
  unsubscribeUrl?: string;
}

export const EventReminderEmail = ({
  eventTitle,
  eventDescription,
  startTime,
  endTime,
  location,
  isAllDay = false,
  organizer,
  reminderType,
  spaceName,
  userName,
  eventUrl,
  unsubscribeUrl,
}: EventReminderEmailProps) => {
  const reminderTexts = {
    now: 'is starting now',
    '15min': 'starts in 15 minutes',
    '1hour': 'starts in 1 hour',
    '1day': 'is tomorrow',
  };

  const formatDateTime = (dateTime: string) => {
    const date = new Date(dateTime);
    if (isAllDay) {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  };

  return (
    <BaseTemplate
      previewText={`Event reminder: ${eventTitle} ${reminderTexts[reminderType]}`}
      title="Event Reminder"
      spaceName={spaceName}
      userName={userName}
      actionButton={{
        text: 'View Event',
        url: eventUrl,
      }}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Text style={reminderText}>
        Your event <strong>"{eventTitle}"</strong> {reminderTexts[reminderType]}.
      </Text>

      <Section style={eventCard}>
        <Text style={eventTitle}>{eventTitle}</Text>

        {eventDescription && (
          <Text style={eventDescription}>{eventDescription}</Text>
        )}

        <Section style={eventDetails}>
          <Row>
            <Column style={iconColumn}>
              <Text style={icon}>🕒</Text>
            </Column>
            <Column>
              <Text style={detailText}>
                <strong>When:</strong> {formatDateTime(startTime)}
                {endTime && !isAllDay && (
                  <> - {new Date(endTime).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    timeZoneName: 'short',
                  })}</>
                )}
              </Text>
            </Column>
          </Row>

          {location && (
            <Row style={{ marginTop: '12px' }}>
              <Column style={iconColumn}>
                <Text style={icon}>📍</Text>
              </Column>
              <Column>
                <Text style={detailText}>
                  <strong>Where:</strong> {location}
                </Text>
              </Column>
            </Row>
          )}

          <Row style={{ marginTop: '12px' }}>
            <Column style={iconColumn}>
              <Text style={icon}>👤</Text>
            </Column>
            <Column>
              <Text style={detailText}>
                <strong>Organizer:</strong> {organizer}
              </Text>
            </Column>
          </Row>
        </Section>
      </Section>

      <Text style={footerNote}>
        You can view all your events and update your attendance in your{' '}
        <Link href={eventUrl.replace(/\/[^\/]*$/, '')} style={link}>
          calendar
        </Link>
        .
      </Text>
    </BaseTemplate>
  );
};

export default EventReminderEmail;

// Styles
const reminderText = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 24px',
};

const eventCard = {
  backgroundColor: '#f0f9ff',
  border: '1px solid #0ea5e9',
  borderRadius: '8px',
  padding: '20px',
  margin: '20px 0',
};

const eventTitle = {
  color: '#0c4a6e',
  fontSize: '20px',
  fontWeight: 'bold',
  lineHeight: '28px',
  margin: '0 0 12px',
};

const eventDescription = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0 0 16px',
};

const eventDetails = {
  margin: '16px 0 0',
};

const iconColumn = {
  width: '32px',
  verticalAlign: 'top',
};

const icon = {
  fontSize: '16px',
  margin: '0',
  lineHeight: '20px',
};

const detailText = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0',
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