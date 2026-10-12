import { useEffect, useMemo, useRef, useState } from 'react';
import { TRACKS, COMPETITION_FAQ, COMPETITION_BENEFITS } from './formConfig.js';
import { buildRow, isVisible, resolveField, validateStep, OTHER, otherKey } from './formLogic.js';
import { submitRegistration, dbConfigured, ApiError } from './api.js';
import './RegisterForm.css';

const MIN_FILL_MS = 4000; // a form filled out faster than this is a bot

const draftKey = (track) => `hp-reg-draft-${track}-v1`;

const loadDraft = (track) => {
  try {
    const d = JSON.parse(localStorage.getItem(draftKey(track)) || 'null');
    if (d && typeof d.answers === 'object') return d;
  } catch {
    /* storage blocked or corrupt: start fresh */
  }
  return null;
};

const saveDraft = (track, data) => {
  try {
    localStorage.setItem(draftKey(track), JSON.stringify(data));
  } catch {
    /* ignore */
  }
};

const clearDraft = (track) => {
  try {
    localStorage.removeItem(draftKey(track));
  } catch {
    /* ignore */
  }
};

// answers shared by both tracks, carried over after a successful registration so the
// second form opens prefilled. Only ids that exist in the opened form are used.
// If your intake field ids differ, edit this list to match formConfig.js.
const PROFILE_KEY = 'hp-reg-profile-v1';
const SHARED_IDS = ['full_name', 'email', 'whatsapp', 'university', 'faculty', 'degree', 'semester', 'field_of_study'];

const loadProfile = (steps) => {
  try {
    const p = JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null');
    if (!p || typeof p !== 'object') return {};
    const ids = new Set(steps.flatMap((st) => st.fields.map((f) => f.id)));
    const out = {};
    for (const id of SHARED_IDS) {
      if (!ids.has(id)) continue;
      if (p[id] != null) out[id] = p[id];
      if (p[otherKey(id)] != null) out[otherKey(id)] = p[otherKey(id)];
    }
    return out;
  } catch {
    return {};
  }
};

const saveProfile = (answers) => {
  try {
    const out = {};
    for (const id of SHARED_IDS) {
      if (answers[id] != null) out[id] = answers[id];
      if (answers[otherKey(id)] != null) out[otherKey(id)] = answers[otherKey(id)];
    }
    localStorage.setItem(PROFILE_KEY, JSON.stringify(out));
  } catch {
    /* ignore */
  }
};

// ---------- small building blocks ----------

function Chips({ f, value, otherValue, onChange, onOther, describedBy, invalid }) {
  const multi = f.type === 'multi';
  const options = f.other ? [...f.options, OTHER] : f.options;
  const selected = multi ? value || [] : value ? [value] : [];
  const atMax = multi && f.max && selected.length >= f.max;

  const toggle = (opt) => {
    if (!multi) return onChange(opt);
    onChange(selected.includes(opt) ? selected.filter((x) => x !== opt) : [...selected, opt]);
  };

  return (
    <>
      <div className="rf-chips" role={multi ? 'group' : 'radiogroup'} aria-describedby={describedBy} aria-invalid={invalid || undefined}>
        {options.map((opt) => {
          const on = selected.includes(opt);
          const disabled = multi && !on && atMax;
          return (
            <label key={opt} className={`rf-chip${on ? ' on' : ''}${disabled ? ' off' : ''}`}>
              <input
                type={multi ? 'checkbox' : 'radio'}
                name={f.id}
                checked={on}
                disabled={disabled}
                onChange={() => toggle(opt)}
              />
              <span>{opt}</span>
            </label>
          );
        })}
      </div>
      {selected.includes(OTHER) && (
        <input
          className="rf-input rf-other"
          type="text"
          maxLength={120}
          placeholder="Please specify"
          aria-label={`${f.label}: other`}
          value={otherValue || ''}
          onChange={(e) => onOther(e.target.value)}
        />
      )}
    </>
  );
}

function Names({ f, value, onChange, describedBy, invalid }) {
  const list = Array.isArray(value) && value.length ? value : [''];
  const update = (i, v) => onChange(list.map((n, j) => (j === i ? v : n)));
  return (
    <div className="rf-names" aria-describedby={describedBy}>
      {list.map((name, i) => (
        <div className="rf-name-row" key={i}>
          <input
            className="rf-input"
            type="text"
            maxLength={120}
            placeholder={`Teammate ${i + 1}, first and last name`}
            aria-label={`Teammate ${i + 1} full name`}
            aria-invalid={invalid || undefined}
            value={name}
            onChange={(e) => update(i, e.target.value)}
          />
          {list.length > 1 && (
            <button type="button" className="rf-btn rf-btn-small" onClick={() => onChange(list.filter((_, j) => j !== i))}
                    aria-label={`Remove teammate ${i + 1}`}>
              Remove
            </button>
          )}
        </div>
      ))}
      {list.length < f.max && (
        <button type="button" className="rf-btn rf-btn-small rf-add" onClick={() => onChange([...list, ''])}>
          + Add teammate
        </button>
      )}
    </div>
  );
}

