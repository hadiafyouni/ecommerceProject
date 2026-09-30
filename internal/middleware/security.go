package middleware

import "net/http"

// SecurityHeaders adds security-hardening HTTP response headers to every response.
// hsts should only be enabled when the API is served over HTTPS.
func SecurityHeaders(hsts bool) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			h := w.Header()

			// Prevent clickjacking
			h.Set("X-Frame-Options", "DENY")

			// Prevent MIME sniffing
			h.Set("X-Content-Type-Options", "nosniff")

			// Referrer policy: don't leak URL to third parties
			h.Set("Referrer-Policy", "strict-origin-when-cross-origin")

			// XSS filter (legacy browsers)
			h.Set("X-XSS-Protection", "1; mode=block")

			// Permissions policy: disable camera, mic, geolocation
			h.Set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")

			// Content Security Policy
			// Allows same-origin scripts/styles + Unsplash images
			h.Set("Content-Security-Policy",
				"default-src 'self'; "+
					"script-src 'self'; "+
					"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "+
					"font-src 'self' https://fonts.gstatic.com; "+
					"img-src 'self' data: https://images.unsplash.com; "+
					"connect-src 'self'; "+
					"frame-ancestors 'none';",
			)

			// HSTS: force HTTPS for 1 year
			if hsts {
				h.Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
			}

			next.ServeHTTP(w, r)
		})
	}
}
