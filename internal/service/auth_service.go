package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"
	"unicode"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/hadiafyouni/ecommerce/internal/models"
	"github.com/hadiafyouni/ecommerce/internal/repository"
	"github.com/rs/zerolog/log"
	"golang.org/x/crypto/bcrypt"
)

// Sentinel errors for the handler to distinguish
var (
	ErrEmailTaken   = errors.New("email already registered")
	ErrInvalidCreds = errors.New("invalid email or password")
	ErrWeakPassword = errors.New("password must be 8-72 characters and contain a letter and a digit")
	ErrInvalidToken = errors.New("invalid or expired token")
	ErrInvalidEmail = errors.New("invalid email address")
)

// dummyHash is compared against when an email is unknown, so login takes the
// same time whether or not the account exists.
var dummyHash, _ = bcrypt.GenerateFromPassword([]byte("dummy-password-for-timing"), bcrypt.DefaultCost)

const (
	tokenTypeAccess  = "access"
	tokenTypeRefresh = "refresh"
)

type AuthService struct {
	userRepo         *repository.UserRepo
	jwtSecret        string
	jwtRefreshSecret string
}

func NewAuthService(userRepo *repository.UserRepo, jwtSecret, jwtRefreshSecret string) *AuthService {
	return &AuthService{userRepo: userRepo, jwtSecret: jwtSecret, jwtRefreshSecret: jwtRefreshSecret}
}

type AuthTokens struct {
	AccessToken  string                 `json:"access_token"`
	RefreshToken string                 `json:"refresh_token"`
	User         *models.UserCredential `json:"user"`
}

// ─── Validation ─────────────────────────────────────────────────────────────

func validatePassword(p string) error {
	// bcrypt only uses the first 72 bytes, so reject anything longer.
	if len(strings.TrimSpace(p)) < 8 || len(p) > 72 {
		return ErrWeakPassword
	}
	hasLetter, hasDigit := false, false
	for _, c := range p {
		if unicode.IsLetter(c) {
			hasLetter = true
		}
		if unicode.IsDigit(c) {
			hasDigit = true
		}
	}
	if !hasLetter || !hasDigit {
		return ErrWeakPassword
	}
	return nil
}

func validateEmail(e string) error {
	e = strings.TrimSpace(e)
	at := strings.LastIndex(e, "@")
	if len(e) > 254 || at < 1 || at == len(e)-1 || strings.ContainsAny(e, " \t\r\n") {
		return ErrInvalidEmail
	}
	return nil
}

// ─── Register ────────────────────────────────────────────────────────────────

func (s *AuthService) Register(ctx context.Context, email, password string) (*AuthTokens, error) {
	email = strings.ToLower(strings.TrimSpace(email))

	if err := validateEmail(email); err != nil {
		return nil, err
	}
	if err := validatePassword(password); err != nil {
		return nil, err
	}

	existing, _ := s.userRepo.GetByEmail(ctx, email)
	if existing != nil {
		return nil, ErrEmailTaken
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("hash password: %w", err)
	}

	userID := uuid.NewString()
	cred, err := s.userRepo.CreateCredential(ctx, email, string(hash), userID, "customer")
	if err != nil {
		return nil, fmt.Errorf("create credential: %w", err)
	}
	if _, err := s.userRepo.CreateProfile(ctx, userID); err != nil {
		log.Warn().Err(err).Str("user_id", userID).Msg("create customer profile failed")
	}

	tokens, err := s.issueTokens(cred)
	if err != nil {
		return nil, err
	}
	tokens.User = cred
	return tokens, nil
}

// ─── Login ───────────────────────────────────────────────────────────────────

