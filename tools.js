/* =====================================================================
   tools.js  -  shared quiz tools (header, search, theme, subject filter,
   lecture list, pin, copy, answers, pen & eraser).
   Each quiz page only provides a QUIZ_CONFIG block, then loads this file.
   ===================================================================== */


/* =====================================================================
   LINKED PAGES  -  questions are stored ONCE, in the YEAR files
   ---------------------------------------------------------------------
   YEAR file  (e.g. IBS_End-Block_2024-2025.html)  owns the questions of every subject:

       window.QUIZ_CONFIG = {
           title: "IBS 🧪", subtitle: "End-Block · 2024-2025",
           year: "End-Block _ 2024-2025",          // the name shown in the subject pages' year filter
           subjects: [ "Pathology 🔬", "Biochemistry 🧪", ... ],   // optional: subject names + emoji (order = filter list); others are added automatically
           subjectFiles: [ "IBS_Pathology_All Years.html", ... ],   // optional: only read for emoji and lecture names; missing files are skipped
           questions: [ { n: 1, s: "Pathology", l: 7, q: "...", o: [...], a: "B" }, ... ]
       };
       "s" = subject name (as written in that subject file), "l" = lecture number (as in that subject file).
       "n" only has to be unique for the same subject inside the year file (it keeps pins / drawings attached).

   SUBJECT file (e.g. IBS_Biochemistry.html) owns the lectures and pulls its questions from the year files:

       window.QUIZ_CONFIG = {
           title, subtitle, subject: "Biochemistry 🧪",
           lectures: { 1: "Protein Metabolism", ... },
           yearFiles: [ "IBS_End-Block_2018-2019.html", ... ]   // order = order of the year filter
       };
       A year file that does not exist yet (or cannot be loaded) is simply skipped, with no warning, so every subject file can list all years now.
       The year name comes from the  year: "..."  line of each year file; only years that have at least one
       question of this subject appear in the filter, and only lectures used by the selected year are listed.

   Needs the pages to be opened through a web server / hosting (not by double-clicking the file).
   ===================================================================== */
