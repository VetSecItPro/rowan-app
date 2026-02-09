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

interface MagicLinkEmailProps {
  userEmail?: string;
  magicLinkUrl?: string;
  userName?: string;
  ipAddress?: string;
  userAgent?: string;
}

export const MagicLinkEmail = ({
  userEmail = 'user@example.com',
  magicLinkUrl = 'https://rowanapp.com/magic?token=sample-token',
  userName = 'there',
  ipAddress = '192.168.1.1',
  userAgent = 'Chrome on macOS',
}: MagicLinkEmailProps) => {
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
            <Heading style={h1}>Sign in to Rowan</Heading>
            
            <Text style={text}>
              Hi {userName},
            </Text>
            
            <Text style={text}>
              Someone (hopefully you!) requested a magic link to sign in to your Rowan account 
              using <strong>{userEmail}</strong>.
            </Text>
            
            <Text style={text}>
              Click the button below to securely sign in:
            </Text>

            {/* Magic Link Button */}
            <Section style={buttonSection}>
              <Button
                href={magicLinkUrl}
                style={button}
              >
                Sign In to Rowan
              </Button>
            </Section>

            <Text style={text}>
              This link will expire in <strong>15 minutes</strong> and can only be used once.
            </Text>

            <Text style={text}>
              If the button doesn&apos;t work, copy and paste this link into your browser:
            </Text>
            
            <Text style={linkText}>
              <Link href={magicLinkUrl} style={link}>
                {magicLinkUrl}
              </Link>
            </Text>

            <Hr style={hr} />

            {/* Security Information */}
            <Section style={securitySection}>
              <Text style={securityTitle}>Sign-in Request Details:</Text>
              <Text style={securityText}>
                • <strong>Email:</strong> {userEmail}<br/>
                • <strong>IP Address:</strong> {ipAddress}<br/>
                • <strong>Device:</strong> {userAgent}<br/>
                • <strong>Time:</strong> {new Date().toLocaleString()}
              </Text>
              <Text style={securityWarning}>
                If you didn&apos;t request this sign-in link, please ignore this email or{' '}
                <Link href="mailto:contact@steelmotionllc.com" style={link}>
                  contact our support team
                </Link>{' '}
                if you&apos;re concerned about your account security.
              </Text>
            </Section>

            {/* Benefits */}
            <Section style={benefitsSection}>
              <Text style={benefitsTitle}>Why Magic Links?</Text>
              <Text style={benefitsText}>
                ✨ <strong>No passwords to remember</strong> - Just click and you&apos;re in<br/>
                🔒 <strong>More secure</strong> - Links expire quickly and can&apos;t be reused<br/>
                ⚡ <strong>Faster sign-in</strong> - No typing, no forgetting passwords<br/>
                📱 <strong>Works everywhere</strong> - Email, phone, tablet, computer
              </Text>
            </Section>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              Welcome to a simpler way to sign in,<br/>
              The Rowan Team
            </Text>
            <Hr style={footerHr} />
            <Text style={footerLegal}>
              This email was sent to {userEmail}. Questions? Reach us at{' '}
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
  backgroundColor: '#fef3c7',
  border: '1px solid #fbbf24',
  borderRadius: '8px',
  padding: '20px',
  marginBottom: '24px',
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
  marginBottom: '12px',
};

const securityWarning = {
  fontSize: '14px',
  color: '#92400e',
  lineHeight: '1.5',
  margin: '0',
};

const benefitsSection = {
  backgroundColor: '#eff6ff',
  border: '1px solid #3b82f6',
  borderRadius: '8px',
  padding: '20px',
  marginBottom: '32px',
};

const benefitsTitle = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#1d4ed8',
  marginBottom: '8px',
};

const benefitsText = {
  fontSize: '14px',
  color: '#1d4ed8',
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

export default MagicLinkEmail;
