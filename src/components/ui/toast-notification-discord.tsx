import { motion } from 'motion/react';
import { X, Zap, CheckCircle, XCircle, Info, AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

export interface ToastNotificationDiscordProps {
  id: string;
  type: 'xp' | 'levelup' | 'achievement' | 'success' | 'error' | 'info' | 'warning';
  title: string;
  description?: string;
  xpAmount?: number;
  duration?: number;
  onDismiss: () => void;
}

export function ToastNotificationDiscord({
  type,
  title,
  description,
  xpAmount,
  duration = 5000,
  onDismiss,
}: ToastNotificationDiscordProps) {
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);

      if (remaining === 0) {
        clearInterval(interval);
        onDismiss();
      }
    }, 16);

    return () => clearInterval(interval);
  }, [duration, onDismiss, isPaused]);

  const getTypeStyles = () => {
    switch (type) {
      case 'xp':
        return {
          bg: 'bg-[#5865F2]', // Discord blurple
          icon: <Zap className="w-5 h-5 text-white" />,
          accentBar: 'bg-[#5865F2]',
        };
      case 'levelup':
        return {
          bg: 'bg-[#5865F2]',
          icon: <span className="text-xl">🎉</span>,
          accentBar: 'bg-[#5865F2]',
        };
      case 'achievement':
        return {
          bg: 'bg-[#FEE75C]', // Discord yellow
          icon: <span className="text-xl">🏆</span>,
          accentBar: 'bg-[#FEE75C]',
        };
      case 'success':
        return {
          bg: 'bg-[#3BA55D]', // Discord green
          icon: <CheckCircle className="w-5 h-5 text-white" />,
          accentBar: 'bg-[#3BA55D]',
        };
      case 'error':
        return {
          bg: 'bg-[#ED4245]', // Discord red
          icon: <XCircle className="w-5 h-5 text-white" />,
          accentBar: 'bg-[#ED4245]',
        };
      case 'warning':
        return {
          bg: 'bg-[#FEE75C]',
          icon: <AlertCircle className="w-5 h-5 text-[#2C2F33]" />,
          accentBar: 'bg-[#FEE75C]',
        };
      case 'info':
      default:
        return {
          bg: 'bg-[#99AAB5]', // Discord gray
          icon: <Info className="w-5 h-5 text-white" />,
          accentBar: 'bg-[#99AAB5]',
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <motion.div
      initial={{ opacity: 0, x: 100, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="relative w-80 bg-[#2C2F33] rounded-lg shadow-2xl overflow-hidden"
      style={{
        boxShadow: '0 8px 16px rgba(0, 0, 0, 0.4)',
      }}
    >
      {/* Accent bar on left */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${styles.accentBar}`} />

      {/* Main content */}
      <div className="pl-4 pr-3 py-3 flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          {styles.icon}
        </div>

        {/* Text content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-white mb-0.5">
                {title}
              </h4>
              {description && (
                <p className="text-xs text-[#B9BBBE] leading-relaxed">
                  {description}
                </p>
              )}
              {xpAmount && (
                <div className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 bg-[#202225] rounded text-xs font-medium text-[#FEE75C]">
                  <Zap className="w-3 h-3" />
                  <span>+{xpAmount} XP</span>
                </div>
              )}
            </div>

            {/* Close button */}
            <button
              onClick={onDismiss}
              className="flex-shrink-0 p-1 hover:bg-[#36393F] rounded transition-colors"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4 text-[#B9BBBE] hover:text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-[#202225]">
        <motion.div
          className={`h-full ${styles.accentBar} opacity-60`}
          initial={{ width: '100%' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.1, ease: 'linear' }}
        />
      </div>
    </motion.div>
  );
}
