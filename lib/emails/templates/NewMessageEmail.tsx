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

interface NewMessageEmailProps {
  recipientName: string;
  senderName: string;
  senderAvatar?: string;
  messageContent: string;
  conversationTitle?: string;
  spaceId: string;
  conversationId: string;
  spaceName: string;
  messageTimestamp: string;
}

const NewMessageEmail = ({
  recipientName = 'Partner',
  senderName = 'Your Partner',
  senderAvatar,
  messageContent = 'New message received',
  conversationTitle,
  spaceId,
  conversationId,
  spaceName = 'Your Space',
  messageTimestamp = 'Just now',
}: NewMessageEmailProps) => {
  const conversationUrl = `https://rowanapp.com/spaces/${spaceId}/messages/${conversationId}`;

  // Truncate message content if too long
  const truncatedContent = messageContent.length > 150
    ? messageContent.substring(0, 150) + '...'
    : messageContent;

  return (
    <Html>
      <Head />
      <Preview>
        New message from {senderName}: {truncatedContent}
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
            <div style={messageBadge}>
              💬 New Message
            </div>

            <Heading style={h1}>You have a new message</Heading>

            <Text style={text}>
              Hi {recipientName},
            </Text>

            <Text style={text}>
              <strong>{senderName}</strong> sent you a message in <strong>{spaceName}</strong>.
            </Text>

            {/* Message Card */}
            <Section style={messageCard}>
              <Row>
                <Column style={avatarColumn}>
                  {senderAvatar ? (
                    <Img
                      src={senderAvatar}
                      width="40"
                      height="40"
                      alt={senderName}
                      style={avatar}
                    />
                  ) : (
                    <div style={avatarPlaceholder}>
                      {senderName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </Column>
                <Column style={messageColumn}>
                  <div style={messageHeader}>
                    <Text style={senderNameText}>{senderName}</Text>
                    <Text style={timestampText}>{messageTimestamp}</Text>
                  </div>
                  {conversationTitle && (
                    <Text style={conversationTitleText}>
                      in "{conversationTitle}"
                    </Text>
                  )}
                </Column>
              </Row>

              <div style={messageContent}>
                <Text style={messageText}>"{messageContent}"</Text>
              </div>
            </Section>

            {/* Action Button */}
            <Section style={buttonContainer}>
              <Button style={primaryButton} href={conversationUrl}>
                Reply to Message
              </Button>
            </Section>

            <Text style={text}>
              You can also view this conversation by visiting your <Link href={`https://rowanapp.com/spaces/${spaceId}/messages`} style={link}>messages</Link> in {spaceName}.
            </Text>
          </Section>

          {/* Footer */}
          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              You're receiving this email because you have email notifications enabled for new messages.
            </Text>
            <Text style={footerText}>
              <Link href="https://rowanapp.com/settings" style={link}>
                Manage your notification preferences
              </Link> |
              <Link href="https://rowanapp.com/unsubscribe" style={link}>
                Unsubscribe
              </Link>
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

export default NewMessageEmail;

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
  backgroundColor: '#10b981',
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
  padding: '30px 30px 40px 30px',
};

const messageBadge = {
  display: 'inline-block',
  padding: '6px 12px',
  backgroundColor: '#d1fae5',
  color: '#065f46',
  borderRadius: '16px',
  fontSize: '12px',
  fontWeight: '600',
  marginBottom: '16px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
};

const h1 = {
  color: '#1f2937',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0 0 20px 0',
  lineHeight: '32px',
};

const text = {
  color: '#4b5563',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 16px 0',
};

const messageCard = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  padding: '20px',
  margin: '24px 0',
};

const avatarColumn = {
  width: '56px',
  verticalAlign: 'top',
};

const messageColumn = {
  paddingLeft: '12px',
  verticalAlign: 'top',
};

const avatar = {
  borderRadius: '50%',
};

const avatarPlaceholder = {
  width: '40px',
  height: '40px',
  borderRadius: '50%',
  backgroundColor: '#6366f1',
  color: '#ffffff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '16px',
  fontWeight: 'bold',
};

const messageHeader = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '4px',
};

const senderNameText = {
  color: '#1f2937',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0',
};

const timestampText = {
  color: '#9ca3af',
  fontSize: '12px',
  margin: '0',
};

const conversationTitleText = {
  color: '#6b7280',
  fontSize: '12px',
  margin: '0 0 12px 0',
  fontStyle: 'italic',
};

const messageContent = {
  marginTop: '16px',
  paddingTop: '16px',
  borderTop: '1px solid #f3f4f6',
};

const messageText = {
  color: '#374151',
  fontSize: '15px',
  lineHeight: '22px',
  margin: '0',
  fontStyle: 'italic',
  backgroundColor: '#ffffff',
  padding: '12px 16px',
  borderRadius: '8px',
  border: '1px solid #e5e7eb',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const primaryButton = {
  backgroundColor: '#10b981',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
  lineHeight: '24px',
};

const link = {
  color: '#10b981',
  textDecoration: 'underline',
};

const hr = {
  borderColor: '#e5e7eb',
  margin: '20px 0',
};

const footer = {
  padding: '0 30px',
};

const footerText = {
  color: '#9ca3af',
  fontSize: '12px',
  lineHeight: '16px',
  margin: '0 0 8px 0',
  textAlign: 'center' as const,
};