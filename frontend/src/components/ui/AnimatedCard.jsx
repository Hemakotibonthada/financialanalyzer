import React, { useState, useRef } from 'react';
import { Loader2 } from 'lucide-react';

const variantStyles = {
  default: {
    container:
      'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700',
    header: 'text-slate-900 dark:text-white',
    subtitle: 'text-slate-500 dark:text-slate-400',
  },
  gradient: {
    container:
      'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 border border-transparent text-white',
    header: 'text-white',
    subtitle: 'text-white/80',
  },
  glass: {
    container:
      'bg-white/30 dark:bg-slate-800/40 backdrop-blur-xl border border-white/20 dark:border-slate-600/30',
    header: 'text-slate-900 dark:text-white',
    subtitle: 'text-slate-600 dark:text-slate-300',
  },
  outline: {
    container:
      'bg-transparent border-2 border-dashed border-slate-300 dark:border-slate-600',
    header: 'text-slate-900 dark:text-white',
    subtitle: 'text-slate-500 dark:text-slate-400',
  },
};

const sizeStyles = {
  compact: 'p-4',
  full: 'p-6',
};

/* ------------------------------------------------------------------ */
/*  Skeleton loader shown when content is still loading                */
/* ------------------------------------------------------------------ */
function CardSkeleton({ size = 'full' }) {
  const padding = sizeStyles[size] || sizeStyles.full;
  return (
    <div
      className={`${padding} rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 animate-pulse`}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-1/3 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-3 w-1/2 rounded bg-slate-200 dark:bg-slate-700" />
        </div>
      </div>
      <div className="space-y-3">
        <div className="h-3 w-full rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-3 w-5/6 rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-3 w-2/3 rounded bg-slate-200 dark:bg-slate-700" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  AnimatedCard                                                       */
/* ------------------------------------------------------------------ */
export function AnimatedCard({
  title,
  subtitle,
  icon: Icon,
  children,
  variant = 'default',
  size = 'full',
  onClick,
  className = '',
  animate = true,
  badge,
  loading = false,
  gradientBorder = false,
  headerRight,
}) {
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef(null);
  const styles = variantStyles[variant] || variantStyles.default;
  const padding = sizeStyles[size] || sizeStyles.full;

  /* ---- loading ---- */
  if (loading) {
    return <CardSkeleton size={size} />;
  }

  /* ---- tilt / perspective on mouse move ---- */
  const handleMouseMove = (e) => {
    if (!animate || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 8;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -8;
    cardRef.current.style.transform = `perspective(800px) rotateY(${x}deg) rotateX(${y}deg) scale(1.02)`;
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (cardRef.current) {
      cardRef.current.style.transform =
        'perspective(800px) rotateY(0deg) rotateX(0deg) scale(1)';
    }
  };

  /* ---- wrapper for gradient-border variant ---- */
  const wrapWithGradientBorder = (node) => {
    if (!gradientBorder) return node;
    return (
      <div className="p-[2px] rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
        {node}
      </div>
    );
  };

  const card = (
    <div
      ref={cardRef}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick(e);
        }
      }}
      className={[
        'rounded-2xl transition-all duration-300 ease-out',
        padding,
        styles.container,
        animate && 'hover:shadow-xl hover:shadow-slate-200/40 dark:hover:shadow-slate-900/50',
        onClick && 'cursor-pointer select-none',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ willChange: animate ? 'transform' : undefined }}
    >
      {/* ---- Header ---- */}
      {(title || Icon || badge) && (
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            {Icon && (
              <div
                className={[
                  'flex items-center justify-center shrink-0 rounded-xl transition-colors duration-300',
                  size === 'compact' ? 'w-9 h-9' : 'w-10 h-10',
                  variant === 'gradient'
                    ? 'bg-white/20'
                    : 'bg-indigo-50 dark:bg-indigo-500/10',
                ].join(' ')}
              >
                <Icon
                  className={[
                    size === 'compact' ? 'w-4 h-4' : 'w-5 h-5',
                    variant === 'gradient'
                      ? 'text-white'
                      : 'text-indigo-600 dark:text-indigo-400',
                  ].join(' ')}
                />
              </div>
            )}
            <div className="min-w-0">
              {title && (
                <h3
                  className={[
                    'font-semibold truncate',
                    size === 'compact' ? 'text-sm' : 'text-base',
                    styles.header,
                  ].join(' ')}
                >
                  {title}
                </h3>
              )}
              {subtitle && (
                <p
                  className={[
                    'text-xs truncate mt-0.5',
                    styles.subtitle,
                  ].join(' ')}
                >
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {badge && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                {badge}
              </span>
            )}
            {headerRight}
          </div>
        </div>
      )}

      {/* ---- Body ---- */}
      {children}

      {/* ---- Hover shimmer overlay ---- */}
      {animate && isHovered && (
        <div className="pointer-events-none absolute inset-0 rounded-2xl overflow-hidden">
          <div className="absolute -inset-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        </div>
      )}
    </div>
  );

  return wrapWithGradientBorder(card);
}

/* ------------------------------------------------------------------ */
/*  AnimatedCard.Skeleton – standalone skeleton export                  */
/* ------------------------------------------------------------------ */
AnimatedCard.Skeleton = CardSkeleton;

export default AnimatedCard;