function Field({ field, answers, setAnswer, error }) {
  const f = resolveField(field, answers);
  const id = `rf-${f.id}`;
  const hintId = f.hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  const describedBy = [hintId, errId].filter(Boolean).join(' ') || undefined;
  const value = answers[f.id];

  if (f.type === 'confirm') {
    return (
      <div className="rf-field" data-field={f.id}>
        <label className={`rf-confirm${value ? ' on' : ''}`}>
          <input id={id} type="checkbox" checked={Boolean(value)} aria-invalid={Boolean(error) || undefined}
                 aria-describedby={errId} onChange={(e) => setAnswer(f.id, e.target.checked)} />
          <span className="rf-box" aria-hidden="true" />
          <span>{f.label}</span>
        </label>
        {error && <p className="rf-error" id={errId} role="alert">{error}</p>}
      </div>
    );
  }

  let control;
  if (f.type === 'choice' || f.type === 'multi') {
    control = (
      <Chips f={f} value={value} otherValue={answers[otherKey(f.id)]} describedBy={describedBy} invalid={Boolean(error)}
             onChange={(v) => setAnswer(f.id, v)} onOther={(v) => setAnswer(otherKey(f.id), v)} />
    );
  } else if (f.type === 'names') {
    control = <Names f={f} value={value} describedBy={describedBy} invalid={Boolean(error)} onChange={(v) => setAnswer(f.id, v)} />;
  } else if (f.type === 'textarea') {
    control = (
      <textarea id={id} className="rf-input" rows={4} maxLength={f.max} placeholder={f.placeholder} value={value || ''}
                aria-invalid={Boolean(error) || undefined} aria-describedby={describedBy}
                onChange={(e) => setAnswer(f.id, e.target.value)} />
    );
  } else {
    control = (
      <input id={id} className="rf-input" type={f.type} maxLength={f.max} placeholder={f.placeholder}
             autoComplete={f.autoComplete} inputMode={f.type === 'tel' ? 'tel' : undefined} value={value || ''}
             aria-invalid={Boolean(error) || undefined} aria-describedby={describedBy}
             onChange={(e) => setAnswer(f.id, e.target.value)} />
    );
  }

  const grouped = ['choice', 'multi', 'names'].includes(f.type);
  const Wrapper = grouped ? 'fieldset' : 'div';
  const Label = grouped ? 'legend' : 'label';

  return (
    <Wrapper className="rf-field" data-field={f.id}>
      <Label className="rf-label" {...(grouped ? {} : { htmlFor: id })}>
        {f.label}
        {!f.required && <span className="rf-optional"> (optional)</span>}
      </Label>
      {f.hint && <p className="rf-hint" id={hintId}>{f.hint}</p>}
      {control}
      {error && <p className="rf-error" id={errId} role="alert">{error}</p>}
    </Wrapper>
  );
}

function Faq() {
  return (
    <div className="rf-faq">
      {COMPETITION_FAQ.map((item) => (
        <details key={item.q}>
          <summary>{item.q}</summary>
          <p>{item.a}</p>
        </details>
      ))}
      {COMPETITION_BENEFITS.length > 0 && (
        <div className="rf-benefits">
          <h2>What you get</h2>
          <ul>{COMPETITION_BENEFITS.map((b) => <li key={b}>{b}</li>)}</ul>
        </div>
      )}
    </div>
  );
}

// ---------- the form ----------

