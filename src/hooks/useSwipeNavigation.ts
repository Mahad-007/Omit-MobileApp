import { useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";

interface SwipeConfig {
  threshold?: number;
  routes: string[];
  /** Called every touchmove with the current horizontal offset in px */
  onDrag?: (offsetX: number) => void;
  /** Called when a swipe exceeds the threshold — caller should navigate */
  onNavigate?: (route: string, direction: "left" | "right") => void;
  /** Called when a swipe is cancelled (below threshold or vertical) */
  onCancel?: () => void;
}

export function useSwipeNavigation({
  threshold = 55,
  routes,
  onDrag,
  onNavigate,
  onCancel,
}: SwipeConfig) {
  const location = useLocation();

  // All touch data lives in refs so touchmove never triggers a re-render
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const isHorizontal = useRef<boolean | null>(null);
  const deltaRef = useRef(0);
  // Keep a stable ref to the latest location so native listeners don't go stale
  const locationRef = useRef(location.pathname);
  locationRef.current = location.pathname;

  // Native TouchEvent handlers (not React.TouchEvent) so they can be attached
  // with { passive: false }, allowing preventDefault() to block the browser's
  // scroll during a horizontal swipe — the primary cause of Android jank.
  const onTouchStart = useCallback((e: TouchEvent) => {
    startX.current = e.targetTouches[0].clientX;
    startY.current = e.targetTouches[0].clientY;
    isHorizontal.current = null;
    deltaRef.current = 0;
  }, []);

  const onTouchMove = useCallback(
    (e: TouchEvent) => {
      if (startX.current === null || startY.current === null) return;

      const dx = e.targetTouches[0].clientX - startX.current;
      const dy = e.targetTouches[0].clientY - startY.current;

      // Wait for a clear directional signal before committing
      if (isHorizontal.current === null) {
        if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
        isHorizontal.current = Math.abs(dx) > Math.abs(dy);
      }

      if (!isHorizontal.current) return;

      // Prevent the browser from also trying to scroll while we handle the
      // horizontal swipe. Requires { passive: false } on the listener.
      e.preventDefault();

      const currentIndex = routes.indexOf(locationRef.current);

      // Rubber-band effect at the first/last tab
      let offset = dx;
      if (
        (dx > 0 && currentIndex === 0) ||
        (dx < 0 && currentIndex === routes.length - 1)
      ) {
        offset = dx * 0.15;
      }

      deltaRef.current = offset;
      onDrag?.(offset);
    },
    [routes, onDrag]
  );

  const onTouchEnd = useCallback(() => {
    if (!isHorizontal.current) {
      onCancel?.();
      reset();
      return;
    }

    const delta = deltaRef.current;
    const currentIndex = routes.indexOf(locationRef.current);

    if (delta < -threshold && currentIndex < routes.length - 1) {
      onNavigate?.(routes[currentIndex + 1], "left");
    } else if (delta > threshold && currentIndex > 0) {
      onNavigate?.(routes[currentIndex - 1], "right");
    } else {
      onCancel?.();
    }

    reset();
  }, [routes, threshold, onNavigate, onCancel]);

  function reset() {
    startX.current = null;
    startY.current = null;
    isHorizontal.current = null;
    deltaRef.current = 0;
  }

  return { onTouchStart, onTouchMove, onTouchEnd };
}
