import { useEffect, useState } from 'react';
import { supabase } from './supabase.js';
import { sendCode, verifyCode, signOut, loadMine, allowedTracks, prefill, save } from './registration.js';
import './RegistrationForm.css';

// ---- option lists: swap in your real ones ----
const UNIVERSITIES = ['Cadi Ayyad', 'UMP', 'UM6P', 'Other'];
const FACULTIES = ['FSSM', 'FSJES', 'FMPM', 'FST', 'ENSA', 'ENCG', 'Other'];
const DEGREES = ['Licence / Bachelor', 'Master', 'PhD', "Cycle d'Ingénieur", 'Other'];
const SEMESTERS = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10'];
const SKILLS = ['Programming', 'Design', 'Marketing', 'Finance', 'Public speaking', 'Project management', 'Writing', 'Video / photo', 'Sales', 'Research'];
const LANGUAGES = ['Darija', 'Arabic', 'French', 'English', 'Tamazight', 'Spanish'];

const EMPTY_GENERAL = { university: '', faculty: '', degree: '', semester: '', field_of_study: '', full_name: '', whatsapp: '' };
const EMPTY_DETAILS = {
  competitor: { has_idea: '', idea: '', skills: [], blockers: '', team_status: '', team_members: '', languages: [], english_comfort: '' },
  organizer: { skills_have: [], skills_want: [], attendance_confirmed: false, benefit: '' }
};

const TITLES = { competitor: 'Register as a competitor', organizer: 'Register as an organizer' };

// ---- small field helpers ----
const Field = ({ label, children }) => (
  <label className="reg-field"><span>{label}</span>{children}</label>
);
const Select = ({ value, onChange, options, required = true }) => (
  <select value={value} onChange={(e) => onChange(e.target.value)} required={required}>
    <option value="" disabled>Choose…</option>
    {options.map((o) => <option key={o} value={o}>{o}</option>)}
  </select>
);
const Chips = ({ value, onChange, options }) => (
  <div className="reg-chips">
    {options.map((o) => {
      const on = value.includes(o);
      return (
        <button type="button" key={o} className={on ? 'on' : ''} aria-pressed={on}
                onClick={() => onChange(on ? value.filter((v) => v !== o) : [...value, o])}>
          {o}
        </button>
      );
    })}
  </div>
);

