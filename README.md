# Show Advance PDF Builder (Didactidigital)

A lightweight, dependency-free web app that collects show advance details and produces a print-ready PDF layout. All Prism branding is removed in favor of a single footer line: **Powered by Didactidigital**.

## Features

- Covers all required sections (header through contacts) and keeps them visible even when fields are empty.
- Generates a print-ready view that respects page breaks and renders blank lines for missing data.
- Uses the browser’s **Print → Save as PDF** flow with a generated filename in the format `Show-Advance_{EventName}_{YYYY-MM-DD}.pdf`.
- No external APIs or databases; everything runs in the browser.

## Running locally

```bash
# Serve the static files (no extra dependencies required)
npm start
# or open index.html directly in your browser
```

The server runs at `http://localhost:4173` by default.

## Generating the PDF

1. Fill out the form sections.
2. Click **Generate PDF**. The preview updates and the print dialog opens.
3. Choose “Save as PDF” in your browser’s print dialog. The suggested filename is auto-filled per the required format.

## Notes

- Page layout is operational and designed to tolerate incomplete data—fields stay in place as blank lines.
- The footer text appears in the lower-right corner on every printed page.
