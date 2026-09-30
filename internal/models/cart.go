package models

import "time"

type Cart struct {
	ID        string     `json:"id"`
	UserID    *string    `json:"user_id,omitempty"`
	Status    string     `json:"status"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
	Items     []CartItem `json:"items,omitempty"`
}

type CartItem struct {
	ID                 string    `json:"id"`
	CartID             string    `json:"cart_id"`
	ProductID          string    `json:"product_id"`
	Quantity           int       `json:"quantity"`
	PriceCentsSnapshot int       `json:"price_cents_snapshot"`
	CreatedAt          time.Time `json:"created_at"`

	Product *Product `json:"product,omitempty"`
}
