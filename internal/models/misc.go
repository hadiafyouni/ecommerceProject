package models

import "time"

type Address struct {
	ID            string    `json:"id"`
	UserID        *string   `json:"user_id,omitempty"`
	AddressTypeID *string   `json:"address_type_id,omitempty"`
	Line1         string    `json:"line1"`
	Line2         *string   `json:"line2,omitempty"`
	City          string    `json:"city"`
	State         *string   `json:"state,omitempty"`
	PostalCode    *string   `json:"postal_code,omitempty"`
	Country       string    `json:"country"`
	IsDefault     bool      `json:"is_default"`
	CreatedAt     time.Time `json:"created_at"`
}

type AddressType struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"created_at"`
}

type Review struct {
	ID        string    `json:"id"`
	ProductID string    `json:"product_id"`
	UserID    *string   `json:"user_id,omitempty"`
	Rating    int       `json:"rating"`
	Title     *string   `json:"title,omitempty"`
	Body      *string   `json:"body,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

type Wishlist struct {
	ID        string         `json:"id"`
	UserID    string         `json:"user_id"`
	Name      string         `json:"name"`
	CreatedAt time.Time      `json:"created_at"`
	Items     []WishlistItem `json:"items,omitempty"`
}

type WishlistItem struct {
	ID         string    `json:"id"`
	WishlistID string    `json:"wishlist_id"`
	ProductID  string    `json:"product_id"`
	CreatedAt  time.Time `json:"created_at"`
	Product    *Product  `json:"product,omitempty"`
}

type Return struct {
	ID        string       `json:"id"`
	OrderID   string       `json:"order_id"`
	UserID    *string      `json:"user_id,omitempty"`
	Status    string       `json:"status"`
	Reason    *string      `json:"reason,omitempty"`
	CreatedAt time.Time    `json:"created_at"`
	Items     []ReturnItem `json:"items,omitempty"`
}

type ReturnItem struct {
	ID          string    `json:"id"`
	ReturnID    string    `json:"return_id"`
	OrderItemID string    `json:"order_item_id"`
	Quantity    int       `json:"quantity"`
	Reason      *string   `json:"reason,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
}

type Notification struct {
	ID        string     `json:"id"`
	UserID    *string    `json:"user_id,omitempty"`
	Channel   string     `json:"channel"`
	Title     string     `json:"title"`
	Body      string     `json:"body"`
	Status    string     `json:"status"`
	CreatedAt time.Time  `json:"created_at"`
	SentAt    *time.Time `json:"sent_at,omitempty"`
}

type AuditLog struct {
	ID          string      `json:"id"`
	ActorUserID *string     `json:"actor_user_id,omitempty"`
	Action      string      `json:"action"`
	EntityType  string      `json:"entity_type"`
	EntityID    *string     `json:"entity_id,omitempty"`
	Metadata    interface{} `json:"metadata,omitempty"`
	CreatedAt   time.Time   `json:"created_at"`
}

type TaxRate struct {
	ID          string    `json:"id"`
	Country     string    `json:"country"`
	State       *string   `json:"state,omitempty"`
	RatePercent int       `json:"rate_percent"`
	IsActive    bool      `json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
}
