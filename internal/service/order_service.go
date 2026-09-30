package service

import (
	"context"
	"errors"
	"fmt"

	"github.com/hadiafyouni/ecommerce/internal/models"
	"github.com/hadiafyouni/ecommerce/internal/repository"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Checkout errors that are safe to show to the client.
var (
	ErrEmptyCart            = errors.New("your cart is empty")
	ErrProductUnavailable   = errors.New("a product in your cart is no longer available")
	ErrInvalidPaymentMethod = errors.New("invalid payment method")
)

// OutOfStockError names the product that could not be reserved.
type OutOfStockError struct{ ProductName string }

func (e *OutOfStockError) Error() string {
	return fmt.Sprintf("not enough stock for %q", e.ProductName)
}

type OrderService struct {
	pool        *pgxpool.Pool
	orderRepo   *repository.OrderRepo
	cartRepo    *repository.CartRepo
	productRepo *repository.ProductRepo
	invRepo     *repository.InventoryRepo
	payRepo     *repository.PaymentRepo
}

func NewOrderService(pool *pgxpool.Pool, o *repository.OrderRepo, c *repository.CartRepo, p *repository.ProductRepo, inv *repository.InventoryRepo, pay *repository.PaymentRepo) *OrderService {
	return &OrderService{pool: pool, orderRepo: o, cartRepo: c, productRepo: p, invRepo: inv, payRepo: pay}
}

type CheckoutInput struct {
	UserID          string
	CartID          string
	CustomerName    string
	CustomerPhone   *string
	ShippingAddress string
	PaymentMethodID *string
}

// Checkout turns the user's cart into an order. Everything (order, items,
// stock reservation, payment, cart conversion) happens in one transaction,
// so a failure part-way leaves no half-created order behind.
func (s *OrderService) Checkout(ctx context.Context, input CheckoutInput) (*models.Order, error) {
	if input.PaymentMethodID != nil {
		ok, err := s.payRepo.MethodExists(ctx, *input.PaymentMethodID)
		if err != nil {
			return nil, fmt.Errorf("check payment method: %w", err)
		}
		if !ok {
			return nil, ErrInvalidPaymentMethod
		}
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin checkout: %w", err)
	}
	defer tx.Rollback(ctx)

	orders := s.orderRepo.WithTx(tx)
	carts := s.cartRepo.WithTx(tx)
	inventory := s.invRepo.WithTx(tx)
	payments := s.payRepo.WithTx(tx)

	// Claim the cart first: a concurrent second checkout of the same cart fails here.
	if err := carts.MarkConverted(ctx, input.CartID); err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, ErrEmptyCart
		}
		return nil, fmt.Errorf("convert cart: %w", err)
	}

	items, err := carts.GetItems(ctx, input.CartID)
	if err != nil {
		return nil, fmt.Errorf("load cart items: %w", err)
	}
	if len(items) == 0 {
		return nil, ErrEmptyCart
	}

	type line struct {
		item    models.CartItem
		product *models.Product
	}
	lines := make([]line, 0, len(items))
	subtotal := 0
	for _, item := range items {
		product, err := s.productRepo.GetByID(ctx, item.ProductID)
		if err != nil || !product.IsActive {
			return nil, ErrProductUnavailable
		}
		subtotal += product.PriceCents * item.Quantity
		lines = append(lines, line{item: item, product: product})
	}

	const shipping = 0 // flat free shipping for now
	total := subtotal + shipping
	order, err := orders.Create(ctx, &input.UserID, &input.CartID, subtotal, shipping, total, "USD",
		input.CustomerName, input.ShippingAddress, input.CustomerPhone)
	if err != nil {
		return nil, fmt.Errorf("create order: %w", err)
	}

	for _, l := range lines {
		if _, err := orders.CreateItem(ctx, order.ID, l.product.ID, l.product.Name,
			l.product.PriceCents, l.item.Quantity, l.product.PriceCents*l.item.Quantity); err != nil {
			return nil, fmt.Errorf("create order item: %w", err)
		}

		tracked, err := inventory.Reserve(ctx, l.product.ID, l.item.Quantity)
		if errors.Is(err, repository.ErrInsufficientStock) {
			return nil, &OutOfStockError{ProductName: l.product.Name}
		}
		if err != nil {
			return nil, fmt.Errorf("reserve stock: %w", err)
		}
		if tracked {
			refType := "order"
			if err := inventory.LogMovement(ctx, l.product.ID, "RESERVE", l.item.Quantity, &refType, &order.ID, nil); err != nil {
				return nil, fmt.Errorf("log movement: %w", err)
			}
		}
	}

	if _, err := payments.Create(ctx, order.ID, input.PaymentMethodID, total, "USD"); err != nil {
		return nil, fmt.Errorf("create payment: %w", err)
	}
	if err := carts.Clear(ctx, input.CartID); err != nil {
		return nil, fmt.Errorf("clear cart: %w", err)
	}

	if order.Items, err = orders.GetItems(ctx, order.ID); err != nil {
		return nil, fmt.Errorf("load order items: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit checkout: %w", err)
	}
	return order, nil
}
