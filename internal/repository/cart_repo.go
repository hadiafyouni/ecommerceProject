package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/hadiafyouni/ecommerce/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type CartRepo struct {
	db DBTX
}

func NewCartRepo(db *pgxpool.Pool) *CartRepo {
	return &CartRepo{db: db}
}

// WithTx returns a copy of the repo that runs its queries inside tx.
func (r *CartRepo) WithTx(tx pgx.Tx) *CartRepo {
	return &CartRepo{db: tx}
}

func (r *CartRepo) GetOrCreate(ctx context.Context, userID string) (*models.Cart, error) {
	q := `SELECT id, user_id, status, created_at, updated_at FROM carts WHERE user_id=$1 AND status='active' LIMIT 1`
	var c models.Cart
	err := r.db.QueryRow(ctx, q, userID).Scan(&c.ID, &c.UserID, &c.Status, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		// Create new cart
		createQ := `INSERT INTO carts (id, user_id, status, created_at, updated_at)
		            VALUES (gen_random_uuid(),$1,'active',now(),now())
		            RETURNING id, user_id, status, created_at, updated_at`
		err = r.db.QueryRow(ctx, createQ, userID).Scan(&c.ID, &c.UserID, &c.Status, &c.CreatedAt, &c.UpdatedAt)
		if err != nil {
			return nil, fmt.Errorf("create cart: %w", err)
		}
	}
	return &c, nil
}

func (r *CartRepo) GetItems(ctx context.Context, cartID string) ([]models.CartItem, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, cart_id, product_id, quantity, price_cents_snapshot, created_at FROM cart_items WHERE cart_id=$1`, cartID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []models.CartItem
	for rows.Next() {
		var i models.CartItem
		if err := rows.Scan(&i.ID, &i.CartID, &i.ProductID, &i.Quantity, &i.PriceCentsSnapshot, &i.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	return items, rows.Err()
}

func (r *CartRepo) AddItem(ctx context.Context, cartID, productID string, qty, priceCents int) (*models.CartItem, error) {
	// Upsert: if product already in cart, increment quantity
	q := `INSERT INTO cart_items (id, cart_id, product_id, quantity, price_cents_snapshot, created_at)
	      VALUES (gen_random_uuid(),$1,$2,$3,$4,now())
	      ON CONFLICT (cart_id, product_id) DO UPDATE
	        SET quantity = cart_items.quantity + EXCLUDED.quantity
	      RETURNING id, cart_id, product_id, quantity, price_cents_snapshot, created_at`
	var item models.CartItem
	err := r.db.QueryRow(ctx, q, cartID, productID, qty, priceCents).
		Scan(&item.ID, &item.CartID, &item.ProductID, &item.Quantity, &item.PriceCentsSnapshot, &item.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("add cart item: %w", err)
	}
	return &item, nil
}

// UpdateItem changes the quantity of an item in one of the user's active carts.
func (r *CartRepo) UpdateItem(ctx context.Context, userID, itemID string, qty int) (*models.CartItem, error) {
	var item models.CartItem
	err := r.db.QueryRow(ctx,
		`UPDATE cart_items SET quantity=$1
		 WHERE id=$2 AND cart_id IN (SELECT id FROM carts WHERE user_id=$3 AND status='active')
		 RETURNING id, cart_id, product_id, quantity, price_cents_snapshot, created_at`,
		qty, itemID, userID).Scan(&item.ID, &item.CartID, &item.ProductID, &item.Quantity, &item.PriceCentsSnapshot, &item.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("update cart item: %w", err)
	}
	return &item, nil
}

// RemoveItem deletes an item from one of the user's active carts.
func (r *CartRepo) RemoveItem(ctx context.Context, userID, itemID string) error {
	tag, err := r.db.Exec(ctx,
		`DELETE FROM cart_items
		 WHERE id=$1 AND cart_id IN (SELECT id FROM carts WHERE user_id=$2 AND status='active')`,
		itemID, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *CartRepo) Clear(ctx context.Context, cartID string) error {
	_, err := r.db.Exec(ctx, `DELETE FROM cart_items WHERE cart_id=$1`, cartID)
	return err
}

// MarkConverted flips an active cart to 'converted'. It returns ErrNotFound if
// the cart was already converted, which guards against double checkout.
func (r *CartRepo) MarkConverted(ctx context.Context, cartID string) error {
	tag, err := r.db.Exec(ctx,
		`UPDATE carts SET status='converted', updated_at=now() WHERE id=$1 AND status='active'`, cartID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
