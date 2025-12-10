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
  Button,
  Hr,
  Img,
  Link,
} from '@react-email/components';

interface SubscriptionCancelledEmailProps {
  recipientEmail: string;
  recipientName: string;
  tier: 'pro' | 'family';
  accessUntil: string;
  resubscribeUrl: string;
}

const SubscriptionCancelledEmail = ({
  recipientEmail = 'user@example.com',
  recipientName = 'there',
  tier = 'pro',
  accessUntil = 'January 15, 2025',
  resubscribeUrl = 'https://rowanapp.com/pricing',
}: SubscriptionCancelledEmailProps) => {
  const tierName = tier === 'family' ? 'Family' : 'Pro';

  return (
    <Html>
      <Head />
      <Preview>
        Your Rowan {tierName} subscription has been cancelled
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
            <Heading style={h1}>We're sorry to see you go 💔</Heading>

            <Text style={text}>
              Hi {recipientName},
            </Text>

            <Text style={text}>
              We've received your request to cancel your <strong>Rowan {tierName}</strong> subscription. We're sad to see you go, but we understand.
            </Text>

            {/* Access Card */}
            <Section style={accessCard}>
              <Row>
                <Column style={accessIconColumn}>
                  <div style={accessIcon}>📅</div>
                </Column>
                <Column style={accessInfoColumn}>
                  <Heading style={accessTitle}>Your Access</Heading>
                  <Text style={accessText}>
                    You'll continue to have full access to all {tierName} features until <strong>{accessUntil}</strong>.
                  </Text>
                </Column>
              </Row>
            </Section>

            <Text style={text}>
              After your subscription ends, you'll be moved to our Free plan. Don't worry - your data will be safely preserved and you can continue using Rowan's core features.
            </Text>

            {/* What you'll lose section */}
            <Section style={loseSection}>
              <Heading style={loseSectionTitle}>What changes on the Free plan:</Heading>
              <Row style={featureRow}>
                <Column style={crossColumn}>
                  <Text style={crossMark}>✕</Text>
                </Column>
                <Column>
                  <Text style={featureLostText}>Limited to 10 tasks per space</Text>
                </Column>
              </Row>
              <Row style={featureRow}>
                <Column style={crossColumn}>
                  <Text style={crossMark}>✕</Text>
                </Column>
                <Column>
                  <Text style={featureLostText}>No meal planning features</Text>
                </Column>
              </Row>
              <Row style={featureRow}>
                <Column style={crossColumn}>
                  <Text style={crossMark}>✕</Text>
                </Column>
                <Column>
                  <Text style={featureLostText}>No goals & milestones</Text>
                </Column>
              </Row>
              {tier === 'family' && (
                <>
                  <Row style={featureRow}>
                    <Column style={crossColumn}>
                      <Text style={crossMark}>✕</Text>
                    </Column>
                    <Column>
                      <Text style={featureLostText}>Family member limit reduced to 2</Text>
                    </Column>
                  </Row>
                  <Row style={featureRow}>
                    <Column style={crossColumn}>
                      <Text style={crossMark}>✕</Text>
                    </Column>
                    <Column>
                      <Text style={featureLostText}>No AI-powered features</Text>
                    </Column>
                  </Row>
                </>
              )}
            </Section>

            <Text style={text}>
              Changed your mind? You can resubscribe anytime and pick up right where you left off.
            </Text>

            {/* Action Button */}
            <Section style={buttonContainer}>
              <Button style={button} href={resubscribeUrl}>
                Resubscribe to {tierName}
              </Button>
            </Section>

            <Text style={smallText}>
              No pressure - we'll be here whenever you're ready to come back.
            </Text>
          </Section>

          {/* Feedback Section */}
          <Section style={feedbackSection}>
            <Heading style={feedbackTitle}>Help us improve</Heading>
            <Text style={feedbackText}>
              We'd love to hear why you decided to cancel. Your feedback helps us make Rowan better for everyone.
            </Text>
            <Text style={feedbackText}>
              Simply reply to this email with your thoughts - we read every response.
            </Text>
          </Section>

          {/* Footer */}
          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              This email was sent to {recipientEmail} regarding your Rowan subscription cancellation.
            </Text>
            <Text style={footerText}>
              You can manage your subscription in your{' '}
              <Link href="https://rowanapp.com/settings/billing" style={footerLink}>
                account settings
              </Link>.
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

export default SubscriptionCancelledEmail;

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
  backgroundColor: '#6b7280', // Gray for cancellation
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
  padding: '30px 30px 20px 30px',
};

const h1 = {
  color: '#1f2937',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '0 0 20px 0',
  lineHeight: '36px',
  textAlign: 'center' as const,
};

const text = {
  color: '#4b5563',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 16px 0',
};

const smallText = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '16px 0',
  textAlign: 'center' as const,
  fontStyle: 'italic',
};

const accessCard = {
  backgroundColor: '#f0f9ff',
  border: '2px solid #bae6fd',
  borderRadius: '12px',
  padding: '24px',
  margin: '24px 0',
};

const accessIconColumn = {
  width: '60px',
  verticalAlign: 'top',
};

const accessInfoColumn = {
  paddingLeft: '16px',
  verticalAlign: 'top',
};

const accessIcon = {
  width: '48px',
  height: '48px',
  borderRadius: '50%',
  backgroundColor: '#0ea5e9',
  color: '#ffffff',
  fontSize: '24px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center' as const,
  lineHeight: '48px',
};

const accessTitle = {
  color: '#0c4a6e',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 4px 0',
  lineHeight: '28px',
};

const accessText = {
  color: '#0369a1',
  fontSize: '14px',
  margin: '0',
  lineHeight: '20px',
};

const loseSection = {
  backgroundColor: '#fef2f2',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
};

const loseSectionTitle = {
  color: '#991b1b',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 12px 0',
};

const featureRow = {
  marginBottom: '8px',
};

const crossColumn = {
  width: '24px',
  verticalAlign: 'top',
};

const crossMark = {
  color: '#dc2626',
  fontSize: '14px',
  fontWeight: 'bold',
  margin: '0',
  lineHeight: '20px',
};

const featureLostText = {
  color: '#7f1d1d',
  fontSize: '14px',
  margin: '0',
  lineHeight: '20px',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#6366f1', // Indigo for re-subscribe
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 28px',
  lineHeight: '24px',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
};

const feedbackSection = {
  backgroundColor: '#f8fafc',
  padding: '24px 30px',
  margin: '20px -30px 0 -30px',
  borderTop: '1px solid #e5e7eb',
};

const feedbackTitle = {
  color: '#374151',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 12px 0',
  textAlign: 'center' as const,
};

const feedbackText = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '0 0 8px 0',
  lineHeight: '20px',
  textAlign: 'center' as const,
};

const hr = {
  borderColor: '#e5e7eb',
  margin: '32px 0 20px 0',
};

const footer = {
  padding: '0 30px 20px 30px',
};

const footerText = {
  color: '#9ca3af',
  fontSize: '12px',
  lineHeight: '16px',
  margin: '0 0 8px 0',
  textAlign: 'center' as const,
};

const footerLink = {
  color: '#6366f1',
  textDecoration: 'underline',
};