func (s *AuthService) Login(ctx context.Context, email, password string) (*AuthTokens, error) {
	email = strings.ToLower(strings.TrimSpace(email))

	cred, err := s.userRepo.GetByEmail(ctx, email)
	if err != nil {
		bcrypt.CompareHashAndPassword(dummyHash, []byte(password))
		return nil, ErrInvalidCreds
	}
	if err := bcrypt.CompareHashAndPassword([]byte(cred.PasswordHash), []byte(password)); err != nil {
		return nil, ErrInvalidCreds
	}

	tokens, err := s.issueTokens(cred)
	if err != nil {
		return nil, err
	}
	tokens.User = cred
	return tokens, nil
}

func (s *AuthService) AdminLogin(ctx context.Context, email, password string) (*AuthTokens, error) {
	email = strings.ToLower(strings.TrimSpace(email))

	cred, err := s.userRepo.GetAdminByEmail(ctx, email)
	if err != nil {
		bcrypt.CompareHashAndPassword(dummyHash, []byte(password))
		return nil, ErrInvalidCreds
	}
	if err := bcrypt.CompareHashAndPassword([]byte(cred.PasswordHash), []byte(password)); err != nil {
		return nil, ErrInvalidCreds
	}

	tokens, err := s.issueTokens(cred)
	if err != nil {
		return nil, err
	}
	tokens.User = cred
	return tokens, nil
}

// ─── Refresh ─────────────────────────────────────────────────────────────────

func (s *AuthService) RefreshAccess(ctx context.Context, refreshToken string) (*AuthTokens, error) {
	claims, err := s.validateToken(refreshToken, s.jwtRefreshSecret, tokenTypeRefresh)
	if err != nil {
		return nil, ErrInvalidToken
	}

	sub, _ := claims["sub"].(string)
	role, _ := claims["role"].(string)

	var cred *models.UserCredential
	var err2 error

	if role == "admin" {
		cred, err2 = s.userRepo.GetAdminByUserID(ctx, sub)
	} else {
		cred, err2 = s.userRepo.GetByUserID(ctx, sub)
	}

	if err2 != nil {
		return nil, ErrInvalidToken
	}

	if cred.Role != role {
		return nil, ErrInvalidToken
	}

	tokens, err := s.issueTokens(cred)
	if err != nil {
		return nil, err
	}
	tokens.User = cred
	return tokens, nil
}

// ─── Token helpers ───────────────────────────────────────────────────────────

func (s *AuthService) issueTokens(cred *models.UserCredential) (*AuthTokens, error) {
	access, err := s.signToken(cred, s.jwtSecret, tokenTypeAccess, 15*time.Minute)
	if err != nil {
		return nil, err
	}
	refresh, err := s.signToken(cred, s.jwtRefreshSecret, tokenTypeRefresh, 7*24*time.Hour)
	if err != nil {
		return nil, err
	}
	return &AuthTokens{AccessToken: access, RefreshToken: refresh}, nil
}

func (s *AuthService) signToken(cred *models.UserCredential, secret, typ string, duration time.Duration) (string, error) {
	claims := jwt.MapClaims{
		"sub":  cred.UserID,
		"role": cred.Role,
		"typ":  typ,
		"exp":  time.Now().Add(duration).Unix(),
		"iat":  time.Now().Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

func (s *AuthService) ValidateAccessToken(tokenStr string) (jwt.MapClaims, error) {
	return s.validateToken(tokenStr, s.jwtSecret, tokenTypeAccess)
}

func (s *AuthService) validateToken(tokenStr, secret, typ string) (jwt.MapClaims, error) {
	token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return []byte(secret), nil
	})
	if err != nil || !token.Valid {
		return nil, ErrInvalidToken
	}
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, ErrInvalidToken
	}
	// Refresh tokens must never work as access tokens (and vice versa).
	if t, _ := claims["typ"].(string); t != typ {
		return nil, ErrInvalidToken
	}
	if sub, _ := claims["sub"].(string); sub == "" {
		return nil, ErrInvalidToken
	}
	if role, _ := claims["role"].(string); role == "" {
		return nil, ErrInvalidToken
	}
	return claims, nil
}
