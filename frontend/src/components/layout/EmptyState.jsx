import React from 'react';
import { Inbox } from 'lucide-react';

/* ================================================================== */
/*  EmptyState                                                         */
/* ================================================================== */
export function EmptyState({
  icon: Icon = Inbox,
  title = 'Nothing here yet',
  description,
  action,
  illustration,
  className = '',
}) {
  const ActionIcon = action?.icon;

  return (
    <div
      className={[
        'flex flex-col items-center justify-center text-center py-16 px-6 animate-[fadeUp_500ms_ease-out]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Illustration or icon */}
      {illustration ? (
        <div className="mb-6">{illustration}</div>
      ) : (
        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center mb-5">
          <Icon className="w-8 h-8 text-slate-400 dark:text-slate-500" />
        </div>
      )}

      {/* Title */}
      <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-1">
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
          {description}
        </p>
      )}

      {/* Action button */}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium shadow-sm shadow-indigo-200 dark:shadow-indigo-900/30 transition-colors duration-200"
        >
          {ActionIcon && <ActionIcon className="w-4 h-4" />}
          {action.label}
        </button>
      )}
    </div>
  );
}

/* ================================================================== */
/*  EmptyState.Compact – smaller inline variant                        */
/* ================================================================== */
EmptyState.Compact = function CompactEmptyState({
  icon: CompactIcon = Inbox,
  message = 'No items',
  action,
  className = '',
}) {
  const CActionIcon = action?.icon;
  return (
    <div
      className={`flex flex-col items-center gap-2 py-8 text-center animate-[fadeUp_400ms_ease-out] ${className}`}
    >
      <CompactIcon className="w-6 h-6 text-slate-400 dark:text-slate-500" />
      <p className="text-xs text-slate-500 dark:text-slate-400">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors"
        >
          {CActionIcon && <CActionIcon className="w-3.5 h-3.5" />}
          {action.label}
        </button>
      )}
    </div>
  );
};

/* ---- Keyframes (injected once) ---- */
if (typeof document !== 'undefined') {
  const id = '__empty_state_kf__';
  if (!document.getElementById(id)) {
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      @keyframes fadeUp {
        from { opacity: 0; transform: translateY(16px) }
        to   { opacity: 1; transform: translateY(0) }
      }
    `;
    document.head.appendChild(style);
  }
}

export default EmptyState;
