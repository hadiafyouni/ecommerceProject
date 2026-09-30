package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/hadiafyouni/ecommerce/internal/apierror"
	"github.com/hadiafyouni/ecommerce/internal/service"
)

type contextKey string

const (
	ContextUserID contextKey = "user_id"
	ContextRole   contextKey = "role"
)

// Auth validates the JWT from the httpOnly "access_token" cookie.
// Falls back to Authorization: Bearer <token> header for dev tooling / mobile clients.
func Auth(authSvc *service.AuthService) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			tokenStr := tokenFromRequest(r)
			if tokenStr == "" {
				apierror.Unauthorized(w, "authentication required")
				return
			}

			claims, err := authSvc.ValidateAccessToken(tokenStr)
			if err != nil {
				apierror.Unauthorized(w, "invalid or expired token")
				return
			}

			next.ServeHTTP(w, r.WithContext(withClaims(r.Context(), claims)))
		})
	}
}

// OptionalAuth attaches the user to the context when a valid token is present,
// but never rejects the request. Used on public routes that show more to admins.
func OptionalAuth(authSvc *service.AuthService) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if tokenStr := tokenFromRequest(r); tokenStr != "" {
				if claims, err := authSvc.ValidateAccessToken(tokenStr); err == nil {
					r = r.WithContext(withClaims(r.Context(), claims))
				}
			}
			next.ServeHTTP(w, r)
		})
	}
}

// withClaims stores the user ID and role in the context.
// ValidateAccessToken guarantees both claims are non-empty strings.
func withClaims(ctx context.Context, claims map[string]any) context.Context {
	sub, _ := claims["sub"].(string)
	role, _ := claims["role"].(string)
	ctx = context.WithValue(ctx, ContextUserID, sub)
	return context.WithValue(ctx, ContextRole, role)
}

// tokenFromRequest reads the access token from the httpOnly cookie, falling
// back to an Authorization: Bearer header for API clients.
func tokenFromRequest(r *http.Request) string {
	if c, err := r.Cookie("access_token"); err == nil && c.Value != "" {
		return c.Value
	}
	if h := r.Header.Get("Authorization"); strings.HasPrefix(h, "Bearer ") {
		return strings.TrimPrefix(h, "Bearer ")
	}
	return ""
}

// AdminOnly rejects any authenticated request that isn't from an admin.
func AdminOnly(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		role, _ := r.Context().Value(ContextRole).(string)
		if role != "admin" {
			apierror.Forbidden(w, "admin access required")
			return
		}
		next.ServeHTTP(w, r)
	})
}

func GetUserID(r *http.Request) string {
	v, _ := r.Context().Value(ContextUserID).(string)
	return v
}

func GetRole(r *http.Request) string {
	v, _ := r.Context().Value(ContextRole).(string)
	return v
}
