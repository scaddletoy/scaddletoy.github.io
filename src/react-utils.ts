import { useCallback, useRef } from 'react';

export function useDebounceFn<F extends (...args: any[]) => any>(fn: F, delay = 500): F {
  const timeoutRef = useRef<number | null>(null);

  // Create a debounced function with the same signature as F
  const debouncedFn = useCallback(
    (...args: Parameters<F>): ReturnType<F> | void => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = window.setTimeout(() => {
        fn(...args);
      }, delay);
      // Debounced function does not return the result immediately
    },
    [fn, delay],
  );

  return debouncedFn as F;
}
