'use client'

import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    // Ensure window is defined (for SSR/server components)
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQueryList = window.matchMedia(query);

    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Set initial state
    setMatches(mediaQueryList.matches);

    // Add listener for changes
    // Using addEventListener for modern browsers, fall back to addListener for older ones
    if (mediaQueryList.addEventListener) {
        mediaQueryList.addEventListener('change', listener);
    } else {
        mediaQueryList.addListener(listener); // Deprecated but necessary for fallback
    }


    // Cleanup listener on component unmount
    return () => {
        if (mediaQueryList.removeEventListener) {
            mediaQueryList.removeEventListener('change', listener);
        } else {
            mediaQueryList.removeListener(listener); // Deprecated but necessary for fallback
        }

    };
  }, [query]);

  return matches;
} 