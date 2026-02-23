/**
 * Tests for AI tool definitions (lib/services/ai/tool-definitions.ts)
 * Verifies structure, required fields, enum values, and TOOL_NAMES constants.
 */

import { describe, it, expect } from 'vitest';
import { SchemaType } from '@google/generative-ai';
import {
  TOOL_DECLARATIONS,
  TOOL_NAMES,
  getToolDeclaration,
} from '@/lib/services/ai/tool-definitions';

describe('lib/services/ai/tool-definitions', () => {
  describe('TOOL_DECLARATIONS array', () => {
    it('should export a non-empty array', () => {
      expect(Array.isArray(TOOL_DECLARATIONS)).toBe(true);
      expect(TOOL_DECLARATIONS.length).toBeGreaterThan(0);
    });

    it('should have unique tool names', () => {
      const names = TOOL_DECLARATIONS.map((d) => d.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });

    it.each(TOOL_DECLARATIONS.map((d) => [d.name, d]))(
      'tool "%s" should have valid name and description',
      (_name, decl) => {
        expect(typeof decl.name).toBe('string');
        expect(decl.name.length).toBeGreaterThan(0);
        expect(typeof decl.description).toBe('string');
        expect(decl.description!.length).toBeGreaterThan(0);
      }
    );

    it.each(TOOL_DECLARATIONS.map((d) => [d.name, d]))(
      'tool "%s" should have OBJECT type parameters',
      (_name, decl) => {
        expect(decl.parameters).toBeDefined();
        expect(decl.parameters?.type).toBe(SchemaType.OBJECT);
      }
    );

    it.each(TOOL_DECLARATIONS.map((d) => [d.name, d]))(
      'tool "%s" should have at least one property',
      (_name, decl) => {
        const props = decl.parameters?.properties;
        expect(props).toBeDefined();
        expect(Object.keys(props!).length).toBeGreaterThan(0);
      }
    );
  });

  describe('required fields', () => {
    it('create_task requires title', () => {
      const decl = getToolDeclaration('create_task');
      expect(decl).toBeDefined();
      expect(decl!.parameters?.required).toContain('title');
    });

    it('update_task requires task_id', () => {
      const decl = getToolDeclaration('update_task');
      expect(decl).toBeDefined();
      expect(decl!.parameters?.required).toContain('task_id');
    });

    it('delete_task requires task_id', () => {
      const decl = getToolDeclaration('delete_task');
      expect(decl).toBeDefined();
      expect(decl!.parameters?.required).toContain('task_id');
    });

    it('create_event requires title', () => {
      const decl = getToolDeclaration('create_event');
      expect(decl).toBeDefined();
      expect(decl!.parameters?.required).toContain('title');
    });

    it('create_reminder requires title', () => {
      const decl = getToolDeclaration('create_reminder');
      expect(decl).toBeDefined();
      expect(decl!.parameters?.required).toContain('title');
    });

    it('add_shopping_item requires name and list_id', () => {
      const decl = getToolDeclaration('add_shopping_item');
      expect(decl).toBeDefined();
      expect(decl!.parameters?.required).toContain('name');
      expect(decl!.parameters?.required).toContain('list_id');
    });

    it('plan_meal requires meal_type and scheduled_date', () => {
      const decl = getToolDeclaration('plan_meal');
      expect(decl).toBeDefined();
      expect(decl!.parameters?.required).toContain('meal_type');
      expect(decl!.parameters?.required).toContain('scheduled_date');
    });

    it('create_goal requires title', () => {
      const decl = getToolDeclaration('create_goal');
      expect(decl).toBeDefined();
      expect(decl!.parameters?.required).toContain('title');
    });
  });

  describe('enum values', () => {
    it('create_task priority has valid enum values', () => {
      const decl = getToolDeclaration('create_task');
      const priorityProp = decl!.parameters?.properties?.priority as { enum?: string[] };
      expect(priorityProp?.enum).toBeDefined();
      expect(priorityProp!.enum).toContain('low');
      expect(priorityProp!.enum).toContain('medium');
      expect(priorityProp!.enum).toContain('high');
      expect(priorityProp!.enum).toContain('urgent');
    });

    it('create_task status has valid enum values', () => {
      const decl = getToolDeclaration('create_task');
      const statusProp = decl!.parameters?.properties?.status as { enum?: string[] };
      expect(statusProp?.enum).toBeDefined();
      expect(statusProp!.enum).toContain('pending');
      expect(statusProp!.enum).toContain('completed');
    });

    it('create_chore frequency has valid enum values', () => {
      const decl = getToolDeclaration('create_chore');
      const freqProp = decl!.parameters?.properties?.frequency as { enum?: string[] };
      expect(freqProp?.enum).toBeDefined();
      expect(freqProp!.enum).toContain('daily');
      expect(freqProp!.enum).toContain('weekly');
      expect(freqProp!.enum).toContain('monthly');
    });

    it('plan_meal meal_type has valid enum values', () => {
      const decl = getToolDeclaration('plan_meal');
      const mealTypeProp = decl!.parameters?.properties?.meal_type as { enum?: string[] };
      expect(mealTypeProp?.enum).toBeDefined();
      expect(mealTypeProp!.enum).toContain('breakfast');
      expect(mealTypeProp!.enum).toContain('lunch');
      expect(mealTypeProp!.enum).toContain('dinner');
    });
  });

  describe('TOOL_NAMES constants', () => {
    it('should be an object with string values', () => {
      expect(typeof TOOL_NAMES).toBe('object');
      for (const value of Object.values(TOOL_NAMES)) {
        expect(typeof value).toBe('string');
      }
    });

    it('each TOOL_NAMES value should match a declaration name', () => {
      const declNames = new Set(TOOL_DECLARATIONS.map((d) => d.name));
      for (const toolName of Object.values(TOOL_NAMES)) {
        expect(declNames.has(toolName)).toBe(true);
      }
    });

    it('number of TOOL_NAMES should match TOOL_DECLARATIONS length', () => {
      expect(Object.keys(TOOL_NAMES).length).toBe(TOOL_DECLARATIONS.length);
    });
  });

  describe('getToolDeclaration()', () => {
    it('should find create_task by name', () => {
      const decl = getToolDeclaration('create_task');
      expect(decl).toBeDefined();
      expect(decl!.name).toBe('create_task');
    });

    it('should find list_tasks by name', () => {
      const decl = getToolDeclaration('list_tasks');
      expect(decl).toBeDefined();
    });

    it('should find plan_meal by name', () => {
      const decl = getToolDeclaration('plan_meal');
      expect(decl).toBeDefined();
    });

    it('should return undefined for non-existent tool', () => {
      expect(getToolDeclaration('non_existent_tool')).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      expect(getToolDeclaration('')).toBeUndefined();
    });

    it('should return the correct declaration object', () => {
      const decl = getToolDeclaration('create_task');
      expect(decl?.name).toBe('create_task');
      expect(decl?.description).toBeTruthy();
      expect(decl?.parameters).toBeDefined();
    });
  });
});
