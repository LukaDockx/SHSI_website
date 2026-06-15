# SHSI Attendance Checker

A static, browser-only replacement for `oldpythoncode.py`, with activity/daytime attendance mode and housing/evening attendance mode.

## What it does

1. Upload the CSV exports for the selected mode:
   - activity mode: today's Jumbula attendance export, optional yesterday housing attendance export, registration/database export, and faculty contacts export
   - housing mode: today's Jumbula attendance export, registration/database export, and optional RA contacts export
2. The app stores those files in this browser's `localStorage` so the user does not need to re-upload after a refresh. Activity-mode and housing-mode files are stored separately.
3. Press **Review faculty submissions** or **Review housing submissions**.
4. Review the separate **2. Faculty/Housing attendance review** section to see which programs still have blank Attendance Status cells, how many students are unreported, and any Jumbula cleanup rows where a student is marked Present while also Checked out/Not checked in.
5. Expand any faculty/program or housing/RA row to see the unreported student names. Leave the row checked to generate sheets for its blank/unreported students, or uncheck it to treat those blank rows as all present for sheet generation.
6. Press **Generate attendance check sheets** at the bottom of Step 2; sheets then appear in **3. Reports**.
7. Review the generated attendance check sheets in the page.
8. Press **Export/Print PDF** and choose **Save as PDF** in the browser print dialog. The print stylesheet formats each student needing a check as one Letter-size attendance check sheet.

No server is used and no CSV/student data is included in the source code or sent over the network.

## Attendance modes

Use the large mode button near the top of the page to switch modes.

- **Activity attendance mode** is the default daytime workflow. It checks activity/program attendance rows and can optionally include yesterday evening housing attendance on each sheet.
- **Housing attendance mode** is the evening bed-check workflow. It checks housing attendance rows from today's attendance CSV, hides/does not use the yesterday housing upload box, labels the optional contact upload as **RA contacts CSV**, and replaces the PDF's yesterday-housing section with **Today's activity attendance** so staff can see whether the student was present in their daytime program. Housing-mode uploads are stored separately from activity-mode uploads.

## GitHub Pages

This repo can be served directly from GitHub Pages using the repository root:

- `index.html`
- `styles.css`
- `app.js`

## Report appearance

The screen report is optimized for review. The PDF/print version is intentionally more compact:

- one student per Letter-size page
- page header: **Attendance Check Sheet**
- sections: student/current check, roommate information, parent/guardian contacts, optional yesterday evening housing check in activity mode or today's activity attendance in housing mode, and faculty/RA contact
- **2. Faculty/Housing attendance review** is its own website section with per-program or per-housing-group sheet-generation checkboxes, expandable unreported-student lists, and Jumbula cleanup rows; it is hidden in the per-student PDF
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
- For the current Jumbula attendance export bug, today/yesterday attendance rows use the numeric Pacific ID from the `Picked up by` column when matching to the database, because `Participant external ID` may contain Jumbula's internal alphanumeric participant ID.
- Empty rows are ignored.
- Whitespace inside cells is normalized.
- Program names with date suffixes like `Program, Jun 2, 2025...` are normalized to `Program`.
- `Present` and `Late` are treated as safe attendance statuses; anything else is included in the attendance check report.
- The yesterday housing CSV is optional in activity mode; if it is omitted, yesterday evening housing check info is omitted from generated sheets. Housing mode does not request or use yesterday housing CSV data.
- Blank/whitespace `Attendance Status` cells are grouped by program/faculty in activity mode and by housing group in housing mode. If an optional RA contacts CSV is uploaded, its contact info is added; if omitted, the report still runs without RA contact info. Checked groups generate sheets for those students; unchecked groups are treated as all present for sheet generation.
- Rows where `Attendance Status` is `Present` while `Status` is `Checked out` or `Not checked in` are shown as website-only Jumbula cleanup issues and do not generate sheets.
- Roommate status uses today's attendance rows and distinguishes Present, Late, Needs attendance check, Not reported yet, Checked out, and Not checked in.
- Housing is read directly from the registration database fields `Participant information: Residence hall` and `Participant information: Room number`; the app no longer requires the row's `Program` value to be one of the housing programs before showing the student's own room.
- Roommates are matched by same residence hall plus normalized room base. The room base drops a final bed suffix when present, so `EIS-0316A` and `EIS-0316B` match; unusual suffixes/formats are not forced into a brittle A/B-only pairing rule.
- Students marked `Checked out` or `Not checked in` are excluded from the attendance check sheet list, but a warning is shown if they are also marked `Present`.
- Housing and activity names are editable in the page under **Settings and program lists** and persist locally. The built-in defaults were updated to the current activity/housing list; use **Reset lists to defaults** if your browser still shows an older saved list.

The Session 2 registration database headers are explicitly supported, including `Participant information: Residence hall`, `Participant information: Room number`, parent/guardian fields without `Parent/guardian 2 information: Email address`, `Photo upload and roommate request: Pacific id: Your pacific id`, `Program`, `Schedule`, `Participant ID`, and `Participant external ID`. If Jumbula changes column names, the app first tries common header aliases and then falls back to the Session 2 column positions.
