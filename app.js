// @ts-nocheck
/* Attendance Checker
 * Browser-only port/rebuild of oldpythoncode.py.
 * No network calls are made; uploaded CSV text is stored only in localStorage.
 */
(() => {
    "use strict";
    const STORAGE_KEY = "shsiMissingStudentFinder.v1";
    const STORAGE_KEY_PREFIX = "shsiAttendanceChecker.files";
    const LISTS_KEY = "shsiAttendanceChecker.programLists.v2";
    const MODE_KEY = "shsiAttendanceChecker.mode.v1";
    const DEFAULT_HOUSES = [
        "Casa Jackson 1",
        "Casa Jackson 2",
        "Casa Jackson 3",
        "Casa Werner 1",
        "Casa Werner 2",
        "Casa Werner 3",
        "Eiselen House 1",
        "Eiselen House 2",
        "Eiselen House 3",
        "Farley House 1",
        "Farley House 2",
        "Farley House 3",
        "Grace Covell Hall 1",
        "Grace Covell Hall 2",
        "Grace Covell Hall 3",
        "Jessie Ballantyne Hall 1",
        "Jessie Ballantyne Hall 2",
        "Jessie Ballantyne Hall 3",
        "John Ballantyne Hall 1",
        "John Ballantyne Hall 2",
        "John Ballantyne Hall 3",
        "Price House 1",
        "Price House 2",
        "Price House 3",
        "Ritter House 1",
        "Ritter House 2",
        "Ritter House 3",
        "Wemyss Hall 1",
        "Wemyss Hall 2",
        "Wemyss Hall 3",
        "School District Sponsored Waitlist housing"
    ];
    const DEFAULT_ACTIVITIES = [
        "2D Art Studio",
        "3D Art and Animation",
        "3D Modeling and Printing",
        "Acting for the Stage",
        "Artificial Intelligence",
        "Baseball Skills and Tactics",
        "Basketball Skills Academy",
        "Be a Lawyer in Court",
        "Be an Influencer",
        "Beach Volleyball",
        "Become the Best Teacher or Coach",
        "Bioengineering and Health Care Technologies",
        "Biology of Cities",
        "Blogs, Vlogs, Podcasts and Reels",
        "Building Electrical Circuits and Computers",
        "Building Your Own Business",
        "Ceramics Studio",
        "Coding",
        "Competitive Debate",
        "Competitive Gaming and Esports",
        "Computer Drawing and Drafting",
        "Creating Media",
        "Creative Writing and Storytelling",
        "Dance and Cheer",
        "Design and Synthesis of Anticancer Drugs",
        "Drone Flying",
        "Engineering Olympics",
        "Exploring the Human Body",
        "F1tenth Racing",
        "Finding a Cure for Cancer",
        "First-Response Engineering: Rescue by Design",
        "Future Dentists",
        "Future Pharmacists",
        "Game Design & Development",
        "Graphic Design for Social Media",
        "Healthcare Professions",
        "Instrumental Music",
        "Investing in Stocks",
        "Jazz",
        "Lawyers and the Rule of Law",
        "Leadership for Women",
        "Medical Microbiology Experience",
        "Music Industry",
        "Musical and Vocal Arts",
        "Nursing: Caring Hands, Healing Hearts",
        "Piano",
        "Police Cadet Academy",
        "Prototyping and Advanced Manufacturing",
        "Robotics Camp",
        "School District Sponsored Waitlist",
        "Soccer Skills and Tactics",
        "Softball",
        "Spanish for the Health Professions",
        "Sports Analytics",
        "Strength and Conditioning",
        "Swim Camp",
        "Taking Control of Your Financial Future",
        "Tennis Skills and Tactics",
        "The Business of Esports",
        "The Science and Practice of Fitness",
        "Volleyball Skills and Tactics",
        "Water Polo Skills and Tactics",
        "Writing and Publishing Your Novel"
    ];
    const FILES = {
        today: { label: "Today attendance CSV", inputId: "todayInput", statusId: "todayStatus", required: true },
        yesterday: { label: "Yesterday housing CSV", inputId: "yesterdayInput", statusId: "yesterdayStatus", required: false },
        database: { label: "Registration database CSV", inputId: "databaseInput", statusId: "databaseStatus", required: true },
        faculty: { label: "Faculty contacts CSV", inputId: "facultyInput", statusId: "facultyStatus", required: true }
    };
    const INITIAL_MODE = loadMode();
    const state = {
        mode: INITIAL_MODE,
        files: loadStoredFiles(INITIAL_MODE),
        lastReport: null,
        lastInputOptions: null,
        sheetsGenerated: false
    };
    document.addEventListener("DOMContentLoaded", init);
    function init() {
        setupDropZones();
        setupLists();
        byId("runButton").addEventListener("click", runReportFromUi);
        byId("modeToggleButton").addEventListener("click", toggleMode);
        byId("clearAllButton").addEventListener("click", clearStoredData);
        byId("resetListsButton").addEventListener("click", resetProgramLists);
        updateModeUi();
        renderInitialReportPlaceholders();
        updateFileStatuses();
    }
    function loadMode() {
        try {
            return localStorage.getItem(MODE_KEY) === "housing" ? "housing" : "activity";
        }
        catch (_error) {
            return "activity";
        }
    }
    function toggleMode() {
        saveStoredFiles();
        state.mode = state.mode === "housing" ? "activity" : "housing";
        state.files = loadStoredFiles(state.mode);
        try {
            localStorage.setItem(MODE_KEY, state.mode);
        }
        catch (_error) { /* ignore */ }
        state.lastInputOptions = null;
        state.lastReport = null;
        state.sheetsGenerated = false;
        setPrintDisabled(true);
        updateModeUi();
        updateFileStatuses();
        renderInitialReportPlaceholders();
        showMessages([{ type: "ok", text: `${modeLabel()} selected.` }]);
    }
    function modeLabel() {
        return state.mode === "housing" ? "Housing attendance mode" : "Activity attendance mode";
    }
    function updateModeUi() {
        const isHousingMode = state.mode === "housing";
        document.body.classList.toggle("housing-mode", isHousingMode);
        const button = document.getElementById("modeToggleButton");
        if (button)
            button.textContent = isHousingMode ? "Switch to activity attendance mode" : "Switch to housing attendance mode";
        const description = document.getElementById("modeDescription");
        if (description) {
            description.textContent = isHousingMode
                ? "Housing attendance mode: evening bed check. Upload today attendance and registration database. RA contacts are optional."
                : "Activity attendance mode: generate sheets for students missing from their daytime programs.";
        }
        const runButton = document.getElementById("runButton");
        if (runButton)
            runButton.textContent = isHousingMode ? "Review housing submissions" : "Review faculty submissions";
        const yesterdayZone = document.querySelector('[data-file-key="yesterday"]');
        if (yesterdayZone)
            yesterdayZone.hidden = isHousingMode;
        const contactsZone = document.querySelector('[data-file-key="faculty"]');
        if (contactsZone) {
            contactsZone.setAttribute("aria-label", isHousingMode ? "Upload RA contacts CSV" : "Upload faculty contacts CSV");
            const title = contactsZone.querySelector(".drop-title");
            const help = contactsZone.querySelector(".drop-help");
            if (title) {
                title.innerHTML = isHousingMode ? 'RA contacts CSV <span class="optional-tag">optional</span>' : "Faculty contacts CSV";
            }
            if (help)
                help.textContent = isHousingMode ? "Optional housing/RA contact mapping, contact person, phone" : "Program, faculty, contact person, phone";
        }
    }
    function byId(id) {
        const element = document.getElementById(id);
        if (!element)
            throw new Error(`Missing element #${id}`);
        return element;
    }
    function setPrintDisabled(disabled) {
        const button = document.getElementById("printButton");
        if (button)
            button.disabled = disabled;
    }
    function renderInitialReportPlaceholders(message) {
        byId("report").innerHTML = `
      <div class="workflow-section disabled-section">
        <h2>2. ${state.mode === "housing" ? "Housing attendance review" : "Faculty attendance review"}</h2>
        <p>${escapeHtml(message || (state.mode === "housing" ? "Upload today attendance and registration database. RA contacts are optional. Yesterday housing is hidden and not used in housing mode." : "Upload the required CSV files, then press Review faculty submissions. Yesterday housing is optional."))}</p>
      </div>
      <div class="workflow-section disabled-section">
        <div class="report-section-header">
          <div>
            <h2>3. Reports</h2>
            <p>Attendance check sheets will appear here after Step 2 review.</p>
          </div>
          <button id="printButton" type="button" class="secondary" disabled>Export/Print PDF</button>
        </div>
      </div>`;
    }
    function setupDropZones() {
        document.querySelectorAll(".drop-zone").forEach((zone) => {
            const key = zone.getAttribute("data-file-key");
            const input = byId(FILES[key].inputId);
            zone.addEventListener("click", () => input.click());
            zone.addEventListener("keydown", (event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    input.click();
                }
            });
            input.addEventListener("change", () => {
                if (input.files && input.files[0])
                    readFileIntoState(key, input.files[0]);
                input.value = "";
            });
            ["dragenter", "dragover"].forEach((name) => {
                zone.addEventListener(name, (event) => {
                    event.preventDefault();
                    zone.classList.add("dragover");
                });
            });
            ["dragleave", "drop"].forEach((name) => {
                zone.addEventListener(name, (event) => {
                    event.preventDefault();
                    zone.classList.remove("dragover");
                });
            });
            zone.addEventListener("drop", (event) => {
                const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
                if (file)
                    readFileIntoState(key, file);
            });
        });
    }
    function readFileIntoState(key, file) {
        const reader = new FileReader();
        reader.onload = () => {
            state.files[key] = {
                name: file.name,
                size: file.size,
                updatedAt: new Date().toISOString(),
                text: String(reader.result || "")
            };
            state.lastInputOptions = null;
            state.lastReport = null;
            state.sheetsGenerated = false;
            setPrintDisabled(true);
            const ok = saveStoredFiles();
            updateFileStatuses();
            showMessages(ok ? [{ type: "ok", text: `${fileLabel(key)} loaded.` }] : [{ type: "warn", text: `${fileLabel(key)} loaded for this session, but localStorage could not save it. The file may be too large for this browser.` }]);
        };
        reader.onerror = () => showMessages([{ type: "error", text: `Could not read ${file.name}.` }]);
        reader.readAsText(file, "utf-8");
    }
    function storageKeyForMode(mode) {
        return `${STORAGE_KEY_PREFIX}.${mode === "housing" ? "housing" : "activity"}.v1`;
    }
    function loadStoredFiles(mode = state.mode) {
        try {
            const modeSpecific = localStorage.getItem(storageKeyForMode(mode));
            if (modeSpecific)
                return JSON.parse(modeSpecific) || {};
            // One-time compatibility migration for users who had files saved before
            // separate activity/housing storage existed. Only migrate into activity
            // mode so housing starts with its own clean three-file setup.
            if (mode !== "housing")
                return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") || {};
            return {};
        }
        catch (_error) {
            return {};
        }
    }
    function saveStoredFiles() {
        try {
            localStorage.setItem(storageKeyForMode(state.mode), JSON.stringify(state.files));
            return true;
        }
        catch (_error) {
            return false;
        }
    }
    function isFileRequired(key) {
        if (key === "yesterday" && state.mode === "housing")
            return false;
        if (key === "faculty" && state.mode === "housing")
            return false;
        return Boolean(FILES[key] && FILES[key].required);
    }
    function fileLabel(key) {
        if (key === "faculty" && state.mode === "housing")
            return "RA contacts CSV";
        return FILES[key] ? FILES[key].label : key;
    }
    function updateFileStatuses() {
        Object.keys(FILES).forEach((key) => {
            const status = byId(FILES[key].statusId);
            const stored = state.files[key];
            if (stored && stored.text) {
                status.textContent = `${stored.name || "Stored CSV"} • ${formatBytes(stored.size || stored.text.length)}`;
                status.classList.add("loaded");
            }
            else {
                status.textContent = isFileRequired(key) ? "No file loaded" : "Optional - no file loaded";
                status.classList.remove("loaded");
            }
        });
    }
    function clearStoredData() {
        if (!confirm(`Clear locally stored CSV data for ${modeLabel()} and the current report from this browser?`))
            return;
        state.files = {};
        state.lastReport = null;
        state.lastInputOptions = null;
        state.sheetsGenerated = false;
        localStorage.removeItem(storageKeyForMode(state.mode));
        updateFileStatuses();
        setPrintDisabled(true);
        renderInitialReportPlaceholders(state.mode === "housing" ? "Stored housing-mode CSV data was cleared. Upload today attendance and registration database. RA contacts are optional." : "Stored activity-mode CSV data was cleared. Upload the required CSV files, then press Review faculty submissions. Yesterday housing is optional.");
        showMessages([{ type: "ok", text: `${modeLabel()} CSV data cleared.` }]);
    }
    function setupLists() {
        const saved = loadProgramLists();
        byId("housesText").value = saved.houses.join("\n");
        byId("activitiesText").value = saved.activities.join("\n");
        ["housesText", "activitiesText"].forEach((id) => {
            byId(id).addEventListener("input", saveProgramListsFromUi);
        });
    }
    function loadProgramLists() {
        try {
            const parsed = JSON.parse(localStorage.getItem(LISTS_KEY) || "null");
            if (parsed && Array.isArray(parsed.houses) && Array.isArray(parsed.activities))
                return parsed;
        }
        catch (_error) {
            // ignore
        }
        return { houses: DEFAULT_HOUSES.slice(), activities: DEFAULT_ACTIVITIES.slice() };
    }
    function saveProgramListsFromUi() {
        const lists = currentProgramLists();
        localStorage.setItem(LISTS_KEY, JSON.stringify(lists));
        state.lastInputOptions = null;
        state.lastReport = null;
        state.sheetsGenerated = false;
        setPrintDisabled(true);
    }
    function resetProgramLists() {
        if (!confirm("Reset the editable housing/activity lists to the defaults from the old Python script?"))
            return;
        byId("housesText").value = DEFAULT_HOUSES.join("\n");
        byId("activitiesText").value = DEFAULT_ACTIVITIES.join("\n");
        saveProgramListsFromUi();
    }
    function currentProgramLists() {
        return {
            houses: textLines(byId("housesText").value),
            activities: textLines(byId("activitiesText").value)
        };
    }
    function textLines(text) {
        return String(text || "").split(/\r?\n/).map(cleanCell).filter(Boolean);
    }
    function runReportFromUi() {
        const inputOptions = currentInputOptions();
        if (!inputOptions)
            return;
        try {
            const report = buildReport({
                ...inputOptions,
                suppressedUnsubmittedProgramKeys: []
            });
            state.lastInputOptions = inputOptions;
            state.lastReport = report;
            state.sheetsGenerated = false;
            renderReport(report, { showSheets: false });
            renderMessagesForReport(report);
            setPrintDisabled(true);
        }
        catch (error) {
            console.error(error);
            setPrintDisabled(true);
            showMessages([{ type: "error", text: error && error.message ? error.message : String(error) }]);
        }
    }
    function currentInputOptions() {
        const missing = Object.keys(FILES).filter((key) => isFileRequired(key) && !(state.files[key] && state.files[key].text));
        if (missing.length) {
            showMessages([{ type: "error", text: `Missing required file(s): ${missing.map(fileLabel).join(", ")}.` }]);
            return null;
        }
        return {
            todayText: state.files.today.text,
            yesterdayText: state.mode === "housing" ? "" : (state.files.yesterday && state.files.yesterday.text ? state.files.yesterday.text : ""),
            databaseText: state.files.database.text,
            facultyText: state.files.faculty && state.files.faculty.text ? state.files.faculty.text : "",
            programLists: currentProgramLists(),
            mode: state.mode
        };
    }
    function generateSheetsFromFacultySelections() {
        if (!state.lastInputOptions) {
            runReportFromUi();
            return;
        }
        const suppressedUnsubmittedProgramKeys = Array.from(document.querySelectorAll(".faculty-generate-checkbox"))
            .filter((checkbox) => !checkbox.checked)
            .map((checkbox) => checkbox.getAttribute("data-program-key"))
            .filter(Boolean);
        try {
            const report = buildReport({
                ...state.lastInputOptions,
                suppressedUnsubmittedProgramKeys
            });
            state.lastReport = report;
            state.sheetsGenerated = true;
            renderReport(report, { showSheets: true, suppressedUnsubmittedProgramKeys });
            renderMessagesForReport(report);
            setPrintDisabled(report.students.length === 0);
        }
        catch (error) {
            console.error(error);
            setPrintDisabled(true);
            showMessages([{ type: "error", text: error && error.message ? error.message : String(error) }]);
        }
    }
    function buildReport(options) {
        const warnings = [];
        const mode = options.mode === "housing" ? "housing" : "activity";
        const isHousingMode = mode === "housing";
        const today = recordsFromCsv(options.todayText, "today attendance", warnings);
        const yesterdayText = isHousingMode ? "" : options.yesterdayText;
        const yesterday = yesterdayText
            ? recordsFromCsv(yesterdayText, "yesterday housing", warnings)
            : { headers: [], records: [], label: "yesterday housing" };
        const hasYesterdayHousing = Boolean(yesterdayText);
        if (!hasYesterdayHousing && !isHousingMode)
            warnings.push("Yesterday housing CSV was not uploaded; yesterday evening housing check info will be omitted from sheets.");
        const database = recordsFromCsv(options.databaseText, "registration database", warnings);
        const contactText = String(options.facultyText || "");
        const hasContactFile = Boolean(cleanCell(contactText));
        const faculty = (hasContactFile || !isHousingMode)
            ? recordsFromCsv(contactText, isHousingMode ? "RA contacts" : "faculty contacts", warnings)
            : { headers: [], records: [], label: "RA contacts" };
        const houses = new Set(options.programLists.houses.map(canonProgram));
        const activities = new Set(options.programLists.activities.map(canonProgram));
        const known = new Set([...houses, ...activities]);
        [today, yesterday, database].forEach((dataset) => {
            dataset.records.forEach((record) => {
                record.__program = stripProgramDate(programOf(record));
            });
        });
        const unknownPrograms = collectUnknownPrograms([today, yesterday, database], known);
        if (unknownPrograms.length) {
            warnings.push(`Unknown program names found. They are treated as activities unless they match a housing name. Add them in Settings if needed: ${unknownPrograms.join("; ")}`);
        }
        const todayHousing = today.records.filter((record) => houses.has(canonProgram(record.__program)));
        const todayNonHousing = today.records.filter((record) => !houses.has(canonProgram(record.__program)));
        const rowsToCheck = isHousingMode ? todayHousing : todayNonHousing;
        const presentNotCheckedIn = rowsToCheck.filter((record) => {
            const status = cleanCell(get(record, ["Status"], 2));
            const attendance = cleanCell(get(record, ["Attendance Status"], 3));
            return (status === "Checked out" || status === "Not checked in") && attendance === "Present";
        });
        const presentButCheckedOutIssues = presentNotCheckedIn.map(cleanupIssueInfo);
        const todayActivityById = groupById(todayNonHousing, 8);
        const todayHousingById = groupById(todayHousing, 8);
        const roommateStatusById = isHousingMode ? todayHousingById : todayActivityById;
        let activeToday = rowsToCheck.filter((record) => {
            const status = cleanCell(get(record, ["Status"], 2));
            return status !== "Checked out" && status !== "Not checked in";
        });
        const unspecified = activeToday.filter((record) => !cleanCell(get(record, ["Attendance Status"], 3)));
        const suppressedUnsubmittedProgramKeys = new Set(options.suppressedUnsubmittedProgramKeys || []);
        activeToday = activeToday.filter((record) => {
            const attendance = cleanCell(get(record, ["Attendance Status"], 3));
            if (attendance)
                return true;
            const programKey = canonProgram(stripProgramDate(programOf(record)) || "Unknown program");
            return !suppressedUnsubmittedProgramKeys.has(programKey);
        });
        const absentRows = activeToday.filter((record) => {
            const attendance = cleanCell(get(record, ["Attendance Status"], 3));
            return attendance !== "Present" && attendance !== "Late";
        });
        // The current registration database export stores housing directly in the
        // participant row:
        //
        //   Participant information: Residence hall
        //   Participant information: Room number
        //
        // Older exports had separate rows where Program was a housing program.  Do
        // not require Program to be one of the configured houses, otherwise normal
        // activity rows with Residence hall / Room number will fail to show the
        // student's own housing and roommate lookup will necessarily fail too.
        const dbHousing = database.records.filter((record) => hasHousingInfo(record) || houses.has(canonProgram(record.__program)));
        const dbActivity = database.records.filter((record) => hasActivityInfo(record) && !houses.has(canonProgram(record.__program)));
        const dbHousingById = groupById(dbHousing, 22);
        const dbActivityById = groupById(dbActivity, 22);
        const dbAnyById = groupById(database.records, 22);
        const studentPhoneById = buildStudentPhoneById(database.records);
        const yesterdayById = groupById(yesterday.records, 8);
        const yesterdayByName = groupBy(yesterday.records, (record) => cleanCell(get(record, ["Participant", "Name"], 0)).toLowerCase());
        const facultyByProgram = groupFaculty(faculty.records);
        const unsubmittedAttendance = buildUnsubmittedAttendance(unspecified, facultyByProgram);
        const absentNames = new Set(absentRows.map((record) => cleanCell(get(record, ["Participant", "Name"], 0)).toLowerCase()).filter(Boolean));
        const students = absentRows.map((attendanceRow) => {
            const id = participantExternalId(attendanceRow, 8);
            const fullName = cleanCell(get(attendanceRow, ["Participant", "Name"], 0));
            const activityRows = dbActivityById.get(id) || [];
            const housingRows = dbHousingById.get(id) || [];
            const databaseRows = dbAnyById.get(id) || [];
            const activityRow = activityRows[0] || databaseRows.find((record) => !houses.has(canonProgram(programOf(record)))) || databaseRows[0] || null;
            const housingRow = housingRows[0] || databaseRows.find((record) => hasHousingInfo(record)) || null;
            if (!id)
                warnings.push(`Attendance row for ${fullName || "(unknown student)"} has no Pacific ID / participant external ID.`);
            if (id && !activityRow)
                warnings.push(`No database row matched ${fullName || id}.`);
            if (id && !housingRow)
                warnings.push(`No database housing row matched ${fullName || id}.`);
            const activityAttendanceRows = (id && todayActivityById.get(id)) || [];
            const activityAttendanceRow = activityAttendanceRows[0] || null;
            const currentActivity = isHousingMode
                ? (activityAttendanceRow ? stripProgramDate(programOf(activityAttendanceRow)) : stripProgramDate(programOf(activityRow)) || "Unknown activity")
                : stripProgramDate(programOf(attendanceRow));
            const checkProgram = stripProgramDate(programOf(attendanceRow));
            const yesterdayRows = (id && yesterdayById.get(id)) || yesterdayByName.get(fullName.toLowerCase()) || [];
            const yesterdayRow = yesterdayRows.find((record) => houses.has(canonProgram(record.__program))) || yesterdayRows[0] || null;
            const contactProgram = isHousingMode ? checkProgram : currentActivity;
            const facultyRows = facultyByProgram.get(canonProgram(contactProgram)) || [];
            if (!facultyRows.length && (!isHousingMode || hasContactFile))
                warnings.push(`No ${isHousingMode ? "RA" : "faculty"} contact row matched ${isHousingMode ? "housing/program" : "program"}: ${contactProgram || "(blank)"}.`);
            const room = housingRow ? roomOf(housingRow) : "";
            const house = housingRow ? houseOf(housingRow) : "";
            const roommates = housingRow ? findRoommates({ housingRow, dbHousing, dbActivityById, dbAnyById, studentPhoneById, todayActivityById: roommateStatusById, absentNames, selfId: id }) : [];
            return {
                id,
                fullName,
                firstName: fullName.split(/\s+/)[0] || firstNameOf(activityRow) || "",
                lastName: fullName.split(/\s+/).slice(1).join(" ") || lastNameOf(activityRow) || "",
                mode,
                currentActivity,
                checkProgram,
                allPrograms: unique(activityRows.map(programOf).map(stripProgramDate).filter(Boolean)),
                gender: activityRow ? cleanCell(get(activityRow, ["Participant information: Gender", "Gender", "Sex"], 2)) : "",
                studentPhone: studentPhoneById.get(id) || studentPhoneFromRows([housingRow, activityRow, ...databaseRows]),
                status: cleanCell(get(attendanceRow, ["Status"], 2)),
                attendanceStatus: cleanCell(get(attendanceRow, ["Attendance Status"], 3)) || "Not specified",
                checkIn: cleanCell(get(attendanceRow, ["Check in", "Check-in", "Check In"], 5)),
                checkOut: cleanCell(get(attendanceRow, ["Check out", "Check-out", "Check Out"], 6)),
                checkedInBy: cleanCell(get(attendanceRow, ["Checked in by", "Checked In By"], 7)),
                house,
                room,
                parent1: parentInfo(activityRow, 1),
                parent2: parentInfo(activityRow, 2),
                todayActivity: activityAttendanceInfo(activityAttendanceRow),
                yesterday: yesterdayInfo(yesterdayRow),
                faculty: facultyRows.map(facultyInfo),
                roommates
            };
        });
        return {
            generatedAt: new Date(),
            students,
            warnings: unique(warnings),
            diagnostics: {
                mode,
                todayRows: today.records.length,
                activityRows: todayNonHousing.length,
                housingRows: todayHousing.length,
                activeRowsChecked: activeToday.length,
                activeActivityRows: activeToday.length,
                absentRows: absentRows.length,
                unspecifiedRows: unspecified.length,
                unsubmittedAttendance,
                hasYesterdayHousing,
                presentButCheckedOutIssues,
                presentNotCheckedIn: presentButCheckedOutIssues.map((issue) => issue.name).filter(Boolean),
                unknownPrograms
            }
        };
    }
    function cleanupIssueInfo(record) {
        return {
            name: cleanCell(get(record, ["Participant", "Name"], 0)) || "Unknown student",
            id: participantExternalId(record, 8),
            program: stripProgramDate(programOf(record)) || "Unknown program",
            status: cleanCell(get(record, ["Status"], 2)),
            attendanceStatus: cleanCell(get(record, ["Attendance Status"], 3)),
            checkIn: cleanCell(get(record, ["Check in", "Check-in", "Check In"], 5)),
            checkOut: cleanCell(get(record, ["Check out", "Check-out", "Check Out"], 6))
        };
    }
    function buildUnsubmittedAttendance(unspecifiedRows, facultyByProgram) {
        const grouped = new Map();
        unspecifiedRows.forEach((record) => {
            const program = stripProgramDate(programOf(record)) || "Unknown program";
            const key = canonProgram(program);
            if (!grouped.has(key)) {
                const facultyRows = facultyByProgram.get(key) || [];
                grouped.set(key, {
                    key,
                    program,
                    count: 0,
                    faculty: facultyRows.map(facultyInfo),
                    students: []
                });
            }
            const group = grouped.get(key);
            group.count += 1;
            group.students.push({
                name: cleanCell(get(record, ["Participant", "Name"], 0)) || "Unknown student",
                id: participantExternalId(record, 8),
                status: cleanCell(get(record, ["Status"], 2)),
                checkIn: cleanCell(get(record, ["Check in", "Check-in", "Check In"], 5))
            });
        });
        return Array.from(grouped.values()).sort((a, b) => {
            if (b.count !== a.count)
                return b.count - a.count;
            return a.program.localeCompare(b.program);
        });
    }
    function recordsFromCsv(text, label, warnings) {
        const rawRows = parseCsv(text);
        const rows = rawRows.length ? rawRows : [];
        if (!rows.length || !rows.some((row) => row.some((cell) => cleanCell(cell))))
            throw new Error(`${label} CSV is empty.`);
        let headerIndex = rows.findIndex((row) => row.map(normalizeHeader).some((cell) => canon(cell) === "program"));
        if (headerIndex < 0)
            headerIndex = rows.findIndex((row) => row.some((cell) => cleanCell(cell)));
        if (headerIndex < 0)
            throw new Error(`${label} CSV is empty.`);
        const hasLiveTitle = rows.slice(0, Math.min(headerIndex + 1, 6)).some((row) => cleanCell(row[0]).includes("Live"));
        if (hasLiveTitle)
            warnings.push(`${label}: skipped ${headerIndex} Jumbula title/filter row(s) before the header.`);
        const headers = rows[headerIndex].map(normalizeHeader);
        const dataRows = rows.slice(headerIndex + 1).filter((row) => row.some((cell) => cleanCell(cell)));
        const records = dataRows.map((row, index) => {
            const record = { __row: row.map(cleanCell), __headers: headers, __sourceLabel: label, __sourceRowNumber: headerIndex + index + 2 };
            headers.forEach((header, col) => {
                if (!header)
                    return;
                record[header] = cleanCell(row[col]);
            });
            return record;
        });
        if (!headers.some((header) => canon(header) === "program"))
            warnings.push(`${label}: could not find a Program column; fallback column positions will be used where possible.`);
        return { headers, records, label };
    }
    function parseCsv(text) {
        const input = String(text || "").replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
        const rows = [];
        let row = [];
        let cell = "";
        let quoted = false;
        for (let i = 0; i < input.length; i += 1) {
            const ch = input[i];
            if (quoted) {
                if (ch === '"') {
                    if (input[i + 1] === '"') {
                        cell += '"';
                        i += 1;
                    }
                    else {
                        quoted = false;
                    }
                }
                else {
                    cell += ch;
                }
            }
            else if (ch === '"') {
                quoted = true;
            }
            else if (ch === ",") {
                row.push(cell);
                cell = "";
            }
            else if (ch === "\n") {
                row.push(cell);
                rows.push(row);
                row = [];
                cell = "";
            }
            else {
                cell += ch;
            }
        }
        row.push(cell);
        if (row.length > 1 || cleanCell(row[0]))
            rows.push(row);
        return rows;
    }
    function collectUnknownPrograms(datasets, known) {
        const unknown = [];
        datasets.forEach((dataset) => {
            dataset.records.forEach((record) => {
                const program = cleanCell(record.__program || programOf(record));
                if (program && !known.has(canonProgram(program)))
                    unknown.push(program);
            });
        });
        return unique(unknown).sort((a, b) => a.localeCompare(b));
    }
    function groupById(records, fallbackIndex) {
        return groupBy(records, (record) => participantExternalId(record, fallbackIndex));
    }
    function groupBy(records, keyFn) {
        const map = new Map();
        records.forEach((record) => {
            const key = keyFn(record);
            if (!key)
                return;
            if (!map.has(key))
                map.set(key, []);
            map.get(key).push(record);
        });
        return map;
    }
    function groupFaculty(records) {
        const map = new Map();
        records.forEach((record) => {
            const program = cleanCell(get(record, ["Program", "Enrolled Program", "Activity", "Class", "Housing", "House", "Residence hall", "Residence Hall"], 0));
            if (!program)
                return;
            const key = canonProgram(stripProgramDate(program));
            if (!map.has(key))
                map.set(key, []);
            map.get(key).push(record);
        });
        return map;
    }
    function findRoommates(context) {
        // Stable roommate lookup for the current registration database:
        // rows contain Residence hall + Room number directly.  Match everyone in
        // the same residence hall and same room *base* (drop the final bed suffix
        // when present, e.g. EIS-0316A/EIS-0316B -> EIS-0316).  Do not require a
        // particular A/B pairing; some rooms have unusual suffixes or formats.
        const selfHallKey = residenceHallKey(houseOf(context.housingRow));
        const selfRoomBase = roomBaseKey(roomOf(context.housingRow));
        if (!selfHallKey || !selfRoomBase)
            return [];
        const seen = new Set();
        return context.dbHousing
            .filter((candidate) => {
            if (candidate === context.housingRow)
                return false;
            const candidateId = participantExternalId(candidate, 22);
            if (candidateId && context.selfId && candidateId === context.selfId)
                return false;
            return residenceHallKey(houseOf(candidate)) === selfHallKey && roomBaseKey(roomOf(candidate)) === selfRoomBase;
        })
            .filter((candidate) => {
            const id = participantExternalId(candidate, 22);
            const key = id || `${fullNameFromDatabase(candidate).toLowerCase()}|${roomBaseKey(roomOf(candidate))}`;
            if (seen.has(key))
                return false;
            seen.add(key);
            return true;
        })
            .map((candidate) => {
            const id = participantExternalId(candidate, 22);
            const activityRows = context.dbActivityById.get(id) || [];
            const activity = activityRows[0] || null;
            const allRows = context.dbAnyById && id ? (context.dbAnyById.get(id) || []) : [];
            const name = fullNameFromDatabase(candidate);
            return {
                id,
                name,
                house: houseOf(candidate),
                room: roomOf(candidate),
                status: roommateAttendanceStatus({
                    id,
                    name,
                    todayActivityById: context.todayActivityById,
                    absentNames: context.absentNames
                }),
                program: activity ? stripProgramDate(programOf(activity)) : "",
                phone: (context.studentPhoneById && context.studentPhoneById.get(id)) || studentPhoneFromRows([candidate, ...activityRows, ...allRows])
            };
        });
    }
    function roommateAttendanceStatus(context) {
        const rows = (context.todayActivityById && context.todayActivityById.get(context.id)) || [];
        const absentBySheetLogic = context.absentNames && context.absentNames.has(cleanCell(context.name).toLowerCase());
        if (!rows.length)
            return absentBySheetLogic ? "Needs attendance check" : "No current activity row found";
        const checkedOut = rows.find((row) => cleanCell(get(row, ["Status"], 2)) === "Checked out");
        if (checkedOut) {
            const attendance = cleanCell(get(checkedOut, ["Attendance Status"], 3));
            return attendance ? `Checked out (marked ${attendance})` : "Checked out";
        }
        const notCheckedIn = rows.find((row) => cleanCell(get(row, ["Status"], 2)) === "Not checked in");
        if (notCheckedIn) {
            const attendance = cleanCell(get(notCheckedIn, ["Attendance Status"], 3));
            return attendance ? `Not checked in (marked ${attendance})` : "Not checked in";
        }
        const blank = rows.find((row) => !cleanCell(get(row, ["Attendance Status"], 3)));
        if (blank)
            return absentBySheetLogic ? "Not reported yet" : "Not reported yet (overridden)";
        const needsCheck = rows.find((row) => {
            const attendance = cleanCell(get(row, ["Attendance Status"], 3));
            return attendance !== "Present" && attendance !== "Late";
        });
        if (needsCheck)
            return `Needs attendance check (${cleanCell(get(needsCheck, ["Attendance Status"], 3))})`;
        const late = rows.find((row) => cleanCell(get(row, ["Attendance Status"], 3)) === "Late");
        if (late)
            return "Late";
        return "Present";
    }
    function parentInfo(row, number) {
        if (!row)
            return { firstName: "", lastName: "", relationship: "", language: "", phone: "", email: "" };
        if (number === 1) {
            return {
                firstName: cleanCell(get(row, ["Parent/guardian information: First name", "Parent 1 first name", "P1 firstname", "P1 first name", "Guardian 1 first name"], 7)),
                lastName: cleanCell(get(row, ["Parent/guardian information: Last name", "Parent 1 last name", "P1 lastname", "P1 last name", "Guardian 1 last name"], 8)),
                relationship: cleanCell(get(row, ["Parent/guardian information: Relationship", "Parent 1 relationship", "P1 rel", "Guardian 1 relationship"], 9)),
                language: cleanCell(get(row, ["Parent/guardian information: Parent/guardian primary language", "Parent 1 language", "Guardian 1 language"], 11)),
                phone: phoneLike(get(row, ["Parent/guardian information: Parent/guardian cell phone", "Parent/guardian information: Primary phone", "Parent 1 phone", "P1 phone", "Guardian 1 phone"], 10)),
                email: ""
            };
        }
        return {
            firstName: cleanCell(get(row, ["Parent/guardian 2 information: First name", "Parent 2 first name", "P2 firstname", "P2 first name", "Guardian 2 first name"], 12)),
            lastName: cleanCell(get(row, ["Parent/guardian 2 information: Last name", "Parent 2 last name", "P2 lastname", "P2 last name", "Guardian 2 last name"], 13)),
            // Session 2 removed the Parent/guardian 2 email column. This field is
            // intentionally blank so column 14 is not misread as an email address.
            email: "",
            relationship: cleanCell(get(row, ["Parent/guardian 2 information: Relationship", "Parent 2 relationship", "P2 rel", "Guardian 2 relationship"], 14)),
            language: cleanCell(get(row, ["Parent/guardian 2 information: Parent/guardian primary language", "Parent 2 language", "Guardian 2 language"], 16)),
            phone: phoneLike(get(row, ["Parent/guardian 2 information: Parent/guardian cell phone", "Parent 2 phone", "P2 phone", "Guardian 2 phone"], 15))
        };
    }
    function yesterdayInfo(row) {
        if (!row)
            return { available: false, date: "", status: "", attendanceStatus: "", program: "", checkIn: "", checkOut: "" };
        return {
            available: true,
            date: cleanCell(get(row, ["Date"], 1)),
            status: cleanCell(get(row, ["Status"], 2)),
            attendanceStatus: cleanCell(get(row, ["Attendance Status"], 3)),
            program: stripProgramDate(programOf(row)),
            checkIn: cleanCell(get(row, ["Check in", "Check-in", "Check In"], 5)),
            checkOut: cleanCell(get(row, ["Check out", "Check-out", "Check Out"], 6))
        };
    }
    function activityAttendanceInfo(row) {
        if (!row)
            return { available: false, date: "", status: "", attendanceStatus: "", program: "", checkIn: "", checkOut: "" };
        return {
            available: true,
            date: cleanCell(get(row, ["Date"], 1)),
            status: cleanCell(get(row, ["Status"], 2)),
            attendanceStatus: cleanCell(get(row, ["Attendance Status"], 3)) || "Not specified",
            program: stripProgramDate(programOf(row)),
            checkIn: cleanCell(get(row, ["Check in", "Check-in", "Check In"], 5)),
            checkOut: cleanCell(get(row, ["Check out", "Check-out", "Check Out"], 6))
        };
    }
    function facultyInfo(row) {
        return {
            program: cleanCell(get(row, ["Program", "Enrolled Program", "Activity", "Class"], 0)) || "N/A",
            faculty: cleanCell(get(row, ["Faculty", "Instructor", "RA", "Resident assistant"], 1)) || "N/A",
            contact: cleanCell(get(row, ["Contact person", "Contact", "Faculty contact", "RA contact"], 2)) || "N/A",
            phone: phoneLike(get(row, ["Phone", "Phone number", "Contact phone", "Contact person phone number", "Faculty phone", "RA phone", "Phone nr"], 3)) || "N/A"
        };
    }
    function programOf(record) {
        const direct = cleanCell(get(record, ["Program", "Enrolled Program", "Activity", "Class"], undefined));
        if (direct)
            return direct;
        // Attendance exports have Program at column 4. The Session 2 registration
        // database has Program at column 18 after removing Parent/guardian 2 email.
        const source = cleanCell(record && record.__sourceLabel).toLowerCase();
        if (source.includes("attendance") || source.includes("housing"))
            return cleanCell(get(record, [], 4));
        return cleanCell(get(record, [], 18));
    }
    function houseOf(record) {
        return cleanCell(get(record, ["Participant information: Residence hall", "House", "Housing", "Dorm", "Residence hall", "Residence Hall"], 4)) || programOf(record);
    }
    function roomOf(record) {
        return cleanCell(get(record, ["Participant information: Room number", "Room number", "Housing room", "Dorm room", "Room"], 5));
    }
    function hasHousingInfo(record) {
        return Boolean(roomOf(record) || cleanCell(get(record, ["Participant information: Residence hall", "Residence hall", "Residence Hall"], 4)));
    }
    function hasActivityInfo(record) {
        return Boolean(programOf(record));
    }
    function buildStudentPhoneById(records) {
        const map = new Map();
        // First pass: housing rows usually carry Participant information: Student cell phone.
        for (const record of records || []) {
            const id = participantExternalId(record, 22);
            if (!id || map.has(id))
                continue;
            const phone = phoneLike(firstNonBlank(record, ["Participant information: Student cell phone"], undefined));
            if (phone)
                map.set(id, phone);
        }
        // Second pass: activity rows usually carry Contact information: Student’s phone number.
        for (const record of records || []) {
            const id = participantExternalId(record, 22);
            if (!id || map.has(id))
                continue;
            const phone = phoneLike(firstNonBlank(record, [
                "Contact information: Student’s phone number",
                "Contact information: Student's phone number",
                "Student phone",
                "Participant phone",
                "Phone",
                "Phone number"
            ], undefined));
            if (phone)
                map.set(id, phone);
        }
        // Final fallback: any recognized student phone field on any row.
        for (const record of records || []) {
            const id = participantExternalId(record, 22);
            if (!id || map.has(id))
                continue;
            const phone = studentPhoneOf(record);
            if (phone)
                map.set(id, phone);
        }
        return map;
    }
    function studentPhoneFromRows(rows) {
        for (const row of rows || []) {
            const phone = studentPhoneOf(row);
            if (phone)
                return phone;
        }
        return "";
    }
    function studentPhoneOf(record) {
        return phoneLike(get(record, ["Participant information: Student cell phone", "Contact information: Student’s phone number", "Contact information: Student's phone number", "Student phone", "Participant phone", "Phone", "Phone number"], 3));
    }
    function firstNameOf(record) {
        return record ? cleanCell(get(record, ["Participant information: First name", "Participant First name", "Participant First Name", "First name", "First Name"], 0)) : "";
    }
    function lastNameOf(record) {
        return record ? cleanCell(get(record, ["Participant information: Last name", "Participant Last name", "Participant Last Name", "Last name", "Last Name"], 1)) : "";
    }
    function fullNameFromDatabase(record) {
        const direct = cleanCell(get(record, ["Participant", "Name", "Full name", "Full Name"], undefined));
        if (direct)
            return direct;
        return cleanCell(`${firstNameOf(record)} ${lastNameOf(record)}`);
    }
    function participantExternalId(record, fallbackIndex) {
        // Jumbula's 2026 live-attendance export currently has a shifted ID bug:
        // the numeric Pacific ID appears under "Picked up by", while
        // "Participant external ID" contains Jumbula's internal alphanumeric ID.
        // Attendance reports call this with fallbackIndex 8, so prefer the
        // numeric Picked up by / column-8 value there. Registration database rows
        // prefer the explicit Pacific ID field from the current database layout,
        // falling back to Participant external ID / the supplied fallback column.
        if (fallbackIndex === 8) {
            const pickedUpBy = normalizeId(firstNonBlank(record, ["Picked up by", "Picked Up By"], 8));
            if (looksLikePacificId(pickedUpBy))
                return pickedUpBy;
        }
        return normalizeId(firstNonBlank(record, [
            "Photo upload and roommate request: Pacific id: Your pacific id",
            "Pacific ID",
            "Pacific id",
            "Participant external ID",
            "Participant External ID",
            "External ID",
            "Student ID",
            "ID"
        ], fallbackIndex));
    }
    function firstNonBlank(record, aliases, fallbackIndex) {
        for (const alias of aliases) {
            const value = get(record, [alias], undefined);
            if (cleanCell(value))
                return value;
        }
        if (typeof fallbackIndex === "number" && record && record.__row && fallbackIndex >= 0 && fallbackIndex < record.__row.length)
            return record.__row[fallbackIndex];
        return "";
    }
    function get(record, aliases, fallbackIndex) {
        if (!record)
            return "";
        for (const alias of aliases) {
            const normalized = normalizeHeader(alias);
            if (Object.prototype.hasOwnProperty.call(record, normalized))
                return record[normalized];
        }
        const aliasKeys = new Set(aliases.map((alias) => canon(alias)));
        for (const header of record.__headers || []) {
            if (aliasKeys.has(canon(header)))
                return record[header];
        }
        if (typeof fallbackIndex === "number" && record.__row && fallbackIndex >= 0 && fallbackIndex < record.__row.length)
            return record.__row[fallbackIndex];
        return "";
    }
    function stripProgramDate(program) {
        return cleanCell(String(program || "").replace(/,\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b.*$/i, ""));
    }
    function normalizeRoomNumber(room) {
        return cleanCell(room)
            .toUpperCase()
            .replace(/[–—]/g, "-")
            .replace(/\s+/g, "");
    }
    function residenceHallKey(house) {
        return canon(cleanCell(house).replace(/\s+\d+$/, ""));
    }
    function roomBaseKey(room) {
        const normalized = normalizeRoomNumber(room);
        if (!normalized)
            return "";
        // Stable behavior from the original workflow: compare room numbers after
        // removing a final bed suffix.  This matches EIS-0316A with EIS-0316B and
        // also handles plain formats like 0316A.  If there is no final letter, use
        // the whole room string rather than inventing a match.
        if (/^[A-Z]+-?0*[0-9]+-?[A-Z]$/.test(normalized) || /^0*[0-9]+-?[A-Z]$/.test(normalized)) {
            return normalized.slice(0, -1);
        }
        return normalized;
    }
    function phoneLike(value) {
        const cleaned = cleanCell(value);
        if (!cleaned || cleaned.toLowerCase() === "nan")
            return "";
        if (/^\d+\.0$/.test(cleaned))
            return cleaned.slice(0, -2);
        return cleaned;
    }
    function looksLikePacificId(value) {
        return /^\d{5,}$/.test(normalizeId(value));
    }
    function normalizeId(value) {
        const cleaned = cleanCell(value);
        if (!cleaned || cleaned.toLowerCase() === "nan")
            return "";
        if (/^\d+\.0$/.test(cleaned))
            return cleaned.slice(0, -2);
        return cleaned;
    }
    function normalizeHeader(value) {
        return cleanCell(value).replace(/^\uFEFF/, "");
    }
    function cleanCell(value) {
        if (value === null || value === undefined)
            return "";
        return String(value).replace(/\s+/g, " ").trim();
    }
    function canon(value) {
        return cleanCell(value).toLowerCase().replace(/[^a-z0-9]+/g, "");
    }
    function canonProgram(value) {
        return cleanCell(value).toLowerCase();
    }
    function unique(values) {
        const seen = new Set();
        const out = [];
        values.forEach((value) => {
            const key = String(value);
            if (!key || seen.has(key))
                return;
            seen.add(key);
            out.push(value);
        });
        return out;
    }
    function renderMessagesForReport(report) {
        const messages = [];
        messages.push({ type: "ok", text: `${report.diagnostics.mode === "housing" ? "Housing" : "Activity"} report generated: ${report.students.length} attendance check sheet(s).` });
        if (report.diagnostics.presentNotCheckedIn.length) {
            messages.push({ type: "warn", text: `Present but checked out/not checked in: ${report.diagnostics.presentNotCheckedIn.join(", ")}.` });
        }
        if (report.diagnostics.unspecifiedRows) {
            messages.push({ type: "warn", text: `${report.diagnostics.unspecifiedRows} student row(s) across ${report.diagnostics.unsubmittedAttendance.length} program(s) have blank Attendance Status.` });
        }
        report.warnings.slice(0, 12).forEach((warning) => messages.push({ type: "warn", text: warning }));
        if (report.warnings.length > 12)
            messages.push({ type: "warn", text: `${report.warnings.length - 12} more warning(s) not shown. Check the report inputs/settings.` });
        showMessages(messages);
    }
    function showMessages(messages) {
        byId("messages").innerHTML = messages.map((message) => `<div class="message ${escapeAttr(message.type)}">${escapeHtml(message.text)}</div>`).join("");
    }
    function renderReport(report, options = {}) {
        const reportElement = byId("report");
        const showSheets = Boolean(options.showSheets);
        const sheetMarkup = showSheets
            ? (report.students.length
                ? report.students.map(renderStudentCard).join("")
                : `<div class="report-empty"><p>No students needing an attendance check were found after applying the current filters.</p></div>`)
            : `<div class="report-empty"><p>Sheets not generated yet. Use the checkboxes in Step 2, then press Generate attendance check sheets.</p></div>`;
        reportElement.innerHTML = `
      <section class="workflow-section faculty-review-section" aria-labelledby="faculty-review-heading">
        <div class="workflow-heading">
          <div>
            <h2 id="faculty-review-heading">2. ${report.diagnostics.mode === "housing" ? "Housing attendance review" : "Faculty attendance review"}</h2>
            <p>${report.diagnostics.mode === "housing" ? "Uncheck a housing row to treat those blank housing attendance cells as a reporting mistake and skip sheets for those students." : "Uncheck a faculty/program row to treat those blank attendance cells as a reporting mistake and skip sheets for those students."}</p>
          </div>
        </div>
        <div class="summary-grid faculty-summary-grid">
          ${summaryCard(report.diagnostics.todayRows, "Today CSV data rows")}
          ${summaryCard(report.diagnostics.activeRowsChecked, report.diagnostics.mode === "housing" ? "Active housing rows checked" : "Active activity rows checked")}
          ${summaryCard(report.diagnostics.unspecifiedRows, "Students not yet reported")}
        </div>
        ${renderFacultySubmissionStatus(report.diagnostics.unsubmittedAttendance, report.diagnostics.unspecifiedRows, options.suppressedUnsubmittedProgramKeys || [], report.diagnostics.mode)}
        ${renderPresentButCheckedOutIssues(report.diagnostics.presentButCheckedOutIssues)}
      </section>

      <section class="workflow-section reports-section ${showSheets ? "" : "disabled-section"}" aria-labelledby="reports-heading">
        <div class="report-section-header workflow-heading">
          <div>
            <h2 id="reports-heading">3. Reports</h2>
            <p>${showSheets ? "Review the generated sheets, then export/print them as a PDF." : "Generate attendance check sheets from Step 2 before exporting."}</p>
          </div>
          <button id="printButton" type="button" class="secondary" onclick="window.print()" ${showSheets && report.students.length ? "" : "disabled"}>Export/Print PDF</button>
        </div>
        ${showSheets ? `<div class="summary-grid reports-summary-grid">${summaryCard(report.students.length, "Generated attendance check sheets")}</div>` : ""}
        ${sheetMarkup}
      </section>`;
        const generateButton = document.getElementById("generateSheetsButton");
        if (generateButton)
            generateButton.addEventListener("click", generateSheetsFromFacultySelections);
    }
    function summaryCard(number, label) {
        return `<div class="summary-card"><strong>${escapeHtml(number)}</strong><span>${escapeHtml(label)}</span></div>`;
    }
    function renderPresentButCheckedOutIssues(issues) {
        if (!issues || !issues.length) {
            return `
        <section class="cleanup-panel cleanup-ok" aria-labelledby="cleanup-heading">
          <h3 id="cleanup-heading">Jumbula cleanup: present but checked out/not checked in</h3>
          <p>No students are simultaneously marked Present and Checked out/Not checked in.</p>
        </section>`;
        }
        return `
      <section class="cleanup-panel cleanup-warn" aria-labelledby="cleanup-heading">
        <div class="cleanup-header">
          <div>
            <h3 id="cleanup-heading">Jumbula cleanup: present but checked out/not checked in</h3>
            <p>These rows do not generate attendance check sheets. Fix the status conflict in Jumbula.</p>
          </div>
          <strong>${escapeHtml(issues.length)} issue${issues.length === 1 ? "" : "s"}</strong>
        </div>
        <div class="faculty-table-wrap">
          <table class="cleanup-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Program</th>
                <th>Jumbula status</th>
                <th>Attendance status</th>
                <th>Times</th>
              </tr>
            </thead>
            <tbody>
              ${issues.map(renderCleanupIssueRow).join("")}
            </tbody>
          </table>
        </div>
      </section>`;
    }
    function renderCleanupIssueRow(issue) {
        const name = issue.id ? `${issue.name} (ID ${issue.id})` : issue.name;
        const times = [issue.checkIn ? `In: ${issue.checkIn}` : "", issue.checkOut ? `Out: ${issue.checkOut}` : ""].filter(Boolean).join(" • ");
        return `
      <tr>
        <td>${escapeHtml(name)}</td>
        <td>${escapeHtml(issue.program)}</td>
        <td>${escapeHtml(issue.status)}</td>
        <td>${escapeHtml(issue.attendanceStatus)}</td>
        <td>${escapeHtml(times || "—")}</td>
      </tr>`;
    }
    function renderFacultySubmissionStatus(groups, totalUnreported, suppressedKeys = [], mode = "activity") {
        const isHousingMode = mode === "housing";
        const suppressed = new Set(suppressedKeys || []);
        const action = `
      <div class="faculty-actions">
        <button id="generateSheetsButton" type="button">Generate attendance check sheets</button>
        <p class="muted">Checked rows generate sheets for blank/unreported students. Unchecked rows are treated as all present for sheet generation.</p>
      </div>`;
        if (!groups.length) {
            return `
        <section class="faculty-status-panel all-submitted" aria-labelledby="faculty-status-heading">
          <div>
            <h3 id="faculty-status-heading">${isHousingMode ? "Housing attendance submission status" : "Faculty attendance submission status"}</h3>
            <p>All active ${isHousingMode ? "housing" : "activity"} rows have an Attendance Status value.</p>
          </div>
          <strong>0 students unreported</strong>
          ${action}
        </section>`;
        }
        return `
      <section class="faculty-status-panel needs-submission" aria-labelledby="faculty-status-heading">
        <div class="faculty-status-header">
          <div>
            <h3 id="faculty-status-heading">${isHousingMode ? "Housing attendance not submitted yet" : "Faculty attendance not submitted yet"}</h3>
            <p>These ${isHousingMode ? "housing groups" : "programs"} still have blank/whitespace Attendance Status cells in today's CSV.</p>
          </div>
          <strong>${escapeHtml(totalUnreported)} students unreported</strong>
        </div>
        <div class="faculty-table-wrap">
          <table class="faculty-status-table">
            <thead>
              <tr>
                <th>Generate sheets?</th>
                <th>Program</th>
                <th>${isHousingMode ? "Housing group" : "Faculty / contact"}</th>
                <th>Students not reported present/absent</th>
              </tr>
            </thead>
            <tbody>
              ${groups.map((group) => renderFacultySubmissionRow(group, !suppressed.has(group.key), mode)).join("")}
            </tbody>
          </table>
        </div>
        ${action}
      </section>`;
    }
    function renderFacultySubmissionRow(group, checked, mode = "activity") {
        const facultyText = group.faculty.length
            ? group.faculty.map((faculty) => {
                const pieces = [faculty.faculty, faculty.contact, faculty.phone].map(cleanCell).filter((value) => value && value !== "N/A");
                return pieces.length ? pieces.join(" • ") : "N/A";
            }).join("; ")
            : `No matching ${mode === "housing" ? "RA" : "faculty"} contact`;
        const detailsId = `students-${canon(group.key)}`;
        return `
      <tr>
        <td>
          <label class="faculty-checkbox-label">
            <input class="faculty-generate-checkbox" type="checkbox" data-program-key="${escapeHtml(group.key)}" ${checked ? "checked" : ""} />
            <span>Yes</span>
          </label>
        </td>
        <td>${escapeHtml(group.program)}</td>
        <td>${escapeHtml(facultyText)}</td>
        <td><strong>${escapeHtml(group.count)}</strong></td>
      </tr>
      <tr class="faculty-student-details-row">
        <td colspan="4">
          <details class="faculty-student-details">
            <summary aria-controls="${escapeHtml(detailsId)}">Show ${escapeHtml(group.count)} unreported student${group.count === 1 ? "" : "s"}</summary>
            <ul id="${escapeHtml(detailsId)}" class="faculty-student-list">
              ${group.students.map(renderUnreportedStudent).join("")}
            </ul>
          </details>
        </td>
      </tr>`;
    }
    function renderUnreportedStudent(student) {
        const meta = [student.id ? `ID ${student.id}` : "", student.status, student.checkIn ? `check-in ${student.checkIn}` : ""].filter(Boolean).join(" • ");
        return `<li><span>${escapeHtml(student.name)}</span>${meta ? `<small>${escapeHtml(meta)}</small>` : ""}</li>`;
    }
    function renderStudentCard(student) {
        return `
      <article class="student-card">
        <div class="sheet-kicker">Attendance Check Sheet</div>
        <div class="sheet-topline">
          <div>
            <h3>${escapeHtml(student.fullName || "Unknown student")}</h3>
            <p class="subline">${student.mode === "housing" ? "Evening housing check" : "Current program"}: ${escapeHtml(student.mode === "housing" ? student.checkProgram || student.house || "Unknown housing" : student.currentActivity || "Unknown program")}</p>
          </div>
          <div class="sheet-id">${student.id ? `Pacific ID ${escapeHtml(student.id)}` : "No Pacific ID"}</div>
        </div>
        ${section("Student identity and current check", [
            row("Name", student.fullName),
            row("Gender", student.gender),
            row("Student phone", student.studentPhone),
            row("Pacific ID", student.id),
            row(student.mode === "housing" ? "Today's activity" : "Current program", student.currentActivity),
            row(student.mode === "housing" ? "Housing check program" : "Check program", student.checkProgram),
            row("All registered programs", student.allPrograms.join("; ")),
            row("Housing assignment", student.house),
            row("Room", student.room),
            row("Enrollment status", student.status),
            row(student.mode === "housing" ? "Housing check status" : "Current check status", student.attendanceStatus),
            row("Check-in time", student.checkIn),
            row("Check-out time", student.checkOut)
        ])}
        <div class="section-title">Roommate information</div>
        ${renderRoommates(student.roommates)}
        ${renderGuardianContacts(student)}
        ${student.mode === "housing" ? renderTodayActivityAttendance(student.todayActivity) : renderYesterdayHousingCheck(student.yesterday)}
        <div class="section-title">${student.mode === "housing" ? "RA / housing contact" : "Program faculty contact"}</div>
        ${student.faculty.length ? student.faculty.map((faculty) => `
          <div class="info-grid compact-grid">
            ${row(student.mode === "housing" ? "Housing/program" : "Program", faculty.program)}
            ${row(student.mode === "housing" ? "RA/faculty" : "Faculty", faculty.faculty)}
            ${row("Contact", faculty.contact)}
            ${row("Contact phone", faculty.phone)}
          </div>`).join("") : `<p class="muted">No matching ${student.mode === "housing" ? "RA" : "faculty"} contact was found.</p>`}
      </article>`;
    }
    function renderTodayActivityAttendance(activity) {
        if (!activity || !activity.available) {
            return section("Today's activity attendance", [
                row("Status", "No activity attendance row found"),
                row("Attendance status", "—")
            ]);
        }
        return section("Today's activity attendance", [
            row("Date", activity.date),
            row("Activity", activity.program),
            row("Status", activity.status),
            row("Attendance status", activity.attendanceStatus),
            row("Check-in time", activity.checkIn),
            row("Check-out time", activity.checkOut)
        ]);
    }
    function renderYesterdayHousingCheck(yesterday) {
        if (!yesterday || !yesterday.available)
            return "";
        return section("Yesterday evening housing check", [
            row("Date", yesterday.date),
            row("Housing status", yesterday.status),
            row("Housing check status", yesterday.attendanceStatus),
            row("House/program", yesterday.program),
            row("Check-in time", yesterday.checkIn),
            row("Check-out time", yesterday.checkOut)
        ]);
    }
    function renderGuardianContacts(student) {
        return `
      <div class="section-title">Parent / guardian contacts</div>
      <div class="guardian-grid">
        ${guardianColumn("Parent / guardian 1", student.parent1)}
        ${guardianColumn("Parent / guardian 2", student.parent2)}
      </div>`;
    }
    function guardianColumn(title, guardian) {
        const name = cleanCell(`${guardian.firstName} ${guardian.lastName}`);
        const relLang = [guardian.relationship, guardian.language].map(cleanCell).filter(Boolean).join(" / ");
        return `
      <div class="guardian-card">
        <h4>${escapeHtml(title)}</h4>
        ${row("Name", name)}
        ${row("Rel/lang", relLang)}
        ${row("Phone", guardian.phone)}
      </div>`;
    }
    function renderRoommates(roommates) {
        if (!roommates.length)
            return `<p class="muted">No roommate found in the registration database.</p>`;
        return `<div class="roommate-list">${roommates.map((roommate) => `
      <div class="info-grid">
        ${row("Name", roommate.name)}
        ${row("House", roommate.house)}
        ${row("Room", roommate.room)}
        ${row("Check status", roommate.status)}
        ${row("Program", roommate.program)}
        ${row("Phone number", roommate.phone)}
      </div>`).join("")}</div>`;
    }
    function section(title, rows) {
        return `<div class="section-title">${escapeHtml(title)}</div><div class="info-grid">${rows.join("")}</div>`;
    }
    function row(label, value) {
        const display = cleanCell(value) || "—";
        return `<div class="info-row"><span class="label">${escapeHtml(label)}</span><span class="value">${escapeHtml(display)}</span></div>`;
    }
    function escapeHtml(value) {
        return String(value).replace(/[&<>'"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[ch]));
    }
    function escapeAttr(value) {
        return String(value).replace(/[^a-z0-9_-]/gi, "");
    }
    function formatBytes(bytes) {
        if (!Number.isFinite(bytes))
            return "";
        if (bytes < 1024)
            return `${bytes} B`;
        if (bytes < 1024 * 1024)
            return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    }
})();
