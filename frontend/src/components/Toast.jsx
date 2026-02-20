import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

const variantStyles = {
  success: 'bg-success/15 border-success/50 text-success',
  error: 'bg-danger/15 border-danger/50 text-danger',
  info: 'bg-accent/15 border-accent/50 text-accent',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, variant = 'info') => {
    const id = Date.now();
    const text = typeof message === 'string' ? message : String(message ?? '');
    setToasts((prev) => [...prev, { id, message: text, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, fading: true } : t)));
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 300);
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto px-4 py-3 rounded-xl border font-sans text-sm font-medium shadow-card transition-opacity duration-300 ${
              variantStyles[t.variant]
            } ${t.fading ? 'opacity-0' : 'opacity-100'}`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
