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

interface ShoppingListItem {
  id: string;
  name: string;
  quantity?: string;
  checked: boolean;
}

interface ShoppingListEmailProps {
  recipientName: string;
  senderName: string;
  listName: string;
  listDescription?: string;
  items: ShoppingListItem[];
  totalItems: number;
  completedItems: number;
  actionType: 'shared' | 'updated' | 'completed';
  spaceId: string;
  listId: string;
  spaceName: string;
}

const ShoppingListEmail = ({
  recipientName = 'Partner',
  senderName = 'Your Partner',
  listName = 'Shopping List',
  listDescription,
  items = [],
  totalItems = 0,
  completedItems = 0,
  actionType = 'shared',
  spaceId,
  listId,
  spaceName = 'Your Space',
}: ShoppingListEmailProps) => {
  const actionLabels = {
    shared: 'shared a shopping list with you',
    updated: 'updated a shopping list',
    completed: 'completed a shopping list'
  };

  const actionColors = {
    shared: '#10b981',
    updated: '#6366f1',
    completed: '#059669'
  };

  const listUrl = `https://rowanapp.com/spaces/${spaceId}/shopping/${listId}`;

  // Show up to 5 items in the email
  const displayItems = items.slice(0, 5);
  const remainingCount = Math.max(0, items.length - 5);

  return (
    <Html>
      <Head />
      <Preview>
        {senderName} {actionLabels[actionType]}: {listName}
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
            <div style={{
              ...actionBadge,
              backgroundColor: actionColors[actionType] + '20',
              color: actionColors[actionType]
            }}>
              🛒 Shopping List {actionType === 'shared' ? 'Shared' : actionType === 'updated' ? 'Updated' : 'Completed'}
            </div>

            <Heading style={h1}>
              {actionType === 'shared' && 'New shopping list shared!'}
              {actionType === 'updated' && 'Shopping list updated'}
              {actionType === 'completed' && 'Shopping list completed! 🎉'}
            </Heading>

            <Text style={text}>
              Hi {recipientName},
            </Text>

            <Text style={text}>
              <strong>{senderName}</strong> {actionLabels[actionType]} in <strong>{spaceName}</strong>.
            </Text>

            {/* Shopping List Card */}
            <Section style={listCard}>
              <div style={listHeader}>
                <Heading style={listTitle}>{listName}</Heading>
                {listDescription && (
                  <Text style={listDesc}>{listDescription}</Text>
                )}
              </div>

              {/* Progress Bar */}
              <div style={progressContainer}>
                <div style={progressBar}>
                  <div
                    style={{
                      ...progressFill,
                      width: `${totalItems > 0 ? (completedItems / totalItems) * 100 : 0}%`,
                      backgroundColor: actionColors[actionType]
                    }}
                  />
                </div>
                <Text style={progressText}>
                  {completedItems} of {totalItems} items completed
                </Text>
              </div>

              {/* Items List */}
              {displayItems.length > 0 && (
                <div style={itemsList}>
                  <Text style={itemsHeader}>Items:</Text>
                  {displayItems.map((item) => (
                    <div key={item.id} style={itemRow}>
                      <div style={checkbox}>
                        {item.checked ? '✅' : '⬜'}
                      </div>
                      <Text style={{
                        ...itemText,
                        textDecoration: item.checked ? 'line-through' : 'none',
                        color: item.checked ? '#9ca3af' : '#374151'
                      }}>
                        {item.name}
                        {item.quantity && <span style={quantityText}> ({item.quantity})</span>}
                      </Text>
                    </div>
                  ))}

                  {remainingCount > 0 && (
                    <Text style={moreItemsText}>
                      + {remainingCount} more item{remainingCount > 1 ? 's' : ''}
                    </Text>
                  )}
                </div>
              )}
            </Section>

            {/* Action Button */}
            <Section style={buttonContainer}>
              <Button style={{
                ...primaryButton,
                backgroundColor: actionColors[actionType]
              }} href={listUrl}>
                {actionType === 'completed' ? 'View List' : 'View & Shop'}
              </Button>
            </Section>

            <Text style={text}>
              You can view and manage this shopping list in your <Link href={`https://rowanapp.com/spaces/${spaceId}/shopping`} style={link}>shopping section</Link> on Rowan.
            </Text>
          </Section>

          {/* Footer */}
          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              You're receiving this email because you have email notifications enabled for shopping lists.
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

export default ShoppingListEmail;

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
  backgroundColor: '#059669',
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

const actionBadge = {
  display: 'inline-block',
  padding: '6px 12px',
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

const listCard = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  padding: '24px',
  margin: '24px 0',
};

const listHeader = {
  marginBottom: '20px',
};

const listTitle = {
  color: '#1f2937',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '0 0 8px 0',
  lineHeight: '28px',
};

const listDesc = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0',
};

const progressContainer = {
  marginBottom: '20px',
};

const progressBar = {
  width: '100%',
  height: '8px',
  backgroundColor: '#e5e7eb',
  borderRadius: '4px',
  overflow: 'hidden',
  marginBottom: '8px',
};

const progressFill = {
  height: '100%',
  borderRadius: '4px',
  transition: 'width 0.3s ease',
};

const progressText = {
  color: '#6b7280',
  fontSize: '12px',
  margin: '0',
  fontWeight: '500',
};

const itemsList = {
  backgroundColor: '#ffffff',
  border: '1px solid #f3f4f6',
  borderRadius: '8px',
  padding: '16px',
};

const itemsHeader = {
  color: '#374151',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 12px 0',
};

const itemRow = {
  display: 'flex',
  alignItems: 'center',
  padding: '6px 0',
};

const checkbox = {
  marginRight: '12px',
  fontSize: '16px',
};

const itemText = {
  fontSize: '14px',
  margin: '0',
  flex: '1',
};

const quantityText = {
  color: '#6b7280',
  fontWeight: '500',
};

const moreItemsText = {
  color: '#6b7280',
  fontSize: '12px',
  fontStyle: 'italic',
  margin: '8px 0 0 28px',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const primaryButton = {
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
  color: '#059669',
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