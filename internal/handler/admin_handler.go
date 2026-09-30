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
	"github.com/rs/zerolog/log"
)

type AdminHandler struct {
	adminRepo    *repository.AdminRepo
	userRepo     *repository.UserRepo
	invRepo      *repository.InventoryRepo
	reviewRepo   *repository.ReviewRepo
	wishRepo     *repository.WishlistRepo
	addrRepo     *repository.AddressRepo
	notifRepo    *repository.NotificationRepo
	payRepo      *repository.PaymentRepo
	productRepo  *repository.ProductRepo
	bannerRepo   *repository.BannerRepo
	settingsRepo *repository.SettingsRepo
}

func NewAdminHandler(
	admin *repository.AdminRepo,
	user *repository.UserRepo,
	inv *repository.InventoryRepo,
	review *repository.ReviewRepo,
	wish *repository.WishlistRepo,
	addr *repository.AddressRepo,
	notif *repository.NotificationRepo,
	pay *repository.PaymentRepo,
	product *repository.ProductRepo,
	banner *repository.BannerRepo,
	settings *repository.SettingsRepo,
) *AdminHandler {
	return &AdminHandler{
		adminRepo: admin, userRepo: user, invRepo: inv, reviewRepo: review,
		wishRepo: wish, addrRepo: addr, notifRepo: notif, payRepo: pay,
		productRepo: product, bannerRepo: banner, settingsRepo: settings,
	}
}

