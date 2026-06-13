# MCQ Mastery OS (OMR Edition)

A lightweight OMR-first study operating system for medical MCQ mastery. It stores answer keys, explanations, source references, tags, progress, notes, mistakes, and analytics without storing question statements or options.

## Files

- `index.html` - single-page app shell.
- `styles.css` - responsive light/dark interface.
- `app.js` - offline-ready frontend state, import validation, practice, quiz, analytics, SRS, backups, export.
- `Code.gs` - Google Apps Script backend for Google Sheets and Drive.

## Local Use

Open `index.html` in a browser. Guest Mode stores data in `localStorage`, so it works without a server.

## Import Format

Paste or upload either a JSON array or an object with a `questions` array.

```json
[
  {
    "id": "BIO-GLY-125",
    "source": "Lippincott Biochemistry",
    "edition": "8th Edition",
    "chapter": "Glycolysis",
    "page": 32,
    "questionNumber": 125,
    "correctAnswer": "D",
    "explanation": "Phosphofructokinase-1 is the rate-limiting enzyme of glycolysis.",
    "difficulty": "Medium",
    "tags": ["Biochemistry", "Metabolism", "Glycolysis"],
    "imageUrl": ""
  }
]
```

Required fields: `id`, `source`, `chapter`, `questionNumber`, `correctAnswer`, `explanation`, `tags`.

## Google Apps Script Setup

1. Create a Google Sheet for the database.
2. Open Extensions -> Apps Script.
3. Paste `Code.gs` into the default script file.
4. Add three HTML files in Apps Script using **+ -> HTML**:
   - `index` and paste the contents of `index.html`.
   - `styles` and paste the contents of `styles.css`.
   - `app` and paste the contents of `app.js`.
5. The names must be exactly `index`, `styles`, and `app` with this casing. Apps Script adds the `.html` type itself, so do not name them `index.html`, `styles.css`, or `app.js` inside GAS.
6. Run `setupDatabase()` once to create sheets and headers.
7. Deploy as a web app when ready.

## Current Scope

Implemented:

- Multiple local profiles and Guest Mode.
- Drag/drop, file, and paste JSON import.
- Duplicate and schema validation.
- Chunks, folders, global search, notes, bookmarks.
- OMR practice and custom quiz builder.
- Result analytics, mistake diary, SM-2 inspired review scheduling.
- Dashboard, heatmap, topic analytics, knowledge graph, study planner.
- Profile export, manual local backup, GAS Drive backup hooks.

Designed for expansion:

- Google Sign-In wiring.
- OCR/PDF import.
- Flashcards and AI tutor.
- Collaborative study groups.
