'use client';

import { createContext, useContext, ReactNode } from 'react';

// =============================================
// DEVELOPMENT ONLY - MOCK AUTHENTICATION
// =============================================
// This is a TEMPORARY mock auth context for development.
// It provides hardcoded user and space data matching the test data
// inserted in the database migration (20251005000000_initial_schema.sql).
//
// This will be REPLACED with real Supabase authentication in Phase 3.
// DO NOT use this in production.
// =============================================

// Hardcoded test user (matches database insert from migration)
const MOCK_USER = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'test@rowan.app',
  name: 'Test User',
  timezone: 'America/New_York',
  color_theme: 'emerald',
};

const MOCK_SPACE = {
  id: '00000000-0000-0000-0000-000000000002',
  name: 'My Test Space',
};

interface MockAuthContextType {
  user: typeof MOCK_USER;
  currentSpace: typeof MOCK_SPACE;
  loading: false;
}

const MockAuthContext = createContext<MockAuthContextType | undefined>(undefined);

export function MockAuthProvider({ children }: { children: ReactNode }) {
  const value: MockAuthContextType = {
    user: MOCK_USER,
    currentSpace: MOCK_SPACE,
    loading: false,
  };

  return (
    <MockAuthContext.Provider value={value}>
      {children}
    </MockAuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(MockAuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within a MockAuthProvider');
  }

  return context;
}
