/**
 * Unit tests for lib/hooks/useGoalsModals.ts
 *
 * Tests goal, milestone, habit, template, check-in, history, and frequency modal state.
 */

// @vitest-environment jsdom

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGoalsModals } from '@/lib/hooks/useGoalsModals';
import type { Goal } from '@/lib/services/goals-service';

const mockGoal = { id: 'goal-1', title: 'Test Goal' } as Goal;

describe('useGoalsModals', () => {
  it('should initialize all modals as closed', () => {
    const { result } = renderHook(() => useGoalsModals());

    expect(result.current.isGoalModalOpen).toBe(false);
    expect(result.current.editingGoal).toBeNull();
    expect(result.current.isMilestoneModalOpen).toBe(false);
    expect(result.current.editingMilestone).toBeNull();
    expect(result.current.isHabitModalOpen).toBe(false);
    expect(result.current.editingHabit).toBeNull();
    expect(result.current.isTemplateModalOpen).toBe(false);
    expect(result.current.selectedTemplate).toBeNull();
    expect(result.current.isCheckInModalOpen).toBe(false);
    expect(result.current.checkInGoal).toBeNull();
    expect(result.current.isHistoryTimelineOpen).toBe(false);
    expect(result.current.historyGoal).toBeNull();
    expect(result.current.isFrequencyModalOpen).toBe(false);
    expect(result.current.frequencyGoal).toBeNull();
    expect(result.current.confirmDialog).toEqual({
      isOpen: false,
      action: 'delete-goal',
      id: '',
    });
  });

  it('handleOpenGoalModal should open goal modal', () => {
    const { result } = renderHook(() => useGoalsModals());

    act(() => result.current.handleOpenGoalModal());

    expect(result.current.isGoalModalOpen).toBe(true);
  });

  it('handleCloseGoalModal should close goal modal and clear editing state', () => {
    const { result } = renderHook(() => useGoalsModals());

    act(() => result.current.handleEditGoal(mockGoal));
    expect(result.current.editingGoal).toEqual(mockGoal);

    act(() => result.current.handleCloseGoalModal());

    expect(result.current.isGoalModalOpen).toBe(false);
    expect(result.current.editingGoal).toBeNull();
  });

  it('handleEditGoal should set editing goal and open modal', () => {
    const { result } = renderHook(() => useGoalsModals());

    act(() => result.current.handleEditGoal(mockGoal));

    expect(result.current.editingGoal).toEqual(mockGoal);
    expect(result.current.isGoalModalOpen).toBe(true);
  });

  it('handleOpenMilestoneModal should open milestone modal', () => {
    const { result } = renderHook(() => useGoalsModals());

    act(() => result.current.handleOpenMilestoneModal());

    expect(result.current.isMilestoneModalOpen).toBe(true);
  });

  it('handleCloseMilestoneModal should close milestone modal and clear editing', () => {
    const { result } = renderHook(() => useGoalsModals());

    act(() => result.current.handleOpenMilestoneModal());
    act(() => result.current.handleCloseMilestoneModal());

    expect(result.current.isMilestoneModalOpen).toBe(false);
    expect(result.current.editingMilestone).toBeNull();
  });

  it('handleOpenHabitModal should open habit modal', () => {
    const { result } = renderHook(() => useGoalsModals());

    act(() => result.current.handleOpenHabitModal());

    expect(result.current.isHabitModalOpen).toBe(true);
  });

  it('handleCloseHabitModal should close habit modal', () => {
    const { result } = renderHook(() => useGoalsModals());

    act(() => result.current.handleOpenHabitModal());
    act(() => result.current.handleCloseHabitModal());

    expect(result.current.isHabitModalOpen).toBe(false);
  });

  it('handleSelectTemplate should open goal modal and close template modal', () => {
    const { result } = renderHook(() => useGoalsModals());
    const template = { id: 'tpl-1', title: 'Template' } as Parameters<typeof result.current.handleSelectTemplate>[0];

    act(() => result.current.setIsTemplateModalOpen(true));
    act(() => result.current.handleSelectTemplate(template));

    expect(result.current.isTemplateModalOpen).toBe(false);
    expect(result.current.isGoalModalOpen).toBe(true);
    expect(result.current.selectedTemplate).toEqual(template);
  });

  it('handleCreateFromScratch should open goal modal and close template modal', () => {
    const { result } = renderHook(() => useGoalsModals());

    act(() => result.current.setIsTemplateModalOpen(true));
    act(() => result.current.handleCreateFromScratch());

    expect(result.current.isTemplateModalOpen).toBe(false);
    expect(result.current.isGoalModalOpen).toBe(true);
  });

  it('handleOpenCheckInModal should set check-in goal and open modal', () => {
    const { result } = renderHook(() => useGoalsModals());

    act(() => result.current.handleOpenCheckInModal(mockGoal));

    expect(result.current.checkInGoal).toEqual(mockGoal);
    expect(result.current.isCheckInModalOpen).toBe(true);
  });

  it('handleCloseCheckInModal should close and clear check-in goal', () => {
    const { result } = renderHook(() => useGoalsModals());

    act(() => result.current.handleOpenCheckInModal(mockGoal));
    act(() => result.current.handleCloseCheckInModal());

    expect(result.current.isCheckInModalOpen).toBe(false);
    expect(result.current.checkInGoal).toBeNull();
  });

  it('handleOpenHistoryTimeline should set history goal and open timeline', () => {
    const { result } = renderHook(() => useGoalsModals());

    act(() => result.current.handleOpenHistoryTimeline(mockGoal));

    expect(result.current.historyGoal).toEqual(mockGoal);
    expect(result.current.isHistoryTimelineOpen).toBe(true);
  });

  it('handleOpenFrequencyModal should set frequency goal and open modal', () => {
    const { result } = renderHook(() => useGoalsModals());

    act(() => result.current.handleOpenFrequencyModal(mockGoal));

    expect(result.current.frequencyGoal).toEqual(mockGoal);
    expect(result.current.isFrequencyModalOpen).toBe(true);
  });

  it('handleNewButtonClick goals viewMode should open template modal', () => {
    const { result } = renderHook(() => useGoalsModals());

    act(() => result.current.handleNewButtonClick('goals'));

    expect(result.current.isTemplateModalOpen).toBe(true);
  });

  it('handleNewButtonClick milestones viewMode should open milestone modal', () => {
    const { result } = renderHook(() => useGoalsModals());

    act(() => result.current.handleNewButtonClick('milestones'));

    expect(result.current.isMilestoneModalOpen).toBe(true);
  });

  it('handleNewButtonClick habits viewMode should open habit modal', () => {
    const { result } = renderHook(() => useGoalsModals());

    act(() => result.current.handleNewButtonClick('habits'));

    expect(result.current.isHabitModalOpen).toBe(true);
  });

  it('handleNewButtonClick activity viewMode should open template modal', () => {
    const { result } = renderHook(() => useGoalsModals());

    act(() => result.current.handleNewButtonClick('activity'));

    expect(result.current.isTemplateModalOpen).toBe(true);
  });
});
