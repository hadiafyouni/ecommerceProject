package config

import (
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	DatabaseURL      string
	JWTSecret        string
	JWTRefreshSecret string
	Port             string
	Env              string
	// CORSOrigins lists the frontend origins allowed to make credentialed requests.
	CORSOrigins []string
	// TrustProxy makes the rate limiter read the client IP from X-Forwarded-For /
	// X-Real-IP. Only enable it when the API sits behind a proxy that sets them.
	TrustProxy bool
}

// Load reads configuration from the environment (and .env if present).
// It fails fast when required secrets are missing or too weak.
func Load() (*Config, error) {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, reading from environment")
	}

	cfg := &Config{
		DatabaseURL:      os.Getenv("DATABASE_URL"),
		JWTSecret:        os.Getenv("JWT_SECRET"),
		JWTRefreshSecret: os.Getenv("JWT_REFRESH_SECRET"),
		Port:             getEnv("PORT", "8080"),
		Env:              getEnv("ENV", "development"),
		CORSOrigins:      splitList(getEnv("CORS_ORIGINS", "http://localhost:3000")),
		TrustProxy:       os.Getenv("TRUST_PROXY") == "true",
	}

	if cfg.DatabaseURL == "" {
		return nil, fmt.Errorf("DATABASE_URL is required")
	}
	if len(cfg.JWTSecret) < 32 || len(cfg.JWTRefreshSecret) < 32 {
		return nil, fmt.Errorf("JWT_SECRET and JWT_REFRESH_SECRET are required and must be at least 32 characters")
	}
	if cfg.JWTSecret == cfg.JWTRefreshSecret {
		return nil, fmt.Errorf("JWT_SECRET and JWT_REFRESH_SECRET must be different")
	}
	return cfg, nil
}

func (c *Config) IsProduction() bool { return c.Env == "production" }

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}

func splitList(s string) []string {
	var out []string
	for _, part := range strings.Split(s, ",") {
		if p := strings.TrimSpace(part); p != "" {
			out = append(out, p)
		}
	}
	return out
}
