import { lazy, Suspense, useEffect, useState } from 'react';
import DitherVeil from './DitherVeil.jsx';
import TargetCursor from './TargetCursor.jsx';
import morpheus from './assets/Morpheus.png';
import { REGISTER_IMAGE, REGISTER_MOBILE } from './registerConfig.js';
import Decrypt from './Decrypt.jsx';
import { useMedia } from './useMedia.js';
import './RegisterPage.css';

// Controls are hidden. Open http://localhost:5173/?controls#register to tune; the panel is only loaded then.
const RegisterPanel = lazy(() => import('./RegisterPanel.jsx'));
const SHOW_PANEL = new URLSearchParams(window.location.search).has('controls');

const CHOICES = [
  { href: '#register/competitor', name: "I'm a competitor", desc: 'Form a team and pitch your idea.' },
  { href: '#register/organizer', name: "I'm an organizer", desc: 'Help us run the event.' }
];

export default function RegisterPage() {
  const phone = useMedia('(max-width: 640px)');
  const base = phone ? { ...REGISTER_IMAGE, ...REGISTER_MOBILE } : REGISTER_IMAGE;
  const [cfg, setCfg] = useState(base);

  // switching between phone and desktop widths (rotate, resize) loads that layout's settings
  useEffect(() => {
    setCfg(base);
  }, [phone]); // eslint-disable-line react-hooks/exhaustive-deps

  const { uiBottom, uiScale, ...veil } = cfg;

  return (
    <main className="register-page" aria-label="Register" style={{ background: cfg.inkColor }}>
      <DitherVeil src={morpheus} wander clickBurst={false} {...veil} />
      <TargetCursor targetSelector=".cursor-target, .sm-toggle, .sm-panel-item" spinDuration={2} />
      <section
        className="register-ui"
        // pinned inline too, so the text can never fall off-screen if the stylesheet is missing or stale
        style={{
          position: 'absolute', left: 0, right: 0, zIndex: 1, display: 'grid', justifyItems: 'center',
          textAlign: 'center', color: '#f4f1ea',
          bottom: `max(${uiBottom}vh, env(safe-area-inset-bottom, 0px))`,
          '--reg-scale': uiScale
        }}
      >
        <h1 className="register-title">
          <Decrypt text="This is your chance." animateOn="view" sequential revealDirection="start"
                   speed={90} maxIterations={10} encryptedClassName="enc" style={{ display: 'block' }} />
        </h1>
        <p className="register-lead">
          <Decrypt text="Join the Hult Prize at FSSM. Choose how you want to take part." animateOn="view" sequential
                   revealDirection="start" speed={38} encryptedClassName="enc" />
        </p>
        <div className="register-choices">
          {CHOICES.map((c) => (
            <a key={c.href} className="choice cursor-target" href={c.href}>
              <span className="choice-name">{c.name}</span>
              <span className="choice-desc">{c.desc}</span>
            </a>
          ))}
        </div>
      </section>
      {SHOW_PANEL && (
        <Suspense fallback={null}>
          <RegisterPanel cfg={cfg} setCfg={setCfg} base={base} />
        </Suspense>
      )}
    </main>
  );
}
