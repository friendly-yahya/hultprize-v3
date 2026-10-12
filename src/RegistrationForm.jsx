import { useEffect, useState } from 'react';
import { loadLocal, submit, RegistrationError } from './registration.js';
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
  const [phase, setPhase] = useState('form'); // form | done | blocked
  const [email, setEmail] = useState('');
  const [general, setGeneral] = useState(EMPTY_GENERAL);
  const [details, setDetails] = useState(EMPTY_DETAILS[track]);
  const [trap, setTrap] = useState(''); // honeypot: real people never see or fill it
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  const setG = (k) => (v) => setGeneral((g) => ({ ...g, [k]: v }));
  const setD = (k) => (v) => setDetails((d) => ({ ...d, [k]: v }));

  // prefill from what this device submitted before (e.g. organizer answers reused for competitor)
  useEffect(() => {
    setPhase('form'); setError('');
    const local = loadLocal(track);
    setEmail(local.email);
    setGeneral(local.general ?? EMPTY_GENERAL);
    setDetails({ ...EMPTY_DETAILS[track], ...(local.details ?? {}) });
    setNote(local.general ? 'We filled in your details from your earlier registration on this device. Check them.' : '');
  }, [track]);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    const g = Object.fromEntries(Object.entries(general).map(([k, v]) => [k, v.trim()]));
    g.whatsapp = g.whatsapp.replace(/[\s().-]/g, '');
    const mail = email.trim().toLowerCase();
    if (g.full_name.length < 3) return setError('Enter your full name.');
    if (!/^\+[0-9]{8,15}$/.test(g.whatsapp)) return setError('WhatsApp must look like +212612345678 (country code, digits only).');
    if (track === 'organizer' && !details.attendance_confirmed) return setError('Please confirm you will attend and do your tasks.');
    if (track === 'competitor' && !details.team_status) return setError('Tell us if you have a team.');
    if (trap) return setPhase('done'); // bot: pretend it worked, save nothing

    setBusy(true);
    try {
      await submit(track, mail, g, details);
      setEmail(mail);
      setPhase('done');
    } catch (err) {
      if (err instanceof RegistrationError && err.kind === 'blocked') setPhase('blocked');
      else setError(err.message || 'Could not save. Try again.');
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

        {phase === 'blocked' && (
          <div className="reg-form">
            <p className="reg-lead">
              This email is already registered as a competitor, so it can't register as an organizer.
              Organizers can take part in both.
            </p>
            <a className="reg-btn" href="#register/competitor">Go to competitor registration</a>
          </div>
        )}

        {phase === 'done' && (
          <div className="reg-form">
            <p className="reg-lead">
              <b>Sign-up successful.</b> You're registered as {track === 'competitor' ? 'a competitor' : 'an organizer'} with <b>{email}</b>.
            </p>
            {track === 'organizer' && (
              <a className="reg-btn ghost" href={other}>Also register as a competitor</a>
            )}
            <a className="reg-btn ghost" href="#">Back home</a>
          </div>
        )}

        {phase === 'form' && (
          <form onSubmit={onSubmit} className="reg-form">
            {note && <p className="reg-note">{note}</p>}

            <fieldset>
              <legend>About you</legend>
              <Field label="Full name">
                <input required minLength={3} maxLength={120} autoComplete="name" value={general.full_name} onChange={(e) => setG('full_name')(e.target.value)} />
              </Field>
              <Field label="Email">
                <input type="email" required autoComplete="email" inputMode="email" maxLength={254} value={email}
                       onChange={(e) => setEmail(e.target.value)} placeholder="you@university.ma" />
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

            <input className="reg-trap" tabIndex={-1} autoComplete="off" aria-hidden="true" name="website"
                   value={trap} onChange={(e) => setTrap(e.target.value)} />
            <button className="reg-btn" disabled={busy}>{busy ? 'Sending…' : 'Submit'}</button>
          </form>
        )}

        {error && <p className="reg-error" role="alert">{error}</p>}
      </div>
    </main>
  );
}
