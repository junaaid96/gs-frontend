'use client';

import { useEffect, useState } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

let toastId = 0;
const toasts: Toast[] = [];
const listeners: Set<() => void> = new Set();

export const showToast = (message: string, type: ToastType = 'info') => {
  const id = `toast-${++toastId}`;
  toasts.push({ id, message, type });
  listeners.forEach((listener) => listener());
  
  setTimeout(() => {
    const index = toasts.findIndex((t) => t.id === id);
    if (index > -1) {
      toasts.splice(index, 1);
      listeners.forEach((listener) => listener());
    }
  }, 3000);
};

export default function ToastContainer() {
  const [toastList, setToastList] = useState<Toast[]>([]);

  useEffect(() => {
    const updateToasts = () => {
      setToastList([...toasts]);
    };
    listeners.add(updateToasts);
    updateToasts();
    
    return () => {
      listeners.delete(updateToasts);
    };
  }, []);

  const getToastStyles = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  if (toastList.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toastList.map((toast) => (
        <div
          key={toast.id}
          className={`min-w-[300px] max-w-md px-4 py-3 rounded-lg shadow-lg border ${getToastStyles(
            toast.type
          )} animate-slide-in`}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{toast.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

