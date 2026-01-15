'use client';

interface UserAvatarProps {
  name: string;
  colorTheme?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  xs: 'w-5 h-5 text-[9px]',
  sm: 'w-6 h-6 text-[10px]',
  md: 'w-8 h-8 text-xs',
  lg: 'w-10 h-10 text-sm',
};

const colorThemes = {
  emerald: 'bg-emerald-500 ring-emerald-800',
  blue: 'bg-blue-500 ring-blue-800',
  purple: 'bg-purple-500 ring-purple-800',
  pink: 'bg-pink-500 ring-pink-800',
  orange: 'bg-orange-500 ring-orange-800',
  rose: 'bg-rose-500 ring-rose-800',
  cyan: 'bg-cyan-500 ring-cyan-800',
  amber: 'bg-amber-500 ring-amber-800',
};

export function UserAvatar({ name, colorTheme = 'purple', size = 'sm', className = '' }: UserAvatarProps) {
  // Get initials (first letter of first and last name)
  const getInitials = (fullName: string) => {
    const parts = fullName.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const initials = getInitials(name);
  const colorClass = colorThemes[colorTheme as keyof typeof colorThemes] || colorThemes.purple;
  const sizeClass = sizeClasses[size];

  return (
    <div
      className={`${sizeClass} ${colorClass} rounded-full flex items-center justify-center text-white font-semibold ring-2 shadow-sm ${className}`}
    >
      {initials}
    </div>
  );
}
