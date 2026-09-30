package models

import "time"

type CustomerProfile struct {
	ID        string    `json:"id"`
	UserID    *string   `json:"user_id,omitempty"`
	FirstName *string   `json:"first_name,omitempty"`
	LastName  *string   `json:"last_name,omitempty"`
	Phone     *string   `json:"phone,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

type UserCredential struct {
	ID           string    `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	UserID       string    `json:"user_id"`
	Role         string    `json:"role"`
	CreatedAt    time.Time `json:"created_at"`
}

type AdminUser struct {
	UserID    string    `json:"user_id"`
	Role      string    `json:"role"`
	CreatedAt time.Time `json:"created_at"`
}
