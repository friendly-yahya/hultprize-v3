import './ComingSoon.css';

export default function ComingSoon({ title }) {
  return (
    <main className="soon">
      {title && <p className="soon-kicker">{title}</p>}
      <h1 className="glitch" data-text="COMING SOON">COMING SOON</h1>
      <p className="soon-lead">This page is still being built. Check back soon.</p>
      <a className="btn btn-primary" href="#">Back home</a>
    </main>
  );
}
