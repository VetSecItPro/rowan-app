/**
 * Unit tests for AI Tool Definitions (Task 6.1)
 *
 * Verifies:
 * - All tool declarations are valid Gemini FunctionDeclaration objects
 * - Required fields are marked correctly
 * - Enum values are present and non-empty
 * - Tool names are unique
 * - TOOL_NAMES constants match actual declarations
 * - getToolDeclaration() lookup works
 */

import { describe, it, expect } from 'vitest';
import { SchemaType } from '@google/generative-ai';
import {
  TOOL_DECLARATIONS,
  TOOL_NAMES,
  getToolDeclaration,
} from '@/lib/services/ai/tool-definitions';

describe('Tool Definitions', () => {
  describe('TOOL_DECLARATIONS array', () => {
    it('should contain at least 15 tool declarations', () => {
      expect(TOOL_DECLARATIONS.length).toBeGreaterThanOrEqual(15);
    });

    it('should have unique tool names', () => {
      const names = TOOL_DECLARATIONS.map((d) => d.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });

    it.each(
      TOOL_DECLARATIONS.map((d) => [d.name, d])
    )('tool "%s" should have a valid structure', (_name, decl) => {
      // Must have name and description
      expect(decl.name).toBeTruthy();
      expect(typeof decl.name).toBe('string');
      expect(decl.description).toBeTruthy();
      expect(typeof decl.description).toBe('string');

      // Must have parameters object
      expect(decl.parameters).toBeDefined();
      expect(decl.parameters?.type).toBe(SchemaType.OBJECT);
      expect(decl.parameters?.properties).toBeDefined();
    });

    it.each(
      TOOL_DECLARATIONS.map((d) => [d.name, d])
    )('tool "%s" should have at least one property defined', (_name, decl) => {
      const props = decl.parameters?.properties;
      expect(props).toBeDefined();
      expect(Object.keys(props!).length).toBeGreaterThan(0);
    });
  });

  describe('required fields', () => {
    it('create_task should require title', () => {
      const decl = getToolDeclaration('create_task');
      expect(decl).toBeDefined();
      expect(decl!.parameters?.required).toContain('title');
    });

    it('create_chore should require title', () => {
      const decl = getToolDeclaration('create_chore');
      expect(decl).toBeDefined();
      expect(decl!.parameters?.required).toContain('title');
    });

    it('create_event should require title', () => {
      const decl = getToolDeclaration('create_event');
      expect(decl).toBeDefined();
      expect(decl!.parameters?.required).toContain('title');
    });

    it('create_reminder should require title', () => {
      const decl = getToolDeclaration('create_reminder');
      expect(decl).toBeDefined();
      expect(decl!.parameters?.required).toContain('title');
    });

    it('add_shopping_item should require name and list_id', () => {
      const decl = getToolDeclaration('add_shopping_item');
      expect(decl).toBeDefined();
      expect(decl!.parameters?.required).toContain('name');
      expect(decl!.parameters?.required).toContain('list_id');
    });

    it('plan_meal should require meal_type and scheduled_date', () => {
      const decl = getToolDeclaration('plan_meal');
      expect(decl).toBeDefined();
      expect(decl!.parameters?.required).toContain('meal_type');
      expect(decl!.parameters?.required).toContain('scheduled_date');
    });

    it('create_goal should require title', () => {
      const decl = getToolDeclaration('create_goal');
      expect(decl).toBeDefined();
      expect(decl!.parameters?.required).toContain('title');
    });

    it('create_expense should require title and amount', () => {
      const decl = getToolDeclaration('create_expense');
      expect(decl).toBeDefined();
      expect(decl!.parameters?.required).toContain('title');
      expect(decl!.parameters?.required).toContain('amount');
    });

    it('create_project should require name', () => {
      const decl = getToolDeclaration('create_project');
      expect(decl).toBeDefined();
      expect(decl!.parameters?.required).toContain('name');
    });
  });

  describe('enum values', () => {
    it('create_task priority should have valid enum values', () => {
      const decl = getToolDeclaration('create_task');
      const priorityProp = decl!.parameters?.properties?.priority;
      expect(priorityProp).toBeDefined();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const enumValues = (priorityProp as any)?.enum;
      expect(enumValues).toBeDefined();
      expect(enumValues).toContain('low');
      expect(enumValues).toContain('medium');
      expect(enumValues).toContain('high');
      expect(enumValues).toContain('urgent');
    });

    it('plan_meal meal_type should have valid enum values', () => {
      const decl = getToolDeclaration('plan_meal');
      const mealTypeProp = decl!.parameters?.properties?.meal_type;
      expect(mealTypeProp).toBeDefined();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const enumValues = (mealTypeProp as any)?.enum;
      expect(enumValues).toBeDefined();
      expect(enumValues).toContain('breakfast');
      expect(enumValues).toContain('lunch');
      expect(enumValues).toContain('dinner');
    });

    it('create_chore frequency should have valid enum values', () => {
      const decl = getToolDeclaration('create_chore');
      const freqProp = decl!.parameters?.properties?.frequency;
      expect(freqProp).toBeDefined();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const enumValues = (freqProp as any)?.enum;
      expect(enumValues).toBeDefined();
      expect(enumValues).toContain('daily');
      expect(enumValues).toContain('weekly');
    });
  });

  describe('TOOL_NAMES constants', () => {
    it('should map to actual tool declaration names', () => {
      const declNames = new Set(TOOL_DECLARATIONS.map((d) => d.name));

      for (const [, toolName] of Object.entries(TOOL_NAMES)) {
        expect(declNames.has(toolName)).toBe(true);
      }
    });

    it('should cover all 17 declarations', () => {
      expect(Object.keys(TOOL_NAMES).length).toBe(TOOL_DECLARATIONS.length);
    });
  });

  describe('getToolDeclaration()', () => {
    it('should find existing tools by name', () => {
      expect(getToolDeclaration('create_task')).toBeDefined();
      expect(getToolDeclaration('list_tasks')).toBeDefined();
      expect(getToolDeclaration('plan_meal')).toBeDefined();
    });

    it('should return undefined for non-existent tools', () => {
      expect(getToolDeclaration('nonexistent_tool')).toBeUndefined();
      expect(getToolDeclaration('')).toBeUndefined();
    });

    it('should return the correct declaration', () => {
      const decl = getToolDeclaration('create_task');
      expect(decl?.name).toBe('create_task');
      expect(decl?.description).toBeTruthy();
    });
  });
});
