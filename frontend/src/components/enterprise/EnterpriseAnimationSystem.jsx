// ============================================================================
// ENTERPRISE ANIMATION SYSTEM — React Animation Utilities & Hooks
// ============================================================================
// Provides page transitions, micro-interactions, scroll animations, staggered
// entry, number counting, parallax, and motion-reduced accessibility support.
// ============================================================================

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// ============================================================================
// §1  MOTION PREFERENCES
// ============================================================================

const getMotionPreference = () => {
  if (typeof window === 'undefined') return true;
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

export const useMotionPreference = () => {
  const [motionAllowed, setMotionAllowed] = useState(getMotionPreference);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = () => setMotionAllowed(!mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return motionAllowed;
};

// ============================================================================
// §2  INTERSECTION OBSERVER HOOK
// ============================================================================

export const useInView = (options = {}) => {
  const { threshold = 0.1, rootMargin = '0px', triggerOnce = true } = options;
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (triggerOnce) observer.unobserve(el);
        } else if (!triggerOnce) {
          setInView(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin, triggerOnce]);

  return [ref, inView];
};

// ============================================================================
// §3  ANIMATED COUNTER HOOK
// ============================================================================

export const useAnimatedCounter = (end, duration = 1500, delay = 0) => {
  const [count, setCount] = useState(0);
  const motionAllowed = useMotionPreference();

  useEffect(() => {
    if (!motionAllowed) { setCount(end); return; }
    if (end === 0) { setCount(0); return; }

    let timer;
    const startTime = Date.now() + delay;
    const animate = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed < 0) { timer = requestAnimationFrame(animate); return; }
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(end * eased));
      if (progress < 1) timer = requestAnimationFrame(animate);
    };
    timer = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(timer);
  }, [end, duration, delay, motionAllowed]);

  return count;
};

// ============================================================================
// §4  STAGGER ANIMATION HOOK
// ============================================================================

export const useStaggerAnimation = (itemCount, baseDelay = 50, maxDelay = 500) => {
  const [visibleItems, setVisibleItems] = useState([]);
  const motionAllowed = useMotionPreference();

  useEffect(() => {
    if (!motionAllowed) {
      setVisibleItems(Array.from({ length: itemCount }, (_, i) => i));
      return;
    }

    const timers = [];
    setVisibleItems([]);
    for (let i = 0; i < itemCount; i++) {
      const delay = Math.min(i * baseDelay, maxDelay);
      timers.push(setTimeout(() => {
        setVisibleItems(prev => [...prev, i]);
      }, delay));
    }
    return () => timers.forEach(clearTimeout);
  }, [itemCount, baseDelay, maxDelay, motionAllowed]);

  return visibleItems;
};

// ============================================================================
// §5  SCROLL PROGRESS HOOK
// ============================================================================

export const useScrollProgress = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const docHeight = document.documentElement.scrollHeight - window.innerHeight;
          setProgress(docHeight > 0 ? window.scrollY / docHeight : 0);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return progress;
};

// ============================================================================
// §6  SPRING ANIMATION HOOK
// ============================================================================

export const useSpring = (target, config = {}) => {
  const { stiffness = 170, damping = 26, mass = 1, precision = 0.01 } = config;
  const [value, setValue] = useState(target);
  const velocityRef = useRef(0);
  const currentRef = useRef(target);
  const targetRef = useRef(target);
  const frameRef = useRef(null);

  useEffect(() => {
    targetRef.current = target;
    const animate = () => {
      const dt = 1 / 60;
      const displacement = currentRef.current - targetRef.current;
      const springForce = -stiffness * displacement;
      const dampForce = -damping * velocityRef.current;
      const acceleration = (springForce + dampForce) / mass;
      velocityRef.current += acceleration * dt;
      currentRef.current += velocityRef.current * dt;

      if (Math.abs(velocityRef.current) < precision && Math.abs(displacement) < precision) {
        currentRef.current = targetRef.current;
        velocityRef.current = 0;
        setValue(targetRef.current);
        return;
      }

      setValue(currentRef.current);
      frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [target, stiffness, damping, mass, precision]);

  return value;
};

// ============================================================================
// §7  HOVER / PRESS INTERACTION HOOK
// ============================================================================

export const useInteraction = () => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const handlers = useMemo(() => ({
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => { setIsHovered(false); setIsPressed(false); },
    onMouseDown: () => setIsPressed(true),
    onMouseUp: () => setIsPressed(false),
    onFocus: () => setIsFocused(true),
    onBlur: () => setIsFocused(false),
  }), []);

  const scale = isPressed ? 0.97 : isHovered ? 1.02 : 1;
  const brightness = isHovered ? 1.05 : 1;

  return { isHovered, isPressed, isFocused, handlers, scale, brightness };
};

// ============================================================================
// §8  PAGE TRANSITION WRAPPER COMPONENT
// ============================================================================

export const PageTransition = ({ children, className = '' }) => {
  const [mounted, setMounted] = useState(false);
  const motionAllowed = useMotionPreference();

  useEffect(() => {
    if (!motionAllowed) { setMounted(true); return; }
    requestAnimationFrame(() => setMounted(true));
  }, [motionAllowed]);

  return (
    <div
      className={`${className}`}
      style={{
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(12px)',
        transition: motionAllowed ? 'opacity 0.4s ease, transform 0.4s ease' : 'none',
      }}
    >
      {children}
    </div>
  );
};

// ============================================================================
// §9  ANIMATED CARD COMPONENT
// ============================================================================

export const AnimatedCard = ({
  children, className = '', delay = 0, hover = true, onClick,
}) => {
  const [ref, inView] = useInView({ threshold: 0.05, triggerOnce: true });
  const { handlers, scale } = useInteraction();
  const motionAllowed = useMotionPreference();

  const style = {
    opacity: inView ? 1 : 0,
    transform: `translateY(${inView ? 0 : 20}px) scale(${hover ? scale : 1})`,
    transition: motionAllowed
      ? `opacity 0.5s ease ${delay}ms, transform 0.3s ease ${inView ? '0ms' : `${delay}ms`}`
      : 'none',
  };

  return (
    <div
      ref={ref}
      className={`${className}`}
      style={style}
      {...(hover ? handlers : {})}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
};

// ============================================================================
// §10  ANIMATED LIST COMPONENT
// ============================================================================

export const AnimatedList = ({ children, className = '', stagger = 60 }) => {
  const items = Array.isArray(children) ? children : [children];
  const visibleItems = useStaggerAnimation(items.length, stagger);

  return (
    <div className={className}>
      {items.map((child, i) => (
        <div
          key={i}
          style={{
            opacity: visibleItems.includes(i) ? 1 : 0,
            transform: `translateX(${visibleItems.includes(i) ? 0 : -16}px)`,
            transition: `opacity 0.4s ease, transform 0.4s ease`,
          }}
        >
          {child}
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// §11  PROGRESS RING COMPONENT
// ============================================================================

export const ProgressRing = ({
  progress = 0, size = 80, strokeWidth = 6,
  color = '#3B82F6', bgColor = '#E5E7EB', label, sublabel,
  animate = true,
}) => {
  const animatedProgress = useAnimatedCounter(animate ? Math.min(100, Math.max(0, progress)) : 0, 1200);
  const displayProgress = animate ? animatedProgress : progress;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (displayProgress / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={bgColor} strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <div className="absolute flex flex-col items-center justify-center"
        style={{ width: size, height: size }}>
        {label && <span className="text-lg font-bold dark:text-white">{label}</span>}
        {sublabel && <span className="text-xs text-gray-500 dark:text-gray-400">{sublabel}</span>}
      </div>
    </div>
  );
};

// ============================================================================
// §12  SHIMMER / SKELETON LOADER
// ============================================================================

export const Shimmer = ({ width = '100%', height = 20, rounded = 'rounded-md', className = '' }) => (
  <div
    className={`${rounded} ${className} animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700`}
    style={{ width, height }}
  />
);

export const CardSkeleton = ({ lines = 3 }) => (
  <div className="p-6 rounded-2xl bg-white dark:bg-gray-800 shadow-sm space-y-4">
    <Shimmer width="60%" height={24} />
    {Array.from({ length: lines }).map((_, i) => (
      <Shimmer key={i} width={`${85 - i * 10}%`} height={16} />
    ))}
  </div>
);

// ============================================================================
// §13  TOOLTIP COMPONENT
// ============================================================================

export const Tooltip = ({ children, content, position = 'top' }) => {
  const [show, setShow] = useState(false);
  const posMap = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div className="relative inline-block"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div className={`absolute z-50 ${posMap[position]} px-3 py-1.5 text-xs font-medium text-white bg-gray-900 dark:bg-gray-700 rounded-lg whitespace-nowrap shadow-lg pointer-events-none`}
          style={{ animation: 'fadeIn 0.15s ease' }}>
          {content}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// §14  ANIMATED NUMBER DISPLAY
// ============================================================================

export const AnimatedNumber = ({
  value, prefix = '', suffix = '', duration = 1200,
  className = '', decimals = 0, compact = false,
}) => {
  const formatted = useAnimatedCounter(value || 0, duration);

  const display = useMemo(() => {
    if (compact && formatted >= 10000000) return `${(formatted / 10000000).toFixed(1)}Cr`;
    if (compact && formatted >= 100000) return `${(formatted / 100000).toFixed(1)}L`;
    if (compact && formatted >= 1000) return `${(formatted / 1000).toFixed(1)}K`;
    return decimals > 0
      ? (formatted / Math.pow(10, decimals)).toFixed(decimals)
      : formatted.toLocaleString('en-IN');
  }, [formatted, compact, decimals]);

  return <span className={className}>{prefix}{display}{suffix}</span>;
};

// ============================================================================
// §15  TAB INDICATOR COMPONENT
// ============================================================================

export const AnimatedTabs = ({ tabs, activeTab, onChange, className = '' }) => {
  const [indicatorStyle, setIndicatorStyle] = useState({});
  const tabRefs = useRef({});

  useEffect(() => {
    const activeEl = tabRefs.current[activeTab];
    if (activeEl) {
      setIndicatorStyle({
        left: activeEl.offsetLeft,
        width: activeEl.offsetWidth,
      });
    }
  }, [activeTab]);

  return (
    <div className={`relative flex ${className}`}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          ref={el => { tabRefs.current[tab.id] = el; }}
          onClick={() => onChange(tab.id)}
          className={`relative z-10 px-4 py-2 text-sm font-medium transition-colors duration-200
            ${activeTab === tab.id
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
        >
          {tab.icon && <span className="mr-2">{tab.icon}</span>}
          {tab.label}
          {tab.badge !== undefined && (
            <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300">
              {tab.badge}
            </span>
          )}
        </button>
      ))}
      <div
        className="absolute bottom-0 h-0.5 bg-blue-500 dark:bg-blue-400 rounded-full transition-all duration-300"
        style={indicatorStyle}
      />
    </div>
  );
};

// ============================================================================
// §16  NOTIFICATION TOAST (auto-dismiss)
// ============================================================================

export const useToast = () => {
  const [toasts, setToasts] = useState([]);
  const toast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type, exiting: false }]);
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 300);
    }, duration);
  }, []);

  const ToastContainer = useMemo(() => {
    const Container = () => (
      <div className="fixed top-4 right-4 z-[9999] space-y-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id}
            className={`pointer-events-auto px-4 py-3 rounded-xl shadow-xl text-sm font-medium
              ${t.type === 'success' ? 'bg-green-500 text-white' : ''}
              ${t.type === 'error' ? 'bg-red-500 text-white' : ''}
              ${t.type === 'warning' ? 'bg-amber-500 text-white' : ''}
              ${t.type === 'info' ? 'bg-blue-500 text-white' : ''}`}
            style={{
              animation: t.exiting ? 'slideOutRight 0.3s ease forwards' : 'slideInRight 0.3s ease',
            }}>
            {t.message}
          </div>
        ))}
      </div>
    );
    return Container;
  }, [toasts]);

  return { toast, ToastContainer };
};

// ============================================================================
// §17  DATA VISUALIZATION HELPERS
// ============================================================================

export const colorPalette = {
  blue: { bg: 'bg-blue-50 dark:bg-blue-950/30', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800', hex: '#3B82F6' },
  green: { bg: 'bg-green-50 dark:bg-green-950/30', text: 'text-green-600 dark:text-green-400', border: 'border-green-200 dark:border-green-800', hex: '#10B981' },
  purple: { bg: 'bg-purple-50 dark:bg-purple-950/30', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800', hex: '#8B5CF6' },
  amber: { bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800', hex: '#F59E0B' },
  rose: { bg: 'bg-rose-50 dark:bg-rose-950/30', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-200 dark:border-rose-800', hex: '#F43F5E' },
  teal: { bg: 'bg-teal-50 dark:bg-teal-950/30', text: 'text-teal-600 dark:text-teal-400', border: 'border-teal-200 dark:border-teal-800', hex: '#14B8A6' },
  indigo: { bg: 'bg-indigo-50 dark:bg-indigo-950/30', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-200 dark:border-indigo-800', hex: '#6366F1' },
  sky: { bg: 'bg-sky-50 dark:bg-sky-950/30', text: 'text-sky-600 dark:text-sky-400', border: 'border-sky-200 dark:border-sky-800', hex: '#0EA5E9' },
};

export const chartColors = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#F43F5E', '#14B8A6', '#6366F1', '#0EA5E9', '#EC4899', '#84CC16'];

// ============================================================================
// §18  GLASSMORPHISM CARD WRAPPER
// ============================================================================

export const GlassCard = ({ children, className = '', blur = 'md', onClick }) => (
  <div
    className={`bg-white/60 dark:bg-gray-800/60 backdrop-blur-${blur} border border-white/40 dark:border-gray-700/40 rounded-2xl shadow-lg shadow-gray-200/20 dark:shadow-black/20 ${className}`}
    onClick={onClick}
  >
    {children}
  </div>
);

// ============================================================================
// §19  EMPTY STATE COMPONENT
// ============================================================================

export const EmptyState = ({ icon: Icon, title, description, action, actionLabel }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    {Icon && (
      <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
      </div>
    )}
    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">{title}</h3>
    {description && <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">{description}</p>}
    {action && (
      <button onClick={action}
        className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors">
        {actionLabel || 'Get Started'}
      </button>
    )}
  </div>
);

// ============================================================================
// §20  BADGE / STATUS INDICATOR
// ============================================================================

export const StatusBadge = ({ status, size = 'sm', pulse = false }) => {
  const colorMap = {
    success: 'bg-green-500', active: 'bg-green-500', good: 'bg-green-500',
    warning: 'bg-amber-500', pending: 'bg-amber-500', fair: 'bg-amber-500',
    error: 'bg-red-500', failure: 'bg-red-500', poor: 'bg-red-500',
    info: 'bg-blue-500', neutral: 'bg-gray-400',
  };
  const sizeMap = { xs: 'w-1.5 h-1.5', sm: 'w-2 h-2', md: 'w-3 h-3', lg: 'w-4 h-4' };
  const color = colorMap[status] || colorMap.neutral;

  return (
    <span className={`inline-block ${sizeMap[size]} rounded-full ${color} ${pulse ? 'animate-pulse' : ''}`} />
  );
};

export const Badge = ({ children, variant = 'default', className = '' }) => {
  const variants = {
    default: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

// ============================================================================
// EXPORT DEFAULTS
// ============================================================================

export default {
  useMotionPreference,
  useInView,
  useAnimatedCounter,
  useStaggerAnimation,
  useScrollProgress,
  useSpring,
  useInteraction,
  useToast,
  PageTransition,
  AnimatedCard,
  AnimatedList,
  AnimatedNumber,
  AnimatedTabs,
  ProgressRing,
  Shimmer,
  CardSkeleton,
  Tooltip,
  GlassCard,
  EmptyState,
  StatusBadge,
  Badge,
  colorPalette,
  chartColors,
};
