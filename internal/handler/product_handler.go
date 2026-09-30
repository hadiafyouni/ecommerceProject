package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/hadiafyouni/ecommerce/internal/apierror"
	"github.com/hadiafyouni/ecommerce/internal/middleware"
	"github.com/hadiafyouni/ecommerce/internal/repository"
	"github.com/rs/zerolog/log"
)

type ProductHandler struct {
	productRepo   *repository.ProductRepo
	categoryRepo  *repository.CategoryRepo
	brandRepo     *repository.BrandRepo
	inventoryRepo *repository.InventoryRepo
	reviewRepo    *repository.ReviewRepo
}

func NewProductHandler(p *repository.ProductRepo, c *repository.CategoryRepo, b *repository.BrandRepo, i *repository.InventoryRepo, rv *repository.ReviewRepo) *ProductHandler {
	return &ProductHandler{productRepo: p, categoryRepo: c, brandRepo: b, inventoryRepo: i, reviewRepo: rv}
}

// GET /products
func (h *ProductHandler) List(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	filter := repository.ProductFilter{}
	filter.Limit, filter.Offset = pagination(r, 20, 100)

	if v := q.Get("category_id"); v != "" {
		filter.CategoryID = &v
	}
	if v := q.Get("category_slug"); v != "" {
		filter.CategorySlug = &v
	}
	if v := q.Get("q"); v != "" {
		filter.Search = &v
	}
	if v := q.Get("sort"); v != "" {
		filter.Sort = v
	}
	// Only admins may list inactive (hidden) products.
	if v := q.Get("is_active"); v != "" && middleware.GetRole(r) == "admin" {
		if v == "all" {
			filter.IsActive = nil
		} else {
			active, _ := strconv.ParseBool(v)
			filter.IsActive = &active
		}
	} else {
		// Default to showing only active products if not specified
		active := true
		filter.IsActive = &active
	}

	products, total, err := h.productRepo.List(r.Context(), filter)
	if err != nil {
		apierror.InternalError(w, err)
		return
	}

	// Enrich with images
	for i, p := range products {
		imgs, _ := h.productRepo.GetImages(r.Context(), p.ID)
		products[i].Images = imgs
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"data":   products,
		"total":  total,
		"limit":  filter.Limit,
		"offset": filter.Offset,
	})
}

// GET /products/{id_or_slug}
func (h *ProductHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	idOrSlug := chi.URLParam(r, "id")

	// Try parsing as UUID first
	if _, parseErr := uuid.Parse(idOrSlug); parseErr == nil {
		product, err := h.productRepo.GetByID(r.Context(), idOrSlug)
		if err != nil {
			apierror.NotFound(w, "product")
			return
		}
		product.Images, _ = h.productRepo.GetImages(r.Context(), product.ID)
		product.Variants, _ = h.productRepo.GetVariants(r.Context(), product.ID)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(product)
		return
	}

	// Otherwise treat it as a slug
	product, err := h.productRepo.GetBySlug(r.Context(), idOrSlug)
	if err != nil {
		apierror.NotFound(w, "product")
		return
	}
	product.Images, _ = h.productRepo.GetImages(r.Context(), product.ID)
	product.Variants, _ = h.productRepo.GetVariants(r.Context(), product.ID)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(product)
}

