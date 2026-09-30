# ── Build ────────────────────────────────────────────────────────────────────
FROM golang:1.25-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
# Migrations are embedded in the binary, so it is the only artifact we need.
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /server .

# ── Runtime ──────────────────────────────────────────────────────────────────
FROM alpine:3.20
RUN apk --no-cache add ca-certificates tzdata && adduser -D -u 10001 app
USER app
COPY --from=builder /server /server
EXPOSE 8080
# Configuration comes from environment variables (see .env.example).
CMD ["/server"]
