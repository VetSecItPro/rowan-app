'use client';

import { memo, type ReactNode } from 'react';
import { Modal } from '@/components/ui/Modal';

interface DrillDownModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
}

/** Displays a modal overlay with a drill-down chart for detailed metric exploration. */
export const DrillDownModal = memo(function DrillDownModal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
}: DrillDownModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      maxWidth="3xl"
      testId="drill-down-modal"
    >
      {children}
    </Modal>
  );
});
