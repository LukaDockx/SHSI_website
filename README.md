# SHSI Attendance Checker

A static, browser-only replacement for `oldpythoncode.py`.

## What it does

1. Upload four CSV exports:
   - today's Jumbula attendance export
   - yesterday's housing attendance export
   - registration/database export
   - faculty contacts export
2. The app stores those files in this browser's `localStorage` so the user does not need to re-upload after a refresh.
3. Press **Review faculty submissions**.
4. Review the separate **2. Faculty attendance review** section to see which programs still have blank Attendance Status cells, how many students are unreported, and any Jumbula cleanup rows where a student is marked Present while also Checked out/Not checked in.
5. Expand any faculty/program row to see the unreported student names. Leave the program checked to generate sheets for its blank/unreported students, or uncheck it to treat those blank rows as all present for sheet generation.
6. Press **Generate attendance check sheets** at the bottom of the faculty section; sheets then appear in **3. Reports**.
7. Review the generated attendance check sheets in the page.
8. Press **Export/Print PDF** and choose **Save as PDF** in the browser print dialog. The print stylesheet formats each student needing a check as one Letter-size attendance check sheet.

No server is used and no CSV/student data is included in the source code or sent over the network.

## GitHub Pages

This repo can be served directly from GitHub Pages using the repository root:

- `index.html`
- `styles.css`
- `app.js`

## Report appearance

The screen report is optimized for review. The PDF/print version is intentionally more compact:

- one student per Letter-size page
- page header: **Attendance Check Sheet**
- sections: student/current check, roommate information, parent/guardian contacts, yesterday evening housing check, and faculty contact
- **2. Faculty attendance review** is its own website section with per-program sheet-generation checkboxes, expandable unreported-student lists, and Jumbula cleanup rows; it is hidden in the per-student PDF
- **3. Reports** contains sheet-generation status, generated sheets, and PDF export
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
- `Present` and `Late` are treated as safe attendance statuses; anything else is included in the attendance check report.
- Blank/whitespace `Attendance Status` cells are grouped by program/faculty in the morning faculty submission-status section. Checked groups generate sheets for those students; unchecked groups are treated as all present for sheet generation.
- Rows where `Attendance Status` is `Present` while `Status` is `Checked out` or `Not checked in` are shown as website-only Jumbula cleanup issues and do not generate sheets.
- Roommate status uses today's attendance rows and distinguishes Present, Late, Needs attendance check, Not reported yet, Checked out, and Not checked in.
- Students marked `Checked out` or `Not checked in` are excluded from the attendance check sheet list, but a warning is shown if they are also marked `Present`.
- Housing and activity names are editable in the page under **Settings and program lists** and persist locally.

If Jumbula changes column names, the app first tries common header aliases and then falls back to the column positions used by `oldpythoncode.py`.
