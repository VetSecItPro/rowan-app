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

interface PasswordResetEmailProps {
  userEmail?: string;
  resetUrl?: string;
  userName?: string;
}

export const PasswordResetEmail = ({
  userEmail = 'user@example.com',
  resetUrl = 'https://rowanapp.com/reset-password?token=sample-token',
  userName = 'there',
}: PasswordResetEmailProps) => {
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
            <Heading style={h1}>Reset Your Password</Heading>
            
            <Text style={text}>
              Hi {userName},
            </Text>
            
            <Text style={text}>
              We received a request to reset the password for your Rowan account (<strong>{userEmail}</strong>). 
              If you didn&apos;t make this request, you can safely ignore this email.
            </Text>
            
            <Text style={text}>
              To reset your password, click the button below:
            </Text>

            {/* Reset Button */}
            <Section style={buttonSection}>
              <Button
                href={resetUrl}
                style={button}
              >
                Reset Password
              </Button>
            </Section>

            <Text style={text}>
              This link will expire in <strong>1 hour</strong> for security reasons.
            </Text>

            <Text style={text}>
              If the button doesn&apos;t work, copy and paste this link into your browser:
            </Text>
            
            <Text style={linkText}>
              <Link href={resetUrl} style={link}>
                {resetUrl}
              </Link>
            </Text>

            <Hr style={hr} />

            {/* Security Notice */}
            <Section style={securitySection}>
              <Text style={securityTitle}>Security Tips:</Text>
              <Text style={securityText}>
                • This email was sent to {userEmail}<br/>
                • Never share your password with anyone<br/>
                • Use a strong, unique password<br/>
                • Enable two-factor authentication for extra security
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
              This email was sent to {userEmail}. If you have questions, contact us at{' '}
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

const securitySection = {
  backgroundColor: '#fef3c7',
  border: '1px solid #fbbf24',
  borderRadius: '8px',
  padding: '20px',
  marginBottom: '32px',
};

const securityTitle = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#92400e',
  marginBottom: '8px',
};

const securityText = {
  fontSize: '14px',
  color: '#92400e',
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

export default PasswordResetEmail;
