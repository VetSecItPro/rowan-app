'use client';

import { useState, useCallback } from 'react';
import type { Goal, Milestone, GoalTemplate } from '@/lib/services/goals-service';
import type { ViewMode } from '@/lib/hooks/useGoalsData';
import type { Habit, ConfirmDialogState } from '@/lib/hooks/useGoalsHandlers';

// ─── Return interface ─────────────────────────────────────────────────────────

export interface UseGoalsModalsReturn {
  // Goal modal
  isGoalModalOpen: boolean;
  setIsGoalModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editingGoal: Goal | null;
  setEditingGoal: React.Dispatch<React.SetStateAction<Goal | null>>;
  handleOpenGoalModal: () => void;
  handleCloseGoalModal: () => void;
  handleEditGoal: (goal: Goal) => void;

  // Milestone modal
  isMilestoneModalOpen: boolean;
  setIsMilestoneModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editingMilestone: Milestone | null;
  setEditingMilestone: React.Dispatch<React.SetStateAction<Milestone | null>>;
  handleOpenMilestoneModal: () => void;
  handleCloseMilestoneModal: () => void;
  handleEditMilestone: (milestone: Milestone) => void;

  // Habit modal
  isHabitModalOpen: boolean;
  setIsHabitModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editingHabit: Habit | null;
  setEditingHabit: React.Dispatch<React.SetStateAction<Habit | null>>;
  handleOpenHabitModal: () => void;
  handleCloseHabitModal: () => void;

  // Template modal
  isTemplateModalOpen: boolean;
  setIsTemplateModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  selectedTemplate: GoalTemplate | null;
  setSelectedTemplate: React.Dispatch<React.SetStateAction<GoalTemplate | null>>;
  handleSelectTemplate: (template: GoalTemplate) => void;
  handleCloseTemplateModal: () => void;
  handleCreateFromScratch: () => void;

  // Check-in modal
  isCheckInModalOpen: boolean;
  setIsCheckInModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  checkInGoal: Goal | null;
  setCheckInGoal: React.Dispatch<React.SetStateAction<Goal | null>>;
  handleOpenCheckInModal: (goal: Goal) => void;
  handleCloseCheckInModal: () => void;

  // History timeline
  isHistoryTimelineOpen: boolean;
  setIsHistoryTimelineOpen: React.Dispatch<React.SetStateAction<boolean>>;
  historyGoal: Goal | null;
  setHistoryGoal: React.Dispatch<React.SetStateAction<Goal | null>>;
  handleOpenHistoryTimeline: (goal: Goal) => void;
  handleCloseHistoryTimeline: () => void;

  // Frequency modal
  isFrequencyModalOpen: boolean;
  setIsFrequencyModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  frequencyGoal: Goal | null;
  setFrequencyGoal: React.Dispatch<React.SetStateAction<Goal | null>>;
  handleOpenFrequencyModal: (goal: Goal) => void;
  handleCloseFrequencyModal: () => void;

  // Confirm dialog
  confirmDialog: ConfirmDialogState;
  setConfirmDialog: React.Dispatch<React.SetStateAction<ConfirmDialogState>>;

  // New button orchestration (dispatches to correct modal based on viewMode)
  handleNewButtonClick: (viewMode: ViewMode) => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/** Manages open/close state for goal creation, editing, and milestone modals */
export function useGoalsModals(): UseGoalsModalsReturn {
  // ─── Goal modal state ───────────────────────────────────────────────────────
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  // ─── Milestone modal state ──────────────────────────────────────────────────
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);

  // ─── Habit modal state ──────────────────────────────────────────────────────
  const [isHabitModalOpen, setIsHabitModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);

  // ─── Template modal state ──────────────────────────────────────────────────
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<GoalTemplate | null>(null);

  // ─── Check-in modal state ──────────────────────────────────────────────────
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [checkInGoal, setCheckInGoal] = useState<Goal | null>(null);

  // ─── History timeline state ────────────────────────────────────────────────
  const [isHistoryTimelineOpen, setIsHistoryTimelineOpen] = useState(false);
  const [historyGoal, setHistoryGoal] = useState<Goal | null>(null);

  // ─── Frequency modal state ────────────────────────────────────────────────
  const [isFrequencyModalOpen, setIsFrequencyModalOpen] = useState(false);
  const [frequencyGoal, setFrequencyGoal] = useState<Goal | null>(null);

