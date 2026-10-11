import { INTAKE_COLUMNS, semesterSpec } from './formConfig.js';

// ---------- field helpers ----------

export const isVisible = (field, answers) => !field.showIf || field.showIf(answers);

// the semester field is built from the chosen degree
export const resolveField = (field, answers) => {
  if (field.type !== 'semester') return field;
  const spec = semesterSpec(answers.degree);
  return spec.options.length
    ? { ...field, type: 'choice', label: spec.label, options: spec.options }
    : { ...field, type: 'text', label: spec.label, placeholder: 'e.g. S3 or Year 2', max: 40 };
};

export const OTHER = 'Other';
export const otherKey = (id) => `${id}__other`;

// ---------- phone ----------

// Accepts +212 6XX XXX XXX, 06XX XXX XXX, 00212..., or other international numbers. Returns +<digits> or null.
export function normalizePhone(raw) {
  let s = String(raw || '').replace(/[\s().-]/g, '');
  if (s.startsWith('00')) s = '+' + s.slice(2);
  if (/^0[5-7]\d{8}$/.test(s)) s = '+212' + s.slice(1);
  else if (/^[5-7]\d{8}$/.test(s)) s = '+212' + s;
  return /^\+\d{8,15}$/.test(s) ? s : null;
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const hasTwoWords = (s) => s.trim().split(/\s+/).filter(Boolean).length >= 2;

// ---------- validation ----------

// Returns { fieldId: message } for the visible fields of one step. Empty object = valid.
export function validateStep(step, answers) {
  const errors = {};
  for (const raw of step.fields) {
    if (!isVisible(raw, answers)) continue;
    const f = resolveField(raw, answers);
    const v = answers[f.id];
    const text = typeof v === 'string' ? v.trim() : '';

    switch (f.type) {
      case 'text':
      case 'textarea':
      case 'email':
      case 'tel': {
        if (f.required && !text) { errors[f.id] = 'This is required.'; break; }
        if (!text) break;
        if (f.max && text.length > f.max) errors[f.id] = `Keep it under ${f.max} characters.`;
        else if (f.type === 'email' && !EMAIL_RE.test(text)) errors[f.id] = 'Enter a valid email address.';
        else if (f.type === 'tel' && !normalizePhone(text)) errors[f.id] = 'Enter a valid number, e.g. +212 6XX XXX XXX.';
        else if (f.id === 'full_name' && !hasTwoWords(text)) errors[f.id] = 'Enter your first and last name.';
        break;
      }
      case 'choice': {
        if (f.required && !v) errors[f.id] = 'Choose one option.';
        else if (v === OTHER && !String(answers[otherKey(f.id)] || '').trim()) errors[f.id] = 'Tell us what "Other" is.';
        break;
      }
      case 'multi': {
        const list = Array.isArray(v) ? v : [];
        if (f.required && list.length === 0) errors[f.id] = 'Choose at least one option.';
        else if (f.max && list.length > f.max) errors[f.id] = `Choose up to ${f.max}.`;
        else if (list.includes(OTHER) && !String(answers[otherKey(f.id)] || '').trim()) errors[f.id] = 'Tell us what "Other" is.';
        break;
      }
      case 'names': {
        const list = (Array.isArray(v) ? v : ['']).map((n) => n.trim());
        if (f.required && list.every((n) => !n)) errors[f.id] = 'Add at least one name.';
        else if (list.some((n) => !n || !hasTwoWords(n))) errors[f.id] = 'Enter the first and last name of each teammate.';
        break;
      }
      case 'confirm': {
        if (f.required && !v) errors[f.id] = 'Please confirm to continue.';
        break;
      }
      default:
        break;
    }
  }
  return errors;
}

// ---------- building what gets stored ----------

const resolveOther = (id, value, answers) => {
  const extra = String(answers[otherKey(id)] || '').trim();
  if (Array.isArray(value)) return value.map((x) => (x === OTHER ? `Other: ${extra}` : x));
  return value === OTHER ? `Other: ${extra}` : value;
};

// One flat row: the intake answers as columns, track-specific answers in `details`.
export function buildRow(track, steps, answers) {
  const row = { track: track.key, details: {} };
  for (const step of steps) {
    for (const raw of step.fields) {
      if (!isVisible(raw, answers)) continue; // answers to questions that were hidden again are dropped
      const f = resolveField(raw, answers);
      let value = answers[f.id];
      if (f.type === 'confirm') value = Boolean(value);
      else if (f.type === 'names') value = (Array.isArray(value) ? value : []).map((n) => n.trim()).filter(Boolean);
      else if (f.type === 'multi') value = resolveOther(f.id, Array.isArray(value) ? value : [], answers);
      else if (typeof value === 'string') value = resolveOther(f.id, value.trim(), answers);
      else if (value === undefined) continue;

      if (f.id === 'whatsapp') value = normalizePhone(value);
      if (f.id === 'email') value = value.toLowerCase();
      if (value === '' || (Array.isArray(value) && value.length === 0)) continue;

      if (INTAKE_COLUMNS.includes(f.id)) row[f.id] = value;
      else row.details[f.id] = value;
    }
  }
  return row;
}
