# Attendance Checker algorithm

This document describes the browser implementation in `src/app.ts` / `app.js`.

## Inputs

The workflow uses browser-uploaded CSV files. They are read with the browser `FileReader` API and persisted in `localStorage` on the same device. Activity-mode uploads and housing-mode uploads use separate storage keys so switching modes does not reuse the wrong CSVs.

Activity mode uses four inputs:

1. **Today attendance CSV**: current Jumbula live attendance export.
2. **Yesterday housing CSV**: optional previous evening housing attendance export.
3. **Registration database CSV**: stable roster/contact/housing/activity export.
4. **Faculty contacts CSV**: program-to-contact mapping.

Housing mode uses three inputs:

1. **Today attendance CSV**: current Jumbula live attendance export.
2. **Registration database CSV**: stable roster/contact/housing/activity export.
3. **RA contacts CSV**: optional housing/program-to-RA/contact mapping. The yesterday housing input is hidden and ignored.

## Normalization

For each CSV:

- UTF-8 text is parsed with an RFC-4180-style parser supporting quoted commas, quoted line breaks, and escaped quotes.
- Jumbula title/filter rows are skipped when a `Live...` title appears before the header.
- Empty rows are removed.
- Repeated whitespace inside cells is collapsed.
- Program date suffixes such as `, Jun 2, 2025...` are stripped.
- Column names are matched by normalized aliases first, then by the fallback column positions used by the historical Python script.
- For attendance reports, the current Jumbula export may put the numeric Pacific ID in `Picked up by` while `Participant external ID` contains an internal alphanumeric ID. Attendance-row matching therefore prefers a numeric `Picked up by` / column-8 value; database rows still use their normal external-ID/last-column value.

## Faculty submission-status check

Before generating student sheets, checked-mode rows with blank or whitespace-only `Attendance Status` values are grouped by normalized program name regardless of Jumbula `Status`, so `Checked out` and `Not checked in` rows still appear in the submission review if attendance was not submitted. In activity mode those are non-housing program rows joined against the faculty contacts CSV. In housing mode those are housing rows grouped by housing program; if an optional RA contacts CSV is uploaded, contact info is joined onto the group, otherwise no RA contact info is shown. Each grouped program/housing group gets a checkbox. Checked groups keep their blank rows eligible for sheet generation; unchecked groups are treated as all present, so those blank rows are excluded from the printed check sheets. Non-blank absence statuses are not suppressed by this override.

## Attendance modes

The app has two modes. In **activity attendance mode**, the checked rows are today's non-housing activity/program rows. In **housing attendance mode**, the checked rows are today's housing rows. Both modes use the same attendance-status rule: `Present` and `Late` are safe; any other non-suppressed status generates a sheet. Housing mode does not use the yesterday housing CSV. Instead, each generated sheet includes a **Today's activity attendance** section populated from the student's non-housing row in today's attendance CSV.

## Attendance check selection

Let `todayRows` be today's attendance rows after normalization.

1. Select rows by mode: non-housing rows in activity mode, housing rows in housing mode.
2. Warn about rows where `Status` is `Checked out` or `Not checked in` but `Attendance Status` is `Present`.
3. Remove rows whose `Status` is `Checked out` or `Not checked in`.
4. Remove blank-status rows only for program/housing groups the user unchecked in the Step 2 submission-status section.
5. Mark for an attendance check every remaining row whose `Attendance Status` is not exactly `Present` or `Late`.

This intentionally preserves the old script's conservative rule: any non-present/non-late status, including blank status when the setting is enabled, requires an attendance check.

## Jumbula cleanup issues

Rows where `Attendance Status` is `Present` but `Status` is `Checked out` or `Not checked in` are excluded from sheet generation and displayed in a website-only cleanup section. These are usually data-entry/state conflicts to fix directly in Jumbula.

## Data enrichment

For each attendance row that needs a check:

- Match database rows by `Participant external ID` / Pacific ID.
- Split database rows into housing-capable and activity-capable rows.  The
  current registration export stores `Participant information: Residence hall`
  and `Participant information: Room number` directly in the participant row, so
  any database row with those fields is considered usable for housing even when
  `Program` is an activity rather than a housing program.  Older exports where
  `Program` itself is a housing name are still supported.
- Pull house/room from the matching housing row.
- Pull gender, student phone, parent/guardian details, and all enrolled programs from matching activity rows.
- If a yesterday housing CSV was uploaded, match yesterday's housing attendance by external ID, with participant name as a fallback. If it was omitted, the generated sheets omit yesterday housing-check fields.
- Match faculty contacts by current activity/program in activity mode. In housing mode, match RA contacts by the current housing check program only if an RA contacts CSV was uploaded; otherwise omit the RA contact section without warning.
- Find roommates by same residence hall plus room base. The room base is the normalized room number after dropping a final bed suffix when present, so `EIS-0316A` and `EIS-0316B` match. This restores the stable old behavior while still using residence hall to avoid cross-building matches. Roommate check status is then resolved from today's attendance rows instead of using the old undifferentiated `Present or checked out` label.

## Registration database session variants

Session 2 removed `Parent/guardian 2 information: Email address` from the registration database. The app now targets the Session 2 layout. Header-based matching is preferred; positional fallbacks use the Session 2 positions for Parent/guardian 2 relationship/phone/language and Pacific ID / Program / Participant ID / Participant external ID. Parent/guardian 2 email is not used in the printed sheet and remains blank.

## Complexity

For `n` today's rows, `m` database rows, `y` yesterday rows, and `f` faculty rows:

- CSV parsing is linear in file size.
- Row normalization is `O(n + m + y + f)`.
- Step 2 submission grouping is `O(u + f)` for `u` blank-status rows and `f` faculty/RA contact rows.
- ID lookups use maps, so student enrichment is approximately `O(k + m)` where `k` is the number of students needing an attendance check.
- Roommate lookup currently scans housing rows for each student needing an attendance check, `O(kh)` where `h` is the number of housing rows. This is acceptable for summer-program scale; if the roster grows significantly, index housing rows by residence-hall plus room-base key to make it `O(k + h)`.

## Error sources and limitations

- The exact Jumbula export schema may change. The app mitigates this with header aliases and fallback indices, but warnings should be reviewed.
- Phone numbers and IDs are kept as strings to avoid numeric precision/formatting errors.
- `localStorage` is convenient but persistent; users should clear stored data on shared computers.
- Roommate matching depends on consistent residence hall and room-number formatting. A final bed suffix is dropped when present; if a room has no final letter, the whole normalized room string is used.
