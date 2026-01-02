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

interface BetaInviteEmailProps {
  recipientEmail: string;
  recipientName?: string;
  inviteCode: string;
  signupUrl: string;
  expiresAt?: string;
}

const BetaInviteEmail = ({
  recipientEmail = 'beta@example.com',
  recipientName,
  inviteCode = 'XXXX-XXXX-XXXX',
  signupUrl = 'https://rowanapp.com/signup?beta_code=XXXX-XXXX-XXXX',
  expiresAt = 'February 15, 2026',
}: BetaInviteEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>
        You&apos;re invited to Rowan Beta! Your exclusive invite code is inside.
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Row>
              <Column style={headerLogoColumn}>
                <Img
                  src="https://rowanapp.com/rowan-logo.png"
                  width="48"
                  height="48"
                  alt="Rowan"
                  style={logo}
                />
              </Column>
              <Column style={headerTextColumn}>
                <Text style={headerTitle}>Rowan Beta</Text>
                <Text style={headerSubtitle}>Exclusive Early Access</Text>
              </Column>
            </Row>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            <Heading style={h1}>Welcome to Rowan Beta! 🌳</Heading>

            <Text style={text}>
              {recipientName ? `Hi ${recipientName},` : 'Hi there,'}
            </Text>

            <Text style={text}>
              You&apos;re one of only <strong>100 people</strong> invited to test Rowan
              before anyone else. Thank you for joining us on this journey to build
              something special for couples and families!
            </Text>

            {/* Invite Code Box */}
            <Section style={codeCard}>
              <Text style={codeLabel}>YOUR EXCLUSIVE INVITE CODE</Text>
              <Text style={codeText}>{inviteCode}</Text>
              <Text style={codeNote}>Keep this code safe - it&apos;s unique to you!</Text>
            </Section>

            {/* Action Button */}
            <Section style={buttonContainer}>
              <Button style={button} href={signupUrl}>
                Create Your Account →
              </Button>
            </Section>

            <Text style={smallText}>
              Can&apos;t click the button? Copy this link into your browser:
            </Text>
            <Text style={linkText}>
              <Link href={signupUrl} style={link}>
                {signupUrl}
              </Link>
            </Text>
          </Section>

          {/* What to Expect Section */}
          <Section style={expectSection}>
            <Heading style={expectTitle}>What to expect as a beta tester:</Heading>
            <Row>
              <Column style={expectItem}>
                <Text style={expectIcon}>🎁</Text>
                <Text style={expectText}>
                  <strong>Full access</strong> to all features until {expiresAt}
                </Text>
              </Column>
            </Row>
            <Row>
              <Column style={expectItem}>
                <Text style={expectIcon}>💡</Text>
                <Text style={expectText}>
                  <strong>Shape the product</strong> - your feedback directly influences development
                </Text>
              </Column>
            </Row>
            <Row>
              <Column style={expectItem}>
                <Text style={expectIcon}>🏆</Text>
                <Text style={expectText}>
                  <strong>Exclusive badge</strong> - forever marked as a founding beta tester
                </Text>
              </Column>
            </Row>
            <Row>
              <Column style={expectItem}>
                <Text style={expectIcon}>💰</Text>
                <Text style={expectText}>
                  <strong>20% lifetime discount</strong> - exclusive pricing for beta testers when you convert to a paid plan
                </Text>
              </Column>
            </Row>
          </Section>

          {/* Features Preview */}
          <Section style={featuresSection}>
            <Heading style={featuresTitle}>What you can do with Rowan:</Heading>
            <Row>
              <Column style={featureColumn}>
                <Text style={featureText}>📋 Shared task lists</Text>
              </Column>
              <Column style={featureColumn}>
                <Text style={featureText}>🛒 Shopping lists</Text>
              </Column>
            </Row>
            <Row>
              <Column style={featureColumn}>
                <Text style={featureText}>📅 Calendar sync</Text>
              </Column>
              <Column style={featureColumn}>
                <Text style={featureText}>🎯 Goal tracking</Text>
              </Column>
            </Row>
            <Row>
              <Column style={featureColumn}>
                <Text style={featureText}>💬 Private messaging</Text>
              </Column>
              <Column style={featureColumn}>
                <Text style={featureText}>🍽️ Meal planning</Text>
              </Column>
            </Row>
          </Section>

          {/* Footer */}
          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              Questions? Just reply to this email – we read every message.
            </Text>
            <Text style={footerText}>
              This invite was sent to {recipientEmail}
            </Text>
            <Text style={footerText}>
              Code expires: {expiresAt}
            </Text>
            <Text style={footerCopyright}>
              © 2025 Rowan • Veteran Owned Business
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default BetaInviteEmail;

// Styles
const main = {
  backgroundColor: '#f3f4f6',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '0',
  marginBottom: '64px',
  maxWidth: '600px',
  borderRadius: '16px',
  overflow: 'hidden',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
};

const header = {
  padding: '40px 40px 30px 40px',
  backgroundColor: '#3b82f6',
  textAlign: 'center' as const,
};

const headerLogoColumn = {
  textAlign: 'center' as const,
  paddingBottom: '12px',
};

const headerTextColumn = {
  textAlign: 'center' as const,
};

const logo = {
  borderRadius: '12px',
  margin: '0 auto',
};

const headerTitle = {
  color: '#ffffff',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '0',
  lineHeight: '36px',
};

const headerSubtitle = {
  color: 'rgba(255, 255, 255, 0.9)',
  fontSize: '14px',
  margin: '4px 0 0 0',
  lineHeight: '20px',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
};

const content = {
  padding: '40px',
};

const h1 = {
  color: '#1f2937',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '0 0 24px 0',
  lineHeight: '36px',
  textAlign: 'center' as const,
};

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '0 0 16px 0',
};

