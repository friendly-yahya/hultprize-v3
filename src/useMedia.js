import { useEffect, useState } from 'react';

export function useMedia(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatches(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return matches;
}

// open the site with ?motion to force every effect on, whatever the OS says
const FORCE_MOTION = new URLSearchParams(window.location.search).has('motion');
if (FORCE_MOTION) document.documentElement.classList.add('force-motion');

export function useReducedMotion() {
  const reduce = useMedia('(prefers-reduced-motion: reduce)');
  return reduce && !FORCE_MOTION;
}
