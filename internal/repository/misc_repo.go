package repository

import (
	"context"
	"fmt"

	"github.com/hadiafyouni/ecommerce/internal/models"
	"github.com/jackc/pgx/v5/pgxpool"
)

type WishlistRepo struct{ db *pgxpool.Pool }

func NewWishlistRepo(db *pgxpool.Pool) *WishlistRepo { return &WishlistRepo{db: db} }

func (r *WishlistRepo) GetOrCreate(ctx context.Context, userID string) (*models.Wishlist, error) {
	var w models.Wishlist
	err := r.db.QueryRow(ctx, `SELECT id, user_id, name, created_at FROM wishlists WHERE user_id=$1 LIMIT 1`, userID).
		Scan(&w.ID, &w.UserID, &w.Name, &w.CreatedAt)
	if err != nil {
		err = r.db.QueryRow(ctx,
			`INSERT INTO wishlists (id, user_id, name, created_at) VALUES (gen_random_uuid(),$1,'My Wishlist',now()) RETURNING id, user_id, name, created_at`,
			userID).Scan(&w.ID, &w.UserID, &w.Name, &w.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("create wishlist: %w", err)
		}
	}
	return &w, nil
}

func (r *WishlistRepo) GetItems(ctx context.Context, wishlistID string) ([]models.WishlistItem, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, wishlist_id, product_id, created_at FROM wishlist_items WHERE wishlist_id=$1`, wishlistID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []models.WishlistItem
	for rows.Next() {
		var i models.WishlistItem
		rows.Scan(&i.ID, &i.WishlistID, &i.ProductID, &i.CreatedAt)
		items = append(items, i)
	}
	return items, nil
}

func (r *WishlistRepo) AddItem(ctx context.Context, wishlistID, productID string) (*models.WishlistItem, error) {
	var i models.WishlistItem
	err := r.db.QueryRow(ctx,
		`INSERT INTO wishlist_items (id, wishlist_id, product_id, created_at) VALUES (gen_random_uuid(),$1,$2,now()) ON CONFLICT (wishlist_id, product_id) DO UPDATE SET product_id = EXCLUDED.product_id RETURNING id, wishlist_id, product_id, created_at`,
		wishlistID, productID).Scan(&i.ID, &i.WishlistID, &i.ProductID, &i.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("add wishlist item: %w", err)
	}
	return &i, nil
}

// RemoveItem deletes an item from the user's wishlist.
func (r *WishlistRepo) RemoveItem(ctx context.Context, userID, itemID string) error {
	tag, err := r.db.Exec(ctx,
		`DELETE FROM wishlist_items WHERE id=$1 AND wishlist_id IN (SELECT id FROM wishlists WHERE user_id=$2)`,
		itemID, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// AddressRepo
type AddressRepo struct{ db *pgxpool.Pool }

func NewAddressRepo(db *pgxpool.Pool) *AddressRepo { return &AddressRepo{db: db} }

func (r *AddressRepo) ListByUser(ctx context.Context, userID string) ([]models.Address, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, user_id, address_type_id, line1, line2, city, state, postal_code, country, is_default, created_at FROM addresses WHERE user_id=$1`,
		userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var addrs []models.Address
	for rows.Next() {
		var a models.Address
		rows.Scan(&a.ID, &a.UserID, &a.AddressTypeID, &a.Line1, &a.Line2, &a.City, &a.State, &a.PostalCode, &a.Country, &a.IsDefault, &a.CreatedAt)
		addrs = append(addrs, a)
	}
	return addrs, nil
}

func (r *AddressRepo) Create(ctx context.Context, userID, line1, city, country string, line2, state, postal *string, isDefault bool) (*models.Address, error) {
	var a models.Address
	err := r.db.QueryRow(ctx,
		`INSERT INTO addresses (id, user_id, line1, line2, city, state, postal_code, country, is_default, created_at) VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,$8,now()) RETURNING id, user_id, address_type_id, line1, line2, city, state, postal_code, country, is_default, created_at`,
		userID, line1, line2, city, state, postal, country, isDefault).
		Scan(&a.ID, &a.UserID, &a.AddressTypeID, &a.Line1, &a.Line2, &a.City, &a.State, &a.PostalCode, &a.Country, &a.IsDefault, &a.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &a, nil
}

// Delete removes one of the user's addresses.
func (r *AddressRepo) Delete(ctx context.Context, userID, id string) error {
	tag, err := r.db.Exec(ctx, `DELETE FROM addresses WHERE id=$1 AND user_id=$2`, id, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// AdminRepo
type AdminRepo struct{ db *pgxpool.Pool }

func NewAdminRepo(db *pgxpool.Pool) *AdminRepo { return &AdminRepo{db: db} }

func (r *AdminRepo) ListAuditLogs(ctx context.Context, limit, offset int) ([]models.AuditLog, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, actor_user_id, action, entity_type, entity_id, metadata, created_at FROM audit_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
		limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var logs []models.AuditLog
	for rows.Next() {
		var l models.AuditLog
		rows.Scan(&l.ID, &l.ActorUserID, &l.Action, &l.EntityType, &l.EntityID, &l.Metadata, &l.CreatedAt)
		logs = append(logs, l)
	}
	return logs, nil
}

type DashboardStats struct {
	TotalOrders    int `json:"total_orders"`
	PendingOrders  int `json:"pending_orders"`
	TotalRevenue   int `json:"total_revenue_cents"`
	LowStockCount  int `json:"low_stock_count"`
	TotalCustomers int `json:"total_customers"`
}

func (r *AdminRepo) DashboardStats(ctx context.Context) (*DashboardStats, error) {
	var s DashboardStats
	err := r.db.QueryRow(ctx, `SELECT
		(SELECT COUNT(*) FROM orders),
		(SELECT COUNT(*) FROM orders WHERE status = 'pending'),
		(SELECT COALESCE(SUM(total_cents), 0) FROM orders WHERE status NOT IN ('cancelled', 'refunded')),
		(SELECT COUNT(*) FROM v_low_stock_products),
		(SELECT COUNT(*) FROM customer_profiles)`).
		Scan(&s.TotalOrders, &s.PendingOrders, &s.TotalRevenue, &s.LowStockCount, &s.TotalCustomers)
	if err != nil {
		return nil, fmt.Errorf("dashboard stats: %w", err)
	}
	return &s, nil
}

// SettingsRepo
type SettingsRepo struct{ db *pgxpool.Pool }

func NewSettingsRepo(db *pgxpool.Pool) *SettingsRepo { return &SettingsRepo{db: db} }

func (r *SettingsRepo) Get(ctx context.Context, key string) (string, error) {
	var val string
	err := r.db.QueryRow(ctx, `SELECT value FROM settings WHERE key=$1`, key).Scan(&val)
	return val, err
}

func (r *SettingsRepo) Set(ctx context.Context, key, value string) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, now()) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=now()`,
		key, value)
	return err
}

func (r *SettingsRepo) List(ctx context.Context) ([]models.Setting, error) {
	rows, err := r.db.Query(ctx, `SELECT key, value, updated_at FROM settings`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var res []models.Setting
	for rows.Next() {
		var s models.Setting
		rows.Scan(&s.Key, &s.Value, &s.UpdatedAt)
		res = append(res, s)
	}
	return res, nil
}
