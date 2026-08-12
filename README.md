<div align="center">

<img src="docs/logo.svg" alt="" width="88" height="88">

# GradePad

**Know where you stand in every course, before the final.**

Paste a syllabus, get a grade table. GradePad works out your weighted mark as you<br>
type, keeps a running average across courses, and saves as you go.

[Quick start](#quick-start) · [How it works](#how-it-works) · [Architecture](#architecture) · [Development](#development)

[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
![npm dependencies: 0](https://img.shields.io/badge/npm%20dependencies-0-brightgreen)
![Auth and data: Firebase](https://img.shields.io/badge/auth%20%26%20data-Firebase-ffca28)
![Deploys: Netlify](https://img.shields.io/badge/deploys-Netlify-00c7b7)

</div>

---

Given the marks you have so far and the weights from your syllabus, GradePad answers
the two questions that matter: what is my mark in this course right now, and what is
that doing to my average. Guest work is stored in the browser and syncs to Firestore
once you sign in.

## Quick start

```bash
git clone https://github.com/chrisjacksonn/GradePad-Improved.git
cd GradePad-Improved
npm install
cp gradepad/jsScripts/firebase-config.example.js gradepad/jsScripts/firebase-config.js
npm run dev
```

The app opens at `http://localhost:3003`. The placeholder config is enough to use it
as a guest; add a real [Firebase web config](https://firebase.google.com/docs/web/setup)
for Google sign-in and cloud sync. Syllabus parsing needs `netlify dev` and a
`GROQ_API_KEY`, and falls back to a local text parser without one.

## How it works

**Marks weight by what you have done so far.** A course graded on one 30% midterm
reads as your midterm score, not as 30% of a grade you have not earned yet. Each row
also shows what that assignment cost you against a perfect mark.

**The average follows course units.** A 1.00-unit course moves it twice as far as a
0.50-unit one.

**Syllabi become tables.** An LLM pulls out the course code, assignments, dates and
weights. Its output is written to inputs as values, never as markup, and a local
parser takes over if the call fails.

**Nothing is quietly lost.** Guest grades move into your account the first time you
sign in, and a failed write says so instead of showing a green tick anyway.

## Architecture

Static pages, ES modules, no framework. Vite bundles the five HTML entry points.

| Module | Responsibility |
| --- | --- |
| `jsScripts/db.js` | Storage. Firestore for signed-in users, `localStorage` for guests, behind one serialized read-modify-write queue |
| `jsScripts/grading.js` | Weighted marks, lost points, unit-weighted average. Pure, no DOM |
| `jsScripts/ordering.js` | Evaluation ordering and renumbering. Pure, no DOM |
| `jsScripts/gradeCalc.js` | Reads the table into `grading.js` and writes the result back |
| `jsScripts/tableOps.js` | Builds course tables and wires them to storage |
| `jsScripts/modal.js` | Syllabus dialog and parsing, AI and local |
| `jsScripts/dragDrop.js` | Row reordering, pointer events so it works on touch |
| `jsScripts/siteHeader.js` | Sign-in header shared by the content pages |
| `jsScripts/utils.js` | Collapse, undo toasts, save status |
| `netlify/functions/groq.js` | Syllabus parsing proxy. Same-origin only, model and size capped |

Writes run through a single promise chain and rewrite the whole document, so
concurrent edits in a tab cannot overwrite each other, and evaluations carry stable
ids, so reordering or deleting a row never rewrites a different one.

## Data model

One document per user, at `users/{uid}` in Firestore or under `gradepad_data` in
`localStorage`.

```json
{
  "semesters": [{
    "id": "m8x2k1", "name": "Fall 2026",
    "courses": [{
      "id": "c4n9p2", "code": "SYDE 101", "topic": "Statics", "units": 0.5,
      "evaluations": [
        { "id": "e7q3", "name": "Midterm", "due": "Mar 15",
          "grade": "82", "weight": "30", "index": 0 }
      ]
    }]
  }]
}
```

`index` is display order only. Identity is always `id`.

## Development

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server on port 3003 |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the built output |
| `npm test` | Unit tests, Node's built-in runner, no test dependencies |

Tests cover `grading.js` and `ordering.js`. Anything touching the page still needs
checking in a browser.

Firestore access is restricted to each user's own document. Those rules live in
[`firestore.rules`](firestore.rules) so they are reviewable next to the code, and ship
with `firebase deploy --only firestore:rules`. Editing them in the console instead
leaves that file stale.

Netlify builds from `master`, writing `firebase-config.js` from `FIREBASE_API_KEY`.
The syllabus function reads `GROQ_API_KEY`.

## License

[MIT](LICENSE) © Chris Jackson
