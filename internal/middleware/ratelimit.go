package middleware

import (
	"net"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/hadiafyouni/ecommerce/internal/apierror"
)

// ─── IP-based in-memory rate limiter ────────────────────────────────────────

type bucket struct {
	count   int
	resetAt time.Time
}

type RateLimiter struct {
	mu      sync.Mutex
	buckets map[string]*bucket
	max     int
	window  time.Duration
}

func NewRateLimiter(max int, window time.Duration) *RateLimiter {
	rl := &RateLimiter{
		buckets: make(map[string]*bucket),
		max:     max,
		window:  window,
	}
	// Periodically clean up expired buckets
	go func() {
		ticker := time.NewTicker(window * 2)
		for range ticker.C {
			rl.mu.Lock()
			now := time.Now()
			for k, b := range rl.buckets {
				if now.After(b.resetAt) {
					delete(rl.buckets, k)
				}
			}
			rl.mu.Unlock()
		}
	}()
	return rl
}

func (rl *RateLimiter) Allow(ip string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	b, ok := rl.buckets[ip]
	if !ok || now.After(b.resetAt) {
		rl.buckets[ip] = &bucket{count: 1, resetAt: now.Add(rl.window)}
		return true
	}
	if b.count >= rl.max {
		return false
	}
	b.count++
	return true
}

// RateLimit returns middleware that limits to max requests per window per IP.
// When trustProxy is true the client IP is taken from X-Forwarded-For /
// X-Real-IP; otherwise those headers are ignored because clients can forge them.
func RateLimit(max int, window time.Duration, trustProxy bool) func(http.Handler) http.Handler {
	rl := NewRateLimiter(max, window)
	retryAfter := strconv.Itoa(int(window.Seconds()))
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if !rl.Allow(clientIP(r, trustProxy)) {
				w.Header().Set("Retry-After", retryAfter)
				apierror.Write(w, http.StatusTooManyRequests, "RATE_LIMITED", "too many requests, please slow down")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// clientIP returns the caller's IP address.
func clientIP(r *http.Request, trustProxy bool) string {
	if trustProxy {
		if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
			first, _, _ := strings.Cut(xff, ",")
			return strings.TrimSpace(first)
		}
		if xri := r.Header.Get("X-Real-IP"); xri != "" {
			return strings.TrimSpace(xri)
		}
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}
