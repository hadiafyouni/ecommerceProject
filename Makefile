# Requires DATABASE_URL etc. in the environment or a .env file.

.PHONY: dev build test vet lint admin docker db-up

dev:            ## Run the API (applies migrations on start)
	go run .

build:          ## Build the API binary
	go build -o bin/server .

test:           ## Run unit tests
	go test ./...

vet:
	go vet ./...

admin:          ## Create an admin account: make admin EMAIL=you@example.com
	go run ./cmd/create-admin -email $(EMAIL)

docker:         ## Build the API Docker image
	docker build -t ecommerce-api .

db-up:          ## Start Postgres in Docker for local development
	docker compose up -d db
