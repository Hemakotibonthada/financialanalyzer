import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';

export const useConfirm = () => {
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    onConfirm: null,
    variant: 'danger' // 'danger', 'warning', 'info'
  });

  const confirm = ({ 
    title = 'Confirm Action', 
    message = 'Are you sure?', 
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'danger'
  }) => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        title,
        message,
        confirmText,
        cancelText,
        variant,
        onConfirm: () => {
          setConfirmState(prev => ({ ...prev, isOpen: false }));
          resolve(true);
        },
        onCancel: () => {
          setConfirmState(prev => ({ ...prev, isOpen: false }));
          resolve(false);
        }
      });
    });
  };

  const ConfirmDialog = () => {
    if (!confirmState.isOpen) return null;

    const variantStyles = {
      danger: {
        header: 'bg-gradient-to-r from-red-500 to-red-600',
        button: 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
      },
      warning: {
        header: 'bg-gradient-to-r from-yellow-500 to-yellow-600',
        button: 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700'
      },
      info: {
        header: 'bg-gradient-to-r from-blue-500 to-blue-600',
        button: 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
      }
    };

    const styles = variantStyles[confirmState.variant] || variantStyles.danger;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-scale-in">
          <div className={`${styles.header} px-6 py-4`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white">{confirmState.title}</h3>
            </div>
          </div>
          <div className="p-6">
            <p className="text-gray-700 text-base leading-relaxed">{confirmState.message}</p>
          </div>
          <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
            <button
              onClick={confirmState.onCancel}
              className="px-6 py-2.5 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 transition-colors font-medium"
            >
              {confirmState.cancelText}
            </button>
            <button
              onClick={confirmState.onConfirm}
              className={`px-6 py-2.5 ${styles.button} text-white rounded-xl transition-all shadow-md hover:shadow-lg font-medium`}
            >
              {confirmState.confirmText}
            </button>
          </div>
        </div>
        <style>{`
          @keyframes scale-in {
            from {
              opacity: 0;
              transform: scale(0.95);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
          .animate-scale-in {
            animation: scale-in 0.2s ease-out;
          }
        `}</style>
      </div>
    );
  };

  return { confirm, ConfirmDialog };
};
