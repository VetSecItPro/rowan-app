import {
  FileText,
  Calendar,
  CheckSquare,
  ShoppingCart,
  MessageSquare,
  Target,
  Bell,
  Utensils,
  DollarSign,
  type LucideIcon,
} from 'lucide-react'

const iconMap: Record<string, LucideIcon> = {
  FileText,
  Calendar,
  CheckSquare,
  ShoppingCart,
  MessageSquare,
  Target,
  Bell,
  Utensils,
  DollarSign,
}

export function getIconComponent(iconName: string): LucideIcon {
  return iconMap[iconName] || FileText
}

export const colorClasses: Record<string, { bg: string; text: string; border: string; gradient: string }> = {
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', gradient: 'from-emerald-500 to-teal-500' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20', gradient: 'from-purple-500 to-indigo-500' },
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', gradient: 'from-blue-500 to-cyan-500' },
  green: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20', gradient: 'from-green-500 to-emerald-500' },
  indigo: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20', gradient: 'from-indigo-500 to-purple-500' },
  pink: { bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/20', gradient: 'from-pink-500 to-rose-500' },
  orange: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20', gradient: 'from-orange-500 to-amber-500' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', gradient: 'from-amber-500 to-yellow-500' },
}
