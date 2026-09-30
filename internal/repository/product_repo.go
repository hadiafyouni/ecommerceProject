package repository

import (
	"context"
	"fmt"

	"github.com/hadiafyouni/ecommerce/internal/models"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ProductRepo struct {
	db *pgxpool.Pool
}

func NewProductRepo(db *pgxpool.Pool) *ProductRepo {
	return &ProductRepo{db: db}
}

type ProductFilter struct {
	CategoryID   *string
	CategorySlug *string
	Search       *string
	IsActive     *bool
	Limit        int
	Offset       int
	Sort         string
}

func (r *ProductRepo) List(ctx context.Context, f ProductFilter) ([]models.Product, int, error) {
	if f.Limit == 0 {
		f.Limit = 20
	}
	base := `SELECT p.id, p.category_id, p.name, p.slug, p.description, p.price_cents, p.currency, p.is_active, p.created_at, p.updated_at, i.stock
	         FROM products p
	         LEFT JOIN inventory i ON p.id = i.product_id`

	if f.CategorySlug != nil {
		base += ` INNER JOIN categories c ON p.category_id = c.id`
	}

	base += ` WHERE 1=1`

	args := []interface{}{}
	i := 1
	if f.IsActive != nil {
		base += fmt.Sprintf(" AND p.is_active=$%d", i)
		args = append(args, *f.IsActive)
		i++
	}
	if f.CategoryID != nil {
		base += fmt.Sprintf(" AND p.category_id=$%d", i)
		args = append(args, *f.CategoryID)
		i++
	}
	if f.CategorySlug != nil {
		base += fmt.Sprintf(" AND c.slug=$%d", i)
		args = append(args, *f.CategorySlug)
		i++
	}
	if f.Search != nil {
		base += fmt.Sprintf(" AND name ILIKE $%d", i)
		args = append(args, "%"+*f.Search+"%")
		i++
	}

	countQ := "SELECT COUNT(*) FROM (" + base + ") sub"
	var total int
	r.db.QueryRow(ctx, countQ, args...).Scan(&total)

	orderClause := "ORDER BY created_at DESC"
	if f.Sort == "price_asc" {
		orderClause = "ORDER BY price_cents ASC"
	} else if f.Sort == "price_desc" {
		orderClause = "ORDER BY price_cents DESC"
	} else if f.Sort == "sales_desc" {
		orderClause = "ORDER BY COALESCE((SELECT SUM(quantity) FROM order_items oi WHERE oi.product_id = p.id), 0) DESC, created_at DESC"
	}

	base += fmt.Sprintf(" %s LIMIT $%d OFFSET $%d", orderClause, i, i+1)
	args = append(args, f.Limit, f.Offset)

	rows, err := r.db.Query(ctx, base, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("list products: %w", err)
	}
	defer rows.Close()

	var products []models.Product
	for rows.Next() {
		var p models.Product
		if err := rows.Scan(&p.ID, &p.CategoryID, &p.Name, &p.Slug, &p.Description,
			&p.PriceCents, &p.Currency, &p.IsActive, &p.CreatedAt, &p.UpdatedAt, &p.Stock); err != nil {
			return nil, 0, err
		}
		products = append(products, p)
	}
	return products, total, nil
}

func (r *ProductRepo) GetByID(ctx context.Context, id string) (*models.Product, error) {
	q := `SELECT id, category_id, name, slug, description, price_cents, currency, is_active, created_at, updated_at FROM products WHERE id=$1`
	var p models.Product
	err := r.db.QueryRow(ctx, q, id).Scan(&p.ID, &p.CategoryID, &p.Name, &p.Slug, &p.Description,
		&p.PriceCents, &p.Currency, &p.IsActive, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("get product by id: %w", err)
	}
	return &p, nil
}

func (r *ProductRepo) GetBySlug(ctx context.Context, slug string) (*models.Product, error) {
	q := `SELECT id, category_id, name, slug, description, price_cents, currency, is_active, created_at, updated_at FROM products WHERE slug=$1`
	var p models.Product
	err := r.db.QueryRow(ctx, q, slug).Scan(&p.ID, &p.CategoryID, &p.Name, &p.Slug, &p.Description,
		&p.PriceCents, &p.Currency, &p.IsActive, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("get product by slug: %w", err)
	}
	return &p, nil
}

func (r *ProductRepo) GetImages(ctx context.Context, productID string) ([]models.ProductImage, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, product_id, path, alt_text, sort_order, created_at FROM product_images WHERE product_id=$1 ORDER BY sort_order`, productID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var imgs []models.ProductImage
	for rows.Next() {
		var img models.ProductImage
		rows.Scan(&img.ID, &img.ProductID, &img.Path, &img.AltText, &img.SortOrder, &img.CreatedAt)
		imgs = append(imgs, img)
	}
	return imgs, nil
}

func (r *ProductRepo) GetVariants(ctx context.Context, productID string) ([]models.ProductVariant, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, product_id, sku, name, is_active, created_at FROM product_variants WHERE product_id=$1`, productID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var variants []models.ProductVariant
	for rows.Next() {
		var v models.ProductVariant
		rows.Scan(&v.ID, &v.ProductID, &v.SKU, &v.Name, &v.IsActive, &v.CreatedAt)
		variants = append(variants, v)
	}
	return variants, nil
}

func (r *ProductRepo) Create(ctx context.Context, categoryID *string, name, slug, description *string, priceCents int, currency string) (*models.Product, error) {
	q := `INSERT INTO products (id, category_id, name, slug, description, price_cents, currency, is_active, created_at, updated_at)
	      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, true, now(), now())
	      RETURNING id, category_id, name, slug, description, price_cents, currency, is_active, created_at, updated_at`
	var p models.Product
	err := r.db.QueryRow(ctx, q, categoryID, name, slug, description, priceCents, currency).
		Scan(&p.ID, &p.CategoryID, &p.Name, &p.Slug, &p.Description, &p.PriceCents, &p.Currency, &p.IsActive, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("create product: %w", err)
	}
	return &p, nil
}

func (r *ProductRepo) Update(ctx context.Context, id string, categoryID, name, slug, description *string, priceCents *int, isActive *bool) (*models.Product, error) {
	q := `UPDATE products SET
	      category_id = COALESCE($1, category_id),
	      name = COALESCE($2, name),
	      slug = COALESCE($3, slug),
	      description = COALESCE($4, description),
	      price_cents = COALESCE($5, price_cents),
	      is_active = COALESCE($6, is_active),
	      updated_at = now()
	      WHERE id=$7
	      RETURNING id, category_id, name, slug, description, price_cents, currency, is_active, created_at, updated_at`
	var p models.Product
	err := r.db.QueryRow(ctx, q, categoryID, name, slug, description, priceCents, isActive, id).
		Scan(&p.ID, &p.CategoryID, &p.Name, &p.Slug, &p.Description, &p.PriceCents, &p.Currency, &p.IsActive, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("update product: %w", err)
	}
	return &p, nil
}

func (r *ProductRepo) Delete(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx, `UPDATE products SET is_active=false, updated_at=now() WHERE id=$1`, id)
	return err
}

