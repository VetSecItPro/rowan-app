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

interface MealReminderEmailProps {
  recipientName: string;
  mealName: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  mealDate: string;
  mealTime: string;
  reminderType: 'prep' | 'cook' | 'plan';
  ingredients?: string[];
  cookingTime?: string;
  recipeUrl?: string;
  spaceId: string;
  mealId: string;
  spaceName: string;
}

const MealReminderEmail = ({
  recipientName = 'Partner',
  mealName = 'Planned Meal',
  mealType = 'dinner',
  mealDate = 'Today',
  mealTime = '6:00 PM',
  reminderType = 'prep',
  ingredients = [],
  cookingTime,
  recipeUrl,
  spaceId,
  mealId,
  spaceName = 'Your Space',
}: MealReminderEmailProps) => {
  const mealTypeEmojis = {
    breakfast: '🥐',
    lunch: '🥗',
    dinner: '🍽️',
    snack: '🍎'
  };

  const reminderLabels = {
    prep: 'meal prep reminder',
    cook: 'cooking reminder',
    plan: 'meal planning reminder'
  };

  const reminderColors = {
    prep: '#f59e0b',
    cook: '#ef4444',
    plan: '#8b5cf6'
  };

  const mealUrl = recipeUrl || `https://rowanapp.com/spaces/${spaceId}/meals/${mealId}`;

  return (
    <Html>
      <Head />
      <Preview>
        {reminderLabels[reminderType]}: {mealName} for {mealType}
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
              ...reminderBadge,
              backgroundColor: reminderColors[reminderType] + '20',
              color: reminderColors[reminderType]
            }}>
              {mealTypeEmojis[mealType]} Meal {reminderType === 'prep' ? 'Prep' : reminderType === 'cook' ? 'Cooking' : 'Planning'}
            </div>

            <Heading style={h1}>
              {reminderType === 'prep' && 'Time to prep your meal!'}
              {reminderType === 'cook' && 'Time to start cooking!'}
              {reminderType === 'plan' && 'Meal planning reminder'}
            </Heading>

            <Text style={text}>
              Hi {recipientName},
            </Text>

            <Text style={text}>
              {reminderType === 'prep' && `It's time to start prepping `}
              {reminderType === 'cook' && `It's time to start cooking `}
              {reminderType === 'plan' && `Don't forget to plan `}
              <strong>{mealName}</strong> for {mealType} in <strong>{spaceName}</strong>.
            </Text>

            {/* Meal Card */}
            <Section style={mealCard}>
              <div style={mealIcon}>
                {mealTypeEmojis[mealType]}
              </div>

              <Heading style={mealTitle}>{mealName}</Heading>

              <div style={mealDetails}>
                <div style={mealDetail}>
                  <span style={detailLabel}>📅 Date:</span>
                  <span style={detailValue}>{mealDate}</span>
                </div>

                <div style={mealDetail}>
                  <span style={detailLabel}>🕐 Time:</span>
                  <span style={detailValue}>{mealTime}</span>
                </div>

                <div style={mealDetail}>
                  <span style={detailLabel}>🍽️ Type:</span>
                  <span style={detailValue}>{mealType.charAt(0).toUpperCase() + mealType.slice(1)}</span>
                </div>

                {cookingTime && (
                  <div style={mealDetail}>
                    <span style={detailLabel}>⏱️ Cook Time:</span>
                    <span style={detailValue}>{cookingTime}</span>
                  </div>
                )}
              </div>

              {/* Ingredients List */}
              {ingredients.length > 0 && (
                <div style={ingredientsSection}>
                  <Text style={ingredientsHeader}>Ingredients needed:</Text>
                  <div style={ingredientsList}>
                    {ingredients.slice(0, 6).map((ingredient, index) => (
                      <div key={index} style={ingredientItem}>
                        <span style={ingredientBullet}>•</span>
                        <Text style={ingredientText}>{ingredient}</Text>
                      </div>
                    ))}
                    {ingredients.length > 6 && (
                      <Text style={moreIngredientsText}>
                        + {ingredients.length - 6} more ingredient{ingredients.length - 6 > 1 ? 's' : ''}
                      </Text>
                    )}
                  </div>
                </div>
              )}
            </Section>

            {/* Action Buttons */}
            <Section style={buttonContainer}>
              {recipeUrl ? (
                <Button style={{
                  ...primaryButton,
                  backgroundColor: reminderColors[reminderType]
                }} href={recipeUrl}>
                  View Recipe
                </Button>
              ) : (
                <Button style={{
                  ...primaryButton,
                  backgroundColor: reminderColors[reminderType]
                }} href={mealUrl}>
                  View Meal Plan
                </Button>
              )}
            </Section>

            <Text style={text}>
              You can view and manage your meal plans in your <Link href={`https://rowanapp.com/spaces/${spaceId}/meals`} style={link}>meal planning section</Link> on Rowan.
            </Text>

            {reminderType === 'prep' && (
              <Text style={tipText}>
                💡 <strong>Prep tip:</strong> Having ingredients ready ahead of time makes cooking much smoother!
              </Text>
            )}

            {reminderType === 'cook' && (
              <Text style={tipText}>
                👨‍🍳 <strong>Cooking tip:</strong> Remember to preheat your oven or prepare your cooking equipment first.
              </Text>
            )}
          </Section>

          {/* Footer */}
          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              You're receiving this email because you have email notifications enabled for meal reminders.
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

export default MealReminderEmail;

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
  backgroundColor: '#f59e0b',
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

const reminderBadge = {
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

const mealCard = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  padding: '24px',
  margin: '24px 0',
  textAlign: 'center' as const,
};

const mealIcon = {
  fontSize: '48px',
  marginBottom: '16px',
};

const mealTitle = {
  color: '#1f2937',
  fontSize: '22px',
  fontWeight: 'bold',
  margin: '0 0 20px 0',
  lineHeight: '30px',
};

const mealDetails = {
  textAlign: 'left' as const,
  maxWidth: '300px',
  margin: '0 auto 20px auto',
};

const mealDetail = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '8px 0',
  borderBottom: '1px solid #f3f4f6',
};

const detailLabel = {
  color: '#6b7280',
  fontSize: '14px',
  fontWeight: '500',
};

const detailValue = {
  color: '#374151',
  fontSize: '14px',
  fontWeight: '600',
};

const ingredientsSection = {
  backgroundColor: '#ffffff',
  border: '1px solid #f3f4f6',
  borderRadius: '8px',
  padding: '16px',
  textAlign: 'left' as const,
};

const ingredientsHeader = {
  color: '#374151',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 12px 0',
};

const ingredientsList = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '6px',
};

const ingredientItem = {
  display: 'flex',
  alignItems: 'center',
};

const ingredientBullet = {
  color: '#f59e0b',
  marginRight: '8px',
  fontWeight: 'bold',
};

const ingredientText = {
  fontSize: '13px',
  color: '#374151',
  margin: '0',
};

const moreIngredientsText = {
  color: '#6b7280',
  fontSize: '12px',
  fontStyle: 'italic',
  margin: '8px 0 0 0',
  gridColumn: '1 / -1',
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

const tipText = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '16px 0 0 0',
  backgroundColor: '#f9fafb',
  padding: '12px 16px',
  borderRadius: '8px',
  border: '1px solid #f3f4f6',
};

const link = {
  color: '#f59e0b',
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