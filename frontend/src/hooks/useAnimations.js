import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

/**
 * Hook to detect if user prefers reduced motion
 * @returns {boolean} true if user prefers reduced motion
 */
export function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (event) => setPrefersReducedMotion(event.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
}

/**
 * Hook that triggers animations when elements enter the viewport
 * @param {Object} options - IntersectionObserver options
 * @param {number} options.threshold - Visibility threshold (0-1)
 * @param {string} options.rootMargin - Root margin string
 * @param {boolean} options.triggerOnce - Only trigger once
 * @returns {{ ref: React.Ref, isIntersecting: boolean, entry: IntersectionObserverEntry }}
 */
export function useIntersectionObserver({
  threshold = 0.1,
  rootMargin = '0px 0px -50px 0px',
  triggerOnce = true,
} = {}) {
  const [entry, setEntry] = useState(null);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const elementRef = useRef(null);
  const observerRef = useRef(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const node = elementRef.current;
    if (!node) return;

    if (prefersReducedMotion) {
      setIsIntersecting(true);
      return;
    }

    observerRef.current = new IntersectionObserver(
      ([observerEntry]) => {
        setEntry(observerEntry);
        setIsIntersecting(observerEntry.isIntersecting);

        if (observerEntry.isIntersecting && triggerOnce) {
          observerRef.current?.unobserve(node);
        }
      },
      { threshold, rootMargin }
    );

    observerRef.current.observe(node);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [threshold, rootMargin, triggerOnce, prefersReducedMotion]);

  return { ref: elementRef, isIntersecting, entry };
}

/**
 * Hook that returns scroll progress as a value between 0 and 1
 * @param {Object} options
 * @param {React.Ref} options.containerRef - Optional container ref (defaults to document)
 * @returns {{ progress: number, scrollY: number, direction: 'up' | 'down' }}
 */
export function useScrollProgress({ containerRef = null } = {}) {
  const [progress, setProgress] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const [direction, setDirection] = useState('down');
  const lastScrollY = useRef(0);
  const rafId = useRef(null);

  useEffect(() => {
    const target = containerRef?.current || window;
    const isWindow = target === window;

    const handleScroll = () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);

      rafId.current = requestAnimationFrame(() => {
        let currentScrollY, maxScroll;

        if (isWindow) {
          currentScrollY = window.scrollY;
          maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        } else {
          currentScrollY = target.scrollTop;
          maxScroll = target.scrollHeight - target.clientHeight;
        }

        const newProgress = maxScroll > 0 ? Math.min(currentScrollY / maxScroll, 1) : 0;

        setScrollY(currentScrollY);
        setProgress(newProgress);
        setDirection(currentScrollY > lastScrollY.current ? 'down' : 'up');
        lastScrollY.current = currentScrollY;
      });
    };

    target.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      target.removeEventListener('scroll', handleScroll);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [containerRef]);

  return { progress, scrollY, direction };
}

/**
 * Hook for parallax scroll effects
 * @param {Object} options
 * @param {number} options.speed - Parallax speed multiplier (default 0.5)
 * @param {string} options.direction - 'vertical' or 'horizontal'
 * @returns {{ ref: React.Ref, offset: number, style: Object }}
 */
export function useParallax({ speed = 0.5, direction = 'vertical' } = {}) {
  const ref = useRef(null);
  const [offset, setOffset] = useState(0);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) return;

    let rafId;
    const handleScroll = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const elementCenter = rect.top + rect.height / 2;
        const viewportCenter = windowHeight / 2;
        const distanceFromCenter = elementCenter - viewportCenter;
        setOffset(distanceFromCenter * speed);
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [speed, prefersReducedMotion]);

  const style = useMemo(() => {
    if (prefersReducedMotion) return {};
    const translate = direction === 'vertical'
      ? `translateY(${offset}px)`
      : `translateX(${offset}px)`;
    return { transform: translate, willChange: 'transform' };
  }, [offset, direction, prefersReducedMotion]);

  return { ref, offset, style };
}

/**
 * Hook for staggered animation classes on child elements
 * @param {Object} options
 * @param {number} options.childCount - Number of children
 * @param {number} options.delayMs - Base delay between children in ms
 * @param {string} options.baseClass - Base animation CSS class
 * @returns {{ containerRef: React.Ref, getStaggerClass: (index: number) => string, isVisible: boolean }}
 */
