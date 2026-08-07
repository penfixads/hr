// The assessment question bank, its answer keys, and the scoring rules.
//
// No 'next/headers' or service-role import here, so the applicant-facing form component can
// import it into the browser bundle safely (same split as lib/applicants.ts vs
// lib/applicants-server.ts, and lib/attendance-shared.ts vs lib/attendance.ts).
//
// A NOTE ON THE ANSWER KEYS BEING IN THE BROWSER BUNDLE: the `weight` on every choice ships
// to the applicant's browser, so a determined applicant could read the "best" answers out of
// devtools. That is accepted deliberately — this exam screens for honesty and attention, and
// someone willing to inspect the bundle to game it has told us something useful. What must
// NOT leak is the applicant's resulting score, which is computed and stored server-side
// (lib/assessment-server.ts) and shown only on the admin review page. If that trade stops
// being acceptable, move SECTIONS behind a server action and post answers as opaque ids.

export const ASSESSMENT_ROLES = ['Graphic Artist', 'Client Frontliner', 'Sales Encoder'] as const
export type AssessmentRole = (typeof ASSESSMENT_ROLES)[number]

const ALL_ROLES = ASSESSMENT_ROLES

// `best` scores a point. `weak` scores nothing; `ok` also scores nothing but is a defensible
// answer, so the two are kept apart to make the intent of each key readable. `flag` is
// separate from the weight on purpose: it marks answers a reviewer should actually talk
// about at interview (integrity concerns), not merely sub-optimal ones — per the build spec,
// these raise attention rather than hard-failing anyone.
export type Weight = 'best' | 'ok' | 'weak'
export type Choice = { text: string; weight: Weight; flag?: true }

export type Question =
  | { id: string; kind: 'choice'; prompt: string; choices: readonly Choice[]; figure?: 'alignment-grid' }
  | { id: string; kind: 'short'; prompt: string; accept: readonly string[]; placeholder?: string }
  | { id: string; kind: 'essay'; prompt: string }
  | { id: string; kind: 'ranking'; prompt: string; items: readonly string[] }

export type Section = {
  id: string
  title: string
  intro?: string
  roles: readonly AssessmentRole[]
  // Whether this section contributes to the auto-score. The essay section is false: it goes
  // to a human with a rubric instead.
  scored: boolean
  questions: readonly Question[]
}

// ---------------------------------------------------------------------------
// Sections 1-4 and the instruction module are ported from the Google Form verbatim,
// including every distractor, so scores stay comparable with the 16 responses already
// collected there.
// ---------------------------------------------------------------------------

const PERSONALITY: Section = {
  id: 'personality',
  title: 'Personality & Work Style',
  intro: 'Select the option that best reflects how you usually think or act in a work setting.',
  roles: ALL_ROLES,
  scored: true,
  questions: [
    {
      id: 's1_deadline',
      kind: 'choice',
      prompt: 'When given a task with a tight deadline, you:',
      choices: [
        { text: 'Focus completely and deliver as best as you can', weight: 'best' },
        { text: 'Feel stressed but try your best to complete it', weight: 'ok' },
        { text: 'Ask for help or more time immediately', weight: 'weak' },
        { text: 'Tend to get overwhelmed and procrastinate', weight: 'weak' },
      ],
    },
    {
      id: 's1_working_style',
      kind: 'choice',
      prompt: 'You prefer working',
      choices: [
        { text: 'Alone and undisturbed', weight: 'ok' },
        // Penfix runs as a small team that covers for each other; this is a culture-fit
        // signal rather than a right/wrong answer, so nothing here is marked weak.
        { text: 'In a small team', weight: 'best' },
        { text: 'With guidance from a supervisor', weight: 'ok' },
        { text: 'In a fast-paced, noisy environment', weight: 'ok' },
      ],
    },
    {
      id: 's1_criticism',
      kind: 'choice',
      prompt: 'When your work is criticized, you:',
      choices: [
        { text: 'Feel bad but accept the feedback', weight: 'ok' },
        { text: 'Defend your work strongly', weight: 'weak' },
        { text: 'Ask for suggestions to improve', weight: 'best' },
        { text: 'Get discouraged and demotivated', weight: 'weak' },
      ],
    },
  ],
}

const ETHICS: Section = {
  id: 'ethics',
  title: 'Work Ethics & Accountability',
  intro: 'Choose the most appropriate response.',
  roles: ALL_ROLES,
  scored: true,
  questions: [
    {
      id: 's2_tip',
      kind: 'choice',
      prompt: 'A client gave you an additional ₱200 tip for a rush service. Company policy says tips must be reported. You:',
      choices: [
        { text: "Keep it — it's a personal reward", weight: 'weak', flag: true },
        { text: 'Ask your coworkers what to do', weight: 'ok' },
        { text: 'Inform your supervisor right away', weight: 'best' },
        { text: 'Refuse to receive the tip', weight: 'ok' },
      ],
    },
    {
      id: 's2_missed_entry',
      kind: 'choice',
      prompt: 'You noticed a sales entry was missed yesterday. What would you do?',
      choices: [
        { text: 'Immediately input and inform the team', weight: 'best' },
        { text: 'Ignore it unless asked', weight: 'weak', flag: true },
        { text: "Mention it to a teammate but don't act", weight: 'ok' },
        { text: 'Wait for someone else to correct it', weight: 'weak' },
      ],
    },
    {
      id: 's2_late',
      kind: 'choice',
      // Self-report integrity questions are subject to social-desirability bias — the build
      // spec's note applies here. Treat a "best" answer as worth confirming at interview
      // rather than as proof of anything.
      prompt: 'You were late by 15 minutes, but no one noticed. What do you do?',
      choices: [
        { text: 'Still mark yourself late', weight: 'best' },
        { text: 'Keep quiet', weight: 'weak', flag: true },
        { text: 'Say the traffic was bad if someone asks', weight: 'weak', flag: true },
        { text: 'Joke about it so it seems casual', weight: 'weak' },
      ],
    },
  ],
}

const CLIENT_HANDLING: Section = {
  id: 'client_handling',
  title: 'Client Handling & Service Attitude',
  roles: ALL_ROLES,
  scored: true,
  questions: [
    {
      id: 's3_rude',
      kind: 'choice',
      prompt: 'A client is being rude and impatient. You:',
      choices: [
        { text: 'Stay calm and continue assisting professionally', weight: 'best' },
        { text: 'Avoid talking and let someone else handle them', weight: 'weak' },
        { text: 'Respond with an irritated tone', weight: 'weak', flag: true },
        { text: 'Try to finish the transaction quickly without further talk', weight: 'ok' },
      ],
    },
    {
      id: 's3_bypass',
      kind: 'choice',
      prompt: 'A client insists their request is urgent and bypasses the process. You:',
      choices: [
        { text: 'Explain the process clearly but remain kind', weight: 'best' },
        { text: 'Prioritize them to avoid conflict', weight: 'ok' },
        { text: 'Tell them rules are rules — take it or leave it', weight: 'weak' },
        { text: 'Refer them to your supervisor immediately', weight: 'ok' },
      ],
    },
    {
      id: 's3_vague',
      kind: 'choice',
      prompt: 'You received a vague instruction. You:',
      choices: [
        { text: 'Ask follow-up questions to clarify', weight: 'best' },
        { text: 'Proceed based on assumption', weight: 'weak' },
        { text: 'Delay the task until the client calls again', weight: 'weak' },
        { text: 'Make a generic layout and hope it fits', weight: 'weak' },
      ],
    },
  ],
}

const INTEGRITY: Section = {
  id: 'integrity',
  title: 'Integrity & Honesty',
  roles: ALL_ROLES,
  scored: true,
  questions: [
    {
      id: 's4_coworker_record',
      kind: 'choice',
      prompt: "You were left alone at the front desk and saw a co-worker's sales record is incomplete. What do you do?",
      choices: [
        { text: 'Inform them and suggest they correct it', weight: 'best' },
        { text: 'Edit it for them', weight: 'ok' },
        { text: 'Report them immediately to your supervisor', weight: 'ok' },
        { text: 'Ignore it', weight: 'weak', flag: true },
      ],
    },
    {
      id: 's4_own_error',
      kind: 'choice',
      prompt: 'You made an error in the work and the client already paid. You:',
      choices: [
        { text: 'Own up and offer to correct it', weight: 'best' },
        { text: 'Wait to see if the client notices', weight: 'weak', flag: true },
        { text: 'Tell the client it was part of the design', weight: 'weak', flag: true },
        { text: 'Make excuses to avoid blame', weight: 'weak', flag: true },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// AUTHORED — not in the Google Form. Every Penfix role is client-facing, graphic artists
// included (they present layouts and take revisions directly), so this module is asked of
// all three roles rather than being frontliner-only.
// ---------------------------------------------------------------------------

const SERVICE: Section = {
  id: 'service',
  title: 'Service & Communication',
  intro: 'Every role at Penfix deals with clients directly. Choose the response closest to what you would actually do.',
  roles: ALL_ROLES,
  scored: true,
  questions: [
    {
      id: 'sc_policy',
      kind: 'choice',
      prompt: "A client asks for something store policy doesn't allow — a discount you can't give, or a turnaround the shop can't meet. You:",
      choices: [
        { text: 'Say yes to keep them happy and sort it out later', weight: 'weak', flag: true },
        { text: "Tell them plainly it isn't allowed and end the conversation", weight: 'weak' },
        { text: "Explain what you can't do, then offer the closest option you can", weight: 'best' },
        { text: "Say you'll check, then avoid following up", weight: 'weak', flag: true },
      ],
    },
    {
      id: 'sc_two_clients',
      kind: 'choice',
      prompt: 'Two clients arrive at once — one collecting a finished order, one asking for a new quotation. You:',
      choices: [
        { text: 'Acknowledge both, release the pickup first, then give the quotation your full attention', weight: 'best' },
        { text: 'Serve whoever spoke first and let the other wait unattended', weight: 'ok' },
        { text: 'Start the quotation because it is the bigger sale', weight: 'weak' },
        { text: 'Ask them to settle between themselves who goes first', weight: 'weak' },
      ],
    },
    {
      id: 'sc_after_hours',
      kind: 'choice',
      prompt: 'A client messages the shop page at 8 PM, after closing, asking for a price. The best response is:',
      choices: [
        { text: 'Leave it unread so it does not set an expectation', weight: 'weak' },
        { text: 'Reply the next working morning with the price and a short apology for the wait', weight: 'best' },
        { text: 'Send a price from memory right away so they do not wait', weight: 'ok' },
        { text: 'Mark it seen and wait for them to follow up', weight: 'weak' },
      ],
    },
    {
      id: 'sc_defend_work',
      kind: 'choice',
      prompt: 'A client pushes back hard on a choice you know is correct. You:',
      choices: [
        { text: 'Change it immediately — the client is always right', weight: 'ok' },
        { text: 'Explain the reason behind the choice, show an alternative, and let them decide', weight: 'best' },
        { text: 'Insist on your version because you are the trained one', weight: 'weak' },
        { text: 'Change it, but tell them afterwards that it will look wrong', weight: 'weak' },
      ],
    },
    {
      id: 'sc_ideal_experience',
      kind: 'essay',
      prompt: 'Describe the experience you would want a client to have walking into a small, family-run print shop. What would make them come back?',
    },
  ],
}

// ---------------------------------------------------------------------------
// Graphic Artist only — ported from the Google Form's Section 6, all 12 items.
// ---------------------------------------------------------------------------

const VISUAL: Section = {
  id: 'visual',
  title: 'Visual Accuracy & Layout Logic',
  intro: 'An applied test. Take your time and look closely.',
  roles: ['Graphic Artist'],
  scored: true,
  questions: [
    {
      id: 'v_alignment',
      kind: 'choice',
      // The Google Form used an uploaded image here. Redrawn as inline SVG in the form
      // component so it stays sharp at any size and can be corrected without re-uploading.
      figure: 'alignment-grid',
      prompt: "Spot the alignment issue. Look at the layout below and identify what's wrong:",
      choices: [
        { text: 'Texts are misaligned vertically', weight: 'best' },
        { text: 'Margins are not equal', weight: 'ok' },
        { text: 'Font sizes are inconsistent', weight: 'ok' },
        { text: 'Nothing is wrong', weight: 'ok' },
      ],
    },
    {
      id: 'v_hierarchy',
      kind: 'choice',
      prompt: "Hierarchy check: which layout principle helps guide the reader's eye first to the most important message?",
      choices: [
        { text: 'Balance', weight: 'ok' },
        { text: 'Contrast', weight: 'best' },
        { text: 'Proximity', weight: 'ok' },
        { text: 'White space', weight: 'ok' },
      ],
    },
    {
      id: 'v_logo_bigger',
      kind: 'choice',
      prompt: "Quick fix scenario: a client insists their logo must be bigger, but doing so ruins the layout. What's the best response?",
      choices: [
        { text: "Follow the client's request exactly", weight: 'ok' },
        { text: 'Explain the design reason and offer a balanced alternative', weight: 'best' },
        { text: 'Increase the logo drastically just to avoid conflict', weight: 'weak' },
        { text: 'Ignore the concern', weight: 'weak' },
      ],
    },
    {
      id: 'v_spelling',
      kind: 'short',
      prompt:
        'Attention drill: count the number of spelling errors in this text —\n' +
        '"Thank you for chooseing Penfix. We garanty quallity and profeshunal service. Your brand is importent to us."',
      // chooseing, garanty, quallity, profeshunal, importent
      accept: ['5', 'five'],
      placeholder: 'e.g. 4',
    },
    {
      id: 'v_font_pairing',
      kind: 'choice',
      prompt: 'Font match task: which combination below best uses font pairing principles?',
      choices: [
        { text: 'Times New Roman + Arial Black', weight: 'ok' },
        { text: 'Montserrat Bold + Montserrat Light', weight: 'best' },
        { text: 'Comic Sans + Courier New', weight: 'ok' },
        { text: 'Impact + Papyrus', weight: 'ok' },
      ],
    },
    {
      id: 'v_whitespace',
      kind: 'choice',
      prompt: 'Whitespace recognition: why is whitespace important in layout design?',
      choices: [
        { text: 'It fills gaps', weight: 'ok' },
        { text: 'It increases ink coverage', weight: 'ok' },
        { text: 'It creates breathing room and visual balance', weight: 'best' },
        { text: 'It is unnecessary if all space is used wisely', weight: 'ok' },
      ],
    },
    {
      id: 'v_color_psych',
      kind: 'choice',
      prompt: 'Color psychology: which color generally evokes trust and professionalism?',
      choices: [
        { text: 'Blue', weight: 'best' },
        { text: 'Red', weight: 'ok' },
        { text: 'Yellow', weight: 'ok' },
        { text: 'Orange', weight: 'ok' },
      ],
    },
    {
      id: 'v_five_fonts',
      kind: 'choice',
      prompt: "Client request review: a client asks to use 5 different fonts in one poster. What's the best response?",
      choices: [
        { text: 'Approve if the client insists', weight: 'ok' },
        { text: 'Suggest a cleaner approach with 2 font families max', weight: 'best' },
        { text: 'Use all fonts equally', weight: 'ok' },
        { text: 'Ask the production team to decide', weight: 'ok' },
      ],
    },
    {
      id: 'v_alignment_docs',
      kind: 'choice',
      prompt: 'Alignment practice: which alignment is most professional for official documents?',
      choices: [
        { text: 'Centered', weight: 'ok' },
        { text: 'Justified', weight: 'ok' },
        { text: 'Left-aligned', weight: 'best' },
        { text: 'Right-aligned', weight: 'ok' },
      ],
    },
    {
      id: 'v_contrast',
      kind: 'choice',
      prompt: 'Color contrast check: which color combination ensures the best readability?',
      choices: [
        { text: 'Red on green', weight: 'ok' },
        { text: 'Yellow on white', weight: 'ok' },
        { text: 'Black on white', weight: 'best' },
        { text: 'Blue on red', weight: 'ok' },
      ],
    },
    {
      id: 'v_cropping',
      kind: 'choice',
      prompt: 'Cropping decision: when resizing images for layout, what should you avoid?',
      choices: [
        { text: 'Keeping resolution intact', weight: 'ok' },
        { text: 'Cropping faces or text', weight: 'best' },
        { text: 'Keeping proportions', weight: 'ok' },
        { text: 'Using high-resolution versions', weight: 'ok' },
      ],
    },
    {
      id: 'v_logo_rule',
      kind: 'choice',
      prompt: "Logo rule: which is the best practice for using a client's logo?",
      choices: [
        { text: 'Resize freely to fit the design', weight: 'ok' },
        { text: 'Stretch to fill the space', weight: 'ok' },
        { text: 'Maintain aspect ratio and respect clear space', weight: 'best' },
        { text: 'Recolor for visual impact', weight: 'ok' },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// AUTHORED — Sales Encoder only. The Google Form had no encoder module at all; these
// mirror the visual module's job: test the accuracy the role actually lives on, plus the
// honesty questions specific to handling cash and records.
// ---------------------------------------------------------------------------

const ENCODING: Section = {
  id: 'encoding',
  title: 'Accuracy & Data Handling',
  intro: 'Encoding is where small mistakes become expensive. Take your time.',
  roles: ['Sales Encoder'],
  scored: true,
  questions: [
    {
      id: 'se_spot_error',
      kind: 'choice',
      prompt:
        'A sales entry reads: 3 pcs tarpaulin at ₱450 each, 2 pcs sticker at ₱120 each, total recorded ₱1,950. What is wrong?',
      choices: [
        { text: 'The total is overstated — it should be ₱1,590', weight: 'best' },
        { text: 'The total is understated — it should be ₱2,310', weight: 'ok' },
        { text: 'Nothing is wrong; the total is correct', weight: 'ok' },
        { text: 'The sticker price was left out of the total', weight: 'ok' },
      ],
    },
    {
      id: 'se_cash_discrepancy',
      kind: 'choice',
      prompt: 'At closing, cash on hand is ₱800 short of recorded sales. You:',
      choices: [
        { text: 'Recount, check for an unrecorded expense or missed entry, then report the shortage the same day', weight: 'best' },
        { text: 'Cover it from your own pocket so the books balance', weight: 'weak', flag: true },
        { text: 'Adjust the recorded sales down to match the cash', weight: 'weak', flag: true },
        { text: 'Leave it and see if it evens out tomorrow', weight: 'weak', flag: true },
      ],
    },
    {
      id: 'se_duplicate',
      kind: 'choice',
      prompt: 'You realise you encoded an order that a teammate had already encoded. You:',
      choices: [
        { text: 'Void the duplicate, note why, and tell the teammate', weight: 'best' },
        { text: 'Delete one quietly so nobody notices', weight: 'weak', flag: true },
        { text: 'Leave both — the totals will be fixed at audit', weight: 'weak', flag: true },
        { text: 'Wait for someone to catch it', weight: 'weak' },
      ],
    },
    {
      id: 'se_illegible',
      kind: 'choice',
      prompt: 'A handwritten order slip has an amount you cannot read clearly. You:',
      choices: [
        { text: 'Ask the person who wrote it before encoding', weight: 'best' },
        { text: 'Encode your best guess and move on', weight: 'weak', flag: true },
        { text: 'Leave the field blank and continue', weight: 'ok' },
        { text: 'Round it to the nearest hundred', weight: 'weak' },
      ],
    },
    {
      id: 'se_backlog',
      kind: 'choice',
      prompt: 'You have 40 entries to encode before closing and you are running out of time. You:',
      choices: [
        { text: 'Keep the same accuracy and tell your supervisor early that some will carry to tomorrow', weight: 'best' },
        { text: 'Speed up and accept a few mistakes — the total is what matters', weight: 'weak' },
        { text: 'Encode the big-ticket ones and leave the small ones', weight: 'weak' },
        { text: 'Stay late without telling anyone and rush through them', weight: 'ok' },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// Instruction comprehension — ported from the Google Form, all 7 items, all roles.
// ---------------------------------------------------------------------------

const INSTRUCTION: Section = {
  id: 'instruction',
  title: 'Instruction Comprehension',
  intro: 'These test how exactly you follow instructions, and when you stop to ask.',
  roles: ALL_ROLES,
  scored: true,
  questions: [
    {
      id: 'ic_clarity',
      kind: 'choice',
      prompt:
        'You were given this instruction: "Create a 12x18 inch vertical tarpaulin design with the Penfix logo at the top center, and a quote in script font at the bottom." Which output best follows it?',
      choices: [
        { text: 'Landscape 12x18 layout with logo on the bottom right', weight: 'ok' },
        { text: 'Portrait 12x18 with centered logo at top and quote in script font at bottom', weight: 'best' },
        { text: 'Square layout with quote centered and no logo', weight: 'ok' },
        { text: 'Portrait 12x18 with quote in bold font at the top', weight: 'ok' },
      ],
    },
    {
      id: 'ic_steps',
      kind: 'choice',
      prompt:
        'Your supervisor says: "Use the template on the shared drive, change only the name and date, then export to PDF." What should you do?',
      choices: [
        { text: 'Change layout elements to make it look better', weight: 'weak' },
        { text: 'Edit name and date only, then export as instructed', weight: 'best' },
        { text: 'Make it from scratch using your own layout', weight: 'weak' },
        { text: 'Ask someone else what the supervisor meant', weight: 'ok' },
      ],
    },
    {
      id: 'ic_recall',
      kind: 'choice',
      prompt:
        'A client gives a verbal instruction with 3 parts: "Make the background light blue, change the font to Montserrat, and add a thank you message at the end." What is the best way to proceed?',
      choices: [
        { text: 'Follow the two parts you remember and guess the rest', weight: 'weak' },
        { text: 'Write it down or ask them to repeat it to ensure clarity', weight: 'best' },
        { text: 'Just do what seems right', weight: 'weak' },
        { text: 'Ask your coworker what they think it meant', weight: 'ok' },
      ],
    },
    {
      id: 'ic_multiple',
      kind: 'choice',
      prompt:
        'A client message says: "Please print this in A3 size, add a QR code at the bottom right, and use our new logo (sent via email)." What should you prioritize?',
      choices: [
        { text: 'Print it immediately using the old logo', weight: 'weak' },
        { text: 'Wait for clearer instruction', weight: 'ok' },
        { text: 'Review the email for the logo, confirm the size, and place the QR as instructed', weight: 'best' },
        { text: 'Ask a teammate what they think it means', weight: 'ok' },
      ],
    },
    {
      id: 'ic_order',
      kind: 'choice',
      prompt:
        'Your boss writes: "Prepare the mock-up first, send it for client approval, then proceed to production." What should you do?',
      choices: [
        { text: 'Skip the mock-up to save time', weight: 'weak' },
        { text: 'Print first and prepare the mock-up later', weight: 'weak' },
        { text: 'Do the steps in the exact order provided', weight: 'best' },
        { text: 'Ask the client to confirm before doing anything', weight: 'ok' },
      ],
    },
    {
      id: 'ic_followup',
      kind: 'choice',
      prompt: 'A client says: "I\'ll send the final copy this afternoon. Please don\'t print yet." What should you do?',
      choices: [
        { text: 'Print the current version while waiting', weight: 'weak', flag: true },
        { text: 'Wait until you receive the file before printing', weight: 'best' },
        { text: 'Assume no changes are coming and proceed', weight: 'weak', flag: true },
        { text: 'Tell the production team to print in advance', weight: 'weak' },
      ],
    },
    {
      id: 'ic_verify',
      kind: 'choice',
      prompt: 'You are unsure if the file resolution meets print standards. What should you do?',
      choices: [
        { text: 'Print it and let the client deal with the result', weight: 'weak', flag: true },
        { text: 'Resize the file and hope for the best', weight: 'weak' },
        { text: 'Confirm the resolution or ask for a higher quality file', weight: 'best' },
        { text: 'Just sharpen the file without checking resolution', weight: 'weak' },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// Essays + values ranking. NOT auto-scored — these go to a reviewer with the rubric below.
// Items 1-4 are ported from the Google Form; the rest are authored, covering the culture
// signals the original form never asked about (family, resilience, motivation, tenure,
// growth) per the build spec.
// ---------------------------------------------------------------------------

export const VALUES_RANKING_ITEMS = [
  'Salary',
  'Learning opportunities',
  'Career growth',
  'Work-life balance',
  'Team culture',
  'Job stability',
  'Recognition',
  'Creative freedom',
] as const

const ESSAYS: Section = {
  id: 'essays',
  title: 'Reflections',
  intro:
    'There are no right answers here — write in your own words, in English or Filipino, whichever you think in. A few honest sentences beat a long polished one.',
  roles: ALL_ROLES,
  scored: false,
  questions: [
    { id: 'e_honesty', kind: 'essay', prompt: 'How do you define honesty in the workplace?' },
    { id: 'e_angry_client', kind: 'essay', prompt: 'Describe how you would handle a very angry client yelling at you.' },
    {
      id: 'e_small_unethical',
      kind: 'essay',
      prompt:
        'What would you do if you saw a teammate doing something unethical but small — extending personal break time, or taking office supplies?',
    },
    {
      id: 'e_creative_responsible',
      kind: 'essay',
      prompt: 'Why do you think being both creative and responsible is important in a company like Penfix?',
    },
    {
      id: 'e_work_family',
      kind: 'essay',
      prompt: 'What does being part of a "work family" mean to you, and how would you contribute to that at Penfix?',
    },
    {
      id: 'e_failure',
      kind: 'essay',
      prompt: 'Describe a time you failed at something, and how you recovered.',
    },
    { id: 'e_why_penfix', kind: 'essay', prompt: 'What attracted you to Penfix, specifically?' },
    { id: 'e_three_years', kind: 'essay', prompt: 'Where do you see yourself in three years?' },
    { id: 'e_would_leave', kind: 'essay', prompt: 'What would make you leave a company?' },
    {
      id: 'e_commitment',
      kind: 'essay',
      prompt: 'Describe a time you stayed committed to a difficult project or responsibility.',
    },
    {
      id: 'e_next_learn',
      kind: 'essay',
      prompt: 'If you mastered your current role, what would you want to learn next?',
    },
    { id: 'e_manager', kind: 'essay', prompt: 'What kind of manager brings out your best work?' },
    {
      id: 'values_ranking',
      kind: 'ranking',
      prompt: 'Rank these from most important to least important to you.',
      items: VALUES_RANKING_ITEMS,
    },
  ],
}

// Order matters — this is the order the applicant sees. The role modules sit between the
// shared behavioural sections and instruction comprehension, so the exam opens and closes
// the same way for everyone.
export const SECTIONS: readonly Section[] = [
  PERSONALITY,
  ETHICS,
  CLIENT_HANDLING,
  INTEGRITY,
  SERVICE,
  VISUAL,
  ENCODING,
  INSTRUCTION,
  ESSAYS,
]

export function sectionsForRole(role: AssessmentRole): Section[] {
  return SECTIONS.filter(s => s.roles.includes(role))
}

// The rubric a reviewer fills in over the essay answers, each 1-5.
export const RUBRIC_CRITERIA = [
  'Honesty',
  'Composure',
  'Self-awareness',
  'Culture fit',
  'Growth orientation',
] as const
export type RubricCriterion = (typeof RUBRIC_CRITERIA)[number]
export type Rubric = Partial<Record<RubricCriterion, number>>

export type AssessmentAnswers = Record<string, string | string[]>

export type ScoreResult = {
  score: number
  max: number
  flags: string[]
  askedIds: string[]
}

// Normalises a short answer for comparison: the spelling-count question should accept "5",
// "five", and " 5 " alike, but nothing looser than that — this is not fuzzy matching.
function normalise(v: string) {
  return v.trim().toLowerCase().replace(/[.\s]+$/, '')
}

// Pure so it can run on the server at submit time and, identically, in a unit test. The
// server is the only caller that matters — see the note at the top of this file about the
// applicant never seeing their own score.
export function scoreAssessment(role: AssessmentRole, answers: AssessmentAnswers): ScoreResult {
  let score = 0
  let max = 0
  const flags: string[] = []
  const askedIds: string[] = []

  for (const section of sectionsForRole(role)) {
    for (const q of section.questions) {
      askedIds.push(q.id)
      if (!section.scored) continue

      const given = answers[q.id]
      if (q.kind === 'choice') {
        max += 1
        const chosen = q.choices.find(c => c.text === given)
        if (chosen?.weight === 'best') score += 1
        if (chosen?.flag) flags.push(q.id)
      } else if (q.kind === 'short') {
        max += 1
        if (typeof given === 'string' && q.accept.some(a => normalise(a) === normalise(given))) {
          score += 1
        }
      }
    }
  }

  return { score, max, flags, askedIds }
}

export function scorePercent(score: number, max: number): number {
  return max === 0 ? 0 : Math.round((score / max) * 100)
}
