'use client';

import { useEffect, useState } from 'react';

export type ModalType = 'alert' | 'confirm' | 'info' | 'warning' | 'error' | 'success';

interface Modal {
  id: string;
  type: ModalType;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

let modalId = 0;
const modals: Modal[] = [];
const listeners: Set<() => void> = new Set();

export const showAlert = (
  title: string,
  message: string,
  type: ModalType = 'info'
): Promise<void> => {
  return new Promise((resolve) => {
    const id = `modal-${++modalId}`;
    modals.push({
      id,
      type,
      title,
      message,
      confirmText: 'OK',
      onConfirm: () => {
        removeModal(id);
        resolve();
      },
    });
    listeners.forEach((listener) => listener());
  });
};

export const showConfirm = (
  title: string,
  message: string,
  type: ModalType = 'confirm'
): Promise<boolean> => {
  return new Promise((resolve) => {
    const id = `modal-${++modalId}`;
    modals.push({
      id,
      type,
      title,
      message,
      confirmText: 'Confirm',
      cancelText: 'Cancel',
      onConfirm: () => {
        removeModal(id);
        resolve(true);
      },
      onCancel: () => {
        removeModal(id);
        resolve(false);
      },
    });
    listeners.forEach((listener) => listener());
  });
};

const removeModal = (id: string) => {
  const index = modals.findIndex((m) => m.id === id);
  if (index > -1) {
    modals.splice(index, 1);
    listeners.forEach((listener) => listener());
  }
};

export default function ModalContainer() {
  const [modalList, setModalList] = useState<Modal[]>([]);

  useEffect(() => {
    const updateModals = () => {
      setModalList([...modals]);
    };
    listeners.add(updateModals);
    updateModals();

    return () => {
      listeners.delete(updateModals);
    };
  }, []);

  useEffect(() => {
    // Prevent body scroll when modal is open
    if (modalList.length > 0) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [modalList.length]);

  if (modalList.length === 0) return null;

  return (
    <>
      {modalList.map((modal) => (
        <ModalComponent key={modal.id} modal={modal} />
      ))}
    </>
  );
}

function ModalComponent({ modal }: { modal: Modal }) {
  const getModalStyles = (type: ModalType) => {
    switch (type) {
      case 'success':
        return {
          icon: '✓',
          iconBg: 'bg-green-100',
          iconColor: 'text-green-600',
          titleColor: 'text-green-900',
          borderColor: 'border-green-200',
        };
      case 'error':
        return {
          icon: '✕',
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
          titleColor: 'text-red-900',
          borderColor: 'border-red-200',
        };
      case 'warning':
        return {
          icon: '⚠',
          iconBg: 'bg-yellow-100',
          iconColor: 'text-yellow-600',
          titleColor: 'text-yellow-900',
          borderColor: 'border-yellow-200',
        };
      case 'confirm':
        return {
          icon: '?',
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600',
          titleColor: 'text-blue-900',
          borderColor: 'border-blue-200',
        };
      default:
        return {
          icon: 'ℹ',
          iconBg: 'bg-indigo-100',
          iconColor: 'text-indigo-600',
          titleColor: 'text-indigo-900',
          borderColor: 'border-indigo-200',
        };
    }
  };

  const styles = getModalStyles(modal.type);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && modal.type === 'alert') {
      modal.onConfirm?.();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (modal.type === 'alert') {
          modal.onConfirm?.();
        } else {
          modal.onCancel?.();
        }
      } else if (e.key === 'Enter' && modal.onConfirm) {
        e.preventDefault();
        modal.onConfirm();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modal.id, modal.type]);

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      onClick={handleBackdropClick}
    >
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 transition-opacity"></div>

        {/* Modal */}
        <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full transform transition-all animate-modal-in">
          {/* Header */}
          <div className={`px-6 py-4 border-b ${styles.borderColor}`}>
            <div className="flex items-center">
              <div
                className={`flex-shrink-0 w-10 h-10 ${styles.iconBg} rounded-full flex items-center justify-center mr-4`}
              >
                <span className={`text-xl font-bold ${styles.iconColor}`}>{styles.icon}</span>
              </div>
              <h3 className={`text-lg font-semibold ${styles.titleColor}`}>{modal.title}</h3>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-4">
            <p className="text-gray-700 text-sm leading-relaxed">{modal.message}</p>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 rounded-b-xl flex justify-end gap-3">
            {modal.type === 'confirm' && modal.onCancel && (
              <button
                onClick={modal.onCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                {modal.cancelText || 'Cancel'}
              </button>
            )}
            <button
              onClick={modal.onConfirm}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
                modal.type === 'success'
                  ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                  : modal.type === 'error'
                  ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                  : modal.type === 'warning'
                  ? 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500'
                  : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'
              }`}
            >
              {modal.confirmText || 'OK'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

