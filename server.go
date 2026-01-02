package main

import (
	"bytes"
	"embed"
	"encoding/json"
	"fmt"
	"html/template"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	pdf "github.com/adrg/go-wkhtmltopdf/v3"
)

//go:embed templates/pdf_template.html
var tmplBytes []byte

//go:embed styles.css
var previewCSS string

type job struct {
	data     map[string]string
	contacts []contact
	respCh   chan jobResult
}

type jobResult struct {
	content  []byte
	err      error
	filename string
}

type contact struct {
	Name  string `json:"name"`
	Email string `json:"email"`
	Phone string `json:"phone"`
	Role  string `json:"role"`
}

type renderData struct {
	Fields    map[string]string
	Contacts  []contact
	Now       string
	AssetBase string
	CSS       template.CSS
}

func main() {
	if err := pdf.Init(); err != nil {
		log.Fatalf("failed to init wkhtmltopdf: %v", err)
	}
	defer pdf.Destroy()

	jobCh := make(chan job)

	mux := http.NewServeMux()

	mux.HandleFunc("/api/pdf", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var payload map[string]interface{}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			http.Error(w, "invalid JSON", http.StatusBadRequest)
			return
		}

		flat := make(map[string]string, len(payload))
		var contacts []contact

		for k, v := range payload {
			if k == "contacts" {
				raw, _ := json.Marshal(v)
				_ = json.Unmarshal(raw, &contacts)
				continue
			}
			flat[k] = fmt.Sprint(v)
		}

		respCh := make(chan jobResult)
		jobCh <- job{data: flat, contacts: contacts, respCh: respCh}
		res := <-respCh

		if res.err != nil {
			http.Error(w, res.err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/pdf")
		disposition := fmt.Sprintf("attachment; filename=\"%s.pdf\"", sanitizeFilename(res.filename))
		w.Header().Set("Content-Disposition", disposition)
		_, _ = w.Write(res.content)
	})

	mux.Handle("/", http.FileServer(http.Dir(".")))

	go func() {
		log.Println("Starting HTTP server on :8080")
		if err := http.ListenAndServe(":8080", mux); err != nil && err != http.ErrServerClosed {
			log.Fatalf("http server error: %v", err)
		}
	}()

	// Main-thread conversion queue: the for-loop runs on the main goroutine.
	for j := range jobCh {
		b, name, err := generatePDF(j.data, j.contacts)
		j.respCh <- jobResult{content: b, filename: name, err: err}
	}
}

func generatePDF(data map[string]string, contacts []contact) ([]byte, string, error) {
	assetBase, _ := os.Getwd()
	tpl, err := template.New("pdf").Funcs(template.FuncMap{
		"val": func(key string) string {
			s := strings.TrimSpace(data[key])
			if s == "" {
				return "N/A"
			}
			if strings.EqualFold(s, "n/a") || strings.EqualFold(s, "na") {
				return "N/A"
			}
			return template.HTMLEscapeString(s)
		},
	}).Parse(string(tmplBytes))
	if err != nil {
		return nil, "", fmt.Errorf("template parse: %w", err)
	}

	buf := &bytes.Buffer{}
	renderCtx := renderData{
		Fields:    data,
		Contacts:  contacts,
		Now:       time.Now().Format(time.RFC3339),
		AssetBase: assetBase,
		CSS:       template.CSS(previewCSS),
	}

	if err := tpl.Execute(buf, renderCtx); err != nil {
		return nil, "", fmt.Errorf("template execute: %w", err)
	}

	conv, err := pdf.NewPDFGenerator()
	if err != nil {
		return nil, "", fmt.Errorf("new converter: %w", err)
	}

	conv.Dpi.Set(300)
	conv.PageSize.Set(pdf.PageSizeLetter)
	conv.MarginLeft.Set(16)
	conv.MarginRight.Set(16)
	conv.MarginTop.Set(16)
	conv.MarginBottom.Set(16)
	conv.FooterCenter.Set("Powered by Didactidigital")
	conv.FooterRight.Set("[page]/[toPage]")
	conv.HeaderSpacing.Set(3)

	// Allow local assets and reuse existing CSS
	page := pdf.NewPageReader(bytes.NewReader(buf.Bytes()))
	page.AllowLocalFileAccess.Set(true)
	page.UserStyleSheet.Set(filepath.Join(assetBase, "styles.css"))
	conv.AddPage(page)

	if err := conv.Create(); err != nil {
		return nil, "", fmt.Errorf("create pdf: %w", err)
	}

	title := data["eventName"]
	if strings.TrimSpace(title) == "" {
		title = "Show-Advance"
	}
	date := data["eventDate"]
	if strings.TrimSpace(date) == "" {
		date = time.Now().Format("2006-01-02")
	}
	fname := fmt.Sprintf("Show-Advance_%s_%s", sanitizeFilename(title), sanitizeFilename(date))

	return conv.Bytes(), fname, nil
}

func sanitizeFilename(s string) string {
	clean := strings.ReplaceAll(s, " ", "_")
	clean = strings.Map(func(r rune) rune {
		if r == '_' || r == '-' || (r >= '0' && r <= '9') || (r >= 'A' && r <= 'Z') || (r >= 'a' && r <= 'z') {
			return r
		}
		return -1
	}, clean)
	if clean == "" {
		return "file"
	}
	return clean
}
