// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProjectPhotoGallery } from '@/components/budget/ProjectPhotoGallery';
import type { ProjectPhoto } from '@/lib/services/project-tracking-service';

const mockPhotos: ProjectPhoto[] = [
  {
    id: 'photo-1',
    project_id: 'project-1',
    url: 'https://example.com/photo1.jpg',
    thumbnail_url: 'https://example.com/thumb1.jpg',
    filename: 'before.jpg',
    photo_type: 'before',
    title: 'Before Photo',
    description: 'Before renovation',
    taken_date: '2026-01-15',
    display_order: 1,
    created_at: '2026-01-15',
  },
  {
    id: 'photo-2',
    project_id: 'project-1',
    url: 'https://example.com/photo2.jpg',
    thumbnail_url: 'https://example.com/thumb2.jpg',
    filename: 'receipt.jpg',
    photo_type: 'receipt',
    title: 'Receipt Photo',
    description: 'Tile receipt',
    taken_date: '2026-01-20',
    display_order: 2,
    created_at: '2026-01-20',
  },
];

const defaultProps = {
  projectId: 'project-1',
  photos: mockPhotos,
  onRefresh: vi.fn(),
};

describe('ProjectPhotoGallery', () => {
  it('renders without crashing', () => {
    render(<ProjectPhotoGallery {...defaultProps} />);
    expect(screen.getByText('Upload Photos')).toBeInTheDocument();
  });

  it('shows photo type statistics cards', () => {
    render(<ProjectPhotoGallery {...defaultProps} />);
    // Photo types appear as capitalize stat cards — use getAllByText since type
    // also appears as a badge in the gallery grid
    expect(screen.getAllByText('before').length).toBeGreaterThan(0);
    expect(screen.getAllByText('receipt').length).toBeGreaterThan(0);
  });

  it('shows count of photos in stat cards', () => {
    render(<ProjectPhotoGallery {...defaultProps} />);
    // Each type has 1 photo, shown as count "1"
    const ones = screen.getAllByText('1');
    expect(ones.length).toBeGreaterThanOrEqual(2);
  });

  it('renders filter select for photo types', () => {
    render(<ProjectPhotoGallery {...defaultProps} />);
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBeGreaterThanOrEqual(1);
  });

  it('has All Photos option in filter select', () => {
    render(<ProjectPhotoGallery {...defaultProps} />);
    expect(screen.getByText('All Photos')).toBeInTheDocument();
  });

  it('shows photo titles in gallery', () => {
    render(<ProjectPhotoGallery {...defaultProps} />);
    expect(screen.getByText('Before Photo')).toBeInTheDocument();
    expect(screen.getByText('Receipt Photo')).toBeInTheDocument();
  });

  it('shows empty state when no photos', () => {
    render(<ProjectPhotoGallery {...defaultProps} photos={[]} />);
    expect(screen.getByText('No photos uploaded yet')).toBeInTheDocument();
  });

  it('shows upload button', () => {
    render(<ProjectPhotoGallery {...defaultProps} />);
    expect(screen.getByText('Upload Photos')).toBeInTheDocument();
  });

  it('shows sort options in select', () => {
    render(<ProjectPhotoGallery {...defaultProps} />);
    expect(screen.getByText('Sort by Date')).toBeInTheDocument();
  });
});
