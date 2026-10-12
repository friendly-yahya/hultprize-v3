import { useEffect, useRef, useState } from 'react';
import italian from './assets/italian.gif';
import './Credit.css';

// "Made with love && coffee by Yahya". Clicking the name opens the gif; Esc, the backdrop or Close dismisses it.
// inline: sits in the page flow (forms). Otherwise it's pinned bottom-right. tone: 'dark' page or 'light' page.
export default function Credit({ inline = false, tone = 'dark' }) {
  const [open, setOpen] = useState(false);
  const openerRef = useRef(null);
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    closeRef.current?.focus();
    const opener = openerRef.current;
    return () => {
      window.removeEventListener('keydown', onKey);
      opener?.focus();
    };
  }, [open]);

  return (
    <>
      <p className={`credit ${inline ? 'credit-inline' : 'credit-fixed'} credit-${tone}`}>
        Made with love &amp;&amp; coffee by{' '}
        <button ref={openerRef} type="button" className="credit-name cursor-target" onClick={() => setOpen(true)}>
          Yahya
        </button>
      </p>

      {open && (
        <div className="credit-modal" role="dialog" aria-modal="true" aria-label="Yahya" onClick={() => setOpen(false)}>
          <div className="credit-card" onClick={(e) => e.stopPropagation()}>
            <img src={italian} alt="Italian gesture gif" />
            <button ref={closeRef} type="button" className="credit-close" onClick={() => setOpen(false)}>Close</button>
          </div>
        </div>
      )}
    </>
  );
}
