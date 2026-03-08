import { useState, useCallback, useRef, useEffect } from 'react';

const DEFAULT_THRESHOLD = 80;
const BOUNDARY_TOLERANCE = 2;

/**
 * Hook to detect pull-to-refresh gestures on a scroll container.
 * @param {Object} options
 * @param {React.RefObject} options.ref - Ref to the scroll container (element with overflow scroll)
 * @param {() => Promise<void>} options.onRefresh - Async function to run when refresh is triggered
 * @param {'top' | 'bottom'} options.direction - 'top' = pull down to refresh, 'bottom' = pull up to refresh
 * @param {number} [options.threshold=80] - Pixels to pull before triggering refresh
 * @param {boolean} [options.disabled=false] - When true, gesture is ignored
 * @returns {{ isRefreshing: boolean, pullDistance: number, pullProgress: number }}
 */
export function usePullToRefresh({
  ref,
  onRefresh,
  direction = 'top',
  threshold = DEFAULT_THRESHOLD,
  disabled = false,
}) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startYRef = useRef(null);
  const isActiveRef = useRef(false);
  const pullDistanceRef = useRef(0);

  useEffect(() => {
    pullDistanceRef.current = pullDistance;
  }, [pullDistance]);

  const pullProgress = Math.min(pullDistance / threshold, 1);

  const isAtBoundary = useCallback(
    (el) => {
      if (!el) return false;
      const { scrollTop, scrollHeight, clientHeight } = el;
      if (direction === 'top') {
        return scrollTop <= BOUNDARY_TOLERANCE;
      }
      return scrollTop + clientHeight >= scrollHeight - BOUNDARY_TOLERANCE;
    },
    [direction],
  );

  useEffect(() => {
    if (disabled || !ref?.current || !onRefresh) return;

    const el = ref.current;

    const handleTouchStart = (e) => {
      if (e.touches.length !== 1) return;
      if (isAtBoundary(el)) {
        startYRef.current = e.touches[0].clientY;
        isActiveRef.current = true;
      } else {
        startYRef.current = null;
        isActiveRef.current = false;
      }
    };

    const handleTouchMove = (e) => {
      if (!isActiveRef.current || startYRef.current == null || e.touches.length !== 1) return;

      const currentY = e.touches[0].clientY;
      let distance;
      if (direction === 'top') {
        distance = currentY - startYRef.current;
      } else {
        distance = startYRef.current - currentY;
      }

      if (distance < 0) distance = 0;
      pullDistanceRef.current = distance;
      setPullDistance(distance);

      if (distance > 0 && el) {
        el.style.overscrollBehavior = 'none';
      }
    };

    const handleTouchEnd = () => {
      const currentDistance = pullDistanceRef.current;
      if (el) el.style.overscrollBehavior = '';
      startYRef.current = null;
      isActiveRef.current = false;
      setPullDistance(0);

      if (currentDistance >= threshold) {
        const promise = Promise.resolve(onRefresh());
        setIsRefreshing(true);
        promise.finally(() => {
          setIsRefreshing(false);
        });
      }
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: true });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      if (el) el.style.overscrollBehavior = '';
    };
  }, [ref, onRefresh, direction, threshold, disabled, isAtBoundary]);

  // Reset pullDistance when threshold check runs (touchEnd uses closure; use effect to sync reset after refresh)
  const pullDistanceForProgress = isRefreshing ? 0 : pullDistance;

  return {
    isRefreshing,
    pullDistance: pullDistanceForProgress,
    pullProgress: Math.min(pullDistanceForProgress / threshold, 1),
  };
}