// POST /admin/products
func (h *ProductHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req struct {
		CategoryID  *string `json:"category_id"`
		Name        string  `json:"name"`
		Slug        string  `json:"slug"`
		Description *string `json:"description"`
		PriceCents  int     `json:"price_cents"`
		Currency    string  `json:"currency"`
		Stock       *int    `json:"stock"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		apierror.BadRequest(w, "invalid body")
		return
	}
	if req.Name == "" || req.Slug == "" || req.PriceCents <= 0 {
		apierror.BadRequest(w, "name, slug, and price_cents are required")
		return
	}
	if req.Stock != nil && *req.Stock < 0 {
		apierror.BadRequest(w, "stock cannot be negative")
		return
	}
	if req.Currency == "" {
		req.Currency = "USD"
	}
	product, err := h.productRepo.Create(r.Context(), req.CategoryID, &req.Name, &req.Slug, req.Description, req.PriceCents, req.Currency)
	if isUniqueViolation(err) {
		apierror.Conflict(w, "a product with this slug already exists")
		return
	}
	if err != nil {
		apierror.InternalError(w, err)
		return
	}

	// Update stock if provided
	if req.Stock != nil {
		if err := h.inventoryRepo.Set(r.Context(), product.ID, *req.Stock); err != nil {
			log.Error().Err(err).Str("product_id", product.ID).Msg("failed to set initial stock")
		}
		product.Stock = req.Stock
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(product)
}

// PUT /admin/products/{id}
func (h *ProductHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req struct {
		CategoryID  *string `json:"category_id"`
		Name        *string `json:"name"`
		Slug        *string `json:"slug"`
		Description *string `json:"description"`
		PriceCents  *int    `json:"price_cents"`
		IsActive    *bool   `json:"is_active"`
		Stock       *int    `json:"stock"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		apierror.BadRequest(w, "invalid body")
		return
	}
	if (req.Stock != nil && *req.Stock < 0) || (req.PriceCents != nil && *req.PriceCents <= 0) {
		apierror.BadRequest(w, "stock cannot be negative and price_cents must be positive")
		return
	}
	if _, err := uuid.Parse(id); err != nil {
		apierror.NotFound(w, "product")
		return
	}

	// Handle empty string as nil (to unset category)
	var catID *string
	if req.CategoryID != nil && *req.CategoryID == "" {
		catID = nil
	} else {
		catID = req.CategoryID
	}

	product, err := h.productRepo.Update(r.Context(), id, catID, req.Name, req.Slug, req.Description, req.PriceCents, req.IsActive)
	if isUniqueViolation(err) {
		apierror.Conflict(w, "a product with this slug already exists")
		return
	}
	if err != nil {
		apierror.NotFound(w, "product")
		return
	}

	// Update stock after the product is confirmed to exist.
	if req.Stock != nil {
		if err := h.inventoryRepo.Set(r.Context(), id, *req.Stock); err != nil {
			apierror.InternalError(w, err)
			return
		}
		product.Stock = req.Stock
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(product)
}

// DELETE /admin/products/{id}
func (h *ProductHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	force := r.URL.Query().Get("force") == "true"

	var err error
	if force {
		err = h.productRepo.ForceDelete(r.Context(), id)
	} else {
		err = h.productRepo.Delete(r.Context(), id)
	}

	if err != nil {
		apierror.InternalError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// GET /categories
func (h *ProductHandler) ListCategories(w http.ResponseWriter, r *http.Request) {
	sort := r.URL.Query().Get("sort")
	cats, err := h.categoryRepo.List(r.Context(), sort)
	if err != nil {
		apierror.InternalError(w)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(cats)
}

// GET /brands
func (h *ProductHandler) ListBrands(w http.ResponseWriter, r *http.Request) {
	brands, err := h.brandRepo.List(r.Context())
	if err != nil {
		apierror.InternalError(w)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(brands)
}

// GET /products/{id}/reviews
func (h *ProductHandler) GetReviews(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if _, err := uuid.Parse(id); err != nil {
		apierror.NotFound(w, "product")
		return
	}
	reviews, err := h.reviewRepo.ListByProduct(r.Context(), id)
	if err != nil {
		apierror.InternalError(w, err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"product_id": id, "reviews": reviews})
}

// Admin Category CRUD

// POST /admin/categories
func (h *ProductHandler) CreateCategory(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name     string  `json:"name"`
		Slug     string  `json:"slug"`
		ImageURL *string `json:"image_url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Name == "" || req.Slug == "" {
		apierror.BadRequest(w, "name and slug are required")
		return
	}
	cat, err := h.categoryRepo.Create(r.Context(), req.Name, req.Slug, req.ImageURL)
	if isUniqueViolation(err) {
		apierror.Conflict(w, "a category with this slug already exists")
		return
	}
	if err != nil {
		apierror.InternalError(w, err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(cat)
}

// PUT /admin/categories/{id}
func (h *ProductHandler) UpdateCategory(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req struct {
		Name     string  `json:"name"`
		Slug     string  `json:"slug"`
		ImageURL *string `json:"image_url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Name == "" || req.Slug == "" {
		apierror.BadRequest(w, "name and slug are required")
		return
	}
	cat, err := h.categoryRepo.Update(r.Context(), id, req.Name, req.Slug, req.ImageURL)
	if isUniqueViolation(err) {
		apierror.Conflict(w, "a category with this slug already exists")
		return
	}
	if err != nil {
		apierror.NotFound(w, "category")
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(cat)
}

// DELETE /admin/categories/{id}
func (h *ProductHandler) DeleteCategory(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.categoryRepo.Delete(r.Context(), id); err != nil {
		log.Error().Err(err).Str("category_id", id).Msg("delete category failed")
		apierror.InternalError(w)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// PUT /admin/products/{id}/images — batch set images (main + hover) by URL
func (h *ProductHandler) SetProductImages(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req struct {
		Images []struct {
			Path      string `json:"path"`
			AltText   string `json:"alt_text"`
			SortOrder int    `json:"sort_order"`
		} `json:"images"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		apierror.BadRequest(w, "invalid JSON")
		return
	}

	images := make([]repository.NewImage, 0, len(req.Images))
	for _, img := range req.Images {
		images = append(images, repository.NewImage{Path: img.Path, AltText: img.AltText, SortOrder: img.SortOrder})
	}
	result, err := h.productRepo.ReplaceImages(r.Context(), id, images)
	if err != nil {
		apierror.InternalError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}
