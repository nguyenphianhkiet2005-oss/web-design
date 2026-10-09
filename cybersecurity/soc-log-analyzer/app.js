"use strict";

const SAMPLE_URL = "sample-logs.csv";
const REQUIRED_HEADERS = ["timestamp", "source_ip", "username", "event", "result"];
const FAILURE_THRESHOLD = 5;
const SPRAY_USER_THRESHOLD = 5;
const SUCCESS_AFTER_FAILURE_THRESHOLD = 3;
const CORRELATION_WINDOW_MS = 30 * 60 * 1000;

const elements = {
    loadSample: document.querySelector("#loadSample"),
    fileInput: document.querySelector("#fileInput"),
    message: document.querySelector("#message"),
    totalEvents: document.querySelector("#totalEvents"),
    failedEvents: document.querySelector("#failedEvents"),
    sourceCount: document.querySelector("#sourceCount"),
    alertCount: document.querySelector("#alertCount"),
    alerts: document.querySelector("#alerts"),
    severityFilter: document.querySelector("#severityFilter"),
    eventSearch: document.querySelector("#eventSearch"),
    eventsBody: document.querySelector("#eventsBody"),
    emptyEvents: document.querySelector("#emptyEvents")
};

let events = [];
let alerts = [];

function setMessage(text, kind = "") {
    elements.message.textContent = text;
    elements.message.dataset.kind = kind;
}

function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = "";
    let quoted = false;

    for (let i = 0; i < text.length; i += 1) {
        const char = text[i];
        if (quoted) {
            if (char === '"' && text[i + 1] === '"') {
                field += '"';
                i += 1;
            } else if (char === '"') {
                quoted = false;
            } else {
                field += char;
            }
        } else if (char === '"' && field.length === 0) {
            quoted = true;
        } else if (char === ",") {
            row.push(field);
            field = "";
        } else if (char === "\n" || char === "\r") {
            if (char === "\r" && text[i + 1] === "\n") i += 1;
            row.push(field);
            if (row.some((value) => value.trim() !== "")) rows.push(row);
            row = [];
            field = "";
        } else {
            field += char;
        }
    }

    if (quoted) throw new Error("The CSV contains an unterminated quoted field.");
    row.push(field);
    if (row.some((value) => value.trim() !== "")) rows.push(row);
    if (rows.length < 2) throw new Error("The CSV needs a header row and at least one event.");

    const headers = rows[0].map((header) => header.trim().toLowerCase());
    const missingHeaders = REQUIRED_HEADERS.filter((header) => !headers.includes(header));
    if (missingHeaders.length) {
        throw new Error(`Missing required CSV columns: ${missingHeaders.join(", ")}.`);
    }
    const positions = Object.fromEntries(REQUIRED_HEADERS.map((header) => [header, headers.indexOf(header)]));
    const validEvents = [];
    let rejectedRows = 0;

    for (const values of rows.slice(1)) {
        const record = Object.fromEntries(REQUIRED_HEADERS.map((header) => [header, (values[positions[header]] || "").trim()]));
        const date = new Date(record.timestamp);
        const valid = !Number.isNaN(date.getTime())
            && record.source_ip.length > 0
            && record.username.length > 0
            && record.event.toLowerCase() === "login"
            && ["success", "failed"].includes(record.result.toLowerCase());

        if (!valid) {
            rejectedRows += 1;
            continue;
        }
        validEvents.push({
            timestamp: date,
            sourceIp: record.source_ip,
            username: record.username,
            event: record.event.toLowerCase(),
            result: record.result.toLowerCase()
        });
    }

    if (!validEvents.length) throw new Error("No valid events found. Check timestamps, login event names, and success/failed results.");
    return { events: validEvents, rejectedRows };
}

function analyzeLogs(records) {
    const bySourceAndUser = new Map();
    const bySource = new Map();
    const generated = [];
    const sorted = [...records].sort((a, b) => a.timestamp - b.timestamp);

    for (const record of sorted) {
        const key = `${record.sourceIp}\u0000${record.username}`;
        const pair = bySourceAndUser.get(key) || { sourceIp: record.sourceIp, username: record.username, failures: [], successAfterFailures: false };
        const sourceUsers = bySource.get(record.sourceIp) || new Set();

        if (record.result === "failed") {
            pair.failures.push(record);
            sourceUsers.add(record.username);
        } else if (record.result === "success") {
            const recentFailures = pair.failures.filter((failure) => record.timestamp - failure.timestamp >= 0
                && record.timestamp - failure.timestamp <= CORRELATION_WINDOW_MS);
            if (recentFailures.length >= SUCCESS_AFTER_FAILURE_THRESHOLD && !pair.successAfterFailures) {
                generated.push({
                    id: `success-${record.sourceIp}-${record.username}`,
                    severity: "high",
                    title: "Successful login after repeated failures",
                    description: `A successful login for ${record.username} followed ${recentFailures.length} failed attempts from the same source within 30 minutes.`,
                    evidence: `Source: ${record.sourceIp} · Account: ${record.username} · Success: ${record.timestamp.toISOString()}`
                });
                pair.successAfterFailures = true;
            }
        }

        bySourceAndUser.set(key, pair);
        bySource.set(record.sourceIp, sourceUsers);
    }

    for (const pair of bySourceAndUser.values()) {
        if (pair.failures.length >= FAILURE_THRESHOLD) {
            generated.push({
                id: `brute-${pair.sourceIp}-${pair.username}`,
                severity: "high",
                title: "Repeated failed logins",
                description: `${pair.failures.length} failed login attempts targeted ${pair.username} from one source address.`,
                evidence: `Source: ${pair.sourceIp} · Account: ${pair.username} · Rule: ${FAILURE_THRESHOLD}+ failures`
            });
        }
    }

    for (const [sourceIp, usernames] of bySource) {
        if (usernames.size >= SPRAY_USER_THRESHOLD) {
            generated.push({
                id: `spray-${sourceIp}`,
                severity: "medium",
                title: "Possible password-spray pattern",
                description: `Failed logins from one source targeted ${usernames.size} different usernames.`,
                evidence: `Source: ${sourceIp} · Distinct accounts: ${[...usernames].sort().join(", ")}`
            });
        }
    }

    return generated.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "high" ? -1 : 1)
        || a.title.localeCompare(b.title));
}

