import { lazy, Suspense, useEffect, useState } from 'react';
import Aurora from './Aurora.jsx';
import ComingSoon from './ComingSoon.jsx';
import Decrypt from './Decrypt.jsx';
import { StaggeredMenu } from './StaggeredMenu.jsx';
import { AURORA, AURORA_MOBILE } from './auroraConfig.js';
import { useMedia, useReducedMotion } from './useMedia.js';

// Controls are hidden. Open http://localhost:5173/?controls to tune; the panel is only loaded then.
const Panel = lazy(() => import('./Panel.jsx'));
const SHOW_PANEL = new URLSearchParams(window.location.search).has('controls');

// every link lands on the coming-soon page until its real page exists
const MENU_ITEMS = [
  { label: 'FAQ', link: '#faq', ariaLabel: 'FAQ' },
  { label: 'Past competition', link: '#past-competition', ariaLabel: 'Past competition' },
  { label: 'Organizers', link: '#organizers', ariaLabel: 'Organizers' },
  { label: 'Resources', link: '#resources', ariaLabel: 'Resources' },
  { label: 'Register', link: '#register', ariaLabel: 'Register' },
  { label: 'About', link: '#about', ariaLabel: 'About' }
];

// placeholder URLs: swap in the club's real profiles
const SOCIALS = [
  { label: 'Instagram', link: 'https://www.instagram.com/' },
  { label: 'TikTok', link: 'https://www.tiktok.com/' },
  { label: 'LinkedIn', link: 'https://www.linkedin.com/' }
];

function useHash() {
  const [hash, setHash] = useState(() => window.location.hash.slice(1));
  useEffect(() => {
    const on = () => {
      setHash(window.location.hash.slice(1));
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return hash;
}

export default function App() {
  const [cfg, setCfg] = useState(AURORA);
  const phone = useMedia('(max-width: 640px)');
  const reduce = useReducedMotion();
  const hash = useHash();
  const soon = hash !== '';
  const title = MENU_ITEMS.find((i) => i.link === `#${hash}`)?.label ?? (hash === 'info' ? 'How it works' : '');

  return (
    <>
      <StaggeredMenu
        isFixed
        position="right"
        items={MENU_ITEMS}
        socialItems={SOCIALS}
        displaySocials
        colors={['#FFBE98', '#4C7DFF', '#EC2088']}
        accentColor="#EC2088"
        menuButtonColor="#14121a"
        openMenuButtonColor="#14121a"
        logo={<a href="#">FSSM × Hult Prize</a>}
      />

      {soon ? (
        <ComingSoon title={title} />
      ) : (
        <main className="hero">
          <div className="aurora-bg" aria-hidden="true">
            <Aurora {...cfg} {...(phone ? AURORA_MOBILE : {})} {...(reduce ? { speed: 0.2 } : {})} />
          </div>

          <section className="content">
            <h1>
              <Decrypt text="The $1M Hult Prize comes to FSSM" animateOn="inViewHover" sequential revealDirection="start"
                       speed={42} maxIterations={10} encryptedClassName="enc" style={{ display: 'block' }} />
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
      )}
    </>
  );
}
