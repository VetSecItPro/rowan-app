/* eslint-disable react/no-unescaped-entities */

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

interface SpaceInvitationEmailProps {
  recipientEmail: string;
  inviterName: string;
  spaceName: string;
  invitationUrl: string;
  expiresAt: string;
}

const SpaceInvitationEmail = ({
  recipientEmail = 'partner@example.com',
  inviterName = 'Your Partner',
  spaceName = 'Family Space',
  invitationUrl = 'https://rowanapp.com/invitations/accept?token=example',
  expiresAt = '7 days',
}: SpaceInvitationEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>
        {inviterName} invited you to join "{spaceName}" on Rowan
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
            <Heading style={h1}>You're Invited! 🎉</Heading>

            <Text style={text}>
              Hi there,
            </Text>

            <Text style={text}>
              <strong>{inviterName}</strong> has invited you to join <strong>"{spaceName}"</strong> on Rowan - the app that helps couples and families stay organized together.
            </Text>

            {/* Invitation Card */}
            <Section style={invitationCard}>
              <Row>
                <Column style={spaceIconColumn}>
                  <div style={spaceIcon}>
                    {spaceName.charAt(0).toUpperCase()}
                  </div>
                </Column>
                <Column style={spaceInfoColumn}>
                  <Heading style={spaceTitle}>{spaceName}</Heading>
                  <Text style={inviterText}>
                    Invited by {inviterName}
                  </Text>
                </Column>
              </Row>
            </Section>

            <Text style={text}>
              With Rowan, you can manage tasks, share shopping lists, plan meals, track goals, and stay connected - all in one beautiful, organized space.
            </Text>

            {/* Action Button */}
            <Section style={buttonContainer}>
              <Button style={button} href={invitationUrl}>
                Accept Invitation
              </Button>
            </Section>

            <Text style={smallText}>
              This invitation will expire in {expiresAt}. Don't miss out!
            </Text>

            <Text style={text}>
              If you don't have a Rowan account yet, don't worry - you can create one when you accept the invitation.
            </Text>
          </Section>

          {/* Features Section */}
          <Section style={featuresSection}>
            <Heading style={featuresTitle}>What you can do together:</Heading>
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
                <Text style={featureText}>📅 Event planning</Text>
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
              Having trouble with the button? Copy and paste this link into your browser:
            </Text>
            <Text style={footerText}>
              <Link href={invitationUrl} style={link}>
                {invitationUrl}
              </Link>
            </Text>
            <Text style={footerText}>
              This invitation was sent to {recipientEmail}. If you didn't expect this invitation, you can safely ignore this email.
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

export default SpaceInvitationEmail;

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
  backgroundColor: '#8b5cf6', // Purple theme for invitations
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

const invitationCard = {
  backgroundColor: '#f8fafc',
  border: '2px solid #e1e7ef',
  borderRadius: '12px',
  padding: '24px',
  margin: '24px 0',
};

const spaceIconColumn = {
  width: '60px',
  verticalAlign: 'top',
};

const spaceInfoColumn = {
  paddingLeft: '16px',
  verticalAlign: 'top',
};

const spaceIcon = {
  width: '48px',
  height: '48px',
  borderRadius: '50%',
  backgroundColor: '#8b5cf6',
  color: '#ffffff',
  fontSize: '20px',
  fontWeight: 'bold',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center' as const,
  lineHeight: '48px',
};

const spaceTitle = {
  color: '#1f2937',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '0 0 4px 0',
  lineHeight: '28px',
};

const inviterText = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '0',
  lineHeight: '20px',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#8b5cf6',
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

const featuresSection = {
  backgroundColor: '#faf9ff',
  padding: '24px 30px',
  margin: '20px -30px 0 -30px',
  borderTop: '1px solid #e5e7eb',
};

const featuresTitle = {
  color: '#374151',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 16px 0',
  textAlign: 'center' as const,
};

const featureColumn = {
  width: '50%',
  paddingBottom: '8px',
};

const featureText = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '0',
  lineHeight: '20px',
};

const link = {
  color: '#8b5cf6',
  textDecoration: 'underline',
  wordBreak: 'break-all' as const,
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
