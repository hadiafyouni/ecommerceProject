package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/hadiafyouni/ecommerce/internal/apierror"
	"github.com/hadiafyouni/ecommerce/internal/service"
)

type AuthHandler struct {
	authSvc *service.AuthService
	isProd  bool // set to true in production to enable Secure cookie flag
}

func NewAuthHandler(authSvc *service.AuthService, isProd bool) *AuthHandler {
	return &AuthHandler{authSvc: authSvc, isProd: isProd}
}

// ─── Cookie helpers ──────────────────────────────────────────────────────────

func (h *AuthHandler) setTokenCookies(w http.ResponseWriter, accessToken, refreshToken string) {
	http.SetCookie(w, &http.Cookie{
		Name:     "access_token",
		Value:    accessToken,
		Path:     "/",
		MaxAge:   int((15 * time.Minute).Seconds()),
		HttpOnly: true,
		Secure:   h.isProd, // only sent over HTTPS in production
		SameSite: http.SameSiteStrictMode,
	})
	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    refreshToken,
		Path:     "/auth/refresh",
		MaxAge:   int((7 * 24 * time.Hour).Seconds()),
		HttpOnly: true,
		Secure:   h.isProd,
		SameSite: http.SameSiteStrictMode,
	})
}

// clearTokenCookies expires both auth cookies. Each cookie must be cleared with
// the same Path it was set with, or the browser keeps it.
func (h *AuthHandler) clearTokenCookies(w http.ResponseWriter) {
	for name, path := range map[string]string{"access_token": "/", "refresh_token": "/auth/refresh"} {
		http.SetCookie(w, &http.Cookie{
			Name:     name,
			Value:    "",
			Path:     path,
			MaxAge:   -1,
			HttpOnly: true,
			Secure:   h.isProd,
			SameSite: http.SameSiteStrictMode,
		})
	}
}

// ─── Register ────────────────────────────────────────────────────────────────

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		apierror.BadRequest(w, "invalid request body")
		return
	}

	tokens, err := h.authSvc.Register(r.Context(), req.Email, req.Password)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrEmailTaken):
			apierror.Conflict(w, err.Error())
		case errors.Is(err, service.ErrWeakPassword), errors.Is(err, service.ErrInvalidEmail):
			apierror.BadRequest(w, err.Error())
		default:
			apierror.InternalError(w, err)
		}
		return
	}

	h.setTokenCookies(w, tokens.AccessToken, tokens.RefreshToken)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"user": tokens.User,
	})
}

// ─── Customer Login ────────────────────────────────────────────────────────
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		apierror.BadRequest(w, "invalid request body")
		return
	}

	tokens, err := h.authSvc.Login(r.Context(), req.Email, req.Password)
	if err != nil {
		if errors.Is(err, service.ErrInvalidCreds) {
			apierror.Unauthorized(w, "invalid email or password")
		} else {
			apierror.InternalError(w, err)
		}
		return
	}

	h.setTokenCookies(w, tokens.AccessToken, tokens.RefreshToken)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"user": tokens.User,
	})
}

// ─── Admin Login ───────────────────────────────────────────────────────────
func (h *AuthHandler) AdminLogin(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		apierror.BadRequest(w, "invalid request body")
		return
	}

	tokens, err := h.authSvc.AdminLogin(r.Context(), req.Email, req.Password)
	if err != nil {
		if errors.Is(err, service.ErrInvalidCreds) {
			apierror.Unauthorized(w, "invalid email or password")
		} else {
			apierror.InternalError(w, err)
		}
		return
	}

	// Admin portal strictly requires admin role
	if tokens.User.Role != "admin" {
		apierror.Unauthorized(w, "invalid credentials for admin access")
		return
	}

	h.setTokenCookies(w, tokens.AccessToken, tokens.RefreshToken)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"user": tokens.User,
	})
}

// ─── Logout ──────────────────────────────────────────────────────────────────

func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	h.clearTokenCookies(w)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "logged out"})
}

// ─── Refresh ─────────────────────────────────────────────────────────────────

func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("refresh_token")
	if err != nil {
		apierror.Unauthorized(w, "missing refresh token")
		return
	}

	tokens, err := h.authSvc.RefreshAccess(r.Context(), cookie.Value)
	if err != nil {
		h.clearTokenCookies(w)
		apierror.Unauthorized(w, "session expired — please log in again")
		return
	}

	h.setTokenCookies(w, tokens.AccessToken, tokens.RefreshToken)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"user": tokens.User,
	})
}
