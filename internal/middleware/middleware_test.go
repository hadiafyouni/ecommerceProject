package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestRateLimiterBlocksAfterMax(t *testing.T) {
	rl := NewRateLimiter(3, time.Minute)
	for i := 0; i < 3; i++ {
		if !rl.Allow("1.2.3.4") {
			t.Fatalf("request %d should be allowed", i+1)
		}
	}
	if rl.Allow("1.2.3.4") {
		t.Fatal("4th request should be blocked")
	}
	if !rl.Allow("5.6.7.8") {
		t.Fatal("a different IP should have its own bucket")
	}
}

func TestClientIPIgnoresForwardedHeadersUnlessTrusted(t *testing.T) {
	r := httptest.NewRequest(http.MethodGet, "/", nil)
	r.RemoteAddr = "10.0.0.1:5555"
	r.Header.Set("X-Forwarded-For", "9.9.9.9, 10.0.0.1")

	if got := clientIP(r, false); got != "10.0.0.1" {
		t.Errorf("untrusted: got %q, want remote addr", got)
	}
	if got := clientIP(r, true); got != "9.9.9.9" {
		t.Errorf("trusted: got %q, want first forwarded IP", got)
	}
}

func TestRateLimitMiddlewareReturns429(t *testing.T) {
	h := RateLimit(1, time.Minute, false)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))
	do := func() *httptest.ResponseRecorder {
		r := httptest.NewRequest(http.MethodPost, "/auth/login", nil)
		r.RemoteAddr = "1.1.1.1:1000"
		w := httptest.NewRecorder()
		h.ServeHTTP(w, r)
		return w
	}
	if w := do(); w.Code != http.StatusOK {
		t.Fatalf("first request: got %d", w.Code)
	}
	w := do()
	if w.Code != http.StatusTooManyRequests {
		t.Fatalf("second request: got %d, want 429", w.Code)
	}
	if w.Header().Get("Retry-After") != "60" {
		t.Errorf("Retry-After = %q, want 60", w.Header().Get("Retry-After"))
	}
}

func TestCorsOnlyAllowsConfiguredOrigins(t *testing.T) {
	h := Cors([]string{"https://shop.example.com"})(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))
	for origin, allowed := range map[string]bool{
		"https://shop.example.com": true,
		"https://evil.example.com": false,
	} {
		r := httptest.NewRequest(http.MethodGet, "/", nil)
		r.Header.Set("Origin", origin)
		w := httptest.NewRecorder()
		h.ServeHTTP(w, r)
		got := w.Header().Get("Access-Control-Allow-Origin") == origin
		if got != allowed {
			t.Errorf("origin %s: allowed=%v, want %v", origin, got, allowed)
		}
	}
}

func TestAdminOnly(t *testing.T) {
	h := AdminOnly(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))
	r := httptest.NewRequest(http.MethodGet, "/admin/dashboard", nil)
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	if w.Code != http.StatusForbidden {
		t.Fatalf("request without admin role: got %d, want 403", w.Code)
	}
}
