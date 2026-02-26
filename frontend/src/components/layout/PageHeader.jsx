import React from 'react';
import { ChevronRight, Home } from 'lucide-react';

/* ================================================================== */
/*  Breadcrumbs                                                        */
/* ================================================================== */
function Breadcrumbs({ items = [] }) {
  if (!items.length) return null;
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mb-2">
      <a
        href="/"
        className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        aria-label="Home"
      >
        <Home className="w-3.5 h-3.5" />
      </a>
      {items.map((item, i) => (
        <React.Fragment key={i}>
          <ChevronRight className="w-3 h-3 opacity-40 shrink-0" />
          {item.href ? (
            <a
              href={item.href}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors truncate max-w-[140px]"
            >
              {item.label}
            </a>
          ) : (
            <span className="text-slate-700 dark:text-slate-200 font-medium truncate max-w-[140px]">
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

/* ================================================================== */
/*  PageHeader                                                         */
/* ================================================================== */
export function PageHeader({
  title,
  subtitle,
  icon: Icon,
  actions = [],
  breadcrumbs,
  rightContent,
  className = '',
}) {
  return (
    <header
      className={[
        'mb-6 animate-[slideDown_400ms_ease-out]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Left: icon + text */}
        <div className="flex items-center gap-3 min-w-0">
          {Icon && (
            <div className="shrink-0 w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
              <Icon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right: actions or custom content */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {rightContent}
          {actions.map((action, i) => {
            const ActionIcon = action.icon;
            return (
              <button
                key={i}
                onClick={action.onClick}
                disabled={action.disabled}
                className={[
                  'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed',
                  action.variant === 'primary'
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200 dark:shadow-indigo-900/30'
                    : action.variant === 'danger'
                      ? 'bg-rose-600 hover:bg-rose-700 text-white'
                      : 'bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {ActionIcon && <ActionIcon className="w-4 h-4" />}
                {action.label}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}

/* ---- Keyframes (injected once) ---- */
if (typeof document !== 'undefined') {
  const id = '__page_header_kf__';
  if (!document.getElementById(id)) {
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      @keyframes slideDown {
        from { opacity: 0; transform: translateY(-12px) }
        to   { opacity: 1; transform: translateY(0) }
      }
    `;
    document.head.appendChild(style);
  }
}

export default PageHeader;
