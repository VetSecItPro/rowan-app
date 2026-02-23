/**
 * Unit tests for lib/supabase.ts
 *
 * Tests:
 * - The module exports a `supabase` client when env vars are present
 * - The client is a Supabase client instance (has .from, .auth, etc.)
 *
 * Note: The vitest.setup.ts file sets NEXT_PUBLIC_SUPABASE_URL and
 * NEXT_PUBLIC_SUPABASE_ANON_KEY, so the module initialises correctly.
 * @supabase/supabase-js is NOT mocked here — we test the real client shape.
 */

import { describe, it, expect } from 'vitest';
import { supabase } from '@/lib/supabase';

describe('supabase client', () => {
  it('exports a supabase client object', () => {
    expect(supabase).toBeDefined();
    expect(typeof supabase).toBe('object');
  });

  it('has a .from() method for table queries', () => {
    expect(typeof supabase.from).toBe('function');
  });

  it('has an .auth object for authentication', () => {
    expect(supabase.auth).toBeDefined();
    expect(typeof supabase.auth).toBe('object');
  });

  it('auth has getUser method', () => {
    expect(typeof supabase.auth.getUser).toBe('function');
  });

  it('auth has getSession method', () => {
    expect(typeof supabase.auth.getSession).toBe('function');
  });

  it('auth has signOut method', () => {
    expect(typeof supabase.auth.signOut).toBe('function');
  });

  it('has a .channel() method for realtime subscriptions', () => {
    expect(typeof supabase.channel).toBe('function');
  });

  it('has a .storage property', () => {
    expect(supabase.storage).toBeDefined();
  });

  it('.from() returns a query builder with .select()', () => {
    const builder = supabase.from('tasks');
    expect(typeof builder.select).toBe('function');
  });

  it('.from() returns a query builder with .insert()', () => {
    const builder = supabase.from('tasks');
    expect(typeof builder.insert).toBe('function');
  });

  it('.from() returns a query builder with .update()', () => {
    const builder = supabase.from('tasks');
    expect(typeof builder.update).toBe('function');
  });

  it('.from() returns a query builder with .delete()', () => {
    const builder = supabase.from('tasks');
    expect(typeof builder.delete).toBe('function');
  });
});
