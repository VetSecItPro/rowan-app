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

interface TaskAssignmentEmailProps {
  recipientName: string;
  assignerName: string;
  taskTitle: string;
  taskDescription?: string;
  dueDate?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  spaceId: string;
  taskId: string;
  spaceName: string;
}

const TaskAssignmentEmail = ({
  recipientName = 'Partner',
  assignerName = 'Your Partner',
  taskTitle = 'New Task Assignment',
  taskDescription,
  dueDate,
  priority = 'normal',
  spaceId,
  taskId,
  spaceName = 'Your Space',
}: TaskAssignmentEmailProps) => {
  const priorityColors = {
    low: '#10B981',
    normal: '#6366F1',
    high: '#F59E0B',
    urgent: '#EF4444'
  };

  const priorityLabels = {
    low: 'Low Priority',
    normal: 'Normal Priority',
    high: 'High Priority',
    urgent: 'Urgent'
  };

  const taskUrl = `https://rowanapp.com/spaces/${spaceId}/tasks/${taskId}`;

  return (
    <Html>
      <Head />
      <Preview>
        {assignerName} assigned you a new task: {taskTitle}
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
            <Heading style={h1}>New Task Assignment</Heading>

            <Text style={text}>
              Hi {recipientName},
            </Text>

            <Text style={text}>
              <strong>{assignerName}</strong> has assigned you a new task in <strong>{spaceName}</strong>.
            </Text>

            {/* Task Card */}
            <Section style={taskCard}>
              <Row>
                <Column>
                  <div style={{
                    ...priorityBadge,
                    backgroundColor: priorityColors[priority]
                  }}>
                    {priorityLabels[priority]}
                  </div>
                </Column>
              </Row>

              <Heading style={taskTitleStyle}>{taskTitle}</Heading>

              {taskDescription && (
                <Text style={taskDesc}>{taskDescription}</Text>
              )}

              {dueDate && (
                <Text style={dueText}>
                  <strong>Due:</strong> {dueDate}
                </Text>
              )}
            </Section>

            {/* Action Button */}
            <Section style={buttonContainer}>
              <Button style={button} href={taskUrl}>
                View Task
              </Button>
            </Section>

            <Text style={text}>
              You can also view this task by visiting your <Link href={`https://rowanapp.com/spaces/${spaceId}`} style={link}>{spaceName}</Link> space on Rowan.
            </Text>
          </Section>

          {/* Footer */}
          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              You&apos;re receiving this email because you have email notifications enabled for task assignments.
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

export default TaskAssignmentEmail;

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
  backgroundColor: '#6366f1',
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

const taskCard = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
};

const priorityBadge = {
  display: 'inline-block',
  padding: '4px 12px',
  borderRadius: '16px',
  color: '#ffffff',
  fontSize: '12px',
  fontWeight: '600',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  marginBottom: '12px',
};

const taskTitleStyle = {
  color: '#1f2937',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '0 0 12px 0',
  lineHeight: '28px',
};

const taskDesc = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0 0 12px 0',
};

const dueText = {
  color: '#374151',
  fontSize: '14px',
  margin: '0',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#6366f1',
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
  color: '#6366f1',
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