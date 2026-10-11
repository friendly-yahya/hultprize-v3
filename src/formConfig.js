// Everything about the registration questions lives here: wording, options, order.
// Edit the text and option lists freely, the form and the database layer adapt.
//
// Field types:
//   text | email | tel   single-line input
//   textarea             multi-line input
//   choice               pick one (chips). `other: true` adds an "Other" chip with a text box
//   multi                pick several (chips). `other: true` adds an "Other" chip with a text box
//   names                a list of full-name boxes the person can add to (team members)
//   confirm              a single checkbox
// A field can have `showIf: (answers) => boolean` to appear only in some cases.

export const MAX_TEAMMATES = 3; // other members besides the person registering (change to match the real team size)

// ---------- shared lists ----------

const UNIVERSITIES = ['Cadi Ayyad', 'UMP', 'UM6P'];

const FACULTIES = ['FSSM', 'FSJES', 'FMPM', 'FST', 'ENSA', 'ENCG', 'EST', 'FLSH', 'ENS'];

const DEGREES = ["Licence", "Master", "PhD", "Cycle d'Ingénieur"];

const range = (n, prefix) => Array.from({ length: n }, (_, i) => `${prefix}${i + 1}`);

// the semester question depends on the degree type
export const SEMESTERS_BY_DEGREE = {
  Licence: { label: 'Current semester', options: range(6, 'S') },
  Master: { label: 'Current semester', options: range(4, 'S') },
  "Cycle d'Ingénieur": { label: 'Current semester', options: range(10, 'S') },
  PhD: { label: 'Current year of the PhD', options: ['Year 1', 'Year 2', 'Year 3', 'Year 4 or more'] },
  Other: { label: 'Current semester or year', options: [] } // empty = free text
};

const OTHER_DEGREE_FALLBACK = { label: 'Current semester or year', options: [] };

export const semesterSpec = (degree) => SEMESTERS_BY_DEGREE[degree] || OTHER_DEGREE_FALLBACK;

export const UN_GOALS = [
  '1. No Poverty',
  '2. Zero Hunger',
  '3. Good Health and Well-being',
  '4. Quality Education',
  '5. Gender Equality',
  '6. Clean Water and Sanitation',
  '7. Affordable and Clean Energy',
  '8. Decent Work and Economic Growth',
  '9. Industry, Innovation and Infrastructure',
  '10. Reduced Inequalities',
  '11. Sustainable Cities and Communities',
  '12. Responsible Consumption and Production',
  '13. Climate Action',
  '14. Life Below Water',
  '15. Life on Land',
  '16. Peace, Justice and Strong Institutions',
  '17. Partnerships for the Goals'
];

const MEMBER_SKILLS = [
  'Graphic design',
  'Video editing',
  'Photography',
  'Social media',
  'Content writing',
  'Public speaking / hosting',
  'Web development',
  'Programming',
  'Event logistics',
  'Sponsorship and fundraising',
  'Partnerships and outreach',
  'Project management',
  'Translation',
  'Finance and budgeting'
];

const BUSINESS_SKILLS = [
  'Programming',
  'Design (UI/UX, graphic)',
  'Marketing',
  'Sales',
  'Finance',
  'Research',
  'Pitching / public speaking',
  'Project management',
  'Data analysis',
  'Engineering / hardware',
  'Writing',
  'Legal'
];

const BLOCKERS = [
  'Finding a good idea',
  'Testing whether the idea works',
  'Building the product',
  'Marketing and finding customers',
  'Pitching and presenting',
  'Legal and administrative steps',
  'Finding a team',
  'Managing my time',
  'Confidence',
  'Understanding finances',
  'Finding mentors and a network'
];

const LANGUAGES = ['Arabic', 'Amazigh', 'French', 'English', 'Spanish'];

const ENGLISH_LEVELS = [
  'Basic',
  'Conversational',
  'Comfortable in presentations',
  'Fluent'
];

// ---------- the general intake, shared by everyone ----------

const INTAKE_STUDIES = {
  id: 'studies',
  title: 'Your studies',
  fields: [
    { id: 'university', type: 'choice', label: 'University', options: UNIVERSITIES, other: true, required: true },
    { id: 'faculty', type: 'choice', label: 'Faculty', options: FACULTIES, other: true, required: true },
    // degree first, then the semester, which depends on it (the form handles that field itself)
    { id: 'degree', type: 'choice', label: 'Degree type', options: DEGREES, other: true, required: true },
    { id: 'semester', type: 'semester', required: true, showIf: (a) => Boolean(a.degree) },
    { id: 'field_of_study', type: 'text', label: 'Field of study', placeholder: 'e.g. Law, Biology', required: true, max: 120 }
  ]
};

const INTAKE_CONTACT = {
  id: 'contact',
  title: 'How to reach you',
  fields: [
    { id: 'full_name', type: 'text', label: 'Full name', autoComplete: 'name', required: true, max: 120 },
    { id: 'whatsapp', type: 'tel', label: 'WhatsApp number', placeholder: '+212 6XX XXX XXX', autoComplete: 'tel', required: true,
      hint: 'We use WhatsApp for most updates.' },
    { id: 'email', type: 'email', label: 'Email', autoComplete: 'email', required: true, max: 254 }
  ]
};

// ---------- organizers (the members track) ----------