export default function RegisterForm({ trackKey }) {
  const track = TRACKS[trackKey];
  const steps = track.steps;

  const [answers, setAnswers] = useState(() => loadDraft(trackKey)?.answers || loadProfile(steps));
  const [prefilled] = useState(() => !loadDraft(trackKey) && Object.keys(loadProfile(steps)).length > 0);
  const [stepIndex, setStepIndex] = useState(() => {
    const s = loadDraft(trackKey)?.step;
    return Number.isInteger(s) && s >= 0 && s < steps.length ? s : 0;
  });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle'); // idle | sending | done
  const [submitError, setSubmitError] = useState('');
  const [honey, setHoney] = useState('');
  const startedAt = useRef(Date.now());
  const headingRef = useRef(null);
  const firstRender = useRef(true);

  const step = steps[stepIndex];
  const last = stepIndex === steps.length - 1;
  const other = trackKey === 'competitor' ? 'organizer' : 'competitor';

  // keep a draft so a refresh doesn't lose the answers
  useEffect(() => {
    if (status !== 'done') saveDraft(trackKey, { answers, step: stepIndex });
  }, [answers, stepIndex, status, trackKey]);

  // move focus to the new step's heading (not on the very first render)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    window.scrollTo(0, 0);
    headingRef.current?.focus({ preventScroll: true });
  }, [stepIndex, status]);

  const setAnswer = (id, value) => {
    setAnswers((a) => {
      const next = { ...a, [id]: value };
      if (id === 'degree') {
        delete next.semester; // the semester options depend on the degree
        delete next[otherKey('semester')];
      }
      return next;
    });
    setErrors((e) => {
      if (!e[id]) return e;
      const { [id]: _removed, ...rest } = e;
      return rest;
    });
  };

  const focusFirstError = (errs) => {
    const firstId = step.fields.map((f) => f.id).find((id) => errs[id]);
    if (!firstId) return;
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-field="${firstId}"]`);
      (el?.querySelector('input,textarea,button') || el)?.focus?.();
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
  };

  const submit = async () => {
    setStatus('sending');
    setSubmitError('');
    // bots: hidden field filled, or finished impossibly fast. Pretend it worked, send nothing.
    if (honey || Date.now() - startedAt.current < MIN_FILL_MS) {
      clearDraft(trackKey);
      setStatus('done');
      return;
    }
    try {
      await submitRegistration(buildRow(track, steps, answers));
      saveProfile(answers);
      clearDraft(trackKey);
      setStatus('done');
    } catch (err) {
      setStatus('idle');
      const code = err instanceof ApiError ? err.code : 'failed';
      setSubmitError(
        code === 'duplicate'
          ? `This email is already registered as ${track.name.toLowerCase()}. If that wasn't you, or you need to change something, contact us.`
          : code === 'blocked'
            ? "This email is already registered as a competitor, so it can't register as an organizer. Organizers can take part in both."
          : code === 'network'
            ? "Couldn't reach the server. Check your connection and try again."
            : code === 'not_configured'
              ? 'Registration is not available right now. Please try again later.'
              : 'Something went wrong while sending. Please try again in a moment.'
      );
    }
  };

  const next = (e) => {
    e.preventDefault();
    if (status === 'sending') return;
    const errs = validateStep(step, answers);
    setErrors(errs);
    if (Object.keys(errs).length) return focusFirstError(errs);
    if (last) submit();
    else setStepIndex((i) => i + 1);
  };

  const back = () => {
    setErrors({});
    setSubmitError('');
    setStepIndex((i) => Math.max(0, i - 1));
  };

  const progress = useMemo(
    () => steps.map((s, i) => <span key={s.id} className={`rf-seg${i < stepIndex ? ' done' : ''}${i === stepIndex ? ' now' : ''}`} />),
    [steps, stepIndex]
  );

  if (status === 'done') {
    return (
      <main className="rf">
        <div className="rf-inner">
          <p className="rf-kicker">Register · {track.name}</p>
          <h1 className="rf-title" ref={headingRef} tabIndex={-1}>{track.doneTitle}</h1>
          <p className="rf-lead">{track.doneText}</p>
          <div className="rf-nav">
            <a className="rf-btn rf-btn-primary" href="#">Back home</a>
            {/* organizers may also compete; competitors can't become organizers (enforced in the database too) */}
            {trackKey === 'organizer' && <a className="rf-btn" href={`#register/${other}`}>Also register as {other}</a>}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="rf">
      <form className="rf-inner" onSubmit={next} noValidate>
        <p className="rf-kicker">Register · {track.name}</p>
        <div className="rf-progress" aria-hidden="true">{progress}</div>
        <p className="rf-step" aria-live="polite">Step {stepIndex + 1} of {steps.length}</p>

        <h1 className="rf-title" ref={headingRef} tabIndex={-1}>{step.title}</h1>

        {prefilled && stepIndex === 0 && (
          <p className="rf-devnote">We filled in your details from your earlier registration. Check them.</p>
        )}

        {step.info && (
          <div className="rf-info">
            <h2>{step.info.heading}</h2>
            {step.info.paragraphs.map((p) => <p key={p}>{p}</p>)}
          </div>
        )}

        {step.faq && <Faq />}

        {step.fields.filter((f) => isVisible(f, answers)).map((f) => (
          <Field key={f.id} field={f} answers={answers} setAnswer={setAnswer} error={errors[f.id]} />
        ))}

        {/* honeypot: real people never see or fill this */}
        <div className="rf-honey" aria-hidden="true">
          <label>Website<input type="text" tabIndex={-1} autoComplete="off" value={honey} onChange={(e) => setHoney(e.target.value)} /></label>
        </div>

        {submitError && <p className="rf-error rf-submit-error" role="alert">{submitError}</p>}
        {import.meta.env.DEV && !dbConfigured && last && (
          <p className="rf-devnote">Dev mode: no database configured, so submitting only logs the data in the console.</p>
        )}

        <div className="rf-nav">
          {stepIndex > 0 && <button type="button" className="rf-btn" onClick={back}>Back</button>}
          <button type="submit" className="rf-btn rf-btn-primary" disabled={status === 'sending'}>
            {status === 'sending' ? 'Sending…' : last ? 'Send registration' : 'Next'}
          </button>
        </div>
      </form>
    </main>
  );
}
