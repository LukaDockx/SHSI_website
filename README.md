# SHSI Missing Student Finder

A static, browser-only replacement for `oldpythoncode.py`.

## What it does

1. Upload four CSV exports:
   - today's Jumbula attendance export
   - yesterday's housing attendance export
   - registration/database export
   - faculty contacts export
2. The app stores those files in this browser's `localStorage` so the user does not need to re-upload after a refresh.
3. Press **Run missing-student report**.
4. Review the generated investigation sheets in the page.
5. Press **Export/Print PDF** and choose **Save as PDF** in the browser print dialog. The print stylesheet formats each missing student as one Letter-size investigation sheet.

No server is used and no CSV/student data is included in the source code or sent over the network.

## GitHub Pages

This repo can be served directly from GitHub Pages using the repository root:

- `index.html`
- `styles.css`
- `app.js`

## Report appearance

The screen report is optimized for review. The PDF/print version is intentionally more compact:

- one missing student per Letter-size page
- page header: **Missing Student Investigation Sheet**
- sections: student/current attendance, roommate information, parent/guardian contacts, yesterday evening housing check, and faculty contact
- app controls, warnings, and summary cards are hidden in the PDF

## TypeScript workflow

The browser runs `app.js`. The editable source lives in `src/app.ts` and can be compiled to `app.js`.

```bash
npm install
npm run check
npm run build
```

For compatibility with Ubuntu's older `apt install npm` stack (`node v12.22.9`), this project pins TypeScript to `4.9.5`. A newer Node LTS is still recommended for future development, but not required to build this app. `app.js` is checked in as the deployable static artifact.

See `docs/algorithm.md` for the detailed matching algorithm, complexity, and limitations.

## CSV assumptions

The app intentionally matches the old Python script's important behavior while being more tolerant:

- Jumbula "Live attendance" title/filter rows are detected and skipped.
- Empty rows are ignored.
- Whitespace inside cells is normalized.
- Program names with date suffixes like `Program, Jun 2, 2025...` are normalized to `Program`.
- `Present` and `Late` are treated as safe attendance statuses; anything else is included in the missing-student report.
- Students marked `Checked out` or `Not checked in` are excluded from the missing list, but a warning is shown if they are also marked `Present`.
- Housing and activity names are editable in the page under **Settings and program lists** and persist locally.

If Jumbula changes column names, the app first tries common header aliases and then falls back to the column positions used by `oldpythoncode.py`.