const ORGANIZER_STEPS = [
  INTAKE_STUDIES,
  INTAKE_CONTACT,
  {
    id: 'disclaimer',
    title: 'Before you continue',
    info: {
      // Draft wording: edit it so it says exactly what you want to say about last year.
      heading: 'Please read this first',
      paragraphs: [
        'Last year we had reliability problems. Some members signed up and then stopped answering or stopped showing up, and the team ended up short-handed when it mattered most.',
        'This year we only want people who can follow through. Being a member means coming to meetings, replying to messages within a couple of days, and finishing the tasks you take on.',
        "If that doesn't fit your schedule right now, it's better to say so now. There's no problem with that."
      ]
    },
    fields: []
  },
  {
    id: 'member-skills',
    title: 'Your skills',
    fields: [
      { id: 'skills_have', type: 'multi', label: 'Skills you currently have', options: MEMBER_SKILLS, other: true, required: true,
        hint: 'Pick all that apply.' },
      { id: 'skills_want', type: 'multi', label: 'Skills you want to learn', options: MEMBER_SKILLS, other: true, required: false,
        hint: 'Optional.' }
    ]
  },
  {
    id: 'commitment',
    title: 'Commitment',
    fields: [
      { id: 'commitment', type: 'choice', label: 'Can you commit to being present?', required: true,
        options: ["Yes, I'm committed and will be present", 'I want to join but I may miss some meetings', "I'm not sure yet"] },
      { id: 'wants_from_club', type: 'textarea', label: 'What would help you, and what do you want from the club?', max: 1000,
        placeholder: 'Anything you want to learn, get or change.' },
      { id: 'consent', type: 'confirm', required: true,
        label: 'I agree that the FSSM Hult Prize team can contact me on WhatsApp and by email about this registration.' }
    ]
  }
];

// ---------- competitors ----------

// Short FAQ shown to competitors. Edit the answers so they match the real rules and dates.
export const COMPETITION_FAQ = [
  {
    q: 'What is the Hult Prize?',
    a: 'A global competition where student teams build startup ideas that tackle real social problems. The winning team receives $1M in funding. This registration is for the Hult Prize at FSSM.'
  },
  {
    q: 'Do I need a finished idea?',
    a: "No. Tell us what you have so far, even if it's only a direction. The questions below help us support you."
  },
  {
    q: 'Do I need a team?',
    a: "No. You can register alone and tell us you're looking for teammates, or register with a full team."
  },
  {
    q: 'What happens after I register?',
    a: "We'll contact you on WhatsApp or by email with the next steps."
  }
];

// "What you get" section, to discuss later. Leave empty to hide it.
export const COMPETITION_BENEFITS = [];

const COMPETITOR_STEPS = [
  INTAKE_STUDIES,
  INTAKE_CONTACT,
  {
    id: 'faq',
    title: 'About the competition',
    faq: true,
    fields: []
  },
  {
    id: 'idea',
    title: 'Your idea',
    fields: [
      { id: 'has_idea', type: 'choice', label: 'Do you have an idea that addresses a UN Sustainable Development Goal?', required: true,
        options: ['Yes, I have an idea', 'I have a rough direction', 'Not yet'] },
      { id: 'un_goals', type: 'multi', label: 'Which goals does it address?', options: UN_GOALS, max: 3, required: true,
        hint: 'Pick up to 3.', showIf: (a) => a.has_idea === 'Yes, I have an idea' || a.has_idea === 'I have a rough direction' },
      { id: 'idea_summary', type: 'textarea', label: 'Describe it in one or two sentences', max: 600,
        showIf: (a) => a.has_idea === 'Yes, I have an idea' || a.has_idea === 'I have a rough direction' }
    ]
  },
  {
    id: 'competitor-skills',
    title: 'Your skills',
    fields: [
      { id: 'skills_have', type: 'multi', label: 'Skills you have', options: BUSINESS_SKILLS, other: true, required: true,
        hint: 'Pick all that apply.' },
      { id: 'blockers', type: 'multi', label: 'Besides money, what is stopping you from starting a business?', options: BLOCKERS, other: true,
        required: true, hint: 'Pick all that apply.' }
    ]
  },
  {
    id: 'team',
    title: 'Your team',
    fields: [
      { id: 'team_status', type: 'choice', label: 'Team status', required: true,
        options: ["I'm looking for team members", 'I already have a full team'] },
      { id: 'teammates', type: 'names', label: 'Full names of your teammates', max: MAX_TEAMMATES, required: true,
        hint: 'Each teammate also needs to register.', showIf: (a) => a.team_status === 'I already have a full team' }
    ]
  },
  {
    id: 'languages',
    title: 'Languages',
    fields: [
      { id: 'languages', type: 'multi', label: 'Languages you speak', options: LANGUAGES, other: true, required: true },
      { id: 'english_level', type: 'choice', label: 'How comfortable are you in English?', options: ENGLISH_LEVELS, required: true },
      { id: 'consent', type: 'confirm', required: true,
        label: 'I agree that the FSSM Hult Prize team can contact me on WhatsApp and by email about this registration.' }
    ]
  }
];

// ---------- exports ----------

export const TRACKS = {
  competitor: {
    key: 'competitor',
    name: 'Competitor',
    steps: COMPETITOR_STEPS,
    doneTitle: "You're registered.",
    doneText: "Thanks for registering as a competitor. We'll contact you on WhatsApp or by email with the next steps."
  },
  organizer: {
    key: 'organizer',
    name: 'Organizer',
    steps: ORGANIZER_STEPS,
    doneTitle: "You're registered.",
    doneText: "Thanks for joining as an organizer. We'll contact you on WhatsApp or by email soon."
  }
};

// the answers stored as real database columns; everything else goes into the `details` JSON
export const INTAKE_COLUMNS = ['university', 'faculty', 'degree', 'semester', 'field_of_study', 'full_name', 'whatsapp', 'email'];
