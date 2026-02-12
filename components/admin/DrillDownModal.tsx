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
