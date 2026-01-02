# Show Advance PDF service

## Server-side PDF generation

This repo now includes a Go endpoint that renders the advance layout to PDF using `go-wkhtmltopdf`:

- Endpoint: `POST /api/pdf`
- Input: JSON payload matching the current form fields (same keys as used in the preview), with `contacts` as an array of `{name,email,phone,role}`.
- Output: `application/pdf` with filename `Show-Advance_<EventName>_<YYYY-MM-DD>.pdf`.

### Running locally

Prerequisites: `wkhtmltopdf` (wkhtmltox) installed on your system.

```bash
go mod tidy
go run server.go
# visit http://localhost:8080 for the existing UI; POST to /api/pdf to download a PDF
```

### Docker (recommended)

```bash
docker build -t showadvance .
docker run -p 8080:8080 showadvance
```

The image installs `wkhtmltopdf` and runs the Go server.

### Main-thread conversion

`wkhtmltopdf` requires conversion on the main thread. The server uses a single conversion loop (a job queue on the main goroutine) so HTTP requests enqueue work, preventing crashes from concurrent conversions.
