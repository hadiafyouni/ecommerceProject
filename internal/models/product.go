package models

import "time"

type Category struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Slug      string    `json:"slug"`
	ImageURL  *string   `json:"image_url"`
	CreatedAt time.Time `json:"created_at"`
}

type Brand struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Slug      string    `json:"slug"`
	CreatedAt time.Time `json:"created_at"`
}

type Tag struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Slug      string    `json:"slug"`
	CreatedAt time.Time `json:"created_at"`
}

type Product struct {
	ID          string    `json:"id"`
	CategoryID  *string   `json:"category_id,omitempty"`
	Name        string    `json:"name"`
	Slug        string    `json:"slug"`
	Description *string   `json:"description,omitempty"`
	PriceCents  int       `json:"price_cents"`
	Currency    string    `json:"currency"`
	IsActive    bool      `json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`

	Stock *int `json:"stock,omitempty"`

	// Enriched fields
	Images   []ProductImage   `json:"images,omitempty"`
	Variants []ProductVariant `json:"variants,omitempty"`
	Tags     []Tag            `json:"tags,omitempty"`
	Category *Category        `json:"category,omitempty"`
}

type ProductVariant struct {
	ID        string    `json:"id"`
	ProductID string    `json:"product_id"`
	SKU       string    `json:"sku"`
	Name      *string   `json:"name,omitempty"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
}

type ProductImage struct {
	ID        string    `json:"id"`
	ProductID string    `json:"product_id"`
	Path      string    `json:"path"`
	AltText   *string   `json:"alt_text,omitempty"`
	SortOrder int       `json:"sort_order"`
	CreatedAt time.Time `json:"created_at"`
}

type ProductAttribute struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"created_at"`
}

type ProductAttributeValue struct {
	ID          string    `json:"id"`
	AttributeID string    `json:"attribute_id"`
	Value       string    `json:"value"`
	CreatedAt   time.Time `json:"created_at"`
}
