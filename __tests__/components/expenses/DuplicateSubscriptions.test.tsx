// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { DuplicateSubscriptions } from '@/components/expenses/DuplicateSubscriptions';

const makePattern = (id: string, overrides = {}) => ({
  id,
  pattern_name: `Pattern ${id}`,
  merchant_name: `Merchant ${id}`,
  frequency: 'monthly',
  average_amount: 10,
  amount_variance: 0,
  occurrence_count: 3,
  confidence_score: 85,
  first_occurrence: '2024-01-01',
  last_occurrence: '2024-03-01',
  next_expected_date: '2024-04-01',
  next_expected_amount: 10,
  category: 'Subscriptions',
  user_confirmed: false,
  user_ignored: false,
  auto_created: false,
  space_id: 'space-1',
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
  ...overrides,
});

const makeDuplicateGroup = (id1: string, id2: string) => ({
  patterns: [makePattern(id1), makePattern(id2)],
  similarity: 90,
  totalCost: 20,
});

describe('DuplicateSubscriptions', () => {
  it('returns null when duplicates array is empty', () => {
    const { container } = render(
      <DuplicateSubscriptions duplicates={[]} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders duplicate group when provided', () => {
    render(
      <DuplicateSubscriptions duplicates={[makeDuplicateGroup('p1', 'p2')]} />
    );
    expect(screen.getByText('Potential Duplicate Subscriptions Detected')).toBeInTheDocument();
  });

  it('renders pattern names', () => {
    render(
      <DuplicateSubscriptions duplicates={[makeDuplicateGroup('p1', 'p2')]} />
    );
    expect(screen.getByText('Pattern p1')).toBeInTheDocument();
    expect(screen.getByText('Pattern p2')).toBeInTheDocument();
  });

  it('renders similarity score', () => {
    render(
      <DuplicateSubscriptions duplicates={[makeDuplicateGroup('p1', 'p2')]} />
    );
    expect(screen.getByText('90%')).toBeInTheDocument();
  });

  it('renders dismiss button when onDismiss provided', () => {
    render(
      <DuplicateSubscriptions
        duplicates={[makeDuplicateGroup('p1', 'p2')]}
        onDismiss={vi.fn()}
      />
    );
    expect(screen.getByLabelText('Dismiss')).toBeInTheDocument();
  });

  it('calls onDismiss with pattern ids when dismiss clicked', () => {
    const onDismiss = vi.fn();
    render(
      <DuplicateSubscriptions
        duplicates={[makeDuplicateGroup('p1', 'p2')]}
        onDismiss={onDismiss}
      />
    );
    fireEvent.click(screen.getByLabelText('Dismiss'));
    expect(onDismiss).toHaveBeenCalledWith(['p1', 'p2']);
  });

  it('renders review button when onReview provided', () => {
    render(
      <DuplicateSubscriptions
        duplicates={[makeDuplicateGroup('p1', 'p2')]}
        onReview={vi.fn()}
      />
    );
    expect(screen.getByText('Review and Consolidate')).toBeInTheDocument();
  });

  it('calls onReview when review button clicked', () => {
    const onReview = vi.fn();
    const group = makeDuplicateGroup('p1', 'p2');
    render(
      <DuplicateSubscriptions
        duplicates={[group]}
        onReview={onReview}
      />
    );
    fireEvent.click(screen.getByText('Review and Consolidate'));
    expect(onReview).toHaveBeenCalledWith(group);
  });

  it('renders multiple duplicate groups', () => {
    render(
      <DuplicateSubscriptions
        duplicates={[makeDuplicateGroup('p1', 'p2'), makeDuplicateGroup('p3', 'p4')]}
      />
    );
    expect(screen.getAllByText('Potential Duplicate Subscriptions Detected')).toHaveLength(2);
  });
});
