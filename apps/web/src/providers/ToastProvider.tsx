import React, { createContext, useContext, useState, useCallback, useId } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  success: (message: string, title?: string) => string;
  error: (message: string, title?: string) => string;
  warning: (message: string, title?: string) => string;
  info: (message: string, title?: string) => string;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idPrefix = useId();

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (toastData: Omit<Toast, 'id'>) => {
      const id = `${idPrefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newToast: Toast = { ...toastData, id };

      setToasts((prev) => [...prev, newToast]);

      const duration = toastData.duration ?? 5000;
      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }

      return id;
    },
    [idPrefix, removeToast]
  );

  const success = useCallback(
    (message: string, title?: string) => addToast({ type: 'success', message, title }),
    [addToast]
  );
  const error = useCallback(
    (message: string, title?: string) => addToast({ type: 'error', message, title }),
    [addToast]
  );
  const warning = useCallback(
    (message: string, title?: string) => addToast({ type: 'warning', message, title }),
    [addToast]
  );
  const info = useCallback(
    (message: string, title?: string) => addToast({ type: 'info', message, title }),
    [addToast]
  );

  return (
    <ToastContext.Provider
      value={{
        toasts,
        addToast,
        removeToast,
        success,
        error,
        warning,
        info,
      }}
    >
      {children}

      {/* Stacked Toast Viewport */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none print:hidden"
      >
        {toasts.map((toast) => {
          const typeStyles = {
            success: 'bg-emerald-50 text-emerald-900 border-emerald-200 icon-emerald',
            error: 'bg-rose-50 text-rose-900 border-rose-200 icon-rose',
            warning: 'bg-amber-50 text-amber-900 border-amber-200 icon-amber',
            info: 'bg-blue-50 text-blue-900 border-blue-200 icon-blue',
          }[toast.type];

          const IconComponent = {
            success: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />,
            error: <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />,
            warning: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />,
            info: <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />,
          }[toast.type];

          return (
            <div
              key={toast.id}
              role="alert"
              className={`pointer-events-auto flex items-start justify-between gap-3 p-3.5 rounded-lg border shadow-elevated transition-all duration-normal animate-in fade-in slide-in-from-bottom-2 ${typeStyles}`}
            >
              <div className="flex items-start gap-2.5 min-w-0">
                {IconComponent}
                <div className="space-y-0.5 text-xs">
                  {toast.title && <div className="font-semibold text-sm">{toast.title}</div>}
                  <p className="text-slate-700 leading-snug break-words">{toast.message}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-black/5 focus:outline-none transition-colors"
                aria-label="Close notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
