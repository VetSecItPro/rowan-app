/**
 * E2E Intelligence System - Type Definitions
 */

export interface MissingTestId {
  file: string;
  line: number;
  elementType: 'button' | 'input' | 'link' | 'modal' | 'form' | 'select' | 'textarea';
  suggestedTestId: string;
  context: string;
  priority: 'high' | 'medium' | 'low';
  reason: string;
}

export interface ScanResult {
  repo: string;
  scanDate: string;
  totalFiles: number;
  totalComponents: number;
  missingTestIds: number;
  currentCoverage: number; // percentage
  suggestions: MissingTestId[];
}

export interface TechStack {
  framework: 'next-app-router' | 'next-pages' | 'react-spa' | 'vue' | 'svelte' | 'other';
  testRunner: 'playwright' | 'cypress' | 'selenium' | 'none';
  hasAppDir: boolean;
  hasPagesDir: boolean;
  hasSrcDir: boolean;
  packageManager: 'pnpm' | 'npm' | 'yarn' | 'bun';
}

export interface RepoConfig {
  name: string;
  framework: string;
  testRunner: string;
  buildCommand: string;
  testCommand: string;
  criticalPaths: string[];
  scanPaths: string[];
  ignorePaths: string[];
}

export interface ChangeAnalysis {
  changedFiles: string[];
  affectedFeatures: string[];
  testSuite: string[];
  skipE2E: boolean;
  reason: string;
}
