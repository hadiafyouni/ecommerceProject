package models

import "time"

type Coupon struct {
	ID                 string     `json:"id"`
	PromotionID        *string    `json:"promotion_id,omitempty"`
	Code               string     `json:"code"`
	DiscountType       string     `json:"discount_type"`
	DiscountValue      int        `json:"discount_value"`
	MinOrderTotalCents int        `json:"min_order_total_cents"`
	MaxRedemptions     *int       `json:"max_redemptions,omitempty"`
	PerUserLimit       *int       `json:"per_user_limit,omitempty"`
	StartsAt           *time.Time `json:"starts_at,omitempty"`
	EndsAt             *time.Time `json:"ends_at,omitempty"`
	IsActive           bool       `json:"is_active"`
	CreatedAt          time.Time  `json:"created_at"`
}

type CouponRedemption struct {
	ID         string    `json:"id"`
	CouponID   string    `json:"coupon_id"`
	OrderID    *string   `json:"order_id,omitempty"`
	UserID     *string   `json:"user_id,omitempty"`
	RedeemedAt time.Time `json:"redeemed_at"`
}

type Promotion struct {
	ID          string     `json:"id"`
	Name        string     `json:"name"`
	Description *string    `json:"description,omitempty"`
	StartsAt    *time.Time `json:"starts_at,omitempty"`
	EndsAt      *time.Time `json:"ends_at,omitempty"`
	IsActive    bool       `json:"is_active"`
	CreatedAt   time.Time  `json:"created_at"`
}
