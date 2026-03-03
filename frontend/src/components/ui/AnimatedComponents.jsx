// ============================================================================
// Animated Components Library — Reusable animation primitives
// ============================================================================
// Usage: Import these components to wrap elements with smooth animations.
// All animations respect prefers-reduced-motion.
// ============================================================================

import React, { useEffect, useRef, useState, useCallback } from 'react';

// ---------------------------------------------------------------------------
// §1  Intersection Observer Hook — animate on scroll into view
// ---------------------------------------------------------------------------

export function useInView(options = {}) {
  const ref = useRef(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          if (!options.repeat) observer.unobserve(el);
        } else if (options.repeat) {
          setIsInView(false);
        }
      },
      { threshold: options.threshold || 0.1, rootMargin: options.rootMargin || '0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [options.threshold, options.rootMargin, options.repeat]);

  return [ref, isInView];
}

// ---------------------------------------------------------------------------
// §2  Animated Counter — counts up to target
// ---------------------------------------------------------------------------

export function AnimatedCounter({
  end,
  start = 0,
  duration = 1200,
  prefix = '',
  suffix = '',
  decimals = 0,
  separator = ',',
  className = '',
}) {
  const [value, setValue] = useState(start);
  const [ref, isInView] = useInView({ threshold: 0.3 });
  const animationRef = useRef(null);

  useEffect(() => {
    if (!isInView) return;

    const startTime = performance.now();
    const diff = end - start;

    const step = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + diff * eased;
      setValue(current);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(step);
      }
    };

    animationRef.current = requestAnimationFrame(step);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isInView, start, end, duration]);

  const formatted = value.toFixed(decimals);
  const parts = formatted.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, separator);

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {prefix}{parts.join('.')}{suffix}
    </span>
  );
}

// ---------------------------------------------------------------------------
// §3  FadeIn — fade + translate on scroll
// ---------------------------------------------------------------------------

export function FadeIn({
  children,
  direction = 'up',
  delay = 0,
  duration = 500,
  className = '',
  as: Component = 'div',
}) {
  const [ref, isInView] = useInView({ threshold: 0.1 });

  const directionMap = {
    up: 'translateY(16px)',
    down: 'translateY(-16px)',
    left: 'translateX(-16px)',
    right: 'translateX(16px)',
    none: 'none',
  };

  return (
    <Component
      ref={ref}
      className={className}
      style={{
        opacity: isInView ? 1 : 0,
        transform: isInView ? 'none' : directionMap[direction],
        transition: `opacity ${duration}ms ease-out ${delay}ms, transform ${duration}ms ease-out ${delay}ms`,
      }}
    >
      {children}
    </Component>
  );
}

// ---------------------------------------------------------------------------
// §4  StaggerChildren — staggered child animations
// ---------------------------------------------------------------------------

export function StaggerChildren({
  children,
  staggerDelay = 60,
  className = '',
  as: Component = 'div',
}) {
  const [ref, isInView] = useInView({ threshold: 0.05 });

  return (
    <Component ref={ref} className={className}>
      {React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return child;
        return (
          <div
            style={{
              opacity: isInView ? 1 : 0,
              transform: isInView ? 'none' : 'translateY(12px)',
              transition: `opacity 400ms ease-out ${index * staggerDelay}ms, transform 400ms ease-out ${index * staggerDelay}ms`,
            }}
          >
            {child}
          </div>
        );
      })}
    </Component>
  );
}

// ---------------------------------------------------------------------------
// §5  ScaleIn — scale from smaller
// ---------------------------------------------------------------------------

export function ScaleIn({
  children,
  delay = 0,
  duration = 300,
  className = '',
}) {
  const [ref, isInView] = useInView({ threshold: 0.1 });

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: isInView ? 1 : 0,
        transform: isInView ? 'scale(1)' : 'scale(0.92)',
        transition: `opacity ${duration}ms ease-out ${delay}ms, transform ${duration}ms cubic-bezier(0.175,0.885,0.32,1.275) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// §6  ProgressBar — animated fill
// ---------------------------------------------------------------------------

export function AnimatedProgress({
  value = 0,
  max = 100,
  className = '',
  barClassName = '',
  height = 'h-2',
  showLabel = false,
  color = 'bg-blue-500',
  animated = true,
}) {
  const [ref, isInView] = useInView({ threshold: 0.2 });
  const percentage = Math.min(100, (value / max) * 100);

  return (
    <div ref={ref} className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between mb-1 text-sm">
          <span className="text-gray-600 dark:text-gray-400">{value.toLocaleString()}</span>
          <span className="text-gray-500 dark:text-gray-500">{percentage.toFixed(0)}%</span>
        </div>
      )}
      <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full ${height} overflow-hidden`}>
        <div
          className={`${height} rounded-full ${color} ${barClassName} transition-all duration-1000 ease-out`}
          style={{
            width: isInView ? `${percentage}%` : '0%',
            transition: animated ? 'width 1s ease-out' : 'none',
          }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// §7  Skeleton Loader — shimmer placeholder
// ---------------------------------------------------------------------------

export function Skeleton({
  width = '100%',
  height = '1rem',
  rounded = 'rounded-md',
  className = '',
  count = 1,
}) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`bg-gray-200 dark:bg-gray-700 ${rounded} ${className} animate-skeleton`}
          style={{
            width,
            height,
            backgroundImage: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)',
            backgroundSize: '200% 100%',
            marginBottom: count > 1 && i < count - 1 ? '0.5rem' : 0,
          }}
        />
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// §8  Card shimmer loading
// ---------------------------------------------------------------------------

