FROM golang:1.20-bullseye AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    wkhtmltopdf \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY go.mod .
RUN go mod download
COPY . .

RUN GOOS=linux GOARCH=amd64 go build -o pdfserver server.go

FROM debian:bullseye-slim
RUN apt-get update && apt-get install -y --no-install-recommends wkhtmltopdf ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/pdfserver /app/
COPY --from=builder /app/templates /app/templates
COPY --from=builder /app/styles.css /app/styles.css
COPY --from=builder /app/index.html /app/index.html
COPY --from=builder /app/app.js /app/app.js
COPY --from=builder /app/oyd.png /app/oyd.png 2>/dev/null || true
COPY --from=builder /app/lecom.png /app/lecom.png 2>/dev/null || true
EXPOSE 8080
CMD [\"/app/pdfserver\"]