export function useStaggerAnimation({
  childCount = 0,
  delayMs = 100,
  baseClass = 'animate-fadeInUp',
} = {}) {
  const { ref: containerRef, isIntersecting: isVisible } = useIntersectionObserver({
    threshold: 0.05,
    triggerOnce: true,
  });

  const getStaggerClass = useCallback(
    (index) => {
      if (!isVisible) return 'opacity-0 translate-y-4';
      const delay = index * delayMs;
      return `${baseClass} opacity-100 translate-y-0 transition-all duration-500`;
    },
    [isVisible, delayMs, baseClass]
  );

  const getStaggerStyle = useCallback(
    (index) => {
      if (!isVisible) return { opacity: 0, transform: 'translateY(16px)' };
      return {
        opacity: 1,
        transform: 'translateY(0)',
        transition: `all 0.5s ease ${index * delayMs}ms`,
      };
    },
    [isVisible, delayMs]
  );

  return { containerRef, getStaggerClass, getStaggerStyle, isVisible };
}

/**
 * Hook for animated counting up to a target number
 * @param {number} end - Target number
 * @param {Object} options
 * @param {number} options.duration - Animation duration in ms
 * @param {number} options.decimals - Number of decimal places
 * @param {boolean} options.startOnView - Start only when in viewport
 * @returns {{ value: string, isAnimating: boolean, ref: React.Ref }}
 */
export function useCountUp(end, { duration = 2000, decimals = 0, startOnView = true } = {}) {
  const [value, setValue] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const { ref, isIntersecting } = useIntersectionObserver({ triggerOnce: true });
  const prefersReducedMotion = usePrefersReducedMotion();
  const animationRef = useRef(null);

  useEffect(() => {
    const shouldStart = startOnView ? isIntersecting : true;
    if (!shouldStart || end === 0) return;

    if (prefersReducedMotion) {
      setValue(end);
      return;
    }

    setIsAnimating(true);
    const startTime = performance.now();
    const startValue = 0;

    const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const rawProgress = Math.min(elapsed / duration, 1);
      const progress = easeOutQuart(rawProgress);
      const current = startValue + (end - startValue) * progress;

      setValue(current);

      if (rawProgress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [end, duration, isIntersecting, startOnView, prefersReducedMotion]);

  const formatted = useMemo(() => value.toFixed(decimals), [value, decimals]);

  return { value: formatted, rawValue: value, isAnimating, ref };
}

/**
 * Hook for typewriter text effect
 * @param {string} text - Full text to type out
 * @param {Object} options
 * @param {number} options.speed - Characters per second
 * @param {number} options.startDelay - Delay before starting in ms
 * @param {boolean} options.loop - Whether to loop the animation
 * @param {number} options.pauseMs - Pause at end before looping
 * @returns {{ displayText: string, isTyping: boolean, isComplete: boolean, reset: () => void }}
 */
export function useTypewriter(text, { speed = 40, startDelay = 0, loop = false, pauseMs = 2000 } = {}) {
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const indexRef = useRef(0);
  const timeoutRef = useRef(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  const reset = useCallback(() => {
    indexRef.current = 0;
    setDisplayText('');
    setIsComplete(false);
    setIsTyping(false);
  }, []);

  useEffect(() => {
    if (!text) return;

    if (prefersReducedMotion) {
      setDisplayText(text);
      setIsComplete(true);
      return;
    }

    const intervalMs = 1000 / speed;

    const startTyping = () => {
      setIsTyping(true);
      indexRef.current = 0;

      const typeNext = () => {
        if (indexRef.current <= text.length) {
          setDisplayText(text.slice(0, indexRef.current));
          indexRef.current++;
          timeoutRef.current = setTimeout(typeNext, intervalMs);
        } else {
          setIsTyping(false);
          setIsComplete(true);

          if (loop) {
            timeoutRef.current = setTimeout(() => {
              reset();
              startTyping();
            }, pauseMs);
          }
        }
      };

      typeNext();
    };

    timeoutRef.current = setTimeout(startTyping, startDelay);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [text, speed, startDelay, loop, pauseMs, prefersReducedMotion, reset]);

  return { displayText, isTyping, isComplete, reset };
}

export default {
  useIntersectionObserver,
  useScrollProgress,
  useParallax,
  useStaggerAnimation,
  useCountUp,
  useTypewriter,
  usePrefersReducedMotion,
};
