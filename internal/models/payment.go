package models

import "time"

type Payment struct {
	ID              string    `json:"id"`
	OrderID         string    `json:"order_id"`
	PaymentMethodID *string   `json:"payment_method_id,omitempty"`
	AmountCents     int       `json:"amount_cents"`
	Currency        string    `json:"currency"`
	Status          string    `json:"status"`
	CreatedAt       time.Time `json:"created_at"`
}

type PaymentTransaction struct {
	ID                string      `json:"id"`
	PaymentID         string      `json:"payment_id"`
	Provider          *string     `json:"provider,omitempty"`
	ProviderReference *string     `json:"provider_reference,omitempty"`
	Status            string      `json:"status"`
	RawPayload        interface{} `json:"raw_payload,omitempty"`
	CreatedAt         time.Time   `json:"created_at"`
}

type PaymentMethod struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"created_at"`
}

type Refund struct {
	ID          string    `json:"id"`
	PaymentID   *string   `json:"payment_id,omitempty"`
	ReturnID    *string   `json:"return_id,omitempty"`
	AmountCents int       `json:"amount_cents"`
	Currency    string    `json:"currency"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
}
