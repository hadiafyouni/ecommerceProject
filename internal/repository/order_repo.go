package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/hadiafyouni/ecommerce/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type OrderRepo struct {
	db DBTX
}

func NewOrderRepo(db *pgxpool.Pool) *OrderRepo {
	return &OrderRepo{db: db}
}

// WithTx returns a copy of the repo that runs its queries inside tx.
func (r *OrderRepo) WithTx(tx pgx.Tx) *OrderRepo {
	return &OrderRepo{db: tx}
}

// Valid order statuses (mirrors the orders_status_check constraint).
var OrderStatuses = map[string]bool{
	"pending": true, "paid": true, "processing": true, "shipped": true,
	"delivered": true, "cancelled": true, "refunded": true,
}

// ErrOrderClosed is returned when trying to move a cancelled order to another status.
var ErrOrderClosed = errors.New("cancelled orders cannot change status")

const orderColumns = `id, user_id, cart_id, status, subtotal_cents, shipping_cents, total_cents, currency, customer_name, customer_phone, shipping_address, created_at, updated_at`

func scanOrder(row pgx.Row, o *models.Order) error {
	return row.Scan(&o.ID, &o.UserID, &o.CartID, &o.Status, &o.SubtotalCents, &o.ShippingCents, &o.TotalCents,
		&o.Currency, &o.CustomerName, &o.CustomerPhone, &o.ShippingAddress, &o.CreatedAt, &o.UpdatedAt)
}

func (r *OrderRepo) listOrders(ctx context.Context, q string, args ...any) ([]models.Order, error) {
	rows, err := r.db.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	orders := []models.Order{}
	for rows.Next() {
		var o models.Order
		if err := scanOrder(rows, &o); err != nil {
			return nil, err
		}
		orders = append(orders, o)
	}
	return orders, rows.Err()
}

func (r *OrderRepo) Create(ctx context.Context, userID, cartID *string, subtotal, shipping, total int, currency, customerName, shippingAddress string, customerPhone *string) (*models.Order, error) {
	q := `INSERT INTO orders (id, user_id, cart_id, status, subtotal_cents, shipping_cents, total_cents, currency, customer_name, customer_phone, shipping_address, created_at, updated_at)
	      VALUES (gen_random_uuid(),$1,$2,'pending',$3,$4,$5,$6,$7,$8,$9,now(),now())
	      RETURNING id, user_id, cart_id, status, subtotal_cents, shipping_cents, total_cents, currency, customer_name, customer_phone, shipping_address, created_at, updated_at`
	var o models.Order
	err := r.db.QueryRow(ctx, q, userID, cartID, subtotal, shipping, total, currency, customerName, customerPhone, shippingAddress).
		Scan(&o.ID, &o.UserID, &o.CartID, &o.Status, &o.SubtotalCents, &o.ShippingCents, &o.TotalCents,
			&o.Currency, &o.CustomerName, &o.CustomerPhone, &o.ShippingAddress, &o.CreatedAt, &o.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("create order: %w", err)
	}
	return &o, nil
}

func (r *OrderRepo) CreateItem(ctx context.Context, orderID, productID, productName string, unitPrice, qty, lineTotal int) (*models.OrderItem, error) {
	q := `INSERT INTO order_items (id, order_id, product_id, product_name_snapshot, unit_price_cents_snapshot, quantity, line_total_cents, created_at)
	      VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,now())
	      RETURNING id, order_id, product_id, product_name_snapshot, unit_price_cents_snapshot, quantity, line_total_cents, created_at`
	var i models.OrderItem
	err := r.db.QueryRow(ctx, q, orderID, productID, productName, unitPrice, qty, lineTotal).
		Scan(&i.ID, &i.OrderID, &i.ProductID, &i.ProductNameSnapshot, &i.UnitPriceCentsSnapshot, &i.Quantity, &i.LineTotalCents, &i.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("create order item: %w", err)
	}
	return &i, nil
}

func (r *OrderRepo) GetByID(ctx context.Context, id string) (*models.Order, error) {
	var o models.Order
	err := scanOrder(r.db.QueryRow(ctx, `SELECT `+orderColumns+` FROM orders WHERE id=$1`, id), &o)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get order: %w", err)
	}
	return &o, nil
}

// GetByIDForUser returns the order only if it belongs to userID.
func (r *OrderRepo) GetByIDForUser(ctx context.Context, id, userID string) (*models.Order, error) {
	var o models.Order
	err := scanOrder(r.db.QueryRow(ctx, `SELECT `+orderColumns+` FROM orders WHERE id=$1 AND user_id=$2`, id, userID), &o)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get order: %w", err)
	}
	return &o, nil
}

