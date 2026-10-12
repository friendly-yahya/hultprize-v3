import Decrypt from './Decrypt.jsx';
import './ComingSoon.css';

export default function ComingSoon({ title }) {
  return (
    <main className="soon">
      {title && <p className="soon-kicker">{title}</p>}
      <h1 className="glitch" data-text="COMING SOON">
        <Decrypt text="COMING SOON" animateOn="view" sequential revealDirection="start" speed={60} maxIterations={10}
                 encryptedClassName="enc" style={{ display: 'block' }} />
      </h1>
      <p className="soon-lead">This page is still being built. Check back soon.</p>
      <a className="btn btn-primary" href="#">Back home</a>
    </main>
  );
}
