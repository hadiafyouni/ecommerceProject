package models

import "time"

type Banner struct {
	ID          string    `json:"id"`
	ImageURL    string    `json:"image_url"`
	LinkURL     string    `json:"link_url,omitempty"`
	Title       string    `json:"title,omitempty"`
	Description string    `json:"description,omitempty"`
	Tag         string    `json:"tag,omitempty"`
	IsActive    bool      `json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
}