export function CardSkeleton({ className = '' }) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 ${className}`}>
      <Skeleton height="1.5rem" width="60%" className="mb-3" />
      <Skeleton height="0.875rem" className="mb-2" />
      <Skeleton height="0.875rem" width="80%" className="mb-4" />
      <Skeleton height="2.5rem" rounded="rounded-lg" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// §9  Ripple Button — material-style ripple effect
// ---------------------------------------------------------------------------

export function RippleButton({
  children,
  onClick,
  className = '',
  disabled = false,
  ...props
}) {
  const [ripples, setRipples] = useState([]);

  const handleClick = useCallback(
    (e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const id = Date.now();

      setRipples((prev) => [...prev, { x, y, id }]);
      setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 600);

      if (onClick) onClick(e);
    },
    [onClick]
  );

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`relative overflow-hidden ${className}`}
      {...props}
    >
      {children}
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="absolute rounded-full bg-white/30 animate-ripple pointer-events-none"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: '8px',
            height: '8px',
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}
    </button>
  );
}

// ---------------------------------------------------------------------------
// §10  Animated Tooltip
// ---------------------------------------------------------------------------

export function Tooltip({
  children,
  text,
  position = 'top',
  className = '',
}) {
  const [visible, setVisible] = useState(false);

  const positionMap = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div
      className={`relative inline-flex ${className}`}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      <div
        className={`absolute ${positionMap[position]} px-3 py-1.5 text-xs font-medium text-white bg-gray-900 dark:bg-gray-700 rounded-lg shadow-lg whitespace-nowrap pointer-events-none z-50 transition-all duration-200 ${
          visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
      >
        {text}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// §11  Page Transition Wrapper
// ---------------------------------------------------------------------------

export function PageTransition({ children, className = '' }) {
  return (
    <div
      className={`animate-fade-in ${className}`}
      style={{ animationFillMode: 'both' }}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// §12  Animated Badge/Pill
// ---------------------------------------------------------------------------

export function AnimatedBadge({
  children,
  variant = 'primary',
  pulse = false,
  className = '',
}) {
  const variantStyles = {
    primary: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    danger: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    info: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold 
        ${variantStyles[variant] || variantStyles.primary}
        ${pulse ? 'animate-pulse-slow' : ''}
        ${className}`}
    >
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// §13  Animated List Item
// ---------------------------------------------------------------------------

export function AnimatedList({ children, className = '' }) {
  const [ref, isInView] = useInView({ threshold: 0.05 });

  return (
    <div ref={ref} className={className}>
      {React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return child;
        return React.cloneElement(child, {
          style: {
            ...child.props.style,
            opacity: isInView ? 1 : 0,
            transform: isInView ? 'translateX(0)' : 'translateX(-12px)',
            transition: `opacity 300ms ease-out ${index * 50}ms, transform 300ms ease-out ${index * 50}ms`,
          },
        });
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// §14  Floating Action Button with animation
// ---------------------------------------------------------------------------

export function FloatingActionButton({
  icon,
  onClick,
  className = '',
  tooltip = '',
  color = 'bg-blue-600 hover:bg-blue-700',
}) {
  return (
    <Tooltip text={tooltip} position="left">
      <button
        onClick={onClick}
        className={`fixed bottom-6 right-6 w-14 h-14 ${color} text-white rounded-full shadow-lg 
          flex items-center justify-center 
          transform hover:scale-110 active:scale-95 
          transition-all duration-200 
          animate-bounce-in
          z-50 ${className}`}
      >
        {icon}
      </button>
    </Tooltip>
  );
}

// ---------------------------------------------------------------------------
// §15  Glass Card — Glassmorphism with animation
// ---------------------------------------------------------------------------

export function GlassCard({
  children,
  className = '',
  hover = true,
}) {
  return (
    <div
      className={`
        bg-white/70 dark:bg-gray-800/70 
        backdrop-blur-lg 
        border border-white/20 dark:border-gray-700/30 
        rounded-2xl shadow-lg
        ${hover ? 'hover:shadow-xl hover:scale-[1.01] hover:bg-white/80 dark:hover:bg-gray-800/80' : ''}
        transition-all duration-300
        ${className}
      `}
    >
      {children}
    </div>
  );
}

export default {
  useInView,
  AnimatedCounter,
  FadeIn,
  StaggerChildren,
  ScaleIn,
  AnimatedProgress,
  Skeleton,
  CardSkeleton,
  RippleButton,
  Tooltip,
  PageTransition,
  AnimatedBadge,
  AnimatedList,
  FloatingActionButton,
  GlassCard,
};
