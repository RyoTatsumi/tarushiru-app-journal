'use client';

import React, { useState, useCallback, createContext, useContext } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ConfirmOptions {
  message: string;
  onConfirm: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
}

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  showConfirm: (options: ConfirmOptions) => void;
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
  showConfirm: () => {},
});

export const useToast = () => useContext(ToastContext);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirm, setConfirm] = useState<ConfirmOptions | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const showConfirm = useCallback((options: ConfirmOptions) => {
    setConfirm(options);
  }, []);

  const handleConfirm = () => {
    confirm?.onConfirm();
    setConfirm(null);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const icons = {
    success: <CheckCircle2 size={18} className="text-green-500 shrink-0" />,
    error: <AlertCircle size={18} className="text-red-500 shrink-0" />,
    info: <Info size={18} className="text-blue-500 shrink-0" />,
  };

  return (
    <ToastContext.Provider value={{ showToast, showConfirm }}>
      {children}

      {/* Toast notifications */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center space-y-2 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className="pointer-events-auto bg-white rounded-xl shadow-lg border border-gray-100 px-4 py-3 flex items-center space-x-3 animate-in slide-in-from-top-2 fade-in min-w-[260px] max-w-[360px]"
          >
            {icons[toast.type]}
            <span className="text-sm text-gray-700 flex-1">{toast.message}</span>
            <button onClick={() => removeToast(toast.id)} className="text-gray-300 hover:text-gray-500 shrink-0">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Confirm dialog */}
      {confirm && (
        <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConfirm(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full animate-in zoom-in-95 fade-in">
            <p className="text-sm text-gray-700 leading-relaxed mb-6">{confirm.message}</p>
            <div className="flex space-x-3">
              <button
                onClick={() => setConfirm(null)}
                className="flex-1 py-2.5 text-sm text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors font-medium"
              >
                {confirm.cancelLabel || 'キャンセル'}
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 py-2.5 text-sm text-white bg-navy-900 rounded-xl hover:bg-navy-800 transition-colors font-medium"
              >
                {confirm.confirmLabel || '確認'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
};
