import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}
    >
      {Icon && (
        <div className="w-16 h-16 bg-gradient-to-br from-gray-400 from-gray-600 to-gray-700 rounded-2xl flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-white" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-white mb-2">
        {title}
      </h3>
      <p className="text-sm text-gray-400 max-w-md mb-6">
        {description}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all font-medium"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
