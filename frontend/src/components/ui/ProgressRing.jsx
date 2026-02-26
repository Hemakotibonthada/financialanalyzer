import React, { useEffect, useState, useId } from 'react';

/* ================================================================== */
/*  ProgressRing                                                       */
/* ================================================================== */
export function ProgressRing({
  value = 0,
  size = 120,
  strokeWidth = 10,
  color = '#6366f1',
  showValue = true,
  label,
  animate = true,
  className = '',
  gradientEnd,
}) {
  const uid = useId();
  const [displayValue, setDisplayValue] = useState(animate ? 0 : value);

  /* ---- animated draw-in ---- */
  useEffect(() => {
    if (!animate) {
      setDisplayValue(value);
      return;
    }
    let raf;
    const start = performance.now();
    const duration = 800;
    const from = 0;
    const to = Math.min(100, Math.max(0, value));

    const tick = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(from + (to - from) * eased);
      if (progress < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, animate]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (displayValue / 100) * circumference;
  const center = size / 2;

  const useGradient = !!gradientEnd;
  const gradientId = `progress-grad-${uid}`;

  return (
    <div
      className={`inline-flex flex-col items-center gap-1 ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <svg width={size} height={size} className="transform -rotate-90">
        {useGradient && (
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={color} />
              <stop offset="100%" stopColor={gradientEnd} />
            </linearGradient>
          </defs>
        )}

        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-slate-200 dark:text-slate-700"
          strokeWidth={strokeWidth}
        />

        {/* Foreground arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={useGradient ? `url(#${gradientId})` : color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            transition: animate ? 'none' : 'stroke-dashoffset 0.4s ease',
          }}
        />
      </svg>

      {/* Center text overlay */}
      {(showValue || label) && (
        <div
          className="absolute flex flex-col items-center justify-center"
          style={{ width: size, height: size }}
        >
          {showValue && (
            <span className="text-lg font-bold text-slate-900 dark:text-white leading-none">
              {Math.round(displayValue)}%
            </span>
          )}
          {label && (
            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 uppercase tracking-wide">
              {label}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/* ---- Convenience size presets ---- */
ProgressRing.Small = (props) => (
  <ProgressRing size={64} strokeWidth={6} {...props} />
);
ProgressRing.Large = (props) => (
  <ProgressRing size={160} strokeWidth={14} {...props} />
);

export default ProgressRing;
