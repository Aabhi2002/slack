
import { useEffect, useRef } from 'react';

interface UseMessageVisibilityProps {
  onVisible: () => void;
  threshold?: number;
}

export function useMessageVisibility({ onVisible, threshold = 0.5 }: UseMessageVisibilityProps) {
  const ref = useRef<HTMLDivElement>(null);
  const hasBeenVisible = useRef(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasBeenVisible.current) {
          hasBeenVisible.current = true;
          onVisible();
        }
      },
      {
        threshold,
        rootMargin: '0px 0px -10% 0px' // Trigger when message is 90% visible
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [onVisible, threshold]);

  return ref;
}
