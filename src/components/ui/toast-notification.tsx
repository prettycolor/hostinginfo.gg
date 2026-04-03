import { motion } from 'motion/react';
import { X, Zap, Trophy, Star, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ToastProps {
  type: 'xp' | 'levelup' | 'achievement' | 'success' | 'error' | 'info';
  title: string;
  description: string;
  icon?: string;
  xpAmount?: number;
  onDismiss: () => void;
}

export function ToastNotification({ type, title, description, icon, xpAmount, onDismiss }: ToastProps) {
  // Color schemes for different toast types
  const styles = {
    xp: {
      bg: 'bg-blue-500/95',
      border: 'border-blue-400/50',
      icon: <Zap className="w-5 h-5" />,
      emoji: '⚡',
    },
    levelup: {
      bg: 'bg-purple-500/95',
      border: 'border-purple-400/50',
      icon: <Star className="w-5 h-5" />,
      emoji: '🎉',
    },
    achievement: {
      bg: 'bg-amber-500/95',
      border: 'border-amber-400/50',
      icon: <Trophy className="w-5 h-5" />,
      emoji: '🏆',
    },
    success: {
      bg: 'bg-green-500/95',
      border: 'border-green-400/50',
      icon: <CheckCircle className="w-5 h-5" />,
      emoji: '✓',
    },
    error: {
      bg: 'bg-red-500/95',
      border: 'border-red-400/50',
      icon: <AlertCircle className="w-5 h-5" />,
      emoji: '✕',
    },
    info: {
      bg: 'bg-slate-500/95',
      border: 'border-slate-400/50',
      icon: <Info className="w-5 h-5" />,
      emoji: 'ℹ',
    },
  }[type];

  return (
    <motion.div
      initial={{ opacity: 0, x: 100, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={cn(
        'backdrop-blur-md text-white rounded-lg shadow-2xl border',
        'min-w-[320px] max-w-[400px] p-4',
        styles.bg,
        styles.border
      )}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0">
          {icon ? (
            <div className="text-2xl">{icon}</div>
          ) : (
            <div className="text-white/90">{styles.icon}</div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-bold text-sm leading-tight">{title}</h4>
            <button
              onClick={onDismiss}
              className="flex-shrink-0 text-white/70 hover:text-white transition-colors"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-white/90 mt-1 leading-relaxed">{description}</p>
          
          {/* XP Amount */}
          {xpAmount && (
            <div className="mt-2 flex items-center gap-1">
              <Zap className="w-3 h-3" />
              <span className="text-xs font-bold">+{xpAmount} XP</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