func (r *OrderRepo) GetItems(ctx context.Context, orderID string) ([]models.OrderItem, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, order_id, product_id, product_name_snapshot, unit_price_cents_snapshot, quantity, line_total_cents, created_at FROM order_items WHERE order_id=$1`,
		orderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []models.OrderItem{}
	for rows.Next() {
		var i models.OrderItem
		if err := rows.Scan(&i.ID, &i.OrderID, &i.ProductID, &i.ProductNameSnapshot, &i.UnitPriceCentsSnapshot, &i.Quantity, &i.LineTotalCents, &i.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	return items, rows.Err()
}

func (r *OrderRepo) ListByUser(ctx context.Context, userID string) ([]models.Order, error) {
	return r.listOrders(ctx, `SELECT `+orderColumns+` FROM orders WHERE user_id=$1 ORDER BY created_at DESC`, userID)
}

func (r *OrderRepo) ListAll(ctx context.Context, limit, offset int) ([]models.Order, error) {
	return r.listOrders(ctx, `SELECT `+orderColumns+` FROM orders ORDER BY created_at DESC LIMIT $1 OFFSET $2`, limit, offset)
}

// UpdateStatus changes an order's status, records the change in
// order_status_history and, when an order is cancelled, releases the stock
// it had reserved. All of it happens in one transaction.
func (r *OrderRepo) UpdateStatus(ctx context.Context, orderID, newStatus string, changedByUserID *string, note *string) error {
	return inTx(ctx, r.db, func(tx pgx.Tx) error {
		var oldStatus string
		err := tx.QueryRow(ctx, `SELECT status FROM orders WHERE id=$1 FOR UPDATE`, orderID).Scan(&oldStatus)
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		}
		if err != nil {
			return fmt.Errorf("lock order: %w", err)
		}
		if oldStatus == newStatus {
			return nil
		}
		if oldStatus == "cancelled" {
			return ErrOrderClosed
		}

		if _, err := tx.Exec(ctx, `UPDATE orders SET status=$1, updated_at=now() WHERE id=$2`, newStatus, orderID); err != nil {
			return fmt.Errorf("update order status: %w", err)
		}

		if newStatus == "cancelled" {
			if err := releaseReservations(ctx, tx, orderID); err != nil {
				return err
			}
		}

		_, err = tx.Exec(ctx,
			`INSERT INTO order_status_history (id, order_id, old_status, new_status, changed_by_user_id, note, created_at) VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,now())`,
			orderID, oldStatus, newStatus, changedByUserID, note)
		return err
	})
}

// releaseReservations gives back the stock reserved by an order's items.
func releaseReservations(ctx context.Context, tx pgx.Tx, orderID string) error {
	rows, err := tx.Query(ctx,
		`UPDATE inventory i SET reserved = GREATEST(i.reserved - oi.quantity, 0), updated_at = now()
		 FROM order_items oi
		 WHERE oi.order_id = $1 AND oi.product_id = i.product_id
		 RETURNING i.product_id, oi.quantity`, orderID)
	if err != nil {
		return fmt.Errorf("release reservations: %w", err)
	}
	type released struct {
		productID string
		qty       int
	}
	var list []released
	for rows.Next() {
		var rel released
		if err := rows.Scan(&rel.productID, &rel.qty); err != nil {
			rows.Close()
			return err
		}
		list = append(list, rel)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return err
	}
	for _, rel := range list {
		if _, err := tx.Exec(ctx,
			`INSERT INTO inventory_movements (id, product_id, movement_type, quantity, reference_type, reference_id, created_at)
			 VALUES (gen_random_uuid(),$1,'RELEASE',$2,'order',$3,now())`,
			rel.productID, rel.qty, orderID); err != nil {
			return fmt.Errorf("log release: %w", err)
		}
	}
	return nil
}

func (r *OrderRepo) AddNote(ctx context.Context, orderID string, userID *string, note string, isInternal bool) (*models.OrderNote, error) {
	var n models.OrderNote
	err := r.db.QueryRow(ctx,
		`INSERT INTO order_notes (id, order_id, user_id, note, is_internal, created_at) VALUES (gen_random_uuid(),$1,$2,$3,$4,now()) RETURNING id, order_id, user_id, note, is_internal, created_at`,
		orderID, userID, note, isInternal).Scan(&n.ID, &n.OrderID, &n.UserID, &n.Note, &n.IsInternal, &n.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &n, nil
}