func (r *ProductRepo) ForceDelete(ctx context.Context, id string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// 1. Nullify references in order_items
	_, err = tx.Exec(ctx, `UPDATE order_items SET product_id = NULL WHERE product_id = $1`, id)
	if err != nil {
		return err
	}

	// 2. Delete from other tables
	_, err = tx.Exec(ctx, `DELETE FROM inventory WHERE product_id = $1`, id)
	if err != nil {
		return err
	}
	_, err = tx.Exec(ctx, `DELETE FROM product_images WHERE product_id = $1`, id)
	if err != nil {
		return err
	}
	_, err = tx.Exec(ctx, `DELETE FROM product_variants WHERE product_id = $1`, id)
	if err != nil {
		return err
	}
	_, err = tx.Exec(ctx, `DELETE FROM cart_items WHERE product_id = $1`, id)
	if err != nil {
		return err
	}
	_, err = tx.Exec(ctx, `DELETE FROM wishlist_items WHERE product_id = $1`, id)
	if err != nil {
		return err
	}

	// 3. Final HARD delete
	_, err = tx.Exec(ctx, `DELETE FROM products WHERE id = $1`, id)
	if err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func (r *ProductRepo) AddImage(ctx context.Context, productID, path, altText string, sortOrder int) (*models.ProductImage, error) {
	q := `INSERT INTO product_images (id, product_id, path, alt_text, sort_order, created_at)
	      VALUES (gen_random_uuid(), $1, $2, $3, $4, now())
	      RETURNING id, product_id, path, alt_text, sort_order, created_at`
	var img models.ProductImage
	err := r.db.QueryRow(ctx, q, productID, path, altText, sortOrder).
		Scan(&img.ID, &img.ProductID, &img.Path, &img.AltText, &img.SortOrder, &img.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("add product image: %w", err)
	}
	return &img, nil
}

func (r *ProductRepo) DeleteImage(ctx context.Context, imageID string) error {
	_, err := r.db.Exec(ctx, `DELETE FROM product_images WHERE id=$1`, imageID)
	return err
}

func (r *ProductRepo) DeleteImagesByProduct(ctx context.Context, productID string) error {
	_, err := r.db.Exec(ctx, `DELETE FROM product_images WHERE product_id=$1`, productID)
	return err
}

// NewImage is an image to attach to a product.
type NewImage struct {
	Path      string
	AltText   string
	SortOrder int
}

// ReplaceImages swaps all of a product's images in one transaction.
func (r *ProductRepo) ReplaceImages(ctx context.Context, productID string, images []NewImage) ([]models.ProductImage, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, `DELETE FROM product_images WHERE product_id=$1`, productID); err != nil {
		return nil, fmt.Errorf("delete images: %w", err)
	}
	result := make([]models.ProductImage, 0, len(images))
	for _, img := range images {
		var pi models.ProductImage
		err := tx.QueryRow(ctx,
			`INSERT INTO product_images (id, product_id, path, alt_text, sort_order, created_at)
			 VALUES (gen_random_uuid(), $1, $2, $3, $4, now())
			 RETURNING id, product_id, path, alt_text, sort_order, created_at`,
			productID, img.Path, img.AltText, img.SortOrder).
			Scan(&pi.ID, &pi.ProductID, &pi.Path, &pi.AltText, &pi.SortOrder, &pi.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("add image: %w", err)
		}
		result = append(result, pi)
	}
	return result, tx.Commit(ctx)
}
