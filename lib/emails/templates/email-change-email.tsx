import * as React from 'react';
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Link,
  Heading,
  Button,
  Hr,
  Img,
} from '@react-email/components';

interface EmailChangeEmailProps {
  currentEmail?: string;
  newEmail?: string;
  verificationUrl?: string;
  userName?: string;
}

export const EmailChangeEmail = ({
  currentEmail = 'current@example.com',
  newEmail = 'new@example.com',
  verificationUrl = 'https://rowanapp.com/verify-email-change?token=sample-token',
  userName = 'there',
}: EmailChangeEmailProps) => {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          {/* Logo Section */}
          <Section style={logoSection}>
            <Img
              src="https://rowanapp.com/rowan-logo.png"
              width="48"
              height="48"
              alt="Rowan"
              style={logo}
            />
            <Heading style={brandName}>Rowan</Heading>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            <Heading style={h1}>Confirm Your New Email Address</Heading>

            <Text style={text}>
              Hi {userName},
            </Text>

            <Text style={text}>
              You requested to change your email address on Rowan from{' '}
              <strong>{currentEmail}</strong> to <strong>{newEmail}</strong>.
            </Text>

            <Text style={text}>
              Click the button below to confirm this change:
            </Text>

            {/* Verification Button */}
            <Section style={buttonSection}>
              <Button
                href={verificationUrl}
                style={button}
              >
                Confirm Email Change
              </Button>
            </Section>

            <Text style={text}>
              This link will expire in <strong>1 hour</strong> for security reasons.
            </Text>

            <Text style={text}>
              If the button doesn&apos;t work, copy and paste this link into your browser:
            </Text>

            <Text style={linkText}>
              <Link href={verificationUrl} style={link}>
                {verificationUrl}
              </Link>
            </Text>

            <Hr style={hr} />

            {/* Security Notice */}
            <Section style={securitySection}>
              <Text style={securityTitle}>Didn&apos;t request this change?</Text>
              <Text style={securityText}>
                If you didn&apos;t request to change your email address, please ignore this email.
                Your current email ({currentEmail}) will remain unchanged. If you&apos;re concerned
                about your account security, please change your password immediately and contact
                our support team.
              </Text>
            </Section>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              Best regards,<br/>
              The Rowan Team
            </Text>
            <Hr style={footerHr} />
            <Text style={footerLegal}>
              This email was sent to {newEmail} to verify your email change request.
              Need help? Contact us at{' '}
              <Link href="mailto:contact@steelmotionllc.com" style={link}>
                contact@steelmotionllc.com
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

// Styles
const main = {
  backgroundColor: '#f8fafc',
  padding: '20px 0',
  fontFamily: '"Inter", "Helvetica Neue", Helvetica, Arial, sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '40px 20px',
  borderRadius: '8px',
  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  maxWidth: '600px',
};

const logoSection = {
  textAlign: 'center' as const,
  marginBottom: '32px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '12px',
};

const logo = {
  borderRadius: '8px',
};

const brandName = {
  fontSize: '28px',
  fontWeight: '700',
  background: 'linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)',
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  color: 'transparent',
  margin: '0',
};

const content = {
  padding: '0 20px',
};

const h1 = {
  fontSize: '28px',
  fontWeight: '700',
  color: '#1e293b',
  textAlign: 'center' as const,
  marginBottom: '32px',
  lineHeight: '1.3',
};

const text = {
  fontSize: '16px',
  lineHeight: '1.6',
  color: '#374151',
  marginBottom: '16px',
};

const buttonSection = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#7c3aed',
  borderRadius: '12px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '16px 32px',
  border: 'none',
  cursor: 'pointer',
};

const linkText = {
  fontSize: '14px',
  color: '#6b7280',
  wordBreak: 'break-all' as const,
  marginBottom: '24px',
};

const link = {
  color: '#7c3aed',
  textDecoration: 'underline',
};

const hr = {
  borderColor: '#e5e7eb',
  margin: '32px 0',
};

const securitySection = {
  backgroundColor: '#fef2f2',
  border: '1px solid #ef4444',
  borderRadius: '8px',
  padding: '16px',
  marginBottom: '32px',
};

const securityTitle = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#dc2626',
  marginBottom: '8px',
};

const securityText = {
  fontSize: '13px',
  color: '#7f1d1d',
  lineHeight: '1.5',
  margin: '0',
};

const footer = {
  textAlign: 'center' as const,
};

const footerText = {
  fontSize: '16px',
  color: '#374151',
  marginBottom: '16px',
};

const footerHr = {
  borderColor: '#e5e7eb',
  margin: '24px 0',
};

const footerLegal = {
  fontSize: '12px',
  color: '#6b7280',
  lineHeight: '1.5',
};

export default EmailChangeEmail;
