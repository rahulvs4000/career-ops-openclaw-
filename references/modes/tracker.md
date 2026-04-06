# Modo: tracker - Application Tracker

Read and show `data/applications.md`.

**Compatible tracker format:**
```markdown
| # | Date | Company | Role | Score | Status | PDF | Report |
```

The `PDF` and `Report` columns may be empty. They remain only for compatibility with existing tracker layouts.

Write only these canonical status labels from `templates/states.yml`:

- `Evaluated`
- `Applied`
- `Responded`
- `Interview`
- `Offer`
- `Rejected`
- `Discarded`
- `SKIP`

Do not write aliases, translations, extra text, markdown, or dates into the status column.

If the user asks to update a status, edit the corresponding row.

Also show summary stats:
- Total applications
- Count by status
