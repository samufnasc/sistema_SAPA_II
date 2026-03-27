'use client';

import { AlertTriangle, CheckCircle, Info, X, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type AlertType = 'success' | 'error' | 'warning' | 'info';

interface AlertProps {
  type: AlertType;
  title?: string;
  message: string;
  onClose?: () => void;
  className?: string;
}

const config: Record<AlertType, { icon: React.ReactNode; classes: string }> = {
  success: {
    icon: <CheckCircle className="w-5 h-5 text-green-600" />,
    classes: 'bg-green-50 border-green-200 text-green-800',
  },
  error: {
    icon: <XCircle className="w-5 h-5 text-red-600" />,
    classes: 'bg-red-50 border-red-200 text-red-800',
  },
  warning: {
    icon: <AlertTriangle className="w-5 h-5 text-yellow-600" />,
    classes: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  },
  info: {
    icon: <Info className="w-5 h-5 text-blue-600" />,
    classes: 'bg-blue-50 border-blue-200 text-blue-800',
  },
};

export function Alert({ type, title, message, onClose, className }: AlertProps) {
  const { icon, classes } = config[type];

  return (
    <div className={cn('flex items-start gap-3 p-4 rounded-lg border', classes, className)}>
      <span className="flex-shrink-0 mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        {title && <p className="font-semibold text-sm mb-0.5">{title}</p>}
        <p className="text-sm">{message}</p>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