(function linkedPageLoader() {
    const cfg = window.QUIZ_CONFIG;
    if (!cfg) return;
    const isYearPage    = Array.isArray(cfg.subjectFiles) || (!!cfg.year && !cfg.subject && Array.isArray(cfg.questions));
    const isSubjectPage = !isYearPage && !!cfg.subject && Array.isArray(cfg.yearFiles);
    if (!isYearPage && !isSubjectPage) return;
    const errors = window.__QUIZ_LINK_ERRORS = [];
    const norm = t => String(t == null ? '' : t).replace(/[\u2013\u2014]/g, '-').replace(/\s+/g, ' ').trim().toLowerCase();
    const fileOf = src => typeof src === 'string' ? src : ((src && src.file) || '');

    function splitSubject(raw) {
        if (!raw) return null;
        if (typeof raw === 'object') return { name: String(raw.name || '').trim(), emoji: raw.emoji || '' };
        const str = String(raw).trim();
        const m = str.match(/^(.*?)\s*([^A-Za-z0-9\s()&,.\-\/'+][^]*)$/u);
        return { name: m ? m[1].trim() : str, emoji: m ? m[2].trim() : '' };
    }
    function subjectName(raw) { const s = splitSubject(raw); return s ? s.name : ''; }
    function readConfig(file) {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', encodeURI(file) + (file.indexOf('?') < 0 ? '?nocache=' + Date.now() : ''), false);   // synchronous on purpose: the page builds right after
        try { xhr.send(null); }
        catch (err) { err.missing = true; throw err; }                // file not found / cannot be fetched (also what a missing file looks like when opened from disk)
        if (xhr.status && (xhr.status < 200 || xhr.status >= 300)) { const e = new Error('HTTP ' + xhr.status); e.missing = true; throw e; }
        if (!xhr.responseText) { const e = new Error('empty response'); e.missing = true; throw e; }
        const doc = new DOMParser().parseFromString(xhr.responseText, 'text/html');   // scripts are NOT executed here
        const script = Array.from(doc.querySelectorAll('script:not([src])')).find(sc => sc.textContent.indexOf('QUIZ_CONFIG') >= 0);
        if (!script) throw new Error('no QUIZ_CONFIG found in the file');
        const fakeWindow = {};
        new Function('window', script.textContent)(fakeWindow);
        if (!fakeWindow.QUIZ_CONFIG) throw new Error('QUIZ_CONFIG is empty');
        return fakeWindow.QUIZ_CONFIG;
    }
    function lectureMap(f, name) {
        const L = f.lectures || {};
        const keys = Object.keys(L);
        if (!keys.length) return {};
        if (keys.every(k => /^\d+$/.test(k))) return L;                       // flat form  { 1: "Name" }
        const hit = keys.find(k => norm(k) === norm(name))
                 || keys.find(k => norm(k).startsWith(norm(name)) || norm(name).startsWith(norm(k)))
                 || keys[0];
        return L[hit] || {};
    }
    function offsetFor(name) {            // stable, so pins / pen drawings stay attached to the right question
        let h = 0;
        for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
        return (h % 9000 + 1) * 100000;
    }

    /* ---------- YEAR page: owns the questions; subject names / emoji / lectures are optional extras ---------- */
    if (isYearPage) {
        const subs = [];                                              // { name, emoji, lectures }  (order = order in the filter list)
        const add = raw => {
            const s = splitSubject(raw);
            if (!s || !s.name) return null;
            let hit = subs.find(x => norm(x.name) === norm(s.name));
            if (!hit) { hit = { name: s.name, emoji: s.emoji || '', lectures: {} }; subs.push(hit); }
            else if (s.emoji && !hit.emoji) hit.emoji = s.emoji;
            return hit;
        };
        (cfg.subjects || []).forEach(add);                            // 1) subjects: [ "Anatomy 🦴", ... ] written on this page
        (cfg.subjectFiles || []).forEach(src => {                     // 2) subject files that exist: emoji + lecture names (missing ones are skipped silently)
            const file = fileOf(src);
            if (!file) return;
            try {
                const f = readConfig(file);
                const hit = add(f.subject);
                if (hit) hit.lectures = lectureMap(f, hit.name);
            } catch (e) { console.info('[linked pages] subject file not loaded, skipped: ' + file); }
        });
        (cfg.questions || []).forEach(q => add(q.s));                 // 3) any other subject used by a question
        const ownLect = cfg.lectures || {};                           // 4) optional lectures: { "Anatomy": { 1: "..." } } written on this page
        subs.forEach(sub => {
            const k = Object.keys(ownLect).find(x => norm(x) === norm(sub.name));
            if (k && !Object.keys(sub.lectures).length) sub.lectures = ownLect[k] || {};
        });

        const seen = new Set(), mine = [];
        (cfg.questions || []).forEach(q => {
            const idx = subs.findIndex(x => norm(x.name) === norm(subjectName(q.s)));
            if (idx < 0) { errors.push('A question (n=' + q.n + ') has no subject "s".'); return; }
            if (!isFinite(Number(q.n))) { errors.push('A ' + subs[idx].name + ' question has no valid number "n".'); return; }
            const key = idx + '|' + Number(q.n);
            if (seen.has(key)) errors.push('Number ' + q.n + ' is used twice for ' + subs[idx].name + ' in this year file.');
            seen.add(key);
            mine.push({ idx, item: Object.assign({}, q, { s: subs[idx].name, srcN: q.n, n: offsetFor(subs[idx].name) + Number(q.n) }) });
        });
        mine.sort((a, b) => a.idx - b.idx);                           // grouped by subject, in the order of the list
        const questions = mine.map(m => m.item);
        const usedSubjects = new Set(questions.map(q => q.s));
        const subjects = [], lecturesOut = {};
        subs.forEach(sub => {
            if (!usedSubjects.has(sub.name)) return;                  // no questions of this subject in this year
            subjects.push({ name: sub.name, emoji: sub.emoji });
            const used = new Set(questions.filter(q => q.s === sub.name).map(q => String(q.l)));
            lecturesOut[sub.name] = Object.fromEntries(Object.entries(sub.lectures).filter(([k]) => used.has(String(k))));
        });
        questions.forEach((q, i) => { q.num = i + 1; });              // numbers shown on this page: 1, 2, 3 ...
        delete cfg.subject;
        delete cfg.years;
        cfg.questions = questions;
        cfg.subjects  = subjects;
        cfg.lectures  = lecturesOut;
        return;
    }

    /* ---------- SUBJECT page: own lectures, questions come from the year files ---------- */
    const wantedName = subjectName(cfg.subject);
    const years = [], questions = [];
    const doneFiles = new Set(), doneYears = new Set();
    cfg.yearFiles.forEach(src => {
        const file = fileOf(src);
        if (!file || doneFiles.has(file)) return;                     // the same file listed twice is only read once
        doneFiles.add(file);
        let f;
        try { f = readConfig(file); }
        catch (e) {
            if (e.missing) { console.info('[linked pages] year file not found, skipped: ' + file); return; }   // no red warning: that year just does not appear
            errors.push('Could not load "' + file + '" (' + e.message + '). Check the file name, and open the page through a web server, not directly from disk.');
            return;
        }
        const label = String(f.year || '').trim();
        if (!label) { errors.push('"' + file + '" has no  year: "..."  line.'); return; }
        if (doneYears.has(norm(label))) return;
        doneYears.add(norm(label));
        const base = offsetFor(label);
        const seen = new Set(), keys = [];
        (f.questions || []).forEach(q => {
            if (norm(subjectName(q.s)) !== norm(wantedName)) return;
            if (!isFinite(Number(q.n))) { errors.push('A question in "' + file + '" has no valid number "n".'); return; }
            if (seen.has(Number(q.n))) errors.push('Number ' + q.n + ' is used twice for ' + wantedName + ' in "' + file + '".');
            seen.add(Number(q.n));
            const key = base + Number(q.n);
            keys.push(key);
            questions.push(Object.assign({}, q, { s: wantedName, srcN: q.n, n: key }));
        });
        if (keys.length) years.push({ year: label, number: keys });   // numbers are listed, so the year filter works unchanged
    });
    questions.forEach((q, i) => { q.num = i + 1; });                  // numbers shown on this page: 1, 2, 3 ...
    cfg.years = years;
    cfg.questions = questions;
})();

const QUIZ = window.QUIZ_CONFIG || {};
const allQuestions = QUIZ.questions || [];

/* Single-subject pages: write  subject: "Pathology"  (or { name: "Pathology", emoji: "🔬" }).
   The filter icon is then removed and every question belongs to that subject. */
/* Accepts any of these:
     subject: "Pathology"
     subject: "Pathology 🔬"                       (emoji typed after the name)
     subject: { name: "Pathology", emoji: "🔬" }
     subject: "Pathology", emoji: "🔬"
   If an emoji is not given, it is taken from the "subjects" list when the name matches there. */
const singleSubjectCfg = (function () {
    if (!QUIZ.subject) return null;
    let name, emoji;
    if (typeof QUIZ.subject === 'string') {
        const m = QUIZ.subject.trim().match(/^(.*?)\s*([^A-Za-z0-9\s()&,.\-\/'+][^]*)$/u);
        name  = m ? m[1].trim() : QUIZ.subject.trim();
        emoji = m ? m[2].trim() : '';
    } else {
        name  = String(QUIZ.subject.name || '').trim();
        emoji = QUIZ.subject.emoji || '';
    }
    if (!emoji) emoji = QUIZ.emoji || QUIZ.subjectEmoji || '';
    if (!emoji) {
        const hit = (QUIZ.subjects || []).find(x => x.name === name);
        if (hit && hit.emoji) emoji = hit.emoji;
    }
    return { name, emoji };
})();
const SINGLE_SUBJECT = singleSubjectCfg ? singleSubjectCfg.name : null;
const subjectList = singleSubjectCfg ? [singleSubjectCfg] : (QUIZ.subjects || []);

let lectures = QUIZ.lectures || {};
if (SINGLE_SUBJECT) {
    const keys = Object.keys(lectures);
    const norm = t => String(t).trim().toLowerCase();
    if (keys.length && keys.every(k => /^\d+$/.test(k))) {
        // flat form:  lectures: { 1: "Name", 2: "Name" }
        lectures = { [SINGLE_SUBJECT]: lectures };
    } else if (!(SINGLE_SUBJECT in lectures)) {
        // tolerate different capitalisation / spacing / a name that includes the emoji
        const hit = keys.find(k => norm(k) === norm(SINGLE_SUBJECT) || norm(k).startsWith(norm(SINGLE_SUBJECT)));
        if (hit) lectures = { ...lectures, [SINGLE_SUBJECT]: lectures[hit] };
    }
}
if (SINGLE_SUBJECT) allQuestions.forEach(q => { q.s = SINGLE_SUBJECT; });

/* ---- YEARS (only used together with a single  subject: "..." ) ----
   years: [ { year: "Final _ 2021-2022", number: "1-10,23" }, ... ]
   "number" lists question numbers (the "n" of each question): ranges and single numbers, comma separated.
   - subject + years  -> the filter icon stays and lists the years instead of subjects
   - subject only     -> no filter icon
   - no subject       -> normal multi-subject page, "years" is ignored */
function parseNumberSet(v) {
    const set = new Set();
    if (v == null) return set;
    if (Array.isArray(v)) { v.forEach(x => parseNumberSet(x).forEach(n => set.add(n))); return set; }
    String(v).split(/[,;،\s]+/).forEach(part => {
        const m = part.trim().match(/^(\d+)\s*[-\u2013\u2014]\s*(\d+)$/);
        if (m) {
            let a = Number(m[1]), b = Number(m[2]);
            if (a > b) [a, b] = [b, a];
            for (let i = a; i <= b; i++) set.add(i);
        } else if (/^\d+$/.test(part.trim())) {
            set.add(Number(part.trim()));
        }
    });
    return set;
}
const YEARS = (SINGLE_SUBJECT && Array.isArray(QUIZ.years))
    ? QUIZ.years
        .map(y => ({ label: String(y.year || y.name || y.label || '').trim(), set: parseNumberSet(y.number != null ? y.number : y.numbers) }))
        .filter(y => y.label)
    : [];
const YEAR_MODE = YEARS.length > 0;
let currentYear = "All";            // "All" or the index (as text) of the selected year
function yearOk(n) {
    return !YEAR_MODE || currentYear === "All" || (YEARS[currentYear] && YEARS[currentYear].set.has(Number(n)));
}

function subjectLabel(name) {
    const s = subjectList.find(x => x.name === name);
    return s && s.emoji ? name + ' ' + s.emoji : name;
}

/* ---- Build the page (header + question area) from the config ---- */
(function buildPage() {
    const esc = t => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const cfg = { title: QUIZ.title || '', subtitle: QUIZ.subtitle || '' };
    const subjectItems = YEAR_MODE
        ? ['All'].concat(YEARS.map((y, i) => String(i))).map(v =>
            `<div class="subject-dropdown-item" data-subject="${v}" onclick="selectSubjectFilter(this.dataset.subject, this)">${esc(v === 'All' ? 'All' : YEARS[v].label)}</div>`
          ).join('\n')
        : [{ name: 'All' }].concat(subjectList).map(s =>
            `<div class="subject-dropdown-item" data-subject="${esc(s.name)}" onclick="selectSubjectFilter(this.dataset.subject, this)">${esc(s.name === 'All' ? 'All' : subjectLabel(s.name))}</div>`
          ).join('\n');
    const filterWord = YEAR_MODE ? 'Year' : 'Subject';
    const subjectToggle = (SINGLE_SUBJECT && !YEAR_MODE) ? '' : `
                <div class="subject-toggle-wrapper">
                    <div class="subject-toggle" id="subject-toggle-btn" onclick="toggleSubjectDropdown()" title="Filter by ${filterWord.toLowerCase()}">
                        <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M9.90693 3.9999C9.93791 3.99996 9.96894 4.00001 10 4.00001C10.0311 4.00001 10.0621 3.99996 10.0931 3.9999C10.4618 3.99929 10.8242 3.99869 11.147 4.08519C12.0098 4.31636 12.6836 4.99023 12.9148 5.85296C13.0013 6.1758 13.0007 6.53821 13.0001 6.90693C13.0001 6.93792 13 6.96895 13 7.00001H21C21.5523 7.00001 22 7.44772 22 8.00001C22 8.55229 21.5523 9.00001 21 9.00001H13C13 9.03107 13.0001 9.0621 13.0001 9.09309C13.0007 9.46181 13.0013 9.82422 12.9148 10.1471C12.6836 11.0098 12.0098 11.6837 11.147 11.9148C10.8242 12.0013 10.4618 12.0007 10.0931 12.0001C10.0621 12.0001 10.0311 12 10 12C9.96894 12 9.93791 12.0001 9.90692 12.0001C9.5382 12.0007 9.17579 12.0013 8.85295 11.9148C7.99022 11.6837 7.31635 11.0098 7.08519 10.1471C6.99868 9.82421 6.99928 9.46181 6.9999 9.09308C6.99995 9.0621 7 9.03106 7 9.00001H5C4.44772 9.00001 4 8.55229 4 8.00001C4 7.44772 4.44772 7.00001 5 7.00001H7C7 6.96895 6.99995 6.93792 6.9999 6.90693C6.99928 6.53821 6.99868 6.1758 7.08519 5.85296C7.31635 4.99023 7.99022 4.31636 8.85295 4.08519C9.17579 3.99869 9.5382 3.99929 9.90693 3.9999ZM9.49861 6.00536C9.39195 6.01022 9.36685 6.01805 9.37059 6.01704C9.19804 6.06328 9.06327 6.19805 9.01704 6.3706C9.0162 6.37411 9.00963 6.40483 9.00535 6.49861C9.00024 6.61064 9 6.75845 9 7.00001V9.00001C9 9.24156 9.00024 9.38937 9.00535 9.5014C9.01021 9.60806 9.01804 9.63315 9.01704 9.62942C9.06327 9.80196 9.19804 9.93674 9.37059 9.98297C9.36685 9.98197 9.39195 9.98979 9.49861 9.99466C9.61063 9.99977 9.75844 10 10 10C10.2416 10 10.3894 9.99977 10.5014 9.99466C10.608 9.98979 10.6331 9.98197 10.6294 9.98297C10.802 9.93674 10.9367 9.80196 10.983 9.62942C10.982 9.63315 10.9898 9.60806 10.9946 9.5014C10.9998 9.38937 11 9.24156 11 9.00001V7.00001C11 6.75845 10.9998 6.61064 10.9946 6.49861C10.9898 6.39196 10.982 6.36686 10.983 6.3706M9.49861 6.00536C9.61063 6.00025 9.75844 6.00001 10 6.00001L9.49861 6.00536ZM10 6.00001C10.2416 6.00001 10.3894 6.00025 10.5014 6.00536L10 6.00001ZM10.5014 6.00536C10.5952 6.00963 10.6259 6.0162 10.6294 6.01704L10.5014 6.00536ZM10.6298 6.01713C10.6298 6.01713 10.6296 6.0171 10.6294 6.01704L10.6298 6.01713ZM15.9069 11.9999C15.9379 12 15.9689 12 16 12C16.0311 12 16.0621 12 16.0931 11.9999C16.4618 11.9993 16.8242 11.9987 17.147 12.0852C18.0098 12.3164 18.6836 12.9902 18.9148 13.853C19.0013 14.1758 19.0007 14.5382 19.0001 14.9069C19.0001 14.9379 19 14.9689 19 15H21C21.5523 15 22 15.4477 22 16C22 16.5523 21.5523 17 21 17H19C19 17.0311 19.0001 17.0621 19.0001 17.0931C19.0007 17.4618 19.0013 17.8242 18.9148 18.1471C18.6836 19.0098 18.0098 19.6837 17.147 19.9148C16.8242 20.0013 16.4618 20.0007 16.0931 20.0001C16.0621 20.0001 16.0311 20 16 20C15.9689 20 15.9379 20.0001 15.9069 20.0001C15.5382 20.0007 15.1758 20.0013 14.853 19.9148C13.9902 19.6837 13.3164 19.0098 13.0852 18.1471C12.9987 17.8242 12.9993 17.4618 12.9999 17.0931C12.9999 17.0621 13 17.0311 13 17H5C4.44772 17 4 16.5523 4 16C4 15.4477 4.44772 15 5 15H13C13 14.969 12.9999 14.9379 12.9999 14.9069C12.9993 14.5382 12.9987 14.1758 13.0852 13.853C13.3164 12.9902 13.9902 12.3164 14.853 12.0852C15.1758 11.9987 15.5382 11.9993 15.9069 11.9999ZM15.4986 14.0054C15.392 14.0102 15.3669 14.018 15.3706 14.017C15.198 14.0633 15.0633 14.1981 15.017 14.3706C15.018 14.3669 15.0102 14.392 15.0054 14.4986C15.0002 14.6106 15 14.7585 15 15V17C15 17.2416 15.0002 17.3894 15.0054 17.5014C15.0102 17.6081 15.018 17.6332 15.017 17.6294C15.0633 17.802 15.198 17.9367 15.3706 17.983C15.3669 17.982 15.392 17.9898 15.4986 17.9947C15.6106 17.9998 15.7584 18 16 18C16.2416 18 16.3894 17.9998 16.5014 17.9947C16.608 17.9898 16.6331 17.982 16.6294 17.983C16.802 17.9367 16.9367 17.802 16.983 17.6294C16.982 17.6332 16.9898 17.6081 16.9946 17.5014C16.9998 17.3894 17 17.2416 17 17V15C17 14.7585 16.9998 14.6106 16.9946 14.4986C16.9898 14.392 16.982 14.3669 16.983 14.3706C16.9367 14.1981 16.802 14.0633 16.6294 14.017C16.6331 14.018 16.608 14.0102 16.5014 14.0054C16.3894 14.0002 16.2416 14 16 14C15.7584 14 15.6106 14.0002 15.4986 14.0054Z"/></svg>
                    </div>
                    <div class="subject-dropdown" id="subject-dropdown">
                        <div class="subject-dropdown-header">
                            <span>${filterWord}</span>
                            <button type="button" class="dropdown-close-btn" onclick="closeSubjectDropdown()" title="Close" aria-label="Close">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                        <div class="subject-dropdown-items">
${subjectItems}
                    </div>
                    </div>
                </div>
`;
    document.body.insertAdjacentHTML('afterbegin', `
<div class="container">
    <div class="header2-sticky" id="header2-sticky">
    <div class="header header2" id="header2">
        <div class="header-actions" id="header-normal-right">
            <div class="main-box">
                <div class="brand-block">
                    <div class="bb-title">${esc(cfg.title)}</div>
                    <div class="bb-sub">${esc(cfg.subtitle)}</div>
                </div>
                <div class="tool-group">
                <button class="search-toggle-btn" id="search-toggle-btn" onclick="toggleSearchBar()" title="Search">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14.9536 14.9458L21 21M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>
                </button>
                <button class="theme-toggle" onclick="toggleTheme()">
                    <svg id="theme-icon" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                    </svg>
                </button>

${subjectToggle}
            
                </div>
            </div>

            <div class="tool-box tool-box-right">
                <button class="icon-btn draw-btn pen-btn" data-tool="pen" data-active="false" onclick="selectTool(this)" title="Pen"></button>
                <button class="icon-btn draw-btn eraser-btn" data-tool="eraser" data-active="false" onclick="selectTool(this)" title="Eraser"></button>
            </div>
        </div>

        <!-- ACTIVE SEARCH STATE (TAKEOVER WRAPPER WITH X ICON & DIVIDER ON THE RIGHT) -->
        <div class="search-takeover-wrap" id="search-takeover-wrap">
            <div class="search-wrapper">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14.9536 14.9458L21 21M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
                </svg>
                <input type="text" id="search-input" placeholder="Search questions..." onkeyup="handleSearch()">
            </div>
            
            <div class="icon-divider" style="margin: 0 4px 0 8px;"></div>
            
            <button class="search-close-btn" onclick="closeSearchBar()" title="Close Search">
                <!-- Premium Minimal X Close Icon -->
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>
    </div>
    </div>

    <div id="quiz-content"></div>
</div>
`);
    document.addEventListener('contextmenu', e => e.preventDefault());
})();

const EYE_SHOW_SVG = `<svg class="icon-eye-open" <svg width="25px" height="25px" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" fill="#000000"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M0 0h48v48H0z" fill="none"></path> <g id="Shopicon"> <path d="M24,38c12,0,20-14,20-14s-8-14-20-14S4,24,4,24S12,38,24,38z M24,14c7.072,0,12.741,6.584,15.201,9.992 C36.728,27.396,31.024,34,24,34c-7.072,0-12.741-6.584-15.201-9.992C11.272,20.604,16.976,14,24,14z"></path> <path d="M24,32c4.418,0,8-3.582,8-8s-3.582-8-8-8s-8,3.582-8,8S19.582,32,24,32z M24,20c2.206,0,4,1.794,4,4c0,2.206-1.794,4-4,4 s-4-1.794-4-4C20,21.794,21.794,20,24,20z"></path> </g> </g></svg>`;
const EYE_HIDE_SVG = `<svg fill="#000000" width="20px" height="20px" viewBox="0 0 32 32" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;" version="1.1" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:serif="http://www.serif.com/" xmlns:xlink="http://www.w3.org/1999/xlink"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M5.112,18.784l-2.153,2.156c-0.585,0.586 -0.585,1.536 0.001,2.121c0.586,0.585 1.536,0.585 2.121,-0.001l2.666,-2.668c1.898,0.983 4.19,1.806 6.773,2.041l0,3.567c0,0.828 0.672,1.5 1.5,1.5c0.828,-0 1.5,-0.672 1.5,-1.5l0,-3.571c2.147,-0.201 4.091,-0.806 5.774,-1.571l3.199,3.202c0.585,0.586 1.535,0.586 2.121,0.001c0.586,-0.585 0.586,-1.535 0.001,-2.121l-2.579,-2.581c2.59,-1.665 4.091,-3.369 4.091,-3.369c0.546,-0.622 0.485,-1.57 -0.137,-2.117c-0.622,-0.546 -1.57,-0.485 -2.117,0.137c0,-0 -4.814,5.49 -11.873,5.49c-7.059,0 -11.873,-5.49 -11.873,-5.49c-0.547,-0.622 -1.495,-0.683 -2.117,-0.137c-0.622,0.547 -0.683,1.495 -0.137,2.117c0,0 1.175,1.334 3.239,2.794Z"></path><g id="Icon"></g></g></svg>`;

const COPY_SVG = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="9" y="9" width="13" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" fill="none" stroke="currentColor" stroke-width="2"></path></svg>`;
const CHECK_SVG = `<svg fill="currentColor" width="20" height="20" viewBox="0 0 335.765 335.765" xmlns="http://www.w3.org/2000/svg"><polygon points="311.757,41.803 107.573,245.96 23.986,162.364 0,186.393 107.573,293.962 335.765,65.795 "></polygon></svg>`;

const PEN_SVG = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15.4998 5.49994L18.3282 8.32837M3 20.9997L3.04745 20.6675C3.21536 19.4922 3.29932 18.9045 3.49029 18.3558C3.65975 17.8689 3.89124 17.4059 4.17906 16.9783C4.50341 16.4963 4.92319 16.0765 5.76274 15.237L17.4107 3.58896C18.1918 2.80791 19.4581 2.80791 20.2392 3.58896C21.0202 4.37001 21.0202 5.63634 20.2392 6.41739L8.37744 18.2791C7.61579 19.0408 7.23497 19.4216 6.8012 19.7244C6.41618 19.9932 6.00093 20.2159 5.56398 20.3879C5.07171 20.5817 4.54375 20.6882 3.48793 20.9012L3 20.9997Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>`;
const ERASER_SVG = `<svg viewBox="4 4 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.67004 11.6064L8.20037 12.1367L7.67004 11.6064ZM6 13.9682H5.25H6ZM10.0318 18V18.75V18ZM11.6064 7.67004L11.076 7.13971L11.6064 7.67004ZM12.6506 16.073C12.9435 16.3659 13.4183 16.3659 13.7112 16.073C14.0041 15.7801 14.0041 15.3053 13.7112 15.0124L12.6506 16.073ZM8.98764 10.2888C8.69474 9.99588 8.21987 9.99588 7.92698 10.2888C7.63408 10.5817 7.63408 11.0565 7.92698 11.3494L8.98764 10.2888ZM15.7996 11.8633L11.8633 15.7996L12.924 16.8603L16.8603 12.924L15.7996 11.8633ZM8.20037 12.1367L12.1367 8.20037L11.076 7.13971L7.13971 11.076L8.20037 12.1367ZM8.20037 15.7996C7.6287 15.228 7.25442 14.8514 7.01378 14.536C6.78634 14.2379 6.75 14.0841 6.75 13.9682H5.25C5.25 14.544 5.492 15.0144 5.82124 15.4459C6.13728 15.8601 6.59802 16.3186 7.13971 16.8603L8.20037 15.7996ZM7.13971 11.076C6.59802 11.6177 6.13728 12.0762 5.82124 12.4904C5.492 12.922 5.25 13.3924 5.25 13.9682H6.75C6.75 13.8522 6.78634 13.6984 7.01378 13.4003C7.25442 13.0849 7.6287 12.7084 8.20037 12.1367L7.13971 11.076ZM11.8633 15.7996C11.2916 16.3713 10.9151 16.7456 10.5997 16.9862C10.3016 17.2137 10.1478 17.25 10.0318 17.25V18.75C10.6076 18.75 11.078 18.508 11.5096 18.1788C11.9238 17.8627 12.3823 17.402 12.924 16.8603L11.8633 15.7996ZM7.13971 16.8603C7.6814 17.402 8.13989 17.8627 8.55411 18.1788C8.98563 18.508 9.45604 18.75 10.0318 18.75V17.25C9.91588 17.25 9.76207 17.2137 9.46398 16.9862C9.14858 16.7456 8.77204 16.3713 8.20037 15.7996L7.13971 16.8603ZM15.7996 8.20037C16.3713 8.77204 16.7456 9.14858 16.9862 9.46398C17.2137 9.76207 17.25 9.91588 17.25 10.0318H18.75C18.75 9.45604 18.508 8.98563 18.1788 8.55411C17.8627 8.13989 17.402 7.6814 16.8603 7.13971L15.7996 8.20037ZM16.8603 12.924C17.402 12.3823 17.8627 11.9238 18.1788 11.5096C18.508 11.078 18.75 10.6076 18.75 10.0318H17.25C17.25 10.1478 17.2137 10.3016 16.9862 10.5997C16.7456 10.9151 16.3713 11.2916 15.7996 11.8633L16.8603 12.924ZM16.8603 7.13971C16.3186 6.59802 15.8601 6.13728 15.4459 5.82124C15.0144 5.492 14.544 5.25 13.9682 5.25V6.75C14.0841 6.75 14.2379 6.78634 14.536 7.01378C14.8514 7.25442 15.228 7.6287 15.7996 8.20037L16.8603 7.13971ZM12.1367 8.20037C12.7084 7.6287 13.0849 7.25442 13.4003 7.01378C13.6984 6.78634 13.8522 6.75 13.9682 6.75V5.25C13.3924 5.25 12.922 5.492 12.4904 5.82124C12.0762 6.13728 11.6177 6.59802 11.076 7.13971L12.1367 8.20037ZM13.7112 15.0124L8.98764 10.2888L7.92698 11.3494L12.6506 16.073L13.7112 15.0124Z" fill="currentColor"></path></svg>`;

const PIN_SVG = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M17.1218 1.87023C15.7573 0.505682 13.4779 0.76575 12.4558 2.40261L9.61062 6.95916C9.61033 6.95965 9.60913 6.96167 9.6038 6.96549C9.59728 6.97016 9.58336 6.97822 9.56001 6.9848C9.50899 6.99916 9.44234 6.99805 9.38281 6.97599C8.41173 6.61599 6.74483 6.22052 5.01389 6.87251C4.08132 7.22378 3.61596 8.03222 3.56525 8.85243C3.51687 9.63502 3.83293 10.4395 4.41425 11.0208L7.94975 14.5563L1.26973 21.2363C0.879206 21.6269 0.879206 22.26 1.26973 22.6506C1.66025 23.0411 2.29342 23.0411 2.68394 22.6506L9.36397 15.9705L12.8995 19.5061C13.4808 20.0874 14.2853 20.4035 15.0679 20.3551C15.8881 20.3044 16.6966 19.839 17.0478 18.9065C17.6998 17.1755 17.3043 15.5086 16.9444 14.5375C16.9223 14.478 16.9212 14.4114 16.9355 14.3603C16.9421 14.337 16.9502 14.3231 16.9549 14.3165C16.9587 14.3112 16.9606 14.31 16.9611 14.3098L21.5177 11.4645C23.1546 10.4424 23.4147 8.16307 22.0501 6.79853L17.1218 1.87023ZM14.1523 3.46191C14.493 2.91629 15.2528 2.8296 15.7076 3.28445L20.6359 8.21274C21.0907 8.66759 21.0041 9.42737 20.4584 9.76806L15.9019 12.6133C14.9572 13.2032 14.7469 14.3637 15.0691 15.2327C15.3549 16.0037 15.5829 17.1217 15.1762 18.2015C15.1484 18.2752 15.1175 18.3018 15.0985 18.3149C15.0743 18.3316 15.0266 18.3538 14.9445 18.3589C14.767 18.3699 14.5135 18.2916 14.3137 18.0919L5.82846 9.6066C5.62872 9.40686 5.55046 9.15333 5.56144 8.97583C5.56651 8.8937 5.58877 8.84605 5.60548 8.82181C5.61855 8.80285 5.64516 8.7719 5.71886 8.74414C6.79869 8.33741 7.91661 8.56545 8.68762 8.85128C9.55668 9.17345 10.7171 8.96318 11.3071 8.01845L14.1523 3.46191Z" fill="currentColor"></path></svg>`;

const UNPIN_SVG = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17.1218 1.87023C15.7573 0.505682 13.4779 0.76575 12.4558 2.40261L9.75191 6.73289L11.1969 8.17793C11.2355 8.1273 11.2723 8.07415 11.3071 8.01845L14.1523 3.46191C14.493 2.91629 15.2528 2.8296 15.7076 3.28445L20.6359 8.21274C21.0907 8.66759 21.0041 9.42737 20.4584 9.76806L15.9019 12.6133C15.8462 12.6481 15.793 12.6848 15.7424 12.7234L17.1874 14.1684L21.5177 11.4645C23.1546 10.4424 23.4147 8.16307 22.0501 6.79852L17.1218 1.87023Z" fill="currentColor"></path><path d="M3.56525 8.85242C3.6015 8.26612 3.84962 7.68582 4.32883 7.27422L5.77735 8.72274C5.75784 8.72967 5.73835 8.7368 5.71886 8.74414C5.64516 8.7719 5.61855 8.80285 5.60548 8.82181C5.58877 8.84604 5.56651 8.8937 5.56144 8.97583C5.55046 9.15333 5.62872 9.40686 5.82846 9.6066L14.3137 18.0919C14.5135 18.2916 14.767 18.3699 14.9445 18.3589C15.0266 18.3538 15.0743 18.3316 15.0985 18.3149C15.1175 18.3018 15.1484 18.2752 15.1762 18.2015C15.1835 18.182 15.1907 18.1625 15.1976 18.143L16.6461 19.5915C16.2345 20.0707 15.6542 20.3188 15.0679 20.3551C14.2853 20.4035 13.4808 20.0874 12.8995 19.5061L9.36397 15.9705L2.68394 22.6506C2.29342 23.0411 1.66025 23.0411 1.26973 22.6506C0.879206 22.26 0.879206 21.6269 1.26973 21.2363L7.94975 14.5563L4.41425 11.0208C3.83293 10.4395 3.51687 9.63502 3.56525 8.85242Z" fill="currentColor"></path><path d="M2.00789 2.00786C1.61736 2.39838 1.61736 3.03155 2.00789 3.42207L20.5862 22.0004C20.9767 22.3909 21.6099 22.3909 22.0004 22.0004C22.391 21.6099 22.391 20.9767 22.0004 20.5862L3.4221 2.00786C3.03158 1.61733 2.39841 1.61733 2.00789 2.00786Z" fill="currentColor"></path></svg>`;

const PINNED_QUESTIONS_KEY = 'pinnedQuestions_' + location.pathname; let pinnedQuestions = new Set(JSON.parse(localStorage.getItem(PINNED_QUESTIONS_KEY) || '[]'));
const originalQuestionsOrder = allQuestions.slice();

function qLabel(item) { return item.num != null ? item.num : item.n; }

function isPinned(n) {
    return pinnedQuestions.has(n);
}

function reorderQuestions() {
    const pinned = originalQuestionsOrder.filter(q => pinnedQuestions.has(q.n));
    const rest = originalQuestionsOrder.filter(q => !pinnedQuestions.has(q.n));
    allQuestions.length = 0;
    allQuestions.push(...pinned, ...rest);
}

function togglePin(n) {
    if (pinnedQuestions.has(n)) {
        pinnedQuestions.delete(n);
    } else {
        pinnedQuestions.add(n);
    }
    localStorage.setItem(PINNED_QUESTIONS_KEY, JSON.stringify([...pinnedQuestions]));
    reorderQuestions();
    try {
        renderQuiz();
    } finally {
        // handleSearch() re-applies the current subject/lecture/search filters
        // to the freshly rendered questions. Running it in a finally block
        // guarantees the list is always re-shown correctly, even if something
        // above throws, instead of getting stuck on "No questions found".
        handleSearch();
    }
}

function copyTextToClipboard(text, btn) {
    function showCopied() {
        if (btn.dataset.copiedTimer) {
            clearTimeout(Number(btn.dataset.copiedTimer));
        }
        btn.classList.add('copied');
        btn.innerHTML = CHECK_SVG;
        const timer = setTimeout(() => {
            btn.classList.remove('copied');
            btn.innerHTML = COPY_SVG;
            delete btn.dataset.copiedTimer;
        }, 1000);
        btn.dataset.copiedTimer = String(timer);
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(showCopied).catch(() => {
            fallbackCopy(text);
            showCopied();
        });
    } else {
        fallbackCopy(text);
        showCopied();
    }
}

function copyQuestion(btn) {
    const block = btn.closest('.q-block');
    const qTextEl = block.querySelector('.q-text');
    const optEls = block.querySelectorAll(':scope > .opts li');
    const qText = (qTextEl.dataset.original || qTextEl.textContent).trim();
    const opts = Array.from(optEls)
        .map(li => (li.dataset.original || li.textContent).trim())
        .filter(Boolean);
    const fullText = opts.length ? `${qText}\n${opts.join('\n')}` : qText;
    copyTextToClipboard(fullText, btn);
}


function copyCase(btn) {
    const qBlock = btn.closest('.q-block');
    const stemEl = qBlock.querySelector('.q-text');
    const stemText = (stemEl.dataset.original || stemEl.textContent).trim();

    const caseBlocks = qBlock.querySelectorAll('.case-block');
    const casesText = Array.from(caseBlocks).map(caseBlock => {
        const caseTextEl = caseBlock.querySelector('.case-text');
        const caseText = (caseTextEl.dataset.original || caseTextEl.textContent).trim();
        const caseOpts = Array.from(caseBlock.querySelectorAll('.opts li'))
            .map(li => (li.dataset.original || li.textContent).trim())
            .filter(Boolean);
        return caseOpts.length ? `${caseText}\n${caseOpts.join('\n')}` : caseText;
    }).join('\n\n');

    const fullText = `${stemText}\n${casesText}`;
    copyTextToClipboard(fullText, btn);
}

/* ---- Global pen/eraser drawing (one page-wide layer, draw anywhere) ----
   Each stroke is saved against the question it started on (x as a fraction of that
   question's width, y in px from its top), so drawings follow their question when the
   list is filtered, answers are revealed, or the window is resized. */
const SVGNS = 'http://www.w3.org/2000/svg';
const DRAWINGS_KEY = 'drawings2_' + location.pathname;
const OLD_DRAWINGS_KEY = 'drawings_' + location.pathname;
const ERASER_RADIUS = 14;   // px -> 28px "medium" circle
let drawingsStore = {};
try { drawingsStore = JSON.parse(localStorage.getItem(DRAWINGS_KEY) || 'null') || null; } catch (e) { drawingsStore = null; }
if (!drawingsStore) {
    // one-time migration of drawings made with the old per-question overlays (they started 40px above the block)
    drawingsStore = {};
    try {
        const old = JSON.parse(localStorage.getItem(OLD_DRAWINGS_KEY) || '{}') || {};
        Object.keys(old).forEach(n => { drawingsStore[n] = old[n].map(s => s.map(p => [p[0], p[1] - 40])); });
    } catch (e) {}
}
function saveDrawings() {
    try { localStorage.setItem(DRAWINGS_KEY, JSON.stringify(drawingsStore)); } catch (e) {}
}

let drawLayer = null;
let currentTool = null;       // 'pen' | 'eraser' | null
let activeDrawState = null;
let blockMetrics = {};        // qn -> {left, top, width} in page coordinates

function updateGlobalScrollLock() {
    const locked = !!currentTool;
    document.documentElement.classList.toggle('drawing-lock', locked);
    document.body.classList.toggle('drawing-lock', locked);
}

// While a tool is on, swallow touchmove so the page can't scroll.
document.addEventListener('touchmove', function (e) {
    if (currentTool) e.preventDefault();
}, { passive: false });

function measureBlocks() {
    blockMetrics = {};
    const sx = window.pageXOffset, sy = window.pageYOffset;
    document.querySelectorAll('.q-block').forEach(qb => {
        if (qb.style.display === 'none') return;
        const r = qb.getBoundingClientRect();
        if (!r.width) return;
        blockMetrics[qb.dataset.qn] = { left: r.left + sx, top: r.top + sy, width: r.width };
    });
}

function nearestBlock(py) {
    let best = null, bestD = Infinity;
    Object.keys(blockMetrics).forEach(n => {
        const m = blockMetrics[n];
        const qb = document.querySelector('.q-block[data-qn="' + n + '"]');
        const h = qb ? qb.getBoundingClientRect().height : 0;
        const d = py < m.top ? m.top - py : (py > m.top + h ? py - (m.top + h) : 0);
        if (d < bestD) { bestD = d; best = n; }
    });
    return best;
}

function sizeDrawLayer() {
    if (!drawLayer) return;
    const c = document.querySelector('.container');
    const bottom = c ? c.getBoundingClientRect().bottom + window.pageYOffset : 0;
    drawLayer.style.height = Math.max(bottom, window.innerHeight) + 'px';
    drawLayer.style.width = document.documentElement.clientWidth + 'px';
}

// Strokes are stored as points [x as fraction of block width, y in px from block top]
function strokeD(stroke, m) {
    const pts = stroke.map(p => [m.left + p[0] * m.width, m.top + p[1]]);
    const f = v => v.toFixed(1);
    if (pts.length === 1) return `M ${f(pts[0][0])} ${f(pts[0][1])} l 0.01 0`;
    let d = `M ${f(pts[0][0])} ${f(pts[0][1])}`;
    for (let i = 1; i < pts.length - 1; i++) {
        const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
        d += ` Q ${f(pts[i][0])} ${f(pts[i][1])} ${f(mx)} ${f(my)}`;
    }
    const l = pts[pts.length - 1];
    return d + ` L ${f(l[0])} ${f(l[1])}`;
}

function redrawAll() {
    if (!drawLayer) return;
    sizeDrawLayer();
    measureBlocks();
    drawLayer.querySelectorAll('.draw-path').forEach(p => p.remove());
    const cur = drawLayer.querySelector('.eraser-cursor');
    Object.keys(drawingsStore).forEach(n => {
        const m = blockMetrics[n];
        if (!m) return;                       // question currently hidden
        drawingsStore[n].forEach(stroke => {
            const path = document.createElementNS(SVGNS, 'path');
            path.setAttribute('class', 'draw-path');
            path.setAttribute('d', strokeD(stroke, m));
            drawLayer.insertBefore(path, cur);
        });
    });
}
let redrawQueued = false;
function queueRedraw() {
    if (redrawQueued) return;
    redrawQueued = true;
    requestAnimationFrame(() => { redrawQueued = false; if (!activeDrawState) redrawAll(); });
}

function initGlobalDrawing() {
    drawLayer = document.createElementNS(SVGNS, 'svg');
    drawLayer.id = 'draw-layer';
    const cur = document.createElementNS(SVGNS, 'circle');
    cur.setAttribute('class', 'eraser-cursor');
    cur.setAttribute('r', ERASER_RADIUS);
    drawLayer.appendChild(cur);
    drawLayer.addEventListener('pointerdown', startDraw);
    drawLayer.addEventListener('pointermove', moveDraw);
    drawLayer.addEventListener('pointerup', endDraw);
    drawLayer.addEventListener('pointerleave', endDraw);
    drawLayer.addEventListener('pointercancel', endDraw);
    document.body.appendChild(drawLayer);
    if (typeof ResizeObserver !== 'undefined') {
        new ResizeObserver(queueRedraw).observe(document.querySelector('.container'));
    }
    window.addEventListener('resize', queueRedraw);
    window.addEventListener('load', queueRedraw);
    redrawAll();
}

function setTool(tool) {
    currentTool = tool;
    if (drawLayer) {
        drawLayer.classList.toggle('active', !!tool);
        drawLayer.classList.toggle('tool-eraser', tool === 'eraser');
        const cur = drawLayer.querySelector('.eraser-cursor');
        if (cur) cur.style.display = 'none';
    }
    updateGlobalScrollLock();
}

function selectTool(btn) {
    const tool = btn.dataset.tool;
    const turnOff = btn.dataset.active === 'true';
    document.querySelectorAll('.draw-btn').forEach(b => { b.dataset.active = 'false'; b.classList.remove('tool-on'); });
    if (turnOff) {
        setTool(null);
    } else {
        btn.dataset.active = 'true';
        btn.classList.add('tool-on');
        setTool(tool);
        redrawAll();
    }
    activeDrawState = null;
}

function deactivateDrawTools(onlyHidden) {
    // Questions being hidden no longer switch the tool off; only a full reset does.
    if (!onlyHidden) {
        document.querySelectorAll('.draw-btn').forEach(b => { b.dataset.active = 'false'; b.classList.remove('tool-on'); });
        setTool(null);
        activeDrawState = null;
    }
    queueRedraw();
}

function pointIn(evt) {
    return { x: evt.pageX, y: evt.pageY };
}

function moveCursor(pt) {
    const cur = drawLayer.querySelector('.eraser-cursor');
    cur.style.display = 'block';
    cur.setAttribute('cx', pt.x);
    cur.setAttribute('cy', pt.y);
}

function eraseAt(px, py) {
    const r2 = ERASER_RADIUS * ERASER_RADIUS;
    let changed = false;
    Object.keys(drawingsStore).forEach(n => {
        const m = blockMetrics[n];
        if (!m) return;
        const out = [];
        let touched = false;
        drawingsStore[n].forEach(stroke => {
            let run = [], hit = false;
            stroke.forEach(p => {
                const dx = m.left + p[0] * m.width - px, dy = m.top + p[1] - py;
                if (dx * dx + dy * dy <= r2) {
                    hit = true;
                    if (run.length) { out.push(run); run = []; }
                } else run.push(p);
            });
            if (!hit) { out.push(stroke); return; }
            touched = true;
            if (run.length) out.push(run);
        });
        if (touched) {
            changed = true;
            if (out.length) drawingsStore[n] = out; else delete drawingsStore[n];
        }
    });
    return changed;
}

function flushDraw(st) {
    st.raf = 0;
    if (st.tool === 'pen') {
        st.path.setAttribute('d', strokeD(st.stroke, st.m));
    } else if (st.dirty) {
        st.dirty = false;
        redrawAll();
    }
}
function scheduleFlush(st) {
    if (!st.raf) st.raf = requestAnimationFrame(() => flushDraw(st));
}

function startDraw(evt) {
    if (!currentTool) return;
    if (activeDrawState) return;               // ignore a second finger / palm while drawing
    if (evt.pointerType === 'mouse' && evt.button !== 0) return;
    evt.preventDefault();
    measureBlocks();
    const pt = pointIn(evt);
    if (drawLayer.setPointerCapture) { try { drawLayer.setPointerCapture(evt.pointerId); } catch (e) {} }
    if (currentTool === 'eraser') {
        const st = activeDrawState = { tool: 'eraser', pid: evt.pointerId, last: pt, dirty: false, raf: 0 };
        moveCursor(pt);
        if (eraseAt(pt.x, pt.y)) { st.dirty = true; scheduleFlush(st); }
    } else {
        const n = nearestBlock(pt.y);
        if (n === null) return;
        const m = blockMetrics[n];
        if (!drawingsStore[n]) drawingsStore[n] = [];
        const stroke = [[(pt.x - m.left) / m.width, pt.y - m.top]];
        drawingsStore[n].push(stroke);
        const path = document.createElementNS(SVGNS, 'path');
        path.setAttribute('class', 'draw-path');
        path.setAttribute('d', strokeD(stroke, m));
        drawLayer.insertBefore(path, drawLayer.querySelector('.eraser-cursor'));
        activeDrawState = { tool: 'pen', pid: evt.pointerId, stroke, path, m, last: pt, raf: 0 };
    }
}

function moveDraw(evt) {
    const st = activeDrawState;
    if (st && evt.pointerId !== st.pid) return;
    // Pencil/finger: circle only while touching the screen. Mouse: also follows hover.
    if (currentTool === 'eraser' && (st || evt.pointerType === 'mouse')) moveCursor(pointIn(evt));
    if (!st) return;
    evt.preventDefault();
    const events = (evt.getCoalescedEvents && evt.getCoalescedEvents()) || [];
    if (!events.length) events.push(evt);     // full-rate Apple Pencil samples
    for (const ev of events) {
        const pt = pointIn(ev);
        const last = st.last;
        if (st.tool === 'eraser') {
            const dist = Math.hypot(pt.x - last.x, pt.y - last.y);
            const steps = Math.max(1, Math.ceil(dist / 5));
            for (let i = 1; i <= steps; i++) {
                const x = last.x + (pt.x - last.x) * i / steps;
                const y = last.y + (pt.y - last.y) * i / steps;
                if (eraseAt(x, y)) st.dirty = true;
            }
            st.last = pt;
        } else {
            if (Math.hypot(pt.x - last.x, pt.y - last.y) < 0.8) continue;
            st.stroke.push([(pt.x - st.m.left) / st.m.width, pt.y - st.m.top]);
            st.last = pt;
        }
    }
    scheduleFlush(st);
}

function endDraw(evt) {
    const st = activeDrawState;
    if (!st) {
        const c = drawLayer && drawLayer.querySelector('.eraser-cursor');
        if (c) c.style.display = 'none';
        return;
    }
    if (evt.pointerId !== st.pid) return;
    if (st.raf) { cancelAnimationFrame(st.raf); st.raf = 0; }
    if (st.tool === 'eraser') { if (st.dirty) redrawAll(); }
    else st.path.setAttribute('d', strokeD(st.stroke, st.m));
    activeDrawState = null;
    saveDrawings();
    const cur = drawLayer.querySelector('.eraser-cursor');
    if (cur && evt.pointerType !== 'mouse') cur.style.display = 'none';
}

/* ---- Apple Pencil taps on buttons ----
   On iPad, Pencil taps on buttons can lose their click (tiny movement during the tap,
   especially while the page is scroll-locked). Handle pen taps via pointer events and
   swallow the browser's own click so nothing fires twice. */
(function () {
    let downEl = null, dx = 0, dy = 0, lastSynth = 0;
    const SEL = 'button, [onclick]';
    document.addEventListener('pointerdown', e => {
        if (e.pointerType !== 'pen') { downEl = null; return; }
        downEl = e.target.closest ? e.target.closest(SEL) : null;
        dx = e.clientX; dy = e.clientY;
    }, true);
    document.addEventListener('pointerup', e => {
        if (e.pointerType !== 'pen' || !downEl) return;
        const el = downEl; downEl = null;
        if (Math.hypot(e.clientX - dx, e.clientY - dy) > 14) return;
        const up = document.elementFromPoint(e.clientX, e.clientY);
        if (!up || up.closest(SEL) !== el) return;
        lastSynth = Date.now();
        el.click();
    }, true);
    document.addEventListener('click', e => {
        if (e.isTrusted && Date.now() - lastSynth < 700) {
            e.stopImmediatePropagation();
            e.preventDefault();
        }
    }, true);
})();

function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
}




// Dropdown lists are built automatically from `lectures` (no need to edit).
const lectureFilters = {
    "All": [],
    ...Object.fromEntries(Object.entries(lectures).map(([subj, lecs]) => [
        subj,
        [{ label: "All", val: "All" },
         ...Object.entries(lecs).map(([val, label]) => ({ label, val: Number(val) }))]
    ]))
};
const CONTENT_NOTE = QUIZ.note || "";
let currentSubjectFilter = SINGLE_SUBJECT || "All";  
let currentLecture = "All";
let lectureDropdownOpen = false;

const CLOSE_ICON_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;

const container = document.getElementById('quiz-content');

const LECTURE_CHEVRON_SVG = `<svg class="lecture-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M12.7071 14.7071C12.3166 15.0976 11.6834 15.0976 11.2929 14.7071L6.29289 9.70711C5.90237 9.31658 5.90237 8.68342 6.29289 8.29289C6.68342 7.90237 7.31658 7.90237 7.70711 8.29289L12 12.5858L16.2929 8.29289C16.6834 7.90237 17.3166 7.90237 17.7071 8.29289C18.0976 8.68342 18.0976 9.31658 17.7071 9.70711L12.7071 14.7071Z" fill="currentColor"></path></svg>`;

const PINNED_LECTURES_KEY = 'pinnedLectures_' + location.pathname;
let pinnedLectures = new Set();
try { pinnedLectures = new Set(JSON.parse(localStorage.getItem(PINNED_LECTURES_KEY) || '[]')); } catch (e) {}

/* Lecture list for the current subject. When a year is selected, only the lectures
   that have at least one question in that year are listed. */
function getLectureFilters() {
    const all = lectureFilters[currentSubjectFilter] || [];
    if (!YEAR_MODE || currentYear === "All") return all;
    const used = new Set(allQuestions.filter(q => yearOk(q.n) && q.s === currentSubjectFilter).map(q => String(q.l)));
    return all.filter(f => f.val === "All" || used.has(String(f.val)));
}

function lectureKey(val) { return currentSubjectFilter + '|' + val; }

function toggleLecturePin(val, ev) {
    if (ev) { ev.stopPropagation(); ev.preventDefault(); }
    const k = lectureKey(val);
    if (pinnedLectures.has(k)) pinnedLectures.delete(k); else pinnedLectures.add(k);
    try { localStorage.setItem(PINNED_LECTURES_KEY, JSON.stringify([...pinnedLectures])); } catch (e) {}
    const wrap = document.querySelector('#lecture-dropdown .lecture-dropdown-items');
    if (wrap) {
        const saved = wrap.scrollTop;
        wrap.innerHTML = renderLectureDropdownItems();
        wrap.scrollTop = saved;
    }
}

function renderLectureDropdownItems() {
    const filters = getLectureFilters();
    const all = filters.filter(f => f.val === "All");
    const lecs = filters.filter(f => f.val !== "All");
    const pinned = lecs.filter(f => pinnedLectures.has(lectureKey(f.val)));
    const rest = lecs.filter(f => !pinnedLectures.has(lectureKey(f.val)));
    return [...all, ...pinned, ...rest].map(f => {
        const sel = String(f.val) === String(currentLecture) ? " selected" : "";
        const pinBtn = f.val === "All" ? '' : (() => {
            const isP = pinnedLectures.has(lectureKey(f.val));
            return `<button type="button" class="lecture-pin-btn" data-pinned="${isP}" onclick="toggleLecturePin('${f.val}', event)" title="${isP ? 'Unpin lecture' : 'Pin lecture'}" aria-label="${isP ? 'Unpin lecture' : 'Pin lecture'}">${isP ? UNPIN_SVG : PIN_SVG}</button>`;
        })();
        return `<div class="lecture-dropdown-item${sel}" onclick="selectLecture('${f.val}', event)"><span class="lecture-item-text">${f.label}</span>${pinBtn}</div>`;
    }).join('');
}

function scrollLectureDropdownToSelected() {
    const wrap = document.querySelector('#lecture-dropdown .lecture-dropdown-items');
    if (!wrap) return;
    const selected = wrap.querySelector('.lecture-dropdown-item.selected');
    if (selected) {
        const target = selected.offsetTop - (wrap.clientHeight / 2) + (selected.clientHeight / 2);
        wrap.scrollTop = Math.max(0, target);
    } else {
        wrap.scrollTop = 0;
    }
}

function toggleLectureDropdown() {
    const dd = document.getElementById('lecture-dropdown');
    const btn = document.getElementById('lecture-select-btn');
    if (!dd || !btn) return;
    const isOpen = dd.classList.contains('open');
    if (isOpen) {
        dd.classList.remove('open');
        btn.classList.remove('dropdown-open');
        lectureDropdownOpen = false;
    } else {
        dd.classList.add('open');
        btn.classList.add('dropdown-open');
        lectureDropdownOpen = true;
        scrollLectureDropdownToSelected();
    }
}

function closeLectureDropdown() {
    const dd = document.getElementById('lecture-dropdown');
    const btn = document.getElementById('lecture-select-btn');
    if (dd) dd.classList.remove('open');
    if (btn) btn.classList.remove('dropdown-open');
    lectureDropdownOpen = false;
}

function selectLecture(val, ev) {
    if (ev) ev.stopPropagation();

    const oldWrap = document.querySelector('#lecture-dropdown .lecture-dropdown-items');
    const savedScroll = oldWrap ? oldWrap.scrollTop : 0;

    currentLecture = val;
    handleSearch();

    const newWrap = document.querySelector('#lecture-dropdown .lecture-dropdown-items');
    if (newWrap) newWrap.scrollTop = savedScroll;
}

document.addEventListener('click', function(e) {
    const wrapper = document.getElementById('lecture-select-wrapper');
    if (wrapper && !wrapper.contains(e.target)) {
        closeLectureDropdown();
    }
});

function getLectureLabel(val) {
    if (val === "All" && currentSubjectFilter === "All") return "All";
    if (val === "All" && YEAR_MODE && currentYear !== "All" && YEARS[currentYear]) return YEARS[currentYear].label;
    if (val === "All") {
        return subjectLabel(currentSubjectFilter);
    }
    return (lectures[currentSubjectFilter] || {})[val] || val;
}

function truncateLabel(str, maxLen) {
    const s = String(str);
    return s.length > maxLen ? s.slice(0, maxLen) + "..." : s;
}

function updateSectionHeading() {
    const existing = document.getElementById('section-heading');
    const visibleBlocks = [...document.querySelectorAll('.q-block')].filter(b => b.style.display !== "none");
    const count = visibleBlocks.length;

    let noResultsMsg = document.getElementById('no-results-msg');
    if (count === 0) {
        if (!noResultsMsg) {
            noResultsMsg = document.createElement('div');
            noResultsMsg.id = 'no-results-msg';
            noResultsMsg.className = 'no-results';
            noResultsMsg.textContent = "No questions found.";
            container.appendChild(noResultsMsg);
        }
        // The page just got much shorter; if we were scrolled down, the view lands
        // on blank space below the content. Jump to the top so the message is visible.
        window.scrollTo(0, 0);
        requestAnimationFrame(function () { window.scrollTo(0, 0); });
    } else if (noResultsMsg) {
        noResultsMsg.remove();
    }

    const label = getLectureLabel(currentLecture);
    const shortLabel = truncateLabel(label, 25);
    const labelHtml = `<span class="label-full">${label}</span><span class="label-short">${shortLabel}</span>`;
    const isSubjectLabel = currentLecture === "All";
    const titleClass = "section-heading-title" + (isSubjectLabel ? " subject-title" : "");
    const badgeText = count === 1 ? "1 MCQ" : `${count} MCQs`;
    const filters = getLectureFilters();
    const hasLectures = filters.some(f => f.val !== "All");
    if (!hasLectures) lectureDropdownOpen = false;

    const showLectureDropdownOpen = hasLectures && lectureDropdownOpen;
    const headingHtml = hasLectures ? `
        <div class="lecture-select-wrapper" id="lecture-select-wrapper">
            <button class="lecture-select-btn${showLectureDropdownOpen ? ' dropdown-open' : ''}" id="lecture-select-btn" onclick="toggleLectureDropdown()" title="Filter by lecture">
                <span class="${titleClass}">${labelHtml}</span>
                ${LECTURE_CHEVRON_SVG}
            </button>
            <div class="lecture-dropdown${showLectureDropdownOpen ? ' open' : ''}" id="lecture-dropdown"><div class="lecture-dropdown-header"><span>Lectures</span><button type="button" class="dropdown-close-btn" onclick="closeLectureDropdown()" title="Close" aria-label="Close">${CLOSE_ICON_SVG}</button></div><div class="lecture-dropdown-items">${renderLectureDropdownItems()}</div></div>
        </div>
        <span class="mcq-count-badge">${badgeText}</span>
    ` : `
        <span class="${titleClass}">${labelHtml}</span>
        <span class="mcq-count-badge">${badgeText}</span>
    `;

    const headingRowHtml = `<div class="section-heading-row">${headingHtml}</div>`;

    let heading;
    if (existing) {
        existing.style.display = "flex";
        existing.innerHTML = headingRowHtml;
        heading = existing;
    } else {
        heading = document.createElement('div');
        heading.id = 'section-heading';
        heading.className = 'section-heading';
        heading.innerHTML = headingRowHtml;
        container.insertBefore(heading, container.firstChild);
    }

    if (showLectureDropdownOpen) scrollLectureDropdownToSelected();

    const showNote = !!CONTENT_NOTE && currentSubjectFilter === "All" && currentLecture === "All";
    if (showNote) {
        const noteEl = document.createElement('div');
        noteEl.id = 'section-note';
        noteEl.className = 'section-note';
        noteEl.textContent = CONTENT_NOTE;
        heading.appendChild(noteEl);
    }
}

function renderCaseHtml(caseItem, mainN) {
    const isEssay = !caseItem.o || caseItem.o.length === 0 || (caseItem.o.length === 1 && caseItem.o[0].trim() === "");

    return `
        <div class="case-block">
            <div class="case-text" data-original="${caseItem.text}">${caseItem.text}</div>
            ${caseItem.o && caseItem.o.length ? `
            <ul class="opts">
                ${caseItem.o.map(opt => `<li data-original="${opt}">${opt}</li>`).join('')}
            </ul>` : ''}
            ${isEssay ? `<div class="answer-text"></div>` : ''}
            <div class="ans-row case-eye-row">
                <button class="eye-btn" data-label="Answer" data-answer="${escapeAttr(isEssay ? caseItem.a : '')}" data-essay="${isEssay}" data-correct="${escapeAttr(caseItem.a)}" data-revealed="false" onclick="toggleAnswer(this)" title="Show answer">${EYE_HIDE_SVG}</button>
            </div>
        </div>`;
}

function renderCaseActionsHtml(mainN) {
    return `
        <div class="case-actions-row">
            <div class="copy-wrap">
                <button class="icon-btn copy-btn" onclick="copyCase(this)" title="Copy question">${COPY_SVG}</button>
            </div>
            <button class="icon-btn pin-btn" data-pinned="${isPinned(mainN)}" onclick="togglePin(${mainN})" title="${isPinned(mainN) ? 'Unpin question' : 'Pin question'}">${isPinned(mainN) ? UNPIN_SVG : PIN_SVG}</button>
        </div>`;
}

/* Optional note under a question: written as  note: "..."  in the question data.
   It stays hidden until the answer is revealed (see syncNote). */
function noteHtml(note) {
    if (!note || !String(note).trim()) return '';
    const safe = String(note).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<div class="q-note" style="display:none">${safe}</div>`;
}

function syncNote(btn) {
    const block = btn.closest('.q-block');
    const note = block && block.querySelector('.q-note');
    if (!note) return;
    note.style.display = block.querySelector('.eye-btn[data-revealed="true"]') ? 'block' : 'none';
}

function renderQuiz() {
    container.innerHTML = '';
    activeDrawState = null;
    allQuestions.forEach(item => {
        const div = document.createElement('div');
        div.className = 'q-block';
        div.dataset.qn = item.n;
        div.dataset.subject = item.s;
        div.dataset.lecture = item.l ?? "";

        const isCaseQuestion = Array.isArray(item.cases) && item.cases.length > 0;

        div.dataset.searchText = isCaseQuestion
            ? (item.q + " " + item.cases.map(c => c.text + " " + (c.o || []).join(" ")).join(" ")).toLowerCase()
            : (item.q + " " + item.o.join(" ")).toLowerCase();

        div.style.display = matchesFilters(item) ? "block" : "none";

        if (isCaseQuestion) {
            div.innerHTML = `
                <div class="q-text" data-original="${qLabel(item)}. ${item.q}">${qLabel(item)}. ${item.q}</div>
                ${item.cases.map(c => renderCaseHtml(c, item.n)).join('')}
                ${noteHtml(item.note)}
                ${renderCaseActionsHtml(item.n)}
            `;
            container.appendChild(div);
            return;
        }

        const isMulti = Array.isArray(item.a);
        const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
        const isEssay = !item.o || item.o.length === 0 || (item.o.length === 1 && item.o[0].trim() === "");

        const iconsRowHtml = isMulti
            ? item.a.map((part, i) => {
                const label = `Answer ${letters[i] || (i + 1)}`;
                const revealText = isEssay ? part : '';
                return `
                <div class="eye-part-row">
                    <span class="eye-part-label">${letters[i] || (i + 1)}</span>
                    <button class="eye-btn" data-label="${label}" data-answer="${escapeAttr(revealText)}" data-essay="${isEssay}" data-correct="${escapeAttr(part)}" data-revealed="false" onclick="toggleAnswer(this)" title="${label}">${EYE_HIDE_SVG}</button>
                </div>`;
              }).join('') + `
                <div class="eye-part-row">
                    <div class="copy-wrap">
                        <button class="icon-btn copy-btn" onclick="copyQuestion(this)" title="Copy question">${COPY_SVG}</button>
                    </div>
                    <button class="icon-btn pin-btn" data-pinned="${isPinned(item.n)}" onclick="togglePin(${item.n})" title="${isPinned(item.n) ? 'Unpin question' : 'Pin question'}">${isPinned(item.n) ? UNPIN_SVG : PIN_SVG}</button>
                        </div>`
            : `
                <button class="eye-btn" data-label="Answer" data-answer="${escapeAttr(isEssay ? item.a : '')}" data-essay="${isEssay}" data-correct="${escapeAttr(item.a)}" data-revealed="false" onclick="toggleAnswer(this)" title="Show answer">${EYE_HIDE_SVG}</button>
                <div class="copy-wrap">
                    <button class="icon-btn copy-btn" onclick="copyQuestion(this)" title="Copy question">${COPY_SVG}</button>
                </div>
                <button class="icon-btn pin-btn" data-pinned="${isPinned(item.n)}" onclick="togglePin(${item.n})" title="${isPinned(item.n) ? 'Unpin question' : 'Pin question'}">${isPinned(item.n) ? UNPIN_SVG : PIN_SVG}</button>`;

        div.innerHTML = `
            <div class="q-text" data-original="${qLabel(item)}. ${item.q}">${qLabel(item)}. ${item.q}</div>
            <ul class="opts">
                ${item.o.map(opt => `<li data-original="${opt}">${opt}</li>`).join('')}
            </ul>
            ${isEssay ? `<div class="answer-text"></div>` : ''}
            ${noteHtml(item.note)}
            <div class="ans-row${isMulti ? ' ans-row--multi' : ''}">
                ${iconsRowHtml}
            </div>
        `;
        container.appendChild(div);
    });
    updateSectionHeading();
    queueRedraw();
}

document.addEventListener("keydown", function(e) {
    const key = e.key ? e.key.toLowerCase() : '';
    const ctrlOrCmd = e.ctrlKey || e.metaKey;

    // Ctrl/Cmd + S (Save)
    if (ctrlOrCmd && key === 's') {
        e.preventDefault();
        e.stopPropagation();
        return false;
    }

    // Ctrl/Cmd + P (Print)
    if (ctrlOrCmd && key === 'p') {
        e.preventDefault();
        e.stopPropagation();
        return false;
    }

    if (e.key === "Escape") {
        const takeover = document.getElementById('search-takeover-wrap');
        if (takeover && takeover.classList.contains('open')) {
            closeSearchBar();
        }
    }
});

// Catch printing triggered via the browser's Print menu / window.print()
window.addEventListener('beforeprint', function (e) {
    document.title = 'Printing disabled';
});

function matchesFilters(item) {
    const subjectOk = currentSubjectFilter === "All" || item.s === currentSubjectFilter;
    const lectureOk = currentLecture === "All" || String(item.l) === String(currentLecture);
    return subjectOk && lectureOk && yearOk(item.n);
}

function scrollSubjectDropdownToSelected() {
    const wrap = document.querySelector('#subject-dropdown .subject-dropdown-items');
    if (!wrap) return;
    const selected = wrap.querySelector('.subject-dropdown-item.selected');
    if (selected) {
        const target = selected.offsetTop - (wrap.clientHeight / 2) + (selected.clientHeight / 2);
        wrap.scrollTop = Math.max(0, target);
    } else {
        wrap.scrollTop = 0;
    }
}

/* Place the (auto-width) dropdown so its close (X) icon sits exactly under the filter icon,
   shifting it left as needed, while keeping the whole list inside the screen. */
function positionSubjectDropdown() {
    const dd = document.getElementById('subject-dropdown');
    const wrap = document.querySelector('.subject-toggle-wrapper');
    const closeBtn = dd && dd.querySelector('.dropdown-close-btn');
    if (!dd || !wrap) return;
    dd.style.marginLeft = '';
    const w = dd.offsetWidth;
    const r = wrap.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    // centre of the X, measured from the dropdown's left edge (corrected for the open animation's scale)
    let closeCx = w / 2;
    if (closeBtn) {
        const dr = dd.getBoundingClientRect(), cr = closeBtn.getBoundingClientRect();
        const scale = dd.offsetWidth ? dr.width / dd.offsetWidth : 1;
        closeCx = (cr.left + cr.width / 2 - dr.left) / (scale || 1);
    }
    let left = r.left + r.width / 2 - closeCx;
    left = Math.max(8, Math.min(left, vw - w - 8));
    dd.style.marginLeft = (left - r.left - r.width / 2) + 'px';
}
window.addEventListener('resize', function () {
    const dd = document.getElementById('subject-dropdown');
    if (dd && dd.classList.contains('open')) positionSubjectDropdown();
});

function toggleSubjectDropdown() {
    const dd = document.getElementById('subject-dropdown');
    const btn = document.getElementById('subject-toggle-btn');
    const isOpen = dd.classList.contains('open');
    if (isOpen) {
        dd.classList.remove('open');
        btn.classList.remove('dropdown-open');
    } else {
        dd.classList.add('open');
        btn.classList.add('dropdown-open');
        positionSubjectDropdown();
        scrollSubjectDropdownToSelected();
    }
}

function closeSubjectDropdown() {
    const dd = document.getElementById('subject-dropdown');
    const btn = document.getElementById('subject-toggle-btn');
    if (dd) dd.classList.remove('open');
    if (btn) btn.classList.remove('dropdown-open');
}

function selectSubjectFilter(subject, el) {
    if (YEAR_MODE) currentYear = subject;          // the dropdown lists years
    else currentSubjectFilter = subject;           // the dropdown lists subjects
    deactivateDrawTools(false);   // switching subject turns off pen/eraser everywhere
    currentLecture = "All";
    try { localStorage.setItem((YEAR_MODE ? 'selectedYear_' : 'selectedSubject_') + location.pathname, subject); } catch (e) {}
    document.querySelectorAll('.subject-dropdown-item').forEach(i => i.classList.remove('selected'));
    el.classList.add('selected');
    handleSearch();
}

document.addEventListener('click', function(e) {
    const wrapper = document.querySelector('.subject-toggle-wrapper');
    if (wrapper && !wrapper.contains(e.target)) {
        document.getElementById('subject-dropdown').classList.remove('open');
        document.getElementById('subject-toggle-btn').classList.remove('dropdown-open');
    }
});

/* Premium Full Header Takeover Functions */
function toggleSearchBar() {
    const takeover = document.getElementById('search-takeover-wrap');
    const normalRight = document.getElementById('header-normal-right');
    const input = document.getElementById('search-input');

    deactivateDrawTools(false);   // pen/eraser buttons are hidden while searching
    normalRight.style.display = 'none';
    takeover.classList.add('open');
    
    setTimeout(() => input.focus(), 50);
}

function closeSearchBar() {
    const takeover = document.getElementById('search-takeover-wrap');
    const normalRight = document.getElementById('header-normal-right');
    const input = document.getElementById('search-input');

    takeover.classList.remove('open');
    normalRight.style.display = 'flex';
    
    input.value = '';
    handleSearch();
}

let savedScrollY = null;
function handleSearch() {
    const term = document.getElementById('search-input').value.toLowerCase();
    // Remember where the user was before the search starts changing the list
    if (term !== "" && savedScrollY === null) savedScrollY = window.pageYOffset;
    const blocks = document.querySelectorAll('.q-block');
    blocks.forEach(block => {
        resetBlock(block);
        const subjectOk = currentSubjectFilter === "All" || block.dataset.subject === currentSubjectFilter;
        const lectureOk = currentLecture === "All" || String(block.dataset.lecture) === String(currentLecture);
        const matchesSearch = term === "" || block.dataset.searchText.includes(term);
        if (subjectOk && lectureOk && yearOk(block.dataset.qn) && matchesSearch) {
            block.style.display = "block";
            if (term !== "") highlight(block, term);
        } else {
            block.style.display = "none";
        }
    });
    deactivateDrawTools(true);   // a hidden question can't keep pen/eraser (or the scroll lock) on
    updateSectionHeading();
    // Search cleared: go back to the spot the user was at before searching
    if (term === "" && savedScrollY !== null) {
        const y = savedScrollY;
        savedScrollY = null;
        window.scrollTo(0, y);
        requestAnimationFrame(function () { window.scrollTo(0, y); });
    }
}

function resetBlock(block) {
    const qText = block.querySelector('.q-text');
    const opts = block.querySelectorAll('li');
    qText.innerHTML = qText.dataset.original;
    opts.forEach(li => { li.innerHTML = li.dataset.original; li.classList.remove('correct-option'); });
    block.querySelectorAll('.case-text').forEach(ct => {
        ct.innerHTML = ct.dataset.original;
    });
    block.querySelectorAll('.eye-btn').forEach(btn => {
        btn.dataset.revealed = "false";
        btn.classList.remove('case-answer-revealed');
        btn.innerHTML = EYE_HIDE_SVG;
        btn.title = 'Show answer';
    });
    block.querySelectorAll('.answer-text').forEach(textEl => {
        textEl.textContent = '';
        textEl.style.display = 'none';
    });
    block.querySelectorAll('.q-note').forEach(n => { n.style.display = 'none'; });
}

function highlight(block, term) {
    const regex = new RegExp(`(${term})`, 'gi');
    block.querySelector('.q-text').innerHTML = block.querySelector('.q-text').innerHTML.replace(regex, '<mark>$1</mark>');
    block.querySelectorAll('.case-text').forEach(ct => ct.innerHTML = ct.innerHTML.replace(regex, '<mark>$1</mark>'));
    block.querySelectorAll('li').forEach(li => li.innerHTML = li.innerHTML.replace(regex, '<mark>$1</mark>'));
}

function escapeAttr(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function toggleAnswer(btn) {
    const isRevealed = btn.dataset.revealed !== "true";
    btn.dataset.revealed = isRevealed ? "true" : "false";
    syncNote(btn);

    // Scope to the case-block if this button belongs to one sub-case of a
    // multi-case question, otherwise fall back to the whole question block.
    const isCase = !!btn.closest('.case-block');
    const scope = btn.closest('.case-block') || btn.closest('.q-block');

    if (btn.dataset.essay === "true") {
        if (isCase) {
            // Case questions (Q21, Q22): the button itself becomes the
            // answer box, without showing the open-eye icon.
            btn.classList.toggle('case-answer-revealed', isRevealed);
            btn.innerHTML = isRevealed ? btn.dataset.answer : EYE_HIDE_SVG;
            btn.title = isRevealed ? '' : 'Show answer';
            return;
        }

        btn.innerHTML = isRevealed ? EYE_SHOW_SVG : EYE_HIDE_SVG;
        const textEl = scope.querySelector('.answer-text');
        if (textEl) {
            textEl.textContent = isRevealed ? btn.dataset.answer : '';
            textEl.style.display = isRevealed ? 'block' : 'none';
        }
        return;
    }

    btn.innerHTML = isRevealed ? EYE_SHOW_SVG : EYE_HIDE_SVG;

    const correctLetters = (btn.dataset.correct || '')
        .split(/[,\s]+/)
        .map(s => s.trim())
        .filter(Boolean);

    scope.querySelectorAll('.opts li').forEach(li => {
        const original = li.dataset.original || li.textContent;
        const letter = original.split('.')[0].trim();
        if (correctLetters.includes(letter)) {
            li.classList.toggle('correct-option', isRevealed);
        }
    });
}

function toggleTheme() {
    const isLight = document.body.getAttribute('data-theme') === 'light';
    const newTheme = isLight ? '' : 'light';
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    document.getElementById('theme-icon').innerHTML = isLight 
        ? '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>'
        : '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';
}

(function () {
    if (localStorage.getItem('theme') === 'light') {
        document.body.setAttribute('data-theme', 'light');
        document.getElementById('theme-icon').innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';
    }
   const saved = localStorage.getItem('selectedSubject_' + location.pathname);
    if (saved && !SINGLE_SUBJECT && (saved === "All" || subjectList.some(x => x.name === saved))) {
        currentSubjectFilter = saved;
    }
    if (YEAR_MODE) {
        const savedYear = localStorage.getItem('selectedYear_' + location.pathname);
        if (savedYear && (savedYear === "All" || YEARS[savedYear])) currentYear = savedYear;
    }
    document.querySelectorAll('.subject-dropdown-item').forEach(item => {
        item.classList.toggle('selected', item.dataset.subject === (YEAR_MODE ? currentYear : currentSubjectFilter));
    });
}());

reorderQuestions();
renderQuiz();

document.querySelectorAll('.pen-btn').forEach(b => b.innerHTML = PEN_SVG);
document.querySelectorAll('.eraser-btn').forEach(b => b.innerHTML = ERASER_SVG);
initGlobalDrawing();


/* Keep the header visible while the search bar is open (mobile keyboard fix) */
(function () {
    const sticky = document.getElementById('header2-sticky');
    const input = document.getElementById('search-input');
    const takeover = document.getElementById('search-takeover-wrap');
    function syncHeader() {
        const searching = takeover.classList.contains('open');
        const off = (window.visualViewport && searching) ? window.visualViewport.offsetTop : 0;
        sticky.style.transform = off > 0 ? 'translateY(' + off + 'px)' : '';
    }
    if (window.visualViewport) {
        window.visualViewport.addEventListener('scroll', syncHeader);
        window.visualViewport.addEventListener('resize', syncHeader);
    }
    window.addEventListener('scroll', syncHeader, { passive: true });
    document.addEventListener('touchmove', function (e) {
        if (document.activeElement === input && e.target !== input) input.blur();
    }, { passive: true });
    document.querySelector('.search-close-btn').addEventListener('click', function () {
        sticky.style.transform = '';
    });
})();

/* Linked year pages: show a clear message when a subject file could not be read */
(function () {
    const errs = window.__QUIZ_LINK_ERRORS;
    if (!errs || !errs.length) return;
    const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const box = document.createElement('div');
    box.style.cssText = 'margin:12px 0;padding:10px 14px;border-radius:10px;border:1px solid rgba(220,53,69,.55);background:rgba(220,53,69,.12);font-size:14px;line-height:1.5;';
    box.innerHTML = errs.map(e => '⚠️ ' + esc(e)).join('<br>');
    const target = document.getElementById('quiz-content');
    if (target) target.parentNode.insertBefore(box, target);
})();
