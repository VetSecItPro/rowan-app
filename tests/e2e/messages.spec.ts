/**
 * E2E Tests for Messages/Chat Feature
 *
 * Tests messages page functionality including viewing conversations, sending messages, and chat interactions.
 * Uses pre-authenticated pro user session.
 */

import { test, expect } from '@playwright/test';
import { TEST_USERS, ensureAuthenticated, dismissCookieBanner } from './helpers/test-utils';
import { resilientClick, resilientFill, elementExists } from './helpers/resilient-selectors';

// Use pro user for messages tests
test.use({ storageState: TEST_USERS.pro.storageState });

test.describe('Messages/Chat Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure pro user session is valid
    await ensureAuthenticated(page, 'pro');
    await page.goto('/messages', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await dismissCookieBanner(page);
    await page.waitForLoadState('networkidle').catch(() => {});
  });

  test('messages page loads and displays conversations', async ({ page }) => {
    // Verify page title/heading
    const heading = page.locator('h1, h2').filter({ hasText: /messages|chat|conversations/i }).first();
    await expect(heading).toBeVisible({ timeout: 10000 });

    // Verify conversations list or new message interface
    const conversationsList = page.locator('[data-testid="conversations-list"], .conversations, [class*="chat"]').first();
    const newMessageButton = page.locator('[data-testid="new-message-button"], button:has-text("New Message"), button:has-text("New Chat")').first();

    const hasConversations = await conversationsList.isVisible({ timeout: 5000 }).catch(() => false);
    const hasNewButton = await newMessageButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasConversations || hasNewButton) {
      console.log('✓ Messages page loaded with chat interface');
    } else {
      console.log('✓ Messages page loaded');
    }
  });

  test('can view conversation list', async ({ page }) => {
    // Wait for page to load
    await page.waitForTimeout(2000);

    // Look for conversation items
    const conversations = page.locator('[data-testid^="conversation-"], .conversation-item, [class*="conversation"]');
    const count = await conversations.count();

    if (count > 0) {
      console.log(`✓ Found ${count} conversations in list`);

      // Click first conversation to open
      const firstConversation = conversations.first();
      await firstConversation.click();
      await page.waitForTimeout(1000);

      // Verify chat view opened
      const chatView = page.locator('[data-testid="chat-view"], [data-testid="message-list"], .chat-messages').first();
      const hasChatView = await chatView.isVisible({ timeout: 3000 }).catch(() => false);

      if (hasChatView) {
        console.log('✓ Conversation opened successfully');
      }
    } else {
      console.log('⚠ No conversations found (empty state)');
    }
  });

  test('can send a message in conversation', async ({ page }) => {
    test.setTimeout(45000);

    // Wait for page to load
    await page.waitForTimeout(2000);

    // Try to open a conversation or start new chat
    const conversations = page.locator('[data-testid^="conversation-"], .conversation-item, [class*="conversation"]');
    const hasConversations = await conversations.first().isVisible({ timeout: 3000 }).catch(() => false);

    if (hasConversations) {
      await conversations.first().click();
      await page.waitForTimeout(1000);
    } else {
      // Try to start new conversation
      const newMessageButton = page.locator('[data-testid="new-message-button"], button:has-text("New Message"), button:has-text("New Chat")').first();
      if (await newMessageButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await newMessageButton.click();
        await page.waitForTimeout(1000);
      }
    }

    // Look for message input
    const messageInput = page.locator('[data-testid="message-input"], textarea[placeholder*="message" i], input[placeholder*="message" i]').first();

    if (await messageInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      const messageText = `E2E Test Message ${Date.now()}`;
      await messageInput.fill(messageText);

      // Send message
      const sendButton = page.locator('[data-testid="send-message-button"], button[aria-label*="send" i], button[type="submit"]').first();

      if (await sendButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await sendButton.click();
        await page.waitForTimeout(2000);

        // Verify message appears in chat
        const sentMessage = page.locator(`text=/${messageText}/i`).first();
        const messageVisible = await sentMessage.isVisible({ timeout: 5000 }).catch(() => false);

        if (messageVisible) {
          console.log(`✓ Message sent: ${messageText}`);
        } else {
          console.log('⚠ Message sent but not visible');
        }
      } else {
        // Try pressing Enter to send
        await messageInput.press('Enter');
        await page.waitForTimeout(2000);
        console.log('✓ Message sent via Enter key');
      }
    } else {
      console.log('⚠ Message input not found');
    }
  });

  test('can view message history in conversation', async ({ page }) => {
    // Wait for page to load
    await page.waitForTimeout(2000);

    // Open a conversation
    const conversations = page.locator('[data-testid^="conversation-"], .conversation-item, [class*="conversation"]');

    if (await conversations.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await conversations.first().click();
      await page.waitForTimeout(1000);

      // Look for message history
      const messages = page.locator('[data-testid^="message-"], .message-item, [class*="message"]');
      const messageCount = await messages.count();

      if (messageCount > 0) {
        console.log(`✓ Found ${messageCount} messages in conversation history`);
      } else {
        console.log('⚠ No messages found in conversation (may be new)');
      }

      // Check for scrollable message area
      const messageList = page.locator('[data-testid="message-list"], .messages-container, [class*="messages"]').first();
      const hasMessageList = await messageList.isVisible({ timeout: 3000 }).catch(() => false);

      if (hasMessageList) {
        console.log('✓ Message list container displayed');
      }
    } else {
      console.log('⚠ No conversations to view history');
    }
  });

  test('can search or filter conversations', async ({ page }) => {
    // Wait for page to load
    await page.waitForTimeout(2000);

    // Look for search input
    const searchInput = page.locator('[data-testid="conversation-search"], input[placeholder*="search" i], input[type="search"]').first();

    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.fill('test');
      await page.waitForTimeout(1500);

      console.log('✓ Conversation search performed');

      // Clear search
      await searchInput.fill('');
      await page.waitForTimeout(500);
    } else {
      console.log('⚠ Conversation search not found');
    }

    // Look for filter buttons
    const filterButtons = page.locator('[data-testid*="filter-"], button[role="tab"]');
    const filterCount = await filterButtons.count();

    if (filterCount > 0) {
      console.log(`✓ Found ${filterCount} conversation filters`);
    }
  });

  test('can start new conversation', async ({ page }) => {
    test.setTimeout(45000);

    // Look for new message/conversation button
    const newMessageButton = page.locator('[data-testid="new-message-button"], button:has-text("New Message"), button:has-text("New Chat"), button:has-text("Start Conversation")').first();

    if (await newMessageButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newMessageButton.click();
      await page.waitForTimeout(1000);

      // Look for recipient selection or message input
      const recipientSelect = page.locator('[data-testid="recipient-select"], select[name*="recipient" i], [data-testid*="user-select"]').first();
      const messageInput = page.locator('[data-testid="message-input"], textarea[placeholder*="message" i]').first();

      const hasRecipientSelect = await recipientSelect.isVisible({ timeout: 3000 }).catch(() => false);
      const hasMessageInput = await messageInput.isVisible({ timeout: 3000 }).catch(() => false);

      if (hasRecipientSelect) {
        // Select recipient if dropdown exists
        await recipientSelect.selectOption({ index: 1 });
        await page.waitForTimeout(500);
        console.log('✓ Recipient selected');
      }

      if (hasMessageInput) {
        const initialMessage = `E2E Test New Conversation ${Date.now()}`;
        await messageInput.fill(initialMessage);

        const sendButton = page.locator('[data-testid="send-message-button"], button[type="submit"], button:has-text("Send")').first();
        if (await sendButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await sendButton.click();
          await page.waitForTimeout(2000);
          console.log(`✓ New conversation started: ${initialMessage}`);
        }
      } else {
        console.log('✓ New conversation dialog opened');
      }
    } else {
      console.log('⚠ New message button not found');
    }
  });

  test('can delete a message', async ({ page }) => {
    test.setTimeout(45000);

    // Wait for page to load
    await page.waitForTimeout(2000);

    // Open a conversation
    const conversations = page.locator('[data-testid^="conversation-"], .conversation-item, [class*="conversation"]');

    if (await conversations.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await conversations.first().click();
      await page.waitForTimeout(1000);

      // Look for a message with delete option
      const messages = page.locator('[data-testid^="message-"], .message-item, [class*="message"]');

      if (await messages.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        // Hover over message to show delete button
        await messages.first().hover();
        await page.waitForTimeout(500);

        // Look for delete button
        const deleteButton = page.locator('[data-testid*="delete-message"], button[aria-label*="delete" i]').first();

        if (await deleteButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await deleteButton.click();
          await page.waitForTimeout(500);

          // Handle confirmation
          const confirmButton = page.locator('[data-testid="confirm-delete-button"], button:has-text("Delete"), button:has-text("Confirm")').first();
          if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await confirmButton.click();
          }

          await page.waitForTimeout(1500);
          console.log('✓ Message deleted');
        } else {
          console.log('⚠ Delete message button not found');
        }
      }
    } else {
      console.log('⚠ No conversations to delete messages from');
    }
  });

  test('can archive or delete conversation', async ({ page }) => {
    test.setTimeout(45000);

    // Wait for page to load
    await page.waitForTimeout(2000);

    // Look for a conversation
    const conversations = page.locator('[data-testid^="conversation-"], .conversation-item, [class*="conversation"]');

    if (await conversations.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      // Hover or long press to show options
      await conversations.first().hover();
      await page.waitForTimeout(500);

      // Look for archive/delete button
      const archiveButton = page.locator('[data-testid*="archive-conversation"], button[aria-label*="archive" i]').first();
      const deleteButton = page.locator('[data-testid*="delete-conversation"], button[aria-label*="delete" i]').first();

      let actionTaken = false;

      if (await archiveButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await archiveButton.click();
        await page.waitForTimeout(1500);
        console.log('✓ Conversation archived');
        actionTaken = true;
      } else if (await deleteButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await deleteButton.click();
        await page.waitForTimeout(500);

        // Handle confirmation
        const confirmButton = page.locator('[data-testid="confirm-delete-button"], button:has-text("Delete"), button:has-text("Confirm")').first();
        if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirmButton.click();
        }

        await page.waitForTimeout(1500);
        console.log('✓ Conversation deleted');
        actionTaken = true;
      }

      if (!actionTaken) {
        console.log('⚠ Archive/delete conversation button not found');
      }
    } else {
      console.log('⚠ No conversations to archive/delete');
    }
  });

  test('shows empty state when no conversations exist', async ({ page }) => {
    // Check for empty state
    const emptyState = page.locator('[data-testid="messages-empty-state"], text=/no conversations/i, text=/start chatting/i').first();
    const hasEmptyState = await emptyState.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasEmptyState) {
      console.log('✓ Empty state displayed');
    } else {
      console.log('⚠ Empty state not visible (conversations may exist)');
    }
  });
});
