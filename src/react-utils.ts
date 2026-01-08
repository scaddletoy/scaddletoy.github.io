import { useCallback, useRef } from 'react';

export function useDebounceFn<T>(setter: (value: T) => void, delay = 500): (value: T) => void {
  const timeoutRef = useRef<number | null>(null);

  return useCallback(
    (value: T) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = window.setTimeout(() => {
        setter(value);
      }, delay);
    },
    [setter, delay],
  );
}
