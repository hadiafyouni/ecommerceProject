package repository

import (
	"context"
	"errors"

	"github.com/hadiafyouni/ecommerce/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ErrInsufficientStock is returned when a tracked product has too little stock.
var ErrInsufficientStock = errors.New("insufficient stock")

type InventoryRepo struct{ db DBTX }

func NewInventoryRepo(db *pgxpool.Pool) *InventoryRepo { return &InventoryRepo{db: db} }

// WithTx returns a copy of the repo that runs its queries inside tx.
func (r *InventoryRepo) WithTx(tx pgx.Tx) *InventoryRepo { return &InventoryRepo{db: tx} }

func (r *InventoryRepo) Get(ctx context.Context, productID string) (*models.Inventory, error) {
	var inv models.Inventory
	err := r.db.QueryRow(ctx,
		`SELECT product_id, stock, reserved, stock - reserved AS available, updated_at FROM inventory WHERE product_id=$1`,
		productID).Scan(&inv.ProductID, &inv.Stock, &inv.Reserved, &inv.Available, &inv.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &inv, nil
}

func (r *InventoryRepo) Set(ctx context.Context, productID string, stock int) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO inventory (product_id, stock, reserved, updated_at) VALUES ($1, $2, 0, now())
		 ON CONFLICT (product_id) DO UPDATE SET stock = $2, updated_at = now()`,
		productID, stock)
	return err
}

func (r *InventoryRepo) Adjust(ctx context.Context, productID string, delta int, reason string, userID *string) error {
	return inTx(ctx, r.db, func(tx pgx.Tx) error {
		_, err := tx.Exec(ctx,
			`INSERT INTO inventory (product_id, stock, reserved, updated_at) VALUES ($1, $2, 0, now())
			 ON CONFLICT (product_id) DO UPDATE SET stock = inventory.stock + $2, updated_at = now()`,
			productID, delta)
		if err != nil {
			return err
		}
		_, err = tx.Exec(ctx,
			`INSERT INTO inventory_adjustments (id, product_id, delta, reason, adjusted_by_user_id, created_at)
			 VALUES (gen_random_uuid(),$1,$2,$3,$4,now())`, productID, delta, reason, userID)
		return err
	})
}

// Reserve sets aside qty units of a product. Products without an inventory row
// are treated as untracked and always succeed (tracked=false). For tracked
// products it returns ErrInsufficientStock if stock - reserved < qty.
func (r *InventoryRepo) Reserve(ctx context.Context, productID string, qty int) (tracked bool, err error) {
	var available int
	err = r.db.QueryRow(ctx,
		`SELECT stock - reserved FROM inventory WHERE product_id = $1 FOR UPDATE`, productID).Scan(&available)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	if available < qty {
		return true, ErrInsufficientStock
	}
	_, err = r.db.Exec(ctx,
		`UPDATE inventory SET reserved = reserved + $1, updated_at = now() WHERE product_id = $2`, qty, productID)
	return true, err
}

func (r *InventoryRepo) LogMovement(ctx context.Context, productID, movementType string, qty int, refType, refID, note *string) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO inventory_movements (id, product_id, movement_type, quantity, reference_type, reference_id, note, created_at)
		 VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,now())`,
		productID, movementType, qty, refType, refID, note)
	return err
}

type ReviewRepo struct{ db *pgxpool.Pool }

func NewReviewRepo(db *pgxpool.Pool) *ReviewRepo { return &ReviewRepo{db: db} }

func (r *ReviewRepo) ListByProduct(ctx context.Context, productID string) ([]models.Review, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, product_id, user_id, rating, title, body, created_at FROM reviews WHERE product_id=$1 ORDER BY created_at DESC`,
		productID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	reviews := []models.Review{}
	for rows.Next() {
		var rv models.Review
		if err := rows.Scan(&rv.ID, &rv.ProductID, &rv.UserID, &rv.Rating, &rv.Title, &rv.Body, &rv.CreatedAt); err != nil {
			return nil, err
		}
		reviews = append(reviews, rv)
	}
	return reviews, rows.Err()
}

func (r *ReviewRepo) Create(ctx context.Context, productID string, userID *string, rating int, title, body *string) (*models.Review, error) {
	var rv models.Review
	err := r.db.QueryRow(ctx,
		`INSERT INTO reviews (id, product_id, user_id, rating, title, body, created_at)
		 VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,now())
		 RETURNING id, product_id, user_id, rating, title, body, created_at`,
		productID, userID, rating, title, body).
		Scan(&rv.ID, &rv.ProductID, &rv.UserID, &rv.Rating, &rv.Title, &rv.Body, &rv.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &rv, nil
}

type NotificationRepo struct{ db *pgxpool.Pool }

func NewNotificationRepo(db *pgxpool.Pool) *NotificationRepo { return &NotificationRepo{db: db} }

func (r *NotificationRepo) ListByUser(ctx context.Context, userID string) ([]models.Notification, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, user_id, channel, title, body, status, created_at, sent_at FROM notifications WHERE user_id=$1 ORDER BY created_at DESC`,
		userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var notifs []models.Notification
	for rows.Next() {
		var n models.Notification
		rows.Scan(&n.ID, &n.UserID, &n.Channel, &n.Title, &n.Body, &n.Status, &n.CreatedAt, &n.SentAt)
		notifs = append(notifs, n)
	}
	return notifs, nil
}
