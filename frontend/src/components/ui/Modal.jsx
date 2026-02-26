import React, { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Size mapping                                                       */
/* ------------------------------------------------------------------ */
const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)]',
};

/* ------------------------------------------------------------------ */
/*  Focus trap helper                                                  */
/* ------------------------------------------------------------------ */
const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

function useFocusTrap(ref, isOpen) {
  useEffect(() => {
    if (!isOpen || !ref.current) return;

    const el = ref.current;
    const previousFocus = document.activeElement;

    // focus first focusable child
    const first = el.querySelector(FOCUSABLE);
    first?.focus();

    const handler = (e) => {
      if (e.key !== 'Tab') return;
      const focusable = [...el.querySelectorAll(FOCUSABLE)];
      if (!focusable.length) return;

      const firstEl = focusable[0];
      const lastEl = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        }
      } else {
        if (document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };

    el.addEventListener('keydown', handler);
    return () => {
      el.removeEventListener('keydown', handler);
      previousFocus?.focus?.();
    };
  }, [isOpen, ref]);
}

/* ================================================================== */
/*  Modal                                                              */
/* ================================================================== */
export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  footer,
  showCloseButton = true,
  closeOnBackdrop = true,
  closeOnEscape = true,
  className = '',
}) {
  const overlayRef = useRef(null);
  const dialogRef = useRef(null);

  /* ---- Escape handler ---- */
  const handleKeyDown = useCallback(
    (e) => {
      if (closeOnEscape && e.key === 'Escape') {
        onClose?.();
      }
    },
    [closeOnEscape, onClose],
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener('keydown', handleKeyDown);
    // prevent body scroll
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prev;
    };
  }, [isOpen, handleKeyDown]);

  /* ---- Focus trap ---- */
  useFocusTrap(dialogRef, isOpen);

  /* ---- Backdrop click ---- */
  const handleBackdropClick = (e) => {
    if (closeOnBackdrop && e.target === overlayRef.current) {
      onClose?.();
    }
  };

  if (!isOpen) return null;

  const sizeClass = sizeClasses[size] || sizeClasses.md;

  const modal = (
    <div
      ref={overlayRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-[fadeIn_200ms_ease-out]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Dialog */}
      <div
        ref={dialogRef}
        className={[
          'relative w-full rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl flex flex-col overflow-hidden',
          'animate-[scaleIn_200ms_ease-out]',
          sizeClass,
          // full-screen on mobile for lg+ sizes
          (size === 'lg' || size === 'xl' || size === 'full') &&
            'sm:rounded-2xl max-sm:rounded-none max-sm:max-w-none max-sm:w-screen max-sm:h-screen max-sm:max-h-screen',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        style={{ maxHeight: size !== 'full' ? 'calc(100vh - 2rem)' : undefined }}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-slate-100 dark:border-slate-700/60 shrink-0">
            {title && (
              <h2
                id="modal-title"
                className="text-lg font-semibold text-slate-900 dark:text-white truncate"
              >
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

/* ---- Keyframe injection (once) ---- */
if (typeof document !== 'undefined') {
  const id = '__modal_keyframes__';
  if (!document.getElementById(id)) {
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0 }
        to   { opacity: 1 }
      }
      @keyframes scaleIn {
        from { opacity: 0; transform: scale(0.95) translateY(8px) }
        to   { opacity: 1; transform: scale(1) translateY(0) }
      }
    `;
    document.head.appendChild(style);
  }
}

export default Modal;
