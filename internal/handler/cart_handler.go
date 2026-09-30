package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/hadiafyouni/ecommerce/internal/apierror"
	"github.com/hadiafyouni/ecommerce/internal/middleware"
	"github.com/hadiafyouni/ecommerce/internal/models"
	"github.com/hadiafyouni/ecommerce/internal/repository"
)

// maxItemQuantity caps a single cart line to keep totals sane.
const maxItemQuantity = 99

type CartHandler struct {
	cartRepo    *repository.CartRepo
	productRepo *repository.ProductRepo
}

func NewCartHandler(cart *repository.CartRepo, product *repository.ProductRepo) *CartHandler {
	return &CartHandler{cartRepo: cart, productRepo: product}
}

// GET /cart
func (h *CartHandler) Get(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	cart, err := h.cartRepo.GetOrCreate(r.Context(), userID)
	if err != nil {
		apierror.InternalError(w)
		return
	}

	items, err := h.cartRepo.GetItems(r.Context(), cart.ID)
	if err != nil {
		apierror.InternalError(w, err)
		return
	}
	if items == nil {
		items = []models.CartItem{}
	}
	// Enrich items with product info
	for i, item := range items {
		p, err := h.productRepo.GetByID(r.Context(), item.ProductID)
		if err == nil {
			imgs, _ := h.productRepo.GetImages(r.Context(), p.ID)
			p.Images = imgs
			items[i].Product = p
		}
	}
	cart.Items = items

	var subtotal int
	for _, item := range items {
		subtotal += item.PriceCentsSnapshot * item.Quantity
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"cart":           cart,
		"subtotal_cents": subtotal,
	})
}

// POST /cart/items
func (h *CartHandler) AddItem(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	var req struct {
		ProductID string `json:"product_id"`
		Quantity  int    `json:"quantity"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.ProductID == "" || req.Quantity <= 0 || req.Quantity > maxItemQuantity {
		apierror.BadRequest(w, "product_id and quantity (1-99) are required")
		return
	}
	if _, err := uuid.Parse(req.ProductID); err != nil {
		apierror.NotFound(w, "product")
		return
	}
	product, err := h.productRepo.GetByID(r.Context(), req.ProductID)
	if err != nil || !product.IsActive {
		apierror.NotFound(w, "product")
		return
	}

	cart, err := h.cartRepo.GetOrCreate(r.Context(), userID)
	if err != nil {
		apierror.InternalError(w)
		return
	}

	item, err := h.cartRepo.AddItem(r.Context(), cart.ID, req.ProductID, req.Quantity, product.PriceCents)
	if err != nil {
		apierror.InternalError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(item)
}

// PUT /cart/items/{id}
func (h *CartHandler) UpdateItem(w http.ResponseWriter, r *http.Request) {
	itemID := chi.URLParam(r, "id")
	var req struct {
		Quantity int `json:"quantity"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Quantity <= 0 || req.Quantity > maxItemQuantity {
		apierror.BadRequest(w, "quantity must be between 1 and 99")
		return
	}
	if _, err := uuid.Parse(itemID); err != nil {
		apierror.NotFound(w, "cart item")
		return
	}
	item, err := h.cartRepo.UpdateItem(r.Context(), middleware.GetUserID(r), itemID, req.Quantity)
	if errors.Is(err, repository.ErrNotFound) {
		apierror.NotFound(w, "cart item")
		return
	}
	if err != nil {
		apierror.InternalError(w, err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(item)
}

// DELETE /cart/items/{id}
func (h *CartHandler) RemoveItem(w http.ResponseWriter, r *http.Request) {
	itemID := chi.URLParam(r, "id")
	if _, err := uuid.Parse(itemID); err != nil {
		apierror.NotFound(w, "cart item")
		return
	}
	err := h.cartRepo.RemoveItem(r.Context(), middleware.GetUserID(r), itemID)
	if errors.Is(err, repository.ErrNotFound) {
		apierror.NotFound(w, "cart item")
		return
	}
	if err != nil {
		apierror.InternalError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
