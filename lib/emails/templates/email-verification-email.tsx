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

interface EmailVerificationEmailProps {
  userEmail?: string;
  verificationUrl?: string;
  userName?: string;
}

export const EmailVerificationEmail = ({
  userEmail = 'user@example.com',
  verificationUrl = 'https://rowanapp.com/verify-email?token=sample-token',
  userName = 'there',
}: EmailVerificationEmailProps) => {
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
            <Heading style={h1}>Welcome to Rowan! 🎉</Heading>
            
            <Text style={text}>
              Hi {userName},
            </Text>
            
            <Text style={text}>
              Thank you for signing up for Rowan! We&apos;re excited to have you on board. 
              To get started, please verify your email address.
            </Text>
            
            <Text style={text}>
              Click the button below to verify <strong>{userEmail}</strong>:
            </Text>

            {/* Verification Button */}
            <Section style={buttonSection}>
              <Button
                href={verificationUrl}
                style={button}
              >
                Verify Email Address
              </Button>
            </Section>

            <Text style={text}>
              This link will expire in <strong>24 hours</strong> for security reasons.
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

            {/* Welcome Section */}
            <Section style={welcomeSection}>
              <Text style={welcomeTitle}>What&apos;s next?</Text>
              <Text style={welcomeText}>
                Once your email is verified, you&apos;ll be able to:<br/><br/>
                🏠 <strong>Create your first space</strong> - Set up a shared workspace with your partner<br/>
                📋 <strong>Start managing tasks</strong> - Keep track of your daily to-dos together<br/>
                📅 <strong>Plan events</strong> - Coordinate your schedules seamlessly<br/>
                💬 <strong>Stay connected</strong> - Send messages and share updates<br/>
                🛒 <strong>Share shopping lists</strong> - Never forget items again<br/>
                🥘 <strong>Plan meals together</strong> - Discover and organize recipes
              </Text>
            </Section>

            {/* Security Notice */}
            <Section style={securitySection}>
              <Text style={securityTitle}>Security Note:</Text>
              <Text style={securityText}>
                If you didn&apos;t create an account with Rowan, please ignore this email. 
                Your email address will not be added to our system without verification.
              </Text>
            </Section>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              Welcome to the Rowan family,<br/>
              The Rowan Team
            </Text>
            <Hr style={footerHr} />
            <Text style={footerLegal}>
              This email was sent to {userEmail}. Need help getting started? Contact us at{' '}
              <Link href="mailto:support@rowanapp.com" style={link}>
                support@rowanapp.com
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

const welcomeSection = {
  backgroundColor: '#eff6ff',
  border: '1px solid #3b82f6',
  borderRadius: '8px',
  padding: '20px',
  marginBottom: '24px',
};

const welcomeTitle = {
  fontSize: '18px',
  fontWeight: '600',
  color: '#1d4ed8',
  marginBottom: '12px',
};

const welcomeText = {
  fontSize: '15px',
  color: '#1d4ed8',
  lineHeight: '1.6',
  margin: '0',
};

const securitySection = {
  backgroundColor: '#f3f4f6',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  padding: '16px',
  marginBottom: '32px',
};

const securityTitle = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#374151',
  marginBottom: '8px',
};

const securityText = {
  fontSize: '13px',
  color: '#6b7280',
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

export default EmailVerificationEmail;
