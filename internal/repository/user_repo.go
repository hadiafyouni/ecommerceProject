package repository

import (
	"context"
	"fmt"

	"github.com/hadiafyouni/ecommerce/internal/models"
	"github.com/jackc/pgx/v5/pgxpool"
)

type UserRepo struct {
	db *pgxpool.Pool
}

func NewUserRepo(db *pgxpool.Pool) *UserRepo {
	return &UserRepo{db: db}
}

func (r *UserRepo) CreateCredential(ctx context.Context, email, hash, userID, role string) (*models.UserCredential, error) {
	q := `INSERT INTO customer_credentials (id, email, password_hash, user_id, role, created_at)
	      VALUES (gen_random_uuid(), $1, $2, $3, $4, now())
	      RETURNING id, email, password_hash, user_id, role, created_at`
	var c models.UserCredential
	err := r.db.QueryRow(ctx, q, email, hash, userID, role).
		Scan(&c.ID, &c.Email, &c.PasswordHash, &c.UserID, &c.Role, &c.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("create credential: %w", err)
	}
	return &c, nil
}

func (r *UserRepo) GetByEmail(ctx context.Context, email string) (*models.UserCredential, error) {
	q := `SELECT id, email, password_hash, user_id, role, created_at FROM customer_credentials WHERE email = $1`
	var c models.UserCredential
	err := r.db.QueryRow(ctx, q, email).
		Scan(&c.ID, &c.Email, &c.PasswordHash, &c.UserID, &c.Role, &c.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("get by email: %w", err)
	}
	return &c, nil
}

func (r *UserRepo) GetByUserID(ctx context.Context, userID string) (*models.UserCredential, error) {
	q := `SELECT id, email, password_hash, user_id, role, created_at FROM customer_credentials WHERE user_id = $1`
	var c models.UserCredential
	err := r.db.QueryRow(ctx, q, userID).
		Scan(&c.ID, &c.Email, &c.PasswordHash, &c.UserID, &c.Role, &c.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("get by user_id: %w", err)
	}
	return &c, nil
}

// ─── Admin Credentials ───────────────────────────────────────────────────────

func (r *UserRepo) CreateAdminCredential(ctx context.Context, email, hash, userID string) (*models.UserCredential, error) {
	q := `INSERT INTO admin_credentials (id, email, password_hash, user_id, role, created_at)
	      VALUES (gen_random_uuid(), $1, $2, $3, 'admin', now())
	      RETURNING id, email, password_hash, user_id, role, created_at`
	var c models.UserCredential
	err := r.db.QueryRow(ctx, q, email, hash, userID).
		Scan(&c.ID, &c.Email, &c.PasswordHash, &c.UserID, &c.Role, &c.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("create admin credential: %w", err)
	}
	return &c, nil
}

func (r *UserRepo) GetAdminByEmail(ctx context.Context, email string) (*models.UserCredential, error) {
	q := `SELECT id, email, password_hash, user_id, role, created_at FROM admin_credentials WHERE email = $1`
	var c models.UserCredential
	err := r.db.QueryRow(ctx, q, email).
		Scan(&c.ID, &c.Email, &c.PasswordHash, &c.UserID, &c.Role, &c.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("get admin by email: %w", err)
	}
	return &c, nil
}

func (r *UserRepo) GetAdminByUserID(ctx context.Context, userID string) (*models.UserCredential, error) {
	q := `SELECT id, email, password_hash, user_id, role, created_at FROM admin_credentials WHERE user_id = $1`
	var c models.UserCredential
	err := r.db.QueryRow(ctx, q, userID).
		Scan(&c.ID, &c.Email, &c.PasswordHash, &c.UserID, &c.Role, &c.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("get admin by user_id: %w", err)
	}
	return &c, nil
}

func (r *UserRepo) CreateProfile(ctx context.Context, userID string) (*models.CustomerProfile, error) {
	q := `INSERT INTO customer_profiles (id, user_id, created_at)
	      VALUES (gen_random_uuid(), $1, now())
	      RETURNING id, user_id, first_name, last_name, phone, created_at`
	var p models.CustomerProfile
	err := r.db.QueryRow(ctx, q, userID).
		Scan(&p.ID, &p.UserID, &p.FirstName, &p.LastName, &p.Phone, &p.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("create profile: %w", err)
	}
	return &p, nil
}

func (r *UserRepo) GetProfile(ctx context.Context, userID string) (*models.CustomerProfile, error) {
	q := `SELECT id, user_id, first_name, last_name, phone, created_at FROM customer_profiles WHERE user_id = $1`
	var p models.CustomerProfile
	err := r.db.QueryRow(ctx, q, userID).
		Scan(&p.ID, &p.UserID, &p.FirstName, &p.LastName, &p.Phone, &p.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("get profile: %w", err)
	}
	return &p, nil
}

func (r *UserRepo) UpdateProfile(ctx context.Context, userID string, firstName, lastName, phone *string) (*models.CustomerProfile, error) {
	q := `UPDATE customer_profiles SET first_name=$1, last_name=$2, phone=$3
	      WHERE user_id=$4
	      RETURNING id, user_id, first_name, last_name, phone, created_at`
	var p models.CustomerProfile
	err := r.db.QueryRow(ctx, q, firstName, lastName, phone, userID).
		Scan(&p.ID, &p.UserID, &p.FirstName, &p.LastName, &p.Phone, &p.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("update profile: %w", err)
	}
	return &p, nil
}

func (r *UserRepo) GetAnyByUserID(ctx context.Context, userID string) (*models.UserCredential, error) {
	// Try admin first
	cred, err := r.GetAdminByUserID(ctx, userID)
	if err == nil {
		return cred, nil
	}

	// Then try customer
	return r.GetByUserID(ctx, userID)
}
