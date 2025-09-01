/* add-to-calendar.js
 * Creates a robust ICS and adds it to the user's device calendar
 * - Uses Web Share (files) when available
 * - Falls back to opening the ICS on Apple (Safari/iOS usually prompts Calendar)
 * - Otherwise downloads the ICS (desktop / Android)
 */

(() => {
    const btn = document.getElementById("addToCalendarBtn");
    if (!btn) return;

    btn.addEventListener("click", async () => {
        const event = readEventFromDataset(btn.dataset);
        const icsText = buildICS(event);

        // Try Web Share (Level 2: file sharing) first
        const file = new File([icsText], safeFilename(event.title) + ".ics", { type: "text/calendar" });
        if (canShareFile(file)) {
            try {
                await navigator.share({ files: [file], title: event.title, text: event.description || "" });
                return;
            } catch (err) {
                // User canceled or share not available; fall through to other methods
            }
        }

        // Fallbacks
        const blob = new Blob([icsText], { type: "text/calendar;charset=utf-8" });
        const url = URL.createObjectURL(blob);

        if (isAppleLike()) {
            // Safari/iOS: open in a new tab, which typically shows the Calendar import prompt
            window.open(url, "_blank", "noopener");
            // Revoke later to avoid killing the URL before the new tab reads it
            setTimeout(() => URL.revokeObjectURL(url), 30_000);
        } else {
            // Everyone else: download; opening the file will import into the default calendar app
            download(url, safeFilename(event.title) + ".ics");
            setTimeout(() => URL.revokeObjectURL(url), 10_000);
        }
    });

    // ---- Helpers ----

    function readEventFromDataset(ds) {
        const title = ds.title?.trim() || "New Event";
        const description = ds.description || "";
        const location = ds.location || "";
        const url = ds.url || window.location.href;

        // Parse dates: If no timezone marker, Date() treats as local time (desired).
        const start = parseDate(ds.start) || new Date(Date.now() + 60 * 60 * 1000); // default in 1 hour
        let end = parseDate(ds.end);
        if (!end) end = new Date(start.getTime() + 60 * 60 * 1000); // default 1 hour duration

        const alarmMinutes = clampInt(ds.alarmMinutes ?? ds.alarmMinutes === "" ? 0 : ds.alarmMinutes, 0, 1440, 30);

        return { title, description, location, url, start, end, alarmMinutes };
    }

    function parseDate(v) {
        if (!v) return null;
        const d = new Date(v);
        return isNaN(d.getTime()) ? null : d;
    }

    function clampInt(v, min, max, fallback) {
        const n = Number.parseInt(v, 10);
        if (Number.isNaN(n)) return fallback;
        return Math.min(Math.max(n, min), max);
    }

    function canShareFile(file) {
        // Needs secure context and Web Share Level 2 support
        if (!("canShare" in navigator) || !("share" in navigator)) return false;
        try {
            return navigator.canShare({ files: [file] });
        } catch {
            return false;
        }
    }

    function isAppleLike() {
        const ua = navigator.userAgent || "";
        const platform = navigator.platform || "";
        const iOS = /iPad|iPhone|iPod/.test(ua);
        const iPadOS13Plus = platform === "MacIntel" && navigator.maxTouchPoints > 1;
        const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
        return (iOS || iPadOS13Plus || /Mac/.test(platform)) && isSafari;
    }

    function toICSDateUTC(date) {
        // RFC5545 UTC: YYYYMMDDTHHMMSSZ
        return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    }

    function escapeICSText(text) {
        return (text || "")
            .replace(/\\/g, "\\\\")
            .replace(/\n/g, "\\n")
            .replace(/,/g, "\\,")
            .replace(/;/g, "\\;");
    }

    function foldICSLines(lines) {
        // Fold at 75 octets per RFC; approximate with 75 chars for simplicity
        const out = [];
        for (const line of lines) {
            if (line.length <= 75) {
                out.push(line);
            } else {
                let i = 0;
                while (i < line.length) {
                    const chunk = line.slice(i, i + 75);
                    out.push(i === 0 ? chunk : " " + chunk);
                    i += 75;
                }
            }
        }
        return out.join("\r\n");
    }

    function buildICS({ title, description, location, url, start, end, alarmMinutes }) {
        const dtStamp = toICSDateUTC(new Date());
        const dtStart = toICSDateUTC(start);
        const dtEnd = toICSDateUTC(end);
        const uid = createUID();
        const lines = [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//AddToCalendar Button//EN",
            "CALSCALE:GREGORIAN",
            "METHOD:PUBLISH",
            "BEGIN:VEVENT",
            `UID:${uid}`,
            `DTSTAMP:${dtStamp}`,
            `DTSTART:${dtStart}`,
            `DTEND:${dtEnd}`,
            `SUMMARY:${escapeICSText(title)}`,
            description ? `DESCRIPTION:${escapeICSText(description)}` : null,
            location ? `LOCATION:${escapeICSText(location)}` : null,
            url ? `URL:${escapeICSText(url)}` : null,
            ...(alarmMinutes > 0
                ? [
                    "BEGIN:VALARM",
                    `TRIGGER:-PT${alarmMinutes}M`,
                    "ACTION:DISPLAY",
                    "DESCRIPTION:Reminder",
                    "END:VALARM",
                ]
                : []),
            "END:VEVENT",
            "END:VCALENDAR",
        ].filter(Boolean);

        return foldICSLines(lines) + "\r\n";
    }

    function createUID() {
        // Simple UID: timestamp + random + host
        const rand = Math.random().toString(36).slice(2);
        const host = (location && location.host) || "local";
        return `${Date.now()}-${rand}@${host}`;
    }

    function download(href, filename) {
        const a = document.createElement("a");
        a.href = href;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
    }

    function safeFilename(name) {
        return (name || "event")
                .replace(/[<>:"/\\|?*\x00-\x1F]/g, " ")
                .replace(/\s+/g, " ")
                .trim()
                .slice(0, 60)
            || "event";
    }
})();
