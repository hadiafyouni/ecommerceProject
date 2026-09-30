package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/hadiafyouni/ecommerce/internal/apierror"
	"github.com/hadiafyouni/ecommerce/internal/middleware"
	"github.com/hadiafyouni/ecommerce/internal/models"
	"github.com/hadiafyouni/ecommerce/internal/repository"
	"github.com/hadiafyouni/ecommerce/internal/service"
)

type OrderHandler struct {
	orderSvc  *service.OrderService
	orderRepo *repository.OrderRepo
	cartRepo  *repository.CartRepo
}

func NewOrderHandler(svc *service.OrderService, repo *repository.OrderRepo, cart *repository.CartRepo) *OrderHandler {
	return &OrderHandler{orderSvc: svc, orderRepo: repo, cartRepo: cart}
}

// POST /orders/checkout
func (h *OrderHandler) Checkout(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	var req struct {
		CustomerName    string  `json:"customer_name"`
		CustomerPhone   *string `json:"customer_phone"`
		ShippingAddress string  `json:"shipping_address"`
		PaymentMethodID *string `json:"payment_method_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		apierror.BadRequest(w, "invalid request body")
		return
	}
	req.CustomerName = strings.TrimSpace(req.CustomerName)
	req.ShippingAddress = strings.TrimSpace(req.ShippingAddress)
	if req.CustomerName == "" || req.ShippingAddress == "" {
		apierror.BadRequest(w, "customer_name and shipping_address are required")
		return
	}
	if len(req.CustomerName) > 200 || len(req.ShippingAddress) > 500 {
		apierror.BadRequest(w, "customer_name or shipping_address is too long")
		return
	}

	if req.PaymentMethodID != nil && *req.PaymentMethodID == "" {
		req.PaymentMethodID = nil
	}

	cart, err := h.cartRepo.GetOrCreate(r.Context(), userID)
	if err != nil {
		apierror.InternalError(w, err)
		return
	}

	order, err := h.orderSvc.Checkout(r.Context(), service.CheckoutInput{
		UserID:          userID,
		CartID:          cart.ID,
		CustomerName:    req.CustomerName,
		CustomerPhone:   req.CustomerPhone,
		ShippingAddress: req.ShippingAddress,
		PaymentMethodID: req.PaymentMethodID,
	})
	if err != nil {
		var stockErr *service.OutOfStockError
		switch {
		case errors.As(err, &stockErr):
			apierror.Conflict(w, stockErr.Error())
		case errors.Is(err, service.ErrEmptyCart),
			errors.Is(err, service.ErrProductUnavailable),
			errors.Is(err, service.ErrInvalidPaymentMethod):
			apierror.BadRequest(w, err.Error())
		default:
			apierror.InternalError(w, err)
		}
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(order)
}

// GET /orders
func (h *OrderHandler) ListMine(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	orders, err := h.orderRepo.ListByUser(r.Context(), userID)
	if err != nil {
		apierror.InternalError(w)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(orders)
}

// GET /orders/{id} — customers can only see their own orders; admins see any.
func (h *OrderHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if _, err := uuid.Parse(id); err != nil {
		apierror.NotFound(w, "order")
		return
	}

	var order *models.Order
	var err error
	if middleware.GetRole(r) == "admin" {
		order, err = h.orderRepo.GetByID(r.Context(), id)
	} else {
		order, err = h.orderRepo.GetByIDForUser(r.Context(), id, middleware.GetUserID(r))
	}
	if errors.Is(err, repository.ErrNotFound) {
		apierror.NotFound(w, "order")
		return
	}
	if err != nil {
		apierror.InternalError(w, err)
		return
	}
	if order.Items, err = h.orderRepo.GetItems(r.Context(), id); err != nil {
		apierror.InternalError(w, err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(order)
}

// GET /admin/orders
func (h *OrderHandler) AdminList(w http.ResponseWriter, r *http.Request) {
	limit, offset := pagination(r, 20, 100)
	orders, err := h.orderRepo.ListAll(r.Context(), limit, offset)
	if err != nil {
		apierror.InternalError(w)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(orders)
}

// PUT /admin/orders/{id}/status
func (h *OrderHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	adminID := middleware.GetUserID(r)
	var req struct {
		Status string  `json:"status"`
		Note   *string `json:"note"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || !repository.OrderStatuses[req.Status] {
		apierror.BadRequest(w, "a valid status is required")
		return
	}
	if _, err := uuid.Parse(id); err != nil {
		apierror.NotFound(w, "order")
		return
	}
	err := h.orderRepo.UpdateStatus(r.Context(), id, req.Status, &adminID, req.Note)
	switch {
	case errors.Is(err, repository.ErrNotFound):
		apierror.NotFound(w, "order")
		return
	case errors.Is(err, repository.ErrOrderClosed):
		apierror.BadRequest(w, err.Error())
		return
	case err != nil:
		apierror.InternalError(w, err)
		return
	}
	order, err := h.orderRepo.GetByID(r.Context(), id)
	if err != nil {
		apierror.InternalError(w, err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(order)
}