function createAlertCard(alert) {
    const card = document.createElement("article");
    card.className = "alert-card";
    card.dataset.severity = alert.severity;

    const top = document.createElement("div");
    top.className = "alert-top";
    const title = document.createElement("h3");
    title.textContent = alert.title;
    const badge = document.createElement("span");
    badge.className = `severity ${alert.severity}`;
    badge.textContent = alert.severity.toUpperCase();
    top.append(title, badge);

    const description = document.createElement("p");
    description.textContent = alert.description;
    const evidence = document.createElement("p");
    evidence.className = "evidence";
    evidence.textContent = alert.evidence;
    card.append(top, description, evidence);
    return card;
}

function renderAlerts() {
    const selected = elements.severityFilter.value;
    const visibleAlerts = alerts.filter((alert) => selected === "all" || alert.severity === selected);
    elements.alerts.replaceChildren();
    if (!visibleAlerts.length) {
        const empty = document.createElement("p");
        empty.className = "no-alerts";
        empty.textContent = alerts.length ? "No alerts match this severity filter." : "No suspicious patterns detected in the loaded events.";
        elements.alerts.append(empty);
        return;
    }
    visibleAlerts.forEach((alert) => elements.alerts.append(createAlertCard(alert)));
}

function renderEvents() {
    const query = elements.eventSearch.value.trim().toLowerCase();
    const visible = [...events].sort((a, b) => b.timestamp - a.timestamp).filter((record) =>
        [record.timestamp.toISOString(), record.sourceIp, record.username, record.event, record.result]
            .some((value) => value.toLowerCase().includes(query))
    );
    elements.eventsBody.replaceChildren();

    for (const record of visible) {
        const row = document.createElement("tr");
        const values = [
            record.timestamp.toISOString().replace(".000Z", "Z"),
            record.sourceIp,
            record.username,
            record.event
        ];
        for (const value of values) {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.append(cell);
        }
        const resultCell = document.createElement("td");
        const status = document.createElement("span");
        status.className = `status ${record.result}`;
        status.textContent = record.result;
        resultCell.append(status);
        row.append(resultCell);
        elements.eventsBody.append(row);
    }

    elements.emptyEvents.hidden = visible.length > 0;
}

function renderDashboard() {
    elements.totalEvents.textContent = String(events.length);
    elements.failedEvents.textContent = String(events.filter((record) => record.result === "failed").length);
    elements.sourceCount.textContent = String(new Set(events.map((record) => record.sourceIp)).size);
    elements.alertCount.textContent = String(alerts.length);
    renderAlerts();
    renderEvents();
}

function loadText(text, sourceName) {
    const parsed = parseCsv(text);
    events = parsed.events;
    alerts = analyzeLogs(events);
    renderDashboard();
    const rejected = parsed.rejectedRows ? ` ${parsed.rejectedRows} invalid row(s) were skipped.` : "";
    setMessage(`Loaded ${events.length} valid event(s) from ${sourceName}.${rejected}`, "success");
}

async function loadSample() {
    try {
        const response = await fetch(SAMPLE_URL);
        if (!response.ok) throw new Error(`Could not load sample CSV (HTTP ${response.status}).`);
        loadText(await response.text(), "the included sample");
    } catch (error) {
        setMessage(`Could not load sample data: ${error.message} Open this project through a web server or upload the CSV file directly.`, "error");
    }
}

elements.loadSample.addEventListener("click", loadSample);
elements.fileInput.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
        loadText(await file.text(), file.name);
    } catch (error) {
        setMessage(`Could not analyze CSV: ${error.message}`, "error");
    } finally {
        event.target.value = "";
    }
});
elements.severityFilter.addEventListener("change", renderAlerts);
elements.eventSearch.addEventListener("input", renderEvents);
loadSample();
