import { lazy, Suspense, useEffect, useState } from 'react';
import Aurora from './Aurora.jsx';
import { AURORA, AURORA_MOBILE } from './auroraConfig.js';

// Controls are hidden. Open http://localhost:5173/?controls to tune; the panel is only loaded then.
const Panel = lazy(() => import('./Panel.jsx'));
const SHOW_PANEL = new URLSearchParams(window.location.search).has('controls');

function useMedia(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatches(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return matches;
}

export default function App() {
  const [cfg, setCfg] = useState(AURORA);
  const phone = useMedia('(max-width: 640px)');
  const reduce = useMedia('(prefers-reduced-motion: reduce)');

  return (
    <main className="hero">
      <div className="aurora-bg" aria-hidden="true">
        <Aurora {...cfg} {...(phone ? AURORA_MOBILE : {})} {...(reduce ? { speed: 0.2 } : {})} />
      </div>

      <header className="bar">
        <span className="brand">FSSM × Hult Prize</span>
        <a className="btn btn-sm" href="#register">Register</a>
      </header>

      <section className="content">
        <p className="chip"><b>$1,000,000</b> prize</p>
        <h1>The $1M Hult Prize comes to FSSM</h1>
        <p className="lead">
          Register as a competitor, an organizer, or both. Answer a few questions and get everything you need to know.
        </p>
        <div className="cta">
          <a className="btn btn-primary" href="#register">Register now</a>
          <a className="btn" href="#info">How it works</a>
        </div>
      </section>

      {SHOW_PANEL && (
        <Suspense fallback={null}>
          <Panel cfg={cfg} setCfg={setCfg} />
        </Suspense>
      )}
    </main>
  );
}
