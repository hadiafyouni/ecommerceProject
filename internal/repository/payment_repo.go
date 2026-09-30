package repository

import (
	"context"
	"fmt"

	"github.com/hadiafyouni/ecommerce/internal/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PaymentRepo struct{ db DBTX }

func NewPaymentRepo(db *pgxpool.Pool) *PaymentRepo { return &PaymentRepo{db: db} }

// WithTx returns a copy of the repo that runs its queries inside tx.
func (r *PaymentRepo) WithTx(tx pgx.Tx) *PaymentRepo { return &PaymentRepo{db: tx} }

func (r *PaymentRepo) Create(ctx context.Context, orderID string, paymentMethodID *string, amountCents int, currency string) (*models.Payment, error) {
	var p models.Payment
	err := r.db.QueryRow(ctx,
		`INSERT INTO payments (id, order_id, payment_method_id, amount_cents, currency, status, created_at)
		 VALUES (gen_random_uuid(),$1,$2,$3,$4,'pending',now())
		 RETURNING id, order_id, payment_method_id, amount_cents, currency, status, created_at`,
		orderID, paymentMethodID, amountCents, currency).
		Scan(&p.ID, &p.OrderID, &p.PaymentMethodID, &p.AmountCents, &p.Currency, &p.Status, &p.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("create payment: %w", err)
	}
	return &p, nil
}

func (r *PaymentRepo) GetByOrder(ctx context.Context, orderID string) (*models.Payment, error) {
	var p models.Payment
	err := r.db.QueryRow(ctx,
		`SELECT id, order_id, payment_method_id, amount_cents, currency, status, created_at FROM payments WHERE order_id=$1 ORDER BY created_at DESC LIMIT 1`,
		orderID).Scan(&p.ID, &p.OrderID, &p.PaymentMethodID, &p.AmountCents, &p.Currency, &p.Status, &p.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("get payment: %w", err)
	}
	return &p, nil
}

func (r *PaymentRepo) UpdateStatus(ctx context.Context, paymentID, status string) error {
	_, err := r.db.Exec(ctx, `UPDATE payments SET status=$1 WHERE id=$2`, status, paymentID)
	return err
}

func (r *PaymentRepo) CreateTransaction(ctx context.Context, paymentID string, provider, providerRef *string, status string) (*models.PaymentTransaction, error) {
	var t models.PaymentTransaction
	err := r.db.QueryRow(ctx,
		`INSERT INTO payment_transactions (id, payment_id, provider, provider_reference, status, created_at)
		 VALUES (gen_random_uuid(),$1,$2,$3,$4,now())
		 RETURNING id, payment_id, provider, provider_reference, status, created_at`,
		paymentID, provider, providerRef, status).
		Scan(&t.ID, &t.PaymentID, &t.Provider, &t.ProviderReference, &t.Status, &t.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("create transaction: %w", err)
	}
	return &t, nil
}

func (r *PaymentRepo) ListMethods(ctx context.Context) ([]models.PaymentMethod, error) {
	rows, err := r.db.Query(ctx, `SELECT id, name, created_at FROM payment_methods ORDER BY name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var methods []models.PaymentMethod
	for rows.Next() {
		var m models.PaymentMethod
		rows.Scan(&m.ID, &m.Name, &m.CreatedAt)
		methods = append(methods, m)
	}
	return methods, nil
}

// MethodExists reports whether a payment method with the given ID exists.
func (r *PaymentRepo) MethodExists(ctx context.Context, id string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM payment_methods WHERE id::text=$1)`, id).Scan(&exists)
	return exists, err
}
