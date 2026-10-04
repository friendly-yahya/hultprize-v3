import { lazy, Suspense, useState } from 'react';
import Aurora from './Aurora.jsx';
import Decrypt from './Decrypt.jsx';
import { StaggeredMenu } from './StaggeredMenu.jsx';
import { AURORA, AURORA_MOBILE } from './auroraConfig.js';
import { useMedia } from './useMedia.js';

// Controls are hidden. Open http://localhost:5173/?controls to tune; the panel is only loaded then.
const Panel = lazy(() => import('./Panel.jsx'));
const SHOW_PANEL = new URLSearchParams(window.location.search).has('controls');

// placeholder links: point them at your real sections
const MENU_ITEMS = [
  { label: 'Register', link: '#register', ariaLabel: 'Register' },
  { label: 'How it works', link: '#info', ariaLabel: 'How it works' },
  { label: 'The prize', link: '#prize', ariaLabel: 'The prize' },
  { label: 'FAQ', link: '#faq', ariaLabel: 'FAQ' }
];

export default function App() {
  const [cfg, setCfg] = useState(AURORA);
  const phone = useMedia('(max-width: 640px)');
  const reduce = useMedia('(prefers-reduced-motion: reduce)');

  return (
    <>
      <StaggeredMenu
        isFixed
        position="right"
        items={MENU_ITEMS}
        displaySocials={false}
        colors={['#FFBE98', '#4C7DFF', '#EC2088']}
        accentColor="#EC2088"
        menuButtonColor="#14121a"
        openMenuButtonColor="#14121a"
        logo={
          <Decrypt text="FSSM × Hult Prize" animateOn="view" sequential revealDirection="start"
                   speed={45} maxIterations={8} encryptedClassName="enc" />
        }
      />

      <main className="hero">
        <div className="aurora-bg" aria-hidden="true">
          <Aurora {...cfg} {...(phone ? AURORA_MOBILE : {})} {...(reduce ? { speed: 0.2 } : {})} />
        </div>

        <section className="content">
          <h1>
            <Decrypt text="The $1M Hult Prize comes to FSSM" animateOn="view" sequential revealDirection="start"
                     speed={28} maxIterations={10} encryptedClassName="enc" style={{ display: 'block' }} />
          </h1>
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
    </>
  );
}
