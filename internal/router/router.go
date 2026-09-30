package router

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/hadiafyouni/ecommerce/internal/config"
	"github.com/hadiafyouni/ecommerce/internal/handler"
	"github.com/hadiafyouni/ecommerce/internal/middleware"
	"github.com/hadiafyouni/ecommerce/internal/service"
)

func New(
	authHandler *handler.AuthHandler,
	productHandler *handler.ProductHandler,
	cartHandler *handler.CartHandler,
	orderHandler *handler.OrderHandler,
	adminHandler *handler.AdminHandler,
	authSvc *service.AuthService,
	cfg *config.Config,
) *chi.Mux {
	r := chi.NewRouter()

	// ── Global middleware (order matters) ──────────────────────────────────
	r.Use(chiMiddleware.RequestID)
	r.Use(middleware.SecurityHeaders(cfg.IsProduction())) // security headers on every response
	r.Use(middleware.Recover)
	r.Use(middleware.Logger)
	r.Use(middleware.Cors(cfg.CORSOrigins))
	r.Use(middleware.MaxBodySize(1 << 20)) // 1 MB request bodies

	// ── Health ─────────────────────────────────────────────────────────────
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(200)
		w.Write([]byte(`{"status":"ok"}`))
	})

	// ── Auth (rate-limited: 10 req/min per IP) ─────────────────────────────
	authLimiter := middleware.RateLimit(10, time.Minute, cfg.TrustProxy)
	r.Group(func(r chi.Router) {
		r.Use(authLimiter)
		r.Post("/auth/register", authHandler.Register)
		r.Post("/auth/login", authHandler.Login)
		r.Post("/auth/admin/login", authHandler.AdminLogin)
		r.Post("/auth/refresh", authHandler.Refresh)
	})

	// Logout doesn't need rate limiting (just clears cookies)
	r.Post("/auth/logout", authHandler.Logout)

	// ── Public read routes ─────────────────────────────────────────────────
	// OptionalAuth lets admins list inactive products through the same endpoint.
	r.With(middleware.OptionalAuth(authSvc)).Get("/products", productHandler.List)
	r.Get("/products/{id}", productHandler.GetByID)
	r.Get("/products/{id}/reviews", productHandler.GetReviews)
	r.Get("/categories", productHandler.ListCategories)
	r.Get("/brands", productHandler.ListBrands)
	r.Get("/banners", adminHandler.ListActiveBanners)
	r.Get("/settings/{key}", adminHandler.GetPublicSetting)

	// ── Authenticated routes ───────────────────────────────────────────────
	r.Group(func(r chi.Router) {
		r.Use(middleware.Auth(authSvc))

		r.Get("/me", adminHandler.GetProfile)

		// Cart
		r.Get("/cart", cartHandler.Get)
		r.Post("/cart/items", cartHandler.AddItem)
		r.Put("/cart/items/{id}", cartHandler.UpdateItem)
		r.Delete("/cart/items/{id}", cartHandler.RemoveItem)

		// Orders
		r.Post("/orders/checkout", orderHandler.Checkout)
		r.Get("/orders", orderHandler.ListMine)
		r.Get("/orders/{id}", orderHandler.GetByID)

		// Wishlist
		r.Get("/wishlist", adminHandler.GetWishlist)
		r.Post("/wishlist/items", adminHandler.AddWishlistItem)
		r.Delete("/wishlist/items/{id}", adminHandler.RemoveWishlistItem)

		// Addresses
		r.Get("/addresses", adminHandler.GetAddresses)
		r.Post("/addresses", adminHandler.CreateAddress)
		r.Delete("/addresses/{id}", adminHandler.DeleteAddress)

		// Notifications & payment methods
		r.Get("/notifications", adminHandler.GetNotifications)
		r.Get("/inventory/{productId}", adminHandler.GetInventory)
		r.Get("/payment-methods", adminHandler.PaymentMethods)
	})

	// ── Admin routes ───────────────────────────────────────────────────────
	r.Group(func(r chi.Router) {
		r.Use(middleware.Auth(authSvc))
		r.Use(middleware.AdminOnly)

		r.Post("/admin/products", productHandler.Create)
		r.Put("/admin/products/{id}", productHandler.Update)
		r.Delete("/admin/products/{id}", productHandler.Delete)
		r.Put("/admin/products/{id}/images", productHandler.SetProductImages)

		r.Post("/admin/categories", productHandler.CreateCategory)
		r.Put("/admin/categories/{id}", productHandler.UpdateCategory)
		r.Delete("/admin/categories/{id}", productHandler.DeleteCategory)

		r.Get("/admin/orders", orderHandler.AdminList)
		r.Put("/admin/orders/{id}/status", orderHandler.UpdateStatus)

		r.Post("/admin/inventory/adjust", adminHandler.AdjustInventory)

		r.Get("/admin/dashboard", adminHandler.Dashboard)
		r.Get("/admin/audit-logs", adminHandler.AuditLogs)

		// Banners
		r.Get("/admin/banners", adminHandler.ListAllBanners)
		r.Post("/admin/banners", adminHandler.CreateBanner)
		r.Put("/admin/banners/{id}/toggle", adminHandler.ToggleBanner)
		r.Delete("/admin/banners/{id}", adminHandler.DeleteBanner)

		r.Get("/admin/settings", adminHandler.GetSettings)
		r.Put("/admin/settings", adminHandler.UpdateSetting)
	})

	return r
}
