package models

import "time"

type Inventory struct {
	ProductID string    `json:"product_id"`
	Stock     int       `json:"stock"`
	Reserved  int       `json:"reserved"`
	Available int       `json:"available"` // computed: stock - reserved
	UpdatedAt time.Time `json:"updated_at"`
}

type InventoryAdjustment struct {
	ID               string    `json:"id"`
	ProductID        string    `json:"product_id"`
	Delta            int       `json:"delta"`
	Reason           string    `json:"reason"`
	AdjustedByUserID *string   `json:"adjusted_by_user_id,omitempty"`
	CreatedAt        time.Time `json:"created_at"`
}

type InventoryMovement struct {
	ID            string    `json:"id"`
	ProductID     string    `json:"product_id"`
	MovementType  string    `json:"movement_type"`
	Quantity      int       `json:"quantity"`
	ReferenceType *string   `json:"reference_type,omitempty"`
	ReferenceID   *string   `json:"reference_id,omitempty"`
	Note          *string   `json:"note,omitempty"`
	CreatedAt     time.Time `json:"created_at"`
}
