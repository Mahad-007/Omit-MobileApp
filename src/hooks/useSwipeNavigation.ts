import { useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";

interface SwipeConfig {
  threshold?: number;
  routes: string[];
}

export function useSwipeNavigation({ threshold = 50, routes }: SwipeConfig) {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > threshold;
    const isRightSwipe = distance < -threshold;

    const currentIndex = routes.indexOf(location.pathname);
    if (currentIndex === -1) return;

    if (isLeftSwipe && currentIndex < routes.length - 1) {
      // Swiping left to go to next tab
      navigate(routes[currentIndex + 1]);
    } else if (isRightSwipe && currentIndex > 0) {
      // Swiping right to go to previous tab
      navigate(routes[currentIndex - 1]);
    }
  }, [touchStart, touchEnd, threshold, navigate, location.pathname, routes]);

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
}
