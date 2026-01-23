import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Img,
  Text,
  Link,
  Hr,
  Button,
  Row,
  Column,
  Preview,
} from '@react-email/components';
import * as React from 'react';

interface BaseTemplateProps {
  previewText?: string;
  title: string;
  children: React.ReactNode;
  actionButton?: {
    text: string;
    url: string;
  };
  spaceName?: string;
  userName?: string;
  unsubscribeUrl?: string;
}

export const BaseTemplate = ({
  previewText = '',
  title,
  children,
  actionButton,
  spaceName = 'Your Space',
  userName = 'there',
  unsubscribeUrl,
}: BaseTemplateProps) => {
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Row>
              <Column>
                <Img
                  src="https://your-domain.com/logo.png"
                  width="120"
                  height="40"
                  alt="Rowan"
                  style={logo}
                />
              </Column>
              <Column align="right">
                <Text style={spaceBadge}>{spaceName}</Text>
              </Column>
            </Row>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            <Text style={greeting}>Hi {userName},</Text>
            <Text style={titleText}>{title}</Text>
            {children}

            {actionButton && (
              <Section style={buttonContainer}>
                <Button style={button} href={actionButton.url}>
                  {actionButton.text}
                </Button>
              </Section>
            )}
          </Section>

          <Hr style={hr} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              This notification was sent from{' '}
              <Link href="https://rowan-app.com" style={link}>
                Rowan
              </Link>
              , your family organization platform.
            </Text>

            <Text style={footerText}>
              You&apos;re receiving this because you&apos;re a member of <strong>{spaceName}</strong>.
            </Text>

            {unsubscribeUrl && (
              <Text style={footerText}>
                <Link href={unsubscribeUrl} style={unsubscribeLink}>
                  Unsubscribe from these notifications
                </Link>
              </Text>
            )}

            <Text style={footerCopyright}>
              © 2024 Rowan. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default BaseTemplate;

// Styles
const main = {
  backgroundColor: '#f8fafc',
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
  borderBottom: '1px solid #e5e7eb',
};

const logo = {
  maxWidth: '120px',
  height: 'auto',
};

const spaceBadge = {
  backgroundColor: '#3b82f6',
  color: '#ffffff',
  padding: '4px 12px',
  borderRadius: '12px',
  fontSize: '12px',
  fontWeight: '500',
  display: 'inline-block',
  margin: '0',
};

const content = {
  padding: '30px',
};

const greeting = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 16px',
};

const titleText = {
  color: '#111827',
  fontSize: '24px',
  fontWeight: 'bold',
  lineHeight: '32px',
  margin: '0 0 24px',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#3b82f6',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
  border: 'none',
};

const hr = {
  borderColor: '#e5e7eb',
  margin: '20px 0',
};

const footer = {
  padding: '0 30px',
  textAlign: 'center' as const,
};

const footerText = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '8px 0',
};

const footerCopyright = {
  color: '#9ca3af',
  fontSize: '12px',
  lineHeight: '16px',
  margin: '16px 0 0',
};

const link = {
  color: '#3b82f6',
  textDecoration: 'underline',
};

const unsubscribeLink = {
  color: '#6b7280',
  textDecoration: 'underline',
  fontSize: '12px',
};