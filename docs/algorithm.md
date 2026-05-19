# Missing Student Finder algorithm

This document describes the browser implementation in `src/app.ts` / `app.js`.

## Inputs

The workflow uses four user-supplied CSV files. They are read with the browser `FileReader` API and persisted in `localStorage` on the same device.

1. **Today attendance CSV**: current Jumbula live attendance export.
2. **Yesterday housing CSV**: previous evening housing attendance export.
3. **Registration database CSV**: stable roster/contact/housing/activity export.
4. **Faculty contacts CSV**: program-to-contact mapping.

## Normalization

For each CSV:

- UTF-8 text is parsed with an RFC-4180-style parser supporting quoted commas, quoted line breaks, and escaped quotes.
- Jumbula title/filter rows are skipped when a `Live...` title appears before the header.
- Empty rows are removed.
- Repeated whitespace inside cells is collapsed.
- Program date suffixes such as `, Jun 2, 2025...` are stripped.
- Column names are matched by normalized aliases first, then by the fallback column positions used by the historical Python script.

## Missing-student selection

Let `todayRows` be today's attendance rows after normalization.

1. Remove rows whose program is in the housing list.
2. Warn about rows where `Status` is `Checked out` or `Not checked in` but `Attendance Status` is `Present`.
3. Remove rows whose `Status` is `Checked out` or `Not checked in`.
4. Optionally remove rows whose `Attendance Status` is blank.
5. Mark as missing every remaining row whose `Attendance Status` is not exactly `Present` or `Late`.

This intentionally preserves the old script's conservative rule: any non-present/non-late status, including blank status when the setting is enabled, requires investigation.

## Data enrichment

For each missing attendance row:

- Match database rows by `Participant external ID` / Pacific ID.
- Split database rows into housing rows and activity rows using the editable housing list.
- Pull house/room from the matching housing row.
- Pull gender, student phone, parent/guardian details, and all enrolled programs from matching activity rows.
- Match yesterday's housing attendance by external ID, with participant name as a fallback.
- Match faculty contacts by current activity/program.
- Find roommates by comparing the room stem (old behavior: drop the final room character, usually the bed suffix) among housing rows.

## Complexity

For `n` today's rows, `m` database rows, `y` yesterday rows, and `f` faculty rows:

- CSV parsing is linear in file size.
- Row normalization is `O(n + m + y + f)`.
- ID lookups use maps, so student enrichment is approximately `O(k + m)` where `k` is the number of missing students.
- Roommate lookup currently scans housing rows for each missing student, `O(kh)` where `h` is the number of housing rows. This is acceptable for summer-program scale; if the roster grows significantly, index housing rows by room stem to make it `O(k + h)`.

## Error sources and limitations

- The exact Jumbula export schema may change. The app mitigates this with header aliases and fallback indices, but warnings should be reviewed.
- Phone numbers and IDs are kept as strings to avoid numeric precision/formatting errors.
- `localStorage` is convenient but persistent; users should clear stored data on shared computers.
- Roommate matching copies the old bed-suffix heuristic. If room formats change, this should be replaced with a normalized building+room key.
