package models

import "time"

type Order struct {
	ID              string    `json:"id"`
	UserID          *string   `json:"user_id,omitempty"`
	CartID          *string   `json:"cart_id,omitempty"`
	Status          string    `json:"status"`
	SubtotalCents   int       `json:"subtotal_cents"`
	ShippingCents   int       `json:"shipping_cents"`
	TotalCents      int       `json:"total_cents"`
	Currency        string    `json:"currency"`
	CustomerName    string    `json:"customer_name"`
	CustomerPhone   *string   `json:"customer_phone,omitempty"`
	ShippingAddress string    `json:"shipping_address"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`

	Items []OrderItem `json:"items,omitempty"`
}

type OrderItem struct {
	ID                     string    `json:"id"`
	OrderID                string    `json:"order_id"`
	ProductID              string    `json:"product_id"`
	ProductNameSnapshot    string    `json:"product_name_snapshot"`
	UnitPriceCentsSnapshot int       `json:"unit_price_cents_snapshot"`
	Quantity               int       `json:"quantity"`
	LineTotalCents         int       `json:"line_total_cents"`
	CreatedAt              time.Time `json:"created_at"`
}

type OrderStatusHistory struct {
	ID              string    `json:"id"`
	OrderID         string    `json:"order_id"`
	OldStatus       *string   `json:"old_status,omitempty"`
	NewStatus       string    `json:"new_status"`
	ChangedByUserID *string   `json:"changed_by_user_id,omitempty"`
	Note            *string   `json:"note,omitempty"`
	CreatedAt       time.Time `json:"created_at"`
}

type OrderNote struct {
	ID         string    `json:"id"`
	OrderID    string    `json:"order_id"`
	UserID     *string   `json:"user_id,omitempty"`
	Note       string    `json:"note"`
	IsInternal bool      `json:"is_internal"`
	CreatedAt  time.Time `json:"created_at"`
}

type OrderTax struct {
	ID        string    `json:"id"`
	OrderID   string    `json:"order_id"`
	TaxRateID *string   `json:"tax_rate_id,omitempty"`
	TaxCents  int       `json:"tax_cents"`
	CreatedAt time.Time `json:"created_at"`
}