  // ─── Confirm dialog state ─────────────────────────────────────────────────
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    isOpen: false,
    action: 'delete-goal',
    id: '',
  });

  // ─── Goal modal handlers ───────────────────────────────────────────────────

  const handleOpenGoalModal = useCallback(() => {
    setIsGoalModalOpen(true);
  }, []);

  const handleCloseGoalModal = useCallback(() => {
    setIsGoalModalOpen(false);
    setEditingGoal(null);
    setSelectedTemplate(null);
  }, []);

  const handleEditGoal = useCallback((goal: Goal) => {
    setEditingGoal(goal);
    setIsGoalModalOpen(true);
  }, []);

  // ─── Milestone modal handlers ──────────────────────────────────────────────

  const handleOpenMilestoneModal = useCallback(() => {
    setIsMilestoneModalOpen(true);
  }, []);

  const handleCloseMilestoneModal = useCallback(() => {
    setIsMilestoneModalOpen(false);
    setEditingMilestone(null);
  }, []);

  const handleEditMilestone = useCallback((milestone: Milestone) => {
    setEditingMilestone(milestone);
    setIsMilestoneModalOpen(true);
  }, []);

  // ─── Habit modal handlers ─────────────────────────────────────────────────

  const handleOpenHabitModal = useCallback(() => {
    setIsHabitModalOpen(true);
  }, []);

  const handleCloseHabitModal = useCallback(() => {
    setIsHabitModalOpen(false);
    setEditingHabit(null);
  }, []);

  // ─── Template modal handlers ──────────────────────────────────────────────

  const handleSelectTemplate = useCallback((template: GoalTemplate) => {
    // Set template data and open NewGoalModal for editing
    setSelectedTemplate(template);
    setIsTemplateModalOpen(false);
    setIsGoalModalOpen(true);
  }, []);

  const handleCloseTemplateModal = useCallback(() => {
    setIsTemplateModalOpen(false);
  }, []);

  const handleCreateFromScratch = useCallback(() => {
    setIsTemplateModalOpen(false);
    setIsGoalModalOpen(true);
  }, []);

  // ─── Check-in modal handlers ──────────────────────────────────────────────

  const handleOpenCheckInModal = useCallback((goal: Goal) => {
    setCheckInGoal(goal);
    setIsCheckInModalOpen(true);
  }, []);

  const handleCloseCheckInModal = useCallback(() => {
    setIsCheckInModalOpen(false);
    setCheckInGoal(null);
  }, []);

  // ─── History timeline handlers ────────────────────────────────────────────

  const handleOpenHistoryTimeline = useCallback((goal: Goal) => {
    setHistoryGoal(goal);
    setIsHistoryTimelineOpen(true);
  }, []);

  const handleCloseHistoryTimeline = useCallback(() => {
    setIsHistoryTimelineOpen(false);
    setHistoryGoal(null);
  }, []);

  // ─── Frequency modal handlers ─────────────────────────────────────────────

  const handleOpenFrequencyModal = useCallback((goal: Goal) => {
    setFrequencyGoal(goal);
    setIsFrequencyModalOpen(true);
  }, []);

  const handleCloseFrequencyModal = useCallback(() => {
    setIsFrequencyModalOpen(false);
    setFrequencyGoal(null);
  }, []);

  // ─── New button orchestration ─────────────────────────────────────────────

  const handleNewButtonClick = useCallback((viewMode: ViewMode) => {
    if (viewMode === 'goals') {
      // Open template selection modal for goals
      setIsTemplateModalOpen(true);
    } else if (viewMode === 'milestones') {
      handleOpenMilestoneModal();
    } else if (viewMode === 'habits') {
      handleOpenHabitModal();
    } else if (viewMode === 'activity') {
      // For activity view, default to creating a new goal
      setIsTemplateModalOpen(true);
    }
  }, [handleOpenMilestoneModal, handleOpenHabitModal]);

  return {
    // Goal modal
    isGoalModalOpen,
    setIsGoalModalOpen,
    editingGoal,
    setEditingGoal,
    handleOpenGoalModal,
    handleCloseGoalModal,
    handleEditGoal,

    // Milestone modal
    isMilestoneModalOpen,
    setIsMilestoneModalOpen,
    editingMilestone,
    setEditingMilestone,
    handleOpenMilestoneModal,
    handleCloseMilestoneModal,
    handleEditMilestone,

    // Habit modal
    isHabitModalOpen,
    setIsHabitModalOpen,
    editingHabit,
    setEditingHabit,
    handleOpenHabitModal,
    handleCloseHabitModal,

    // Template modal
    isTemplateModalOpen,
    setIsTemplateModalOpen,
    selectedTemplate,
    setSelectedTemplate,
    handleSelectTemplate,
    handleCloseTemplateModal,
    handleCreateFromScratch,

    // Check-in modal
    isCheckInModalOpen,
    setIsCheckInModalOpen,
    checkInGoal,
    setCheckInGoal,
    handleOpenCheckInModal,
    handleCloseCheckInModal,

    // History timeline
    isHistoryTimelineOpen,
    setIsHistoryTimelineOpen,
    historyGoal,
    setHistoryGoal,
    handleOpenHistoryTimeline,
    handleCloseHistoryTimeline,

    // Frequency modal
    isFrequencyModalOpen,
    setIsFrequencyModalOpen,
    frequencyGoal,
    setFrequencyGoal,
    handleOpenFrequencyModal,
    handleCloseFrequencyModal,

    // Confirm dialog
    confirmDialog,
    setConfirmDialog,

    // New button orchestration
    handleNewButtonClick,
  };
}
