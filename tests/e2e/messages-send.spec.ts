/**
 * E2E Durable Spec: Message send — persistence + XSS sanitization at the boundary
 *
 * Drives the authenticated /api/messages endpoint and asserts:
 *   1. A message persists to `messages` with the sender stamped (conversation_id
 *      is nullable, so a space-level message needs only space_id + content). The
 *      insert fires the conversation-last-message + thread-reply-count triggers,
 *      so a clean 200 is also orphan-trigger coverage.
 *   2. HTML/script content is sanitized server-side (sanitizePlainText) — the
 *      stored content must never contain a live <script> tag. This is the XSS
 *      defense for the message boundary, asserted against what actually lands
 *      in the DB (not just the API echo).
 *   3. Empty and oversized content are rejected (400).
 */

import { test, expect, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { TEST_USERS, ensureAuthenticated } from './helpers/test-utils';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const MARKER = `E2E-MSG-${Date.now()}`;

async function postMessage(page: Page, body: Record<string, unknown>) {
  const tokenResp = await page.request.get('/api/csrf/token', { timeout: 10000 });
  const { token } = (await tokenResp.json()) as { token?: string };
  return page.request.post('/api/messages', {
    headers: { 'Content-Type': 'application/json', 'x-csrf-token': token! },
    data: body,
    timeout: 20000,
  });
}

test.use({ storageState: TEST_USERS.pro.storageState });

test.describe('Message send', () => {
  test.skip(
    !SUPABASE_URL || !SERVICE_ROLE_KEY,
    'Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY'
  );

  let admin: SupabaseClient;
  let spaceId: string;
  let userId: string;
  // The messages INSERT RLS policy requires conversation_id to belong to a
  // conversation in the caller's space (and sender_id = self). Membership is by
  // space, not a participants table — so a single seeded conversation suffices.
  let conversationId: string;

  test.beforeAll(async () => {
    admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: userRow } = await admin
      .from('users')
      .select('id')
      .eq('email', TEST_USERS.pro.email)
      .single();
    userId = userRow!.id;
    const { data: memberRow } = await admin
      .from('space_members')
      .select('space_id')
      .eq('user_id', userId)
      .limit(1)
      .single();
    spaceId = memberRow!.space_id;

    const { data: convo, error: convErr } = await admin
      .from('conversations')
      .insert({ space_id: spaceId })
      .select('id')
      .single();
    expect(convErr, `seed conversation: ${convErr?.message}`).toBeNull();
    conversationId = convo!.id;
  });

  test.afterAll(async () => {
    if (!admin || !spaceId) return;
    await admin.from('messages').delete().eq('space_id', spaceId).like('content', `%${MARKER}%`);
    if (conversationId) await admin.from('conversations').delete().eq('id', conversationId);
  });

  test('persists a message stamped with the sender', async ({ page }) => {
    await ensureAuthenticated(page, 'pro');

    const content = `${MARKER} hello from the durable spec`;
    const resp = await postMessage(page, { space_id: spaceId, conversation_id: conversationId, content });

    const json = await resp.json();
    expect(resp.ok(), `send message failed (${resp.status()}): ${JSON.stringify(json)}`).toBeTruthy();
    expect(json.success).toBe(true);

    const { data: row } = await admin
      .from('messages')
      .select('content, sender_id, space_id')
      .eq('id', json.data.id)
      .single();
    expect(row!.content).toContain(MARKER);
    expect(row!.sender_id).toBe(userId);
    expect(row!.space_id).toBe(spaceId);
  });

  test('sanitizes HTML/script content before it is stored (XSS defense)', async ({
    page,
  }) => {
    await ensureAuthenticated(page, 'pro');

    const payload = `${MARKER} <script>alert(1)</script><img src=x onerror=alert(2)>hi`;
    const resp = await postMessage(page, { space_id: spaceId, conversation_id: conversationId, content: payload });

    const json = await resp.json();
    expect(resp.ok(), `send failed (${resp.status()}): ${JSON.stringify(json)}`).toBeTruthy();

    const { data: row } = await admin
      .from('messages')
      .select('content')
      .eq('id', json.data.id)
      .single();
    // The stored content must not carry an executable script tag or inline handler.
    expect(row!.content.toLowerCase()).not.toContain('<script');
    expect(row!.content.toLowerCase()).not.toContain('onerror=');
  });

  test('rejects empty and oversized content', async ({ page }) => {
    await ensureAuthenticated(page, 'pro');

    const empty = await postMessage(page, { space_id: spaceId, content: '' });
    expect(empty.status()).toBe(400);

    const tooLong = await postMessage(page, {
      space_id: spaceId,
      content: `${MARKER} ` + 'x'.repeat(10001),
    });
    expect(tooLong.status()).toBe(400);
  });
});
