package models

import "time"

type Shipment struct {
	ID               string     `json:"id"`
	OrderID          string     `json:"order_id"`
	ShippingMethodID *string    `json:"shipping_method_id,omitempty"`
	CarrierID        *string    `json:"carrier_id,omitempty"`
	TrackingNumber   *string    `json:"tracking_number,omitempty"`
	Status           string     `json:"status"`
	ShippedAt        *time.Time `json:"shipped_at,omitempty"`
	DeliveredAt      *time.Time `json:"delivered_at,omitempty"`
	CreatedAt        time.Time  `json:"created_at"`
}

type ShipmentItem struct {
	ID          string    `json:"id"`
	ShipmentID  string    `json:"shipment_id"`
	OrderItemID string    `json:"order_item_id"`
	Quantity    int       `json:"quantity"`
	CreatedAt   time.Time `json:"created_at"`
}

type ShippingMethod struct {
	ID            string    `json:"id"`
	Name          string    `json:"name"`
	BaseCostCents int       `json:"base_cost_cents"`
	Currency      string    `json:"currency"`
	CreatedAt     time.Time `json:"created_at"`
}

type Carrier struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"created_at"`
}
