/**
 * Tool declarations for the messages feature.
 *
 * Aggregated into TOOL_DECLARATIONS via ./index.ts. The orchestrator
 * sees one combined array; this split is purely for navigability.
 */
import { SchemaType, type FunctionDeclaration } from '@google/generative-ai';

export const MESSAGES_TOOLS: FunctionDeclaration[] = [
  {
    name: 'send_message',
    description:
      'Send a message in a space conversation. Use list_conversations first to get the conversation ID, then send the message. Use this when a user wants to post a message to a household conversation thread.',
    parameters: {
      type: SchemaType.OBJECT,
      description: 'Parameters for sending a message',
      properties: {
        content: {
          type: SchemaType.STRING,
          description: 'The text content of the message to send',
        },
        conversation_id: {
          type: SchemaType.STRING,
          description: 'The ID of the conversation to send the message to. Use list_conversations to find the right conversation first.',
        },
      },
      required: ['content', 'conversation_id'],
    },
  },
  {
    name: 'list_conversations',
    description:
      'List active conversations in the space. Use this when a user wants to see their conversations or find a specific thread to message.',
    parameters: {
      type: SchemaType.OBJECT,
      description: 'Parameters for listing conversations',
      properties: {
        include_archived: {
          type: SchemaType.BOOLEAN,
          description: 'Whether to include archived conversations. Defaults to false.',
        },
      },
      required: [],
    },
  },
  {
    name: 'list_messages',
    description:
      'Read recent messages from a conversation. Use this when a user asks "what did we say in family chat?", "read the last messages", or wants to see conversation history. Use list_conversations first to find the conversation ID.',
    parameters: {
      type: SchemaType.OBJECT,
      description: 'Parameters for listing messages',
      properties: {
        conversation_id: {
          type: SchemaType.STRING,
          description: 'The ID of the conversation to read messages from',
        },
      },
      required: ['conversation_id'],
    },
  },
  {
    name: 'create_conversation',
    description:
      'Create a new conversation thread. Use this when a user wants to start a new chat with specific family members or create a group chat.',
    parameters: {
      type: SchemaType.OBJECT,
      description: 'Parameters for creating a conversation',
      properties: {
        title: {
          type: SchemaType.STRING,
          description: 'Name of the conversation (e.g. "Family Chat", "Parents Only", "Trip Planning")',
        },
        conversation_type: {
          type: SchemaType.STRING,
          format: 'enum',
          enum: ['direct', 'group', 'general'],
          description: 'Type of conversation. Defaults to group.',
        },
        description: {
          type: SchemaType.STRING,
          description: 'Description of the conversation purpose',
        },
      },
      required: ['title'],
    },
  },
  {
    name: 'edit_message',
    description:
      'Edit the content of a previously sent message. Use this when a user wants to fix a typo or update a sent message.',
    parameters: {
      type: SchemaType.OBJECT,
      description: 'Parameters for editing a message',
      properties: {
        message_id: {
          type: SchemaType.STRING,
          description: 'The unique ID of the message to edit',
        },
        content: {
          type: SchemaType.STRING,
          description: 'The new content for the message',
        },
      },
      required: ['message_id', 'content'],
    },
  },
  {
    name: 'delete_message',
    description:
      'Delete a sent message. Use this when a user wants to remove a message from a conversation.',
    parameters: {
      type: SchemaType.OBJECT,
      description: 'Parameters for deleting a message',
      properties: {
        message_id: {
          type: SchemaType.STRING,
          description: 'The unique ID of the message to delete',
        },
      },
      required: ['message_id'],
    },
  },
  {
    name: 'pin_message',
    description:
      'Pin an important message to the top of a conversation. Use this when a user wants to highlight or save an important message for easy reference.',
    parameters: {
      type: SchemaType.OBJECT,
      description: 'Parameters for pinning a message',
      properties: {
        message_id: {
          type: SchemaType.STRING,
          description: 'The unique ID of the message to pin',
        },
      },
      required: ['message_id'],
    },
  },
  {
    name: 'react_to_message',
    description:
      'Add or remove an emoji reaction on a message. Toggles — if the reaction already exists, it removes it.',
    parameters: {
      type: SchemaType.OBJECT,
      description: 'Parameters for reacting to a message',
      properties: {
        message_id: {
          type: SchemaType.STRING,
          description: 'The ID of the message to react to',
        },
        emoji: {
          type: SchemaType.STRING,
          description: 'The emoji to react with (e.g. "👍", "❤️", "😂")',
        },
      },
      required: ['message_id', 'emoji'],
    },
  },
  {
    name: 'mark_conversation_read',
    description:
      'Mark all messages in a conversation as read.',
    parameters: {
      type: SchemaType.OBJECT,
      description: 'Parameters for marking a conversation as read',
      properties: {
        conversation_id: {
          type: SchemaType.STRING,
          description: 'The ID of the conversation to mark as read',
        },
      },
      required: ['conversation_id'],
    },
  },
  {
    name: 'unpin_message',
    description:
      'Unpin a previously pinned message in a conversation.',
    parameters: {
      type: SchemaType.OBJECT,
      description: 'Parameters for unpinning a message',
      properties: {
        message_id: {
          type: SchemaType.STRING,
          description: 'The ID of the message to unpin',
        },
      },
      required: ['message_id'],
    },
  },
  {
    name: 'archive_conversation',
    description:
      'Archive a conversation to hide it from the main list. Can be unarchived later.',
    parameters: {
      type: SchemaType.OBJECT,
      description: 'Parameters for archiving a conversation',
      properties: {
        conversation_id: {
          type: SchemaType.STRING,
          description: 'The ID of the conversation to archive',
        },
      },
      required: ['conversation_id'],
    },
  },
  {
    name: 'delete_conversation',
    description:
      'Permanently delete a conversation and all its messages.',
    parameters: {
      type: SchemaType.OBJECT,
      description: 'Parameters for deleting a conversation',
      properties: {
        conversation_id: {
          type: SchemaType.STRING,
          description: 'The ID of the conversation to delete',
        },
      },
      required: ['conversation_id'],
    },
  },
];
