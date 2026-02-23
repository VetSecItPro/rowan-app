// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), back: vi.fn() })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
     
    <img src={src} alt={alt} />
  ),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/utils/toast', () => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
  showWarning: vi.fn(),
}));

vi.mock('@/lib/services/meals-service', () => ({
  mealsService: {
    createRecipe: vi.fn().mockResolvedValue({ id: 'recipe-1' }),
  },
}));

vi.mock('@/lib/utils/csrf-fetch', () => ({
  csrfFetch: vi.fn().mockResolvedValue({
    ok: true,
    json: vi.fn().mockResolvedValue({
      recipe: {
        name: 'Parsed Recipe',
        ingredients: [{ name: 'Flour', amount: '2', unit: 'cups' }],
      },
    }),
  }),
}));

import NewRecipeClient from '@/components/recipes/NewRecipeClient';

describe('NewRecipeClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<NewRecipeClient spaceId="space-1" />);
    expect(container).toBeTruthy();
  });

  it('renders the Create New Recipe heading', () => {
    render(<NewRecipeClient spaceId="space-1" />);
    expect(screen.getByText('Create New Recipe')).toBeTruthy();
  });

  it('renders the Manual Entry tab', () => {
    render(<NewRecipeClient spaceId="space-1" />);
    expect(screen.getByText('Manual Entry')).toBeTruthy();
  });

  it('renders the AI Import tab', () => {
    render(<NewRecipeClient spaceId="space-1" />);
    expect(screen.getByText('AI Import')).toBeTruthy();
  });

  it('shows manual entry form by default', () => {
    render(<NewRecipeClient spaceId="space-1" />);
    expect(screen.getByText('Basic Information')).toBeTruthy();
    expect(screen.getByPlaceholderText("e.g., Grandma's Apple Pie")).toBeTruthy();
  });

  it('renders the Recipe Name field', () => {
    render(<NewRecipeClient spaceId="space-1" />);
    const nameInput = screen.getByPlaceholderText("e.g., Grandma's Apple Pie");
    expect(nameInput).toBeTruthy();
  });

  it('renders the Add Ingredient button', () => {
    render(<NewRecipeClient spaceId="space-1" />);
    expect(screen.getByText('Add Ingredient')).toBeTruthy();
  });

  it('renders the Create Recipe submit button', () => {
    render(<NewRecipeClient spaceId="space-1" />);
    expect(screen.getByText('Create Recipe')).toBeTruthy();
  });

  it('renders the Cancel link', () => {
    render(<NewRecipeClient spaceId="space-1" />);
    expect(screen.getByText('Cancel')).toBeTruthy();
  });

  it('switches to AI Import tab on click', () => {
    render(<NewRecipeClient spaceId="space-1" />);
    fireEvent.click(screen.getByText('AI Import'));
    expect(screen.getByText('How AI Import Works')).toBeTruthy();
  });

  it('renders AI import instructions when AI tab is active', () => {
    render(<NewRecipeClient spaceId="space-1" />);
    fireEvent.click(screen.getByText('AI Import'));
    expect(screen.getByText('Paste Recipe Text')).toBeTruthy();
    expect(screen.getByText('Parse Recipe with AI')).toBeTruthy();
  });

  it('renders the Difficulty select', () => {
    render(<NewRecipeClient spaceId="space-1" />);
    expect(screen.getByText('Select difficulty...')).toBeTruthy();
  });

  it('renders the Recipe Details section', () => {
    render(<NewRecipeClient spaceId="space-1" />);
    expect(screen.getByText('Recipe Details')).toBeTruthy();
  });

  it('renders the Ingredients section', () => {
    render(<NewRecipeClient spaceId="space-1" />);
    expect(screen.getByText(/Ingredients/)).toBeTruthy();
  });

  it('adds a new ingredient row when Add Ingredient is clicked', () => {
    render(<NewRecipeClient spaceId="space-1" />);
    const initialInputs = screen.getAllByPlaceholderText('Ingredient name');
    fireEvent.click(screen.getByText('Add Ingredient'));
    const updatedInputs = screen.getAllByPlaceholderText('Ingredient name');
    expect(updatedInputs.length).toBe(initialInputs.length + 1);
  });
});