export default function RegistrationForm({ track }) {
  const [phase, setPhase] = useState('loading'); // loading | email | code | form | blocked | done
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);
  const [general, setGeneral] = useState(EMPTY_GENERAL);
  const [details, setDetails] = useState(EMPTY_DETAILS[track]);
  const [note, setNote] = useState('');

  const setG = (k) => (v) => setGeneral((g) => ({ ...g, [k]: v }));
  const setD = (k) => (v) => setDetails((d) => ({ ...d, [k]: v }));

  // enter the form: load my rows, enforce the track rule, prefill
  async function enter(userEmail) {
    setEmail(userEmail);
    try {
      const mine = await loadMine();
      setRows(mine);
      if (!allowedTracks(mine).includes(track)) return setPhase('blocked');
      const pre = prefill(track, mine);
      setGeneral(pre?.general ?? EMPTY_GENERAL);
      setDetails({ ...EMPTY_DETAILS[track], ...(pre?.details ?? {}) });
      setNote(
        pre?.alreadyRegistered ? 'You are already registered. Saving updates your answers.'
        : pre ? 'We filled in your details from your earlier registration. Check them.' : ''
      );
      setPhase('form');
    } catch (e) {
      setError(e.message || 'Could not load your data.');
      setPhase('email');
    }
  }

  // already signed in (session survives reloads) -> skip straight to the form
  useEffect(() => {
    let alive = true;
    setPhase('loading');
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      const u = data.session?.user;
      u ? enter(u.email) : setPhase('email');
    });
    return () => { alive = false; };
  }, [track]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function onSendCode(e) {
    e?.preventDefault();
    setError(''); setBusy(true);
    const { error: err } = await sendCode(email);
    setBusy(false);
    if (err) return setError(err.message);
    setCooldown(60);
    setPhase('code');
  }

  async function onVerify(e) {
    e.preventDefault();
    setError(''); setBusy(true);
    const { data, error: err } = await verifyCode(email, code);
    setBusy(false);
    if (err) return setError('That code is wrong or expired. Request a new one.');
    enter(data.user.email);
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    const g = Object.fromEntries(Object.entries(general).map(([k, v]) => [k, v.trim()]));
    g.whatsapp = g.whatsapp.replace(/[\s().-]/g, '');
    if (g.full_name.length < 3) return setError('Enter your full name.');
    if (!/^\+[0-9]{8,15}$/.test(g.whatsapp)) return setError('WhatsApp must look like +212612345678 (country code, digits only).');
    if (track === 'organizer' && !details.attendance_confirmed) return setError('Please confirm you will attend and do your tasks.');
    if (track === 'competitor' && !details.team_status) return setError('Tell us if you have a team.');

    setBusy(true);
    try {
      await save(track, g, details);
      setPhase('done');
    } catch (err) {
      // surfaces RLS / constraint / trigger errors instead of failing silently
      setError(err.message || 'Could not save. Try again.');
    } finally {
      setBusy(false);
    }
  }

  const other = track === 'competitor' ? '#register/organizer' : '#register/competitor';

  return (
    <main className="reg-page" aria-label={TITLES[track]}>
      <div className="reg-wrap">
        <p className="reg-kicker">FSSM × Hult Prize</p>
        <h1 className="reg-title">{TITLES[track]}</h1>

        {phase === 'loading' && <p className="reg-lead">Loading…</p>}

        {phase === 'email' && (
          <form onSubmit={onSendCode} className="reg-form">
            <p className="reg-lead">First, confirm your email. We send you a 6-digit code.</p>
            <Field label="Email">
              <input type="email" required autoComplete="email" inputMode="email" value={email}
                     onChange={(e) => setEmail(e.target.value)} placeholder="you@university.ma" />
            </Field>
            <button className="reg-btn" disabled={busy}>{busy ? 'Sending…' : 'Send code'}</button>
          </form>
        )}

        {phase === 'code' && (
          <form onSubmit={onVerify} className="reg-form">
            <p className="reg-lead">Code sent to <b>{email}</b>. Check spam too.</p>
            <Field label="6-digit code">
              <input required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,8}" maxLength={8}
                     value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
            </Field>
            <div className="reg-row">
              <button className="reg-btn" disabled={busy || code.length < 6}>{busy ? 'Checking…' : 'Confirm'}</button>
              <button type="button" className="reg-btn ghost" disabled={cooldown > 0 || busy} onClick={onSendCode}>
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
              </button>
              <button type="button" className="reg-btn ghost" onClick={() => { setPhase('email'); setCode(''); setError(''); }}>
                Change email
              </button>
            </div>
          </form>
        )}

        {phase === 'blocked' && (
          <div className="reg-form">
            <p className="reg-lead">
              You are registered as a competitor, so you can't register as an organizer.
              Organizers can take part in both.
            </p>
            <a className="reg-btn" href="#register/competitor">Go to competitor registration</a>
          </div>
        )}

        {phase === 'done' && (
          <div className="reg-form">
            <p className="reg-lead">Done. You're registered as {track === 'competitor' ? 'a competitor' : 'an organizer'}.</p>
            {track === 'organizer' && (
              <a className="reg-btn ghost" href={other}>Also register as a competitor</a>
            )}
            <a className="reg-btn ghost" href="#">Back home</a>
          </div>
        )}

        {phase === 'form' && (
          <form onSubmit={onSubmit} className="reg-form">
            <div className="reg-who">
              <span>Signed in as <b>{email}</b></span>
              <button type="button" className="reg-link" onClick={async () => { await signOut(); setPhase('email'); setEmail(''); setCode(''); }}>
                Not you?
              </button>
            </div>
            {note && <p className="reg-note">{note}</p>}

            <fieldset>
              <legend>About you</legend>
              <Field label="Full name">
                <input required minLength={3} maxLength={120} autoComplete="name" value={general.full_name} onChange={(e) => setG('full_name')(e.target.value)} />
              </Field>
              <Field label="WhatsApp number">
                <input required inputMode="tel" autoComplete="tel" placeholder="+212612345678" value={general.whatsapp} onChange={(e) => setG('whatsapp')(e.target.value)} />
              </Field>
              <Field label="University"><Select value={general.university} onChange={setG('university')} options={UNIVERSITIES} /></Field>
              <Field label="Faculty"><Select value={general.faculty} onChange={setG('faculty')} options={FACULTIES} /></Field>
              <Field label="Degree"><Select value={general.degree} onChange={setG('degree')} options={DEGREES} /></Field>
              <Field label="Current semester"><Select value={general.semester} onChange={setG('semester')} options={SEMESTERS} /></Field>
              <Field label="Field of study">
                <input required maxLength={160} value={general.field_of_study} onChange={(e) => setG('field_of_study')(e.target.value)} />
              </Field>
            </fieldset>

            {track === 'competitor' ? (
              <fieldset>
                <legend>Your idea and team</legend>
                <Field label="Do you have an idea that addresses one of the UN global goals?">
                  <Select value={details.has_idea} onChange={setD('has_idea')} options={['Yes', 'Not yet']} />
                </Field>
                {details.has_idea === 'Yes' && (
                  <Field label="Describe it in a few lines">
                    <textarea rows={4} maxLength={1000} value={details.idea} onChange={(e) => setD('idea')(e.target.value)} />
                  </Field>
                )}
                <div className="reg-field"><span>Skills you have</span>
                  <Chips value={details.skills} onChange={setD('skills')} options={SKILLS} /></div>
                <Field label="Aside from money, which skills stop you from starting a business?">
                  <textarea rows={3} maxLength={1000} value={details.blockers} onChange={(e) => setD('blockers')(e.target.value)} />
                </Field>
                <Field label="Team">
                  <Select value={details.team_status} onChange={setD('team_status')}
                          options={['I need teammates', 'I already have a full team']} />
                </Field>
                {details.team_status === 'I already have a full team' && (
                  <Field label="Full names of your teammates (one per line)">
                    <textarea rows={4} maxLength={1000} value={details.team_members} onChange={(e) => setD('team_members')(e.target.value)} />
                  </Field>
                )}
                <div className="reg-field"><span>Languages you speak</span>
                  <Chips value={details.languages} onChange={setD('languages')} options={LANGUAGES} /></div>
                <Field label="Are you comfortable in English?">
                  <Select value={details.english_comfort} onChange={setD('english_comfort')} options={['Yes', 'Somewhat', 'No']} />
                </Field>
              </fieldset>
            ) : (
              <fieldset>
                <legend>Organizing</legend>
                <p className="reg-note">
                  Last year some members didn't do their tasks, skipped events and caused problems inside the team.
                  Only register if you will show up and do the work.
                </p>
                <div className="reg-field"><span>Skills you have</span>
                  <Chips value={details.skills_have} onChange={setD('skills_have')} options={SKILLS} /></div>
                <div className="reg-field"><span>Skills you want to learn</span>
                  <Chips value={details.skills_want} onChange={setD('skills_want')} options={SKILLS} /></div>
                <Field label="What would you want to get out of the club?">
                  <textarea rows={3} maxLength={1000} value={details.benefit} onChange={(e) => setD('benefit')(e.target.value)} />
                </Field>
                <label className="reg-check">
                  <input type="checkbox" checked={details.attendance_confirmed} onChange={(e) => setD('attendance_confirmed')(e.target.checked)} />
                  <span>I confirm I will attend the events and do my tasks.</span>
                </label>
              </fieldset>
            )}

            <button className="reg-btn" disabled={busy}>{busy ? 'Saving…' : rows.some((r) => r.track === track) ? 'Save changes' : 'Submit'}</button>
          </form>
        )}

        {error && <p className="reg-error" role="alert">{error}</p>}
      </div>
    </main>
  );
}
