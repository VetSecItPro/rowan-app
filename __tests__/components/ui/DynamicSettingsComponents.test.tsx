// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/dynamic', () => ({
  default: (_loader: unknown, _opts?: unknown) => {
    const MockComponent = ({ children }: { children?: React.ReactNode }) => (
      <div data-testid="dynamic-component">{children}</div>
    );
    MockComponent.displayName = 'DynamicComponent';
    return MockComponent;
  },
}));

import {
  DynamicSettingsComponents,
  AccountDeletionModal,
  CCPAOptOutModal,
  RestoreAccountModal,
  PasswordConfirmModal,
  ExportDataModal,
  PrivacyDataManager,
  TwoFactorAuth,
  SettingsSectionLoader,
} from '@/components/ui/DynamicSettingsComponents';

describe('DynamicSettingsComponents', () => {
  it('exports DynamicSettingsComponents object', () => {
    expect(DynamicSettingsComponents).toBeDefined();
  });

  it('has all expected keys', () => {
    expect(DynamicSettingsComponents.AccountDeletionModal).toBeDefined();
    expect(DynamicSettingsComponents.CCPAOptOutModal).toBeDefined();
    expect(DynamicSettingsComponents.RestoreAccountModal).toBeDefined();
    expect(DynamicSettingsComponents.PasswordConfirmModal).toBeDefined();
    expect(DynamicSettingsComponents.ExportDataModal).toBeDefined();
    expect(DynamicSettingsComponents.PrivacyDataManager).toBeDefined();
    expect(DynamicSettingsComponents.TwoFactorAuth).toBeDefined();
  });

  it('exports named dynamic components', () => {
    expect(AccountDeletionModal).toBeDefined();
    expect(CCPAOptOutModal).toBeDefined();
    expect(RestoreAccountModal).toBeDefined();
    expect(PasswordConfirmModal).toBeDefined();
    expect(ExportDataModal).toBeDefined();
    expect(PrivacyDataManager).toBeDefined();
    expect(TwoFactorAuth).toBeDefined();
  });
});

describe('SettingsSectionLoader', () => {
  it('shows loading state', () => {
    render(<SettingsSectionLoader isLoading={true}><p>Content</p></SettingsSectionLoader>);
    expect(screen.queryByText('Content')).toBeNull();
    expect(screen.getByText('Loading settings section...')).toBeDefined();
  });

  it('shows error state', () => {
    render(
      <SettingsSectionLoader isLoading={false} error="Something went wrong">
        <p>Content</p>
      </SettingsSectionLoader>
    );
    expect(screen.getByText('Something went wrong')).toBeDefined();
    expect(screen.queryByText('Content')).toBeNull();
  });

  it('shows children when not loading and no error', () => {
    render(
      <SettingsSectionLoader isLoading={false}>
        <p>Loaded content</p>
      </SettingsSectionLoader>
    );
    expect(screen.getByText('Loaded content')).toBeDefined();
  });
});
