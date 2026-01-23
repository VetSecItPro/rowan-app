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
} from '@react-email/components';

interface SubscriptionWelcomeEmailProps {
  recipientEmail: string;
  recipientName: string;
  tier: 'pro' | 'family';
  period: 'monthly' | 'annual';
  dashboardUrl: string;
}

const SubscriptionWelcomeEmail = ({
  recipientEmail = 'user@example.com',
  recipientName = 'there',
  tier = 'pro',
  period = 'monthly',
  dashboardUrl = 'https://rowanapp.com/dashboard',
}: SubscriptionWelcomeEmailProps) => {
  const tierName = tier === 'family' ? 'Family' : 'Pro';
  const periodLabel = period === 'annual' ? 'annual' : 'monthly';

  const proFeatures = [
    'Unlimited tasks & calendar events',
    'Meal planning & recipes',
    'Goals & milestones tracking',
    'Smart reminders',
    'Real-time collaboration',
    'Priority support',
  ];

  const familyFeatures = [
    ...proFeatures,
    'Up to 6 family members',
    'AI-powered features',
    'Advanced integrations',
    'Family analytics',
  ];

  const features = tier === 'family' ? familyFeatures : proFeatures;

  return (
    <Html>
      <Head />
      <Preview>
        Welcome to Rowan {tierName}! Your subscription is now active.
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
            <Heading style={h1}>Welcome to Rowan {tierName}! 🎉</Heading>

            <Text style={text}>
              Hi {recipientName},
            </Text>

            <Text style={text}>
              Thank you for subscribing to <strong>Rowan {tierName}</strong>! Your {periodLabel} subscription is now active, and you have full access to all premium features.
            </Text>

            {/* Subscription Card */}
            <Section style={subscriptionCard}>
              <Row>
                <Column style={planIconColumn}>
                  <div style={planIcon}>
                    {tier === 'family' ? '👨‍👩‍👧‍👦' : '⭐'}
                  </div>
                </Column>
                <Column style={planInfoColumn}>
                  <Heading style={planTitle}>Rowan {tierName}</Heading>
                  <Text style={planPeriodText}>
                    {period === 'annual' ? 'Annual' : 'Monthly'} Plan
                  </Text>
                </Column>
              </Row>
            </Section>

            <Text style={text}>
              Here&apos;s what you can now do with your {tierName} plan:
            </Text>

            {/* Features List */}
            <Section style={featuresContainer}>
              {features.map((feature, index) => (
                <Row key={index} style={featureRow}>
                  <Column style={checkColumn}>
                    <Text style={checkMark}>✓</Text>
                  </Column>
                  <Column>
                    <Text style={featureText}>{feature}</Text>
                  </Column>
                </Row>
              ))}
            </Section>

            {/* Quick Start Section */}
            <Section style={quickStartSection}>
              <Heading style={quickStartTitle}>Quick Start Guide</Heading>
              <Text style={quickStartText}>
                <strong>1. Create your first space</strong> - Set up a space for your family or personal use.
              </Text>
              <Text style={quickStartText}>
                <strong>2. Invite family members</strong> - Share your space with loved ones.
              </Text>
              <Text style={quickStartText}>
                <strong>3. Add tasks & events</strong> - Start organizing your life together.
              </Text>
            </Section>

            {/* Action Button */}
            <Section style={buttonContainer}>
              <Button style={button} href={dashboardUrl}>
                Go to Dashboard
              </Button>
            </Section>

            <Text style={text}>
              If you have any questions, our support team is here to help. Just reply to this email or visit our help center.
            </Text>
          </Section>

          {/* Footer */}
          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              This email was sent to {recipientEmail} because you subscribed to Rowan {tierName}.
            </Text>
            <Text style={footerText}>
              You can manage your subscription in your account settings.
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

export default SubscriptionWelcomeEmail;

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
  backgroundColor: '#10b981', // Emerald/green for success
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

const subscriptionCard = {
  backgroundColor: '#ecfdf5',
  border: '2px solid #a7f3d0',
  borderRadius: '12px',
  padding: '24px',
  margin: '24px 0',
};

const planIconColumn = {
  width: '60px',
  verticalAlign: 'top',
};

const planInfoColumn = {
  paddingLeft: '16px',
  verticalAlign: 'top',
};

const planIcon = {
  width: '48px',
  height: '48px',
  borderRadius: '50%',
  backgroundColor: '#10b981',
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: 'bold',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center' as const,
  lineHeight: '48px',
};

const planTitle = {
  color: '#1f2937',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '0 0 4px 0',
  lineHeight: '28px',
};

const planPeriodText = {
  color: '#059669',
  fontSize: '14px',
  margin: '0',
  lineHeight: '20px',
  fontWeight: '500',
};

const featuresContainer = {
  margin: '16px 0 24px 0',
};

const featureRow = {
  marginBottom: '8px',
};

const checkColumn = {
  width: '24px',
  verticalAlign: 'top',
};

const checkMark = {
  color: '#10b981',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0',
  lineHeight: '24px',
};

const featureText = {
  color: '#4b5563',
  fontSize: '15px',
  margin: '0',
  lineHeight: '24px',
};

const quickStartSection = {
  backgroundColor: '#f8fafc',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
};

const quickStartTitle = {
  color: '#1f2937',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 12px 0',
};

const quickStartText = {
  color: '#4b5563',
  fontSize: '14px',
  margin: '0 0 8px 0',
  lineHeight: '20px',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#10b981',
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
