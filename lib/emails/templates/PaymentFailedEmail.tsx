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

interface PaymentFailedEmailProps {
  recipientEmail: string;
  recipientName: string;
  tier: 'pro' | 'family';
  attemptCount: number;
  updatePaymentUrl: string;
  gracePeriodDays: number;
}

const PaymentFailedEmail = ({
  recipientEmail = 'user@example.com',
  recipientName = 'there',
  tier = 'pro',
  attemptCount = 1,
  updatePaymentUrl = 'https://rowanapp.com/settings/billing',
  gracePeriodDays = 7,
}: PaymentFailedEmailProps) => {
  const tierName = tier === 'family' ? 'Family' : 'Pro';

  return (
    <Html>
      <Head />
      <Preview>
        Action needed: Your Rowan payment couldn't be processed
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
            <Heading style={h1}>Payment Issue ⚠️</Heading>

            <Text style={text}>
              Hi {recipientName},
            </Text>

            <Text style={text}>
              We had trouble processing your payment for your <strong>Rowan {tierName}</strong> subscription. This was attempt #{attemptCount}.
            </Text>

            {/* Warning Card */}
            <Section style={warningCard}>
              <Row>
                <Column style={warningIconColumn}>
                  <div style={warningIcon}>!</div>
                </Column>
                <Column style={warningInfoColumn}>
                  <Heading style={warningTitle}>Grace Period Active</Heading>
                  <Text style={warningText}>
                    You have <strong>{gracePeriodDays} days</strong> to update your payment method before your subscription is paused.
                  </Text>
                </Column>
              </Row>
            </Section>

            <Text style={text}>
              Don't worry - your Rowan {tierName} features are still active. To keep your subscription running smoothly, please update your payment method.
            </Text>

            <Text style={text}>
              <strong>Common reasons for payment failures:</strong>
            </Text>

            <Section style={reasonsList}>
              <Text style={reasonItem}>• Expired credit card</Text>
              <Text style={reasonItem}>• Insufficient funds</Text>
              <Text style={reasonItem}>• Card declined by your bank</Text>
              <Text style={reasonItem}>• Outdated billing information</Text>
            </Section>

            {/* Action Button */}
            <Section style={buttonContainer}>
              <Button style={button} href={updatePaymentUrl}>
                Update Payment Method
              </Button>
            </Section>

            <Text style={text}>
              If you've already updated your payment details, you can ignore this email - we'll automatically retry the payment.
            </Text>

            <Text style={text}>
              Need help? Just reply to this email or contact our support team.
            </Text>
          </Section>

          {/* What happens section */}
          <Section style={infoSection}>
            <Heading style={infoTitle}>What happens next?</Heading>
            <Text style={infoText}>
              <strong>If payment succeeds:</strong> Your subscription continues as normal.
            </Text>
            <Text style={infoText}>
              <strong>If payment fails after {gracePeriodDays} days:</strong> Your subscription will be paused, but your data will be safely preserved. You can reactivate anytime.
            </Text>
          </Section>

          {/* Footer */}
          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              This email was sent to {recipientEmail} regarding your Rowan subscription.
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

export default PaymentFailedEmail;

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
  backgroundColor: '#f59e0b', // Amber for warning
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

const warningCard = {
  backgroundColor: '#fffbeb',
  border: '2px solid #fcd34d',
  borderRadius: '12px',
  padding: '24px',
  margin: '24px 0',
};

const warningIconColumn = {
  width: '60px',
  verticalAlign: 'top',
};

const warningInfoColumn = {
  paddingLeft: '16px',
  verticalAlign: 'top',
};

const warningIcon = {
  width: '48px',
  height: '48px',
  borderRadius: '50%',
  backgroundColor: '#f59e0b',
  color: '#ffffff',
  fontSize: '28px',
  fontWeight: 'bold',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center' as const,
  lineHeight: '48px',
};

const warningTitle = {
  color: '#92400e',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 4px 0',
  lineHeight: '28px',
};

const warningText = {
  color: '#78350f',
  fontSize: '14px',
  margin: '0',
  lineHeight: '20px',
};

const reasonsList = {
  margin: '8px 0 16px 16px',
};

const reasonItem = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '0 0 4px 0',
  lineHeight: '20px',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#f59e0b',
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

const infoSection = {
  backgroundColor: '#f8fafc',
  padding: '24px 30px',
  margin: '20px -30px 0 -30px',
  borderTop: '1px solid #e5e7eb',
};

const infoTitle = {
  color: '#374151',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 12px 0',
};

const infoText = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '0 0 8px 0',
  lineHeight: '20px',
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