const codeCard = {
  backgroundColor: '#eff6ff',
  border: '2px solid #3b82f6',
  borderRadius: '12px',
  padding: '24px',
  margin: '24px 0',
  textAlign: 'center' as const,
};

const codeLabel = {
  color: '#6b7280',
  fontSize: '12px',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
  margin: '0 0 8px 0',
};

const codeText = {
  color: '#1e40af',
  fontSize: '32px',
  fontWeight: 'bold',
  fontFamily: '"SF Mono", Monaco, "Courier New", monospace',
  letterSpacing: '2px',
  margin: '0 0 8px 0',
};

const codeNote = {
  color: '#6b7280',
  fontSize: '13px',
  margin: '0',
  fontStyle: 'italic',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0 16px 0',
};

const button = {
  backgroundColor: '#3b82f6',
  borderRadius: '12px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '16px 40px',
  lineHeight: '24px',
};

const smallText = {
  color: '#9ca3af',
  fontSize: '13px',
  lineHeight: '20px',
  margin: '0 0 4px 0',
  textAlign: 'center' as const,
};

const linkText = {
  textAlign: 'center' as const,
  margin: '0 0 16px 0',
};

const link = {
  color: '#3b82f6',
  textDecoration: 'underline',
  fontSize: '13px',
  wordBreak: 'break-all' as const,
};

const expectSection = {
  backgroundColor: '#f9fafb',
  padding: '24px 40px',
  borderTop: '1px solid #e5e7eb',
};

const expectTitle = {
  color: '#111827',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 16px 0',
  textAlign: 'center' as const,
};

const expectItem = {
  paddingBottom: '12px',
};

const expectIcon = {
  fontSize: '20px',
  margin: '0',
  display: 'inline',
  verticalAlign: 'middle',
};

const expectText = {
  color: '#4b5563',
  fontSize: '14px',
  margin: '0',
  lineHeight: '22px',
  display: 'inline',
  paddingLeft: '8px',
};

const featuresSection = {
  backgroundColor: '#eff6ff',
  padding: '24px 40px',
  borderTop: '1px solid #e5e7eb',
};

const featuresTitle = {
  color: '#1e40af',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 16px 0',
  textAlign: 'center' as const,
};

const featureColumn = {
  width: '50%',
  paddingBottom: '8px',
};

const featureText = {
  color: '#3b82f6',
  fontSize: '14px',
  margin: '0',
  lineHeight: '20px',
};

const hr = {
  borderColor: '#e5e7eb',
  margin: '0',
};

const footer = {
  padding: '24px 40px',
  backgroundColor: '#f9fafb',
};

const footerText = {
  color: '#9ca3af',
  fontSize: '12px',
  lineHeight: '18px',
  margin: '0 0 6px 0',
  textAlign: 'center' as const,
};

const footerCopyright = {
  color: '#9ca3af',
  fontSize: '12px',
  lineHeight: '18px',
  margin: '12px 0 0 0',
  textAlign: 'center' as const,
};