// GET /admin/dashboard
func (h *AdminHandler) Dashboard(w http.ResponseWriter, r *http.Request) {
	stats, err := h.adminRepo.DashboardStats(r.Context())
	if err != nil {
		apierror.InternalError(w)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

// GET /admin/audit-logs
func (h *AdminHandler) AuditLogs(w http.ResponseWriter, r *http.Request) {
	limit, offset := pagination(r, 50, 200)
	logs, err := h.adminRepo.ListAuditLogs(r.Context(), limit, offset)
	if err != nil {
		apierror.InternalError(w)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(logs)
}

// GET /inventory/{productId}
func (h *AdminHandler) GetInventory(w http.ResponseWriter, r *http.Request) {
	productID := chi.URLParam(r, "productId")
	inv, err := h.invRepo.Get(r.Context(), productID)
	if err != nil {
		apierror.NotFound(w, "inventory")
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(inv)
}

// POST /admin/inventory/adjust
func (h *AdminHandler) AdjustInventory(w http.ResponseWriter, r *http.Request) {
	adminID := middleware.GetUserID(r)
	var req struct {
		ProductID string `json:"product_id"`
		Delta     int    `json:"delta"`
		Reason    string `json:"reason"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.ProductID == "" {
		apierror.BadRequest(w, "product_id, delta, and reason are required")
		return
	}
	if err := h.invRepo.Adjust(r.Context(), req.ProductID, req.Delta, req.Reason, &adminID); err != nil {
		apierror.InternalError(w)
		return
	}
	inv, _ := h.invRepo.Get(r.Context(), req.ProductID)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(inv)
}

// GET /me
func (h *AdminHandler) GetProfile(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	user, err := h.userRepo.GetAnyByUserID(r.Context(), userID)
	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	w.Header().Set("Pragma", "no-cache")
	w.Header().Set("Expires", "0")
	w.Header().Set("Content-Type", "application/json")

	if err != nil {
		log.Error().Err(err).Str("user_id", userID).Msg("failed to fetch user profile in /me endpoint")
		json.NewEncoder(w).Encode(map[string]string{"user_id": userID})
		return
	}
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":      user.ID,
		"email":   user.Email,
		"user_id": user.UserID,
		"role":    user.Role,
	})
}

// GET /notifications
func (h *AdminHandler) GetNotifications(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	notifs, err := h.notifRepo.ListByUser(r.Context(), userID)
	if err != nil {
		apierror.InternalError(w)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(notifs)
}

// GET /wishlist
func (h *AdminHandler) GetWishlist(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	wishlist, err := h.wishRepo.GetOrCreate(r.Context(), userID)
	if err != nil {
		apierror.InternalError(w)
		return
	}
	items, _ := h.wishRepo.GetItems(r.Context(), wishlist.ID)

	// Enrich items with product info
	for i := range items {
		p, err := h.productRepo.GetByID(r.Context(), items[i].ProductID)
		if err == nil {
			imgs, _ := h.productRepo.GetImages(r.Context(), p.ID)
			p.Images = imgs
			items[i].Product = p
		}
	}

	wishlist.Items = items
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(wishlist)
}

// POST /wishlist/items
func (h *AdminHandler) AddWishlistItem(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	var req struct {
		ProductID string `json:"product_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.ProductID == "" {
		apierror.BadRequest(w, "product_id is required")
		return
	}
	if _, err := uuid.Parse(req.ProductID); err != nil {
		apierror.NotFound(w, "product")
		return
	}
	if _, err := h.productRepo.GetByID(r.Context(), req.ProductID); err != nil {
		apierror.NotFound(w, "product")
		return
	}
	wishlist, err := h.wishRepo.GetOrCreate(r.Context(), userID)
	if err != nil {
		apierror.InternalError(w)
		return
	}
	item, err := h.wishRepo.AddItem(r.Context(), wishlist.ID, req.ProductID)
	if err != nil {
		apierror.InternalError(w)
		return
	}

	// Enrich the new item before returning
	p, err := h.productRepo.GetByID(r.Context(), item.ProductID)
	if err == nil {
		imgs, _ := h.productRepo.GetImages(r.Context(), p.ID)
		p.Images = imgs
		item.Product = p
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(item)
}

// DELETE /wishlist/items/{id}
func (h *AdminHandler) RemoveWishlistItem(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if _, err := uuid.Parse(id); err != nil {
		apierror.NotFound(w, "wishlist item")
		return
	}
	err := h.wishRepo.RemoveItem(r.Context(), middleware.GetUserID(r), id)
	if errors.Is(err, repository.ErrNotFound) {
		apierror.NotFound(w, "wishlist item")
		return
	}
	if err != nil {
		apierror.InternalError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// GET /addresses
func (h *AdminHandler) GetAddresses(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	addrs, err := h.addrRepo.ListByUser(r.Context(), userID)
	if err != nil {
		apierror.InternalError(w)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(addrs)
}

// POST /addresses
func (h *AdminHandler) CreateAddress(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	var req struct {
		Line1      string  `json:"line1"`
		Line2      *string `json:"line2"`
		City       string  `json:"city"`
		State      *string `json:"state"`
		PostalCode *string `json:"postal_code"`
		Country    string  `json:"country"`
		IsDefault  bool    `json:"is_default"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Line1 == "" || req.City == "" {
		apierror.BadRequest(w, "line1 and city are required")
		return
	}
	if req.Country == "" {
		req.Country = "LY"
	}
	addr, err := h.addrRepo.Create(r.Context(), userID, req.Line1, req.City, req.Country, req.Line2, req.State, req.PostalCode, req.IsDefault)
	if err != nil {
		apierror.InternalError(w)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(addr)
}

// DELETE /addresses/{id}
func (h *AdminHandler) DeleteAddress(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if _, err := uuid.Parse(id); err != nil {
		apierror.NotFound(w, "address")
		return
	}
	err := h.addrRepo.Delete(r.Context(), middleware.GetUserID(r), id)
	if errors.Is(err, repository.ErrNotFound) {
		apierror.NotFound(w, "address")
		return
	}
	if err != nil {
		apierror.InternalError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// GET /payments/methods
func (h *AdminHandler) PaymentMethods(w http.ResponseWriter, r *http.Request) {
	methods, err := h.payRepo.ListMethods(r.Context())
	if err != nil {
		apierror.InternalError(w)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(methods)
}

// ─── Banners ─────────────────────────────────────────────────────────────────

// GET /banners (public)
func (h *AdminHandler) ListActiveBanners(w http.ResponseWriter, r *http.Request) {
	banners, err := h.bannerRepo.ListActive(r.Context())
	if err != nil {
		apierror.InternalError(w)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(banners)
}

// GET /admin/banners
func (h *AdminHandler) ListAllBanners(w http.ResponseWriter, r *http.Request) {
	banners, err := h.bannerRepo.ListAll(r.Context())
	if err != nil {
		apierror.InternalError(w)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(banners)
}

// POST /admin/banners
func (h *AdminHandler) CreateBanner(w http.ResponseWriter, r *http.Request) {
	var req models.Banner
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.ImageURL == "" {
		apierror.BadRequest(w, "image_url is required")
		return
	}
	b, err := h.bannerRepo.Create(r.Context(), req)
	if err != nil {
		apierror.InternalError(w)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(b)
}

// PUT /admin/banners/{id}/toggle
func (h *AdminHandler) ToggleBanner(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req struct {
		IsActive bool `json:"is_active"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		apierror.BadRequest(w, "is_active is required")
		return
	}
	if err := h.bannerRepo.ToggleActive(r.Context(), id, req.IsActive); err != nil {
		apierror.InternalError(w)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// DELETE /admin/banners/{id}
func (h *AdminHandler) DeleteBanner(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.bannerRepo.Delete(r.Context(), id); err != nil {
		apierror.InternalError(w)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ─── Settings ────────────────────────────────────────────────────────────────

// GET /settings
func (h *AdminHandler) GetSettings(w http.ResponseWriter, r *http.Request) {
	settings, err := h.settingsRepo.List(r.Context())
	if err != nil {
		apierror.InternalError(w)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(settings)
}

// GET /settings/{key} (public)
func (h *AdminHandler) GetPublicSetting(w http.ResponseWriter, r *http.Request) {
	key := chi.URLParam(r, "key")
	val, err := h.settingsRepo.Get(r.Context(), key)
	if err != nil {
		apierror.NotFound(w, "setting")
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"key": key, "value": val})
}

// PUT /settings
func (h *AdminHandler) UpdateSetting(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Key   string `json:"key"`
		Value string `json:"value"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Key == "" {
		apierror.BadRequest(w, "key and value are required")
		return
	}
	if err := h.settingsRepo.Set(r.Context(), req.Key, req.Value); err != nil {
		apierror.InternalError(w)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
