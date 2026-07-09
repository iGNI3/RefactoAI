import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

const ICONS = {
  success: <CheckCircle size={18} className="text-emerald-400 shrink-0" />,
  error: <XCircle size={18} className="text-red-400 shrink-0" />,
  warning: <AlertTriangle size={18} className="text-yellow-400 shrink-0" />,
  info: <CheckCircle size={18} className="text-[#519aba] shrink-0" />,
};

const COLORS = {
  success: 'border-emerald-500/40',
  error: 'border-red-500/40',
  warning: 'border-yellow-500/40',
  info: 'border-[#519aba]/40',
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Animate in
    requestAnimationFrame(() => setVisible(true));
    // Auto-dismiss after 4s
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(toast.id), 300);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div
      className={`flex items-start gap-3 bg-[#1e1e1e] border ${COLORS[toast.type]} rounded-xl p-4 shadow-2xl min-w-[280px] max-w-[380px] transition-all duration-300 ${
        visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
      }`}
    >
      {ICONS[toast.type]}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-white">{toast.title}</p>
        {toast.message && <p className="text-[12px] text-white/50 mt-0.5 leading-relaxed">{toast.message}</p>}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-white/30 hover:text-white/80 transition-colors shrink-0 mt-0.5"
      >
        <X size={14} />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-[200]">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

// Hook for managing toasts
let _addToast: ((toast: Omit<ToastMessage, 'id'>) => void) | null = null;

export function useToasts() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = React.useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { ...toast, id }]);
  }, []);

  const dismissToast = React.useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Register globally so non-React code can call it
  useEffect(() => {
    _addToast = addToast;
    return () => { _addToast = null; };
  }, [addToast]);

  return { toasts, addToast, dismissToast };
}

// Global toast trigger (can be called from anywhere)
export function toast(t: Omit<ToastMessage, 'id'>) {
  _addToast?.(t);
}
