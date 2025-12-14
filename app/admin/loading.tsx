'use client';

import { Shield } from 'lucide-react';

export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-600/20 rounded-2xl mb-4">
          <Shield className="w-8 h-8 text-emerald-500 animate-pulse" />
        </div>
        <div className="flex items-center gap-2 text-gray-400">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" />
        </div>
      </div>
    </div>
  );
}
