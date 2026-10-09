# SOC Log Analyzer

A defensive cybersecurity portfolio project that analyzes synthetic authentication events and displays investigation leads in a browser dashboard. It is a small software project for learning log analysis and security alert triage, not a production SIEM.

## Try it

Open `index.html` on the portfolio site, click **Load sample data**, or upload `sample-logs.csv`. The demo also works locally through a simple static web server.

## CSV format

The CSV must include these columns (additional columns are ignored):

```csv
timestamp,source_ip,username,event,result
2026-10-08T08:00:00Z,203.0.113.10,admin,login,failed
```

- `timestamp`: date/time parseable by the browser; timestamps are displayed in UTC.
- `source_ip`: non-empty source address string.
- `username`: non-empty account identifier.
- `event`: must be `login`.
- `result`: must be `success` or `failed`.

Invalid event rows are skipped and reported. The dashboard supports searching the event table and filtering alerts by severity.

## Demonstration rules

- Repeated failed logins: at least five failures for the same username and source IP.
- Possible password spray: failed logins from one source against at least five distinct usernames.
- Successful login after repeated failures: a success for the same username and source after at least three failures in the preceding 30 minutes.

These simple rules produce leads for review, not confirmed incident findings. They do not account for every environment, benign behavior, distributed sources, or all attack patterns.

## Privacy and scope

Analysis runs in the browser tab. The project has no backend, database, authentication, analytics, or external network requests. Uploaded file contents are not sent to a server or saved by the app. Use synthetic or explicitly authorized logs only; remove personal and sensitive information before using any real data.

The sample uses documentation-only IP ranges and fictional account names. This project is defensive and does not scan, connect to, or attack any system.
