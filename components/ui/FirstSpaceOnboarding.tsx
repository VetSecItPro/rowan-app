'use client';

import React from 'react';

interface FirstSpaceOnboardingProps {
  userName?: string;
  onSpaceCreated?: (spaceId: string, spaceName: string) => Promise<void>;
  onSkip?: () => void;
}

export function FirstSpaceOnboarding({ userName, onSpaceCreated, onSkip }: FirstSpaceOnboardingProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 from-gray-900 to-gray-800">
      <div className="max-w-md mx-auto text-center p-8">
        <h1 className="text-2xl font-bold text-white mb-4">
          Welcome to Rowan
        </h1>
        <p className="text-gray-400 mb-6">
          Create your first space to get started organizing your life.
        </p>
        <button className="btn btn-primary w-full">
          Create Your First Space
        </button>
      </div>
    </div>
  );
}