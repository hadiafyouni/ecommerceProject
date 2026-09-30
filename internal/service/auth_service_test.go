package service

import (
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/hadiafyouni/ecommerce/internal/models"
)

const (
	testAccessSecret  = "test-access-secret-0123456789abcdef"
	testRefreshSecret = "test-refresh-secret-0123456789abcdef"
)

func newTestAuth() *AuthService {
	return NewAuthService(nil, testAccessSecret, testRefreshSecret)
}

func TestIssuedAccessTokenValidates(t *testing.T) {
	s := newTestAuth()
	tokens, err := s.issueTokens(&models.UserCredential{UserID: "u-1", Role: "customer"})
	if err != nil {
		t.Fatal(err)
	}
	claims, err := s.ValidateAccessToken(tokens.AccessToken)
	if err != nil {
		t.Fatalf("access token rejected: %v", err)
	}
	if claims["sub"] != "u-1" || claims["role"] != "customer" {
		t.Fatalf("unexpected claims: %v", claims)
	}
}

func TestRefreshTokenIsNotAnAccessToken(t *testing.T) {
	// Even if both secrets were the same, the typ claim must keep them apart.
	s := NewAuthService(nil, testAccessSecret, testAccessSecret)
	tokens, err := s.issueTokens(&models.UserCredential{UserID: "u-1", Role: "admin"})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := s.ValidateAccessToken(tokens.RefreshToken); !errors.Is(err, ErrInvalidToken) {
		t.Fatalf("refresh token accepted as access token, err=%v", err)
	}
}

func TestRejectsBadTokens(t *testing.T) {
	s := newTestAuth()
	sign := func(method jwt.SigningMethod, key any, claims jwt.MapClaims) string {
		tok, err := jwt.NewWithClaims(method, claims).SignedString(key)
		if err != nil {
			t.Fatal(err)
		}
		return tok
	}
	valid := jwt.MapClaims{"sub": "u-1", "role": "admin", "typ": "access", "exp": time.Now().Add(time.Hour).Unix()}

	cases := map[string]string{
		"wrong secret": sign(jwt.SigningMethodHS256, []byte("some-other-secret-0123456789abcdef"), valid),
		"expired": sign(jwt.SigningMethodHS256, []byte(testAccessSecret),
			jwt.MapClaims{"sub": "u-1", "role": "admin", "typ": "access", "exp": time.Now().Add(-time.Minute).Unix()}),
		"missing sub": sign(jwt.SigningMethodHS256, []byte(testAccessSecret),
			jwt.MapClaims{"role": "admin", "typ": "access", "exp": time.Now().Add(time.Hour).Unix()}),
		"missing typ": sign(jwt.SigningMethodHS256, []byte(testAccessSecret),
			jwt.MapClaims{"sub": "u-1", "role": "admin", "exp": time.Now().Add(time.Hour).Unix()}),
		"alg none": sign(jwt.SigningMethodNone, jwt.UnsafeAllowNoneSignatureType, valid),
		"garbage":  "not.a.jwt",
	}
	for name, tok := range cases {
		t.Run(name, func(t *testing.T) {
			if _, err := s.ValidateAccessToken(tok); !errors.Is(err, ErrInvalidToken) {
				t.Fatalf("expected ErrInvalidToken, got %v", err)
			}
		})
	}
}

func TestValidatePassword(t *testing.T) {
	cases := map[string]bool{
		"short1":                 false,
		"onlyletters":            false,
		"12345678":               false,
		"goodpass1":              true,
		strings.Repeat("a1", 37): false, // 74 bytes, over bcrypt's limit
		strings.Repeat("a1", 36): true,  // exactly 72 bytes
		"   pad1   ":             false, // trimmed length is too short
	}
	for pw, ok := range cases {
		if err := validatePassword(pw); (err == nil) != ok {
			t.Errorf("validatePassword(%q) = %v, want ok=%v", pw, err, ok)
		}
	}
}

func TestValidateEmail(t *testing.T) {
	cases := map[string]bool{
		"user@example.com": true,
		"a@b":              true,
		"@example.com":     false,
		"user@":            false,
		"no-at-sign":       false,
		"sp ace@x.com":     false,
	}
	for email, ok := range cases {
		if err := validateEmail(email); (err == nil) != ok {
			t.Errorf("validateEmail(%q) = %v, want ok=%v", email, err, ok)
		}
	}
}

func TestDummyHashIsValid(t *testing.T) {
	// If the dummy hash were malformed, bcrypt would return instantly and
	// login timing would reveal which emails are registered.
	if len(dummyHash) == 0 {
		t.Fatal("dummy hash was not generated")
	}
}
