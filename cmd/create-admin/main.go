// Command create-admin adds an admin account to the database.
//
// Usage:
//
//	go run ./cmd/create-admin -email admin@example.com
//
// The password is read from the ADMIN_PASSWORD environment variable, or
// prompted for on stdin, so it never ends up in shell history.
package main

import (
	"bufio"
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/google/uuid"
	"github.com/hadiafyouni/ecommerce/internal/repository"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	email := flag.String("email", "", "admin email address")
	flag.Parse()
	if *email == "" {
		log.Fatal("usage: create-admin -email admin@example.com")
	}

	_ = godotenv.Load()
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL is required")
	}

	password := os.Getenv("ADMIN_PASSWORD")
	if password == "" {
		fmt.Print("Password (min 8 chars): ")
		line, err := bufio.NewReader(os.Stdin).ReadString('\n')
		if err != nil {
			log.Fatalf("read password: %v", err)
		}
		password = strings.TrimSpace(line)
	}
	if len(password) < 8 || len(password) > 72 {
		log.Fatal("password must be 8-72 characters")
	}

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		log.Fatalf("connect: %v", err)
	}
	defer pool.Close()

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("hash password: %v", err)
	}

	users := repository.NewUserRepo(pool)
	cred, err := users.CreateAdminCredential(ctx, strings.ToLower(strings.TrimSpace(*email)), string(hash), uuid.NewString())
	if err != nil {
		log.Fatalf("create admin: %v", err)
	}
	fmt.Printf("Admin created: %s\n", cred.Email)
}
