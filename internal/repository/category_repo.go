package repository

import (
	"context"
	"fmt"

	"github.com/hadiafyouni/ecommerce/internal/models"
	"github.com/jackc/pgx/v5/pgxpool"
)

type CategoryRepo struct {
	db *pgxpool.Pool
}

func NewCategoryRepo(db *pgxpool.Pool) *CategoryRepo {
	return &CategoryRepo{db: db}
}

func (r *CategoryRepo) List(ctx context.Context, sort string) ([]models.Category, error) {
	q := `SELECT id, name, slug, image_url, created_at FROM categories ORDER BY name`

	if sort == "sales_desc" {
		q = `SELECT c.id, c.name, c.slug, c.image_url, c.created_at
			 FROM categories c
			 LEFT JOIN products p ON p.category_id = c.id
			 LEFT JOIN order_items oi ON oi.product_id = p.id
			 GROUP BY c.id
			 ORDER BY COALESCE(SUM(oi.quantity), 0) DESC, c.name`
	}

	rows, err := r.db.Query(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var cats []models.Category
	for rows.Next() {
		var c models.Category
		rows.Scan(&c.ID, &c.Name, &c.Slug, &c.ImageURL, &c.CreatedAt)
		cats = append(cats, c)
	}
	return cats, nil
}

func (r *CategoryRepo) GetByID(ctx context.Context, id string) (*models.Category, error) {
	var c models.Category
	err := r.db.QueryRow(ctx, `SELECT id, name, slug, image_url, created_at FROM categories WHERE id=$1`, id).
		Scan(&c.ID, &c.Name, &c.Slug, &c.ImageURL, &c.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("get category: %w", err)
	}
	return &c, nil
}

func (r *CategoryRepo) Create(ctx context.Context, name, slug string, imageURL *string) (*models.Category, error) {
	var c models.Category
	err := r.db.QueryRow(ctx,
		`INSERT INTO categories (id, name, slug, image_url, created_at) VALUES (gen_random_uuid(),$1,$2,$3,now()) RETURNING id, name, slug, image_url, created_at`,
		name, slug, imageURL).Scan(&c.ID, &c.Name, &c.Slug, &c.ImageURL, &c.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("create category: %w", err)
	}
	return &c, nil
}

func (r *CategoryRepo) Update(ctx context.Context, id, name, slug string, imageURL *string) (*models.Category, error) {
	var c models.Category
	err := r.db.QueryRow(ctx,
		`UPDATE categories SET name=$1, slug=$2, image_url=$3 WHERE id=$4 RETURNING id, name, slug, image_url, created_at`,
		name, slug, imageURL, id).Scan(&c.ID, &c.Name, &c.Slug, &c.ImageURL, &c.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("update category: %w", err)
	}
	return &c, nil
}

func (r *CategoryRepo) Delete(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx, `DELETE FROM categories WHERE id=$1`, id)
	return err
}

// BrandRepo
type BrandRepo struct{ db *pgxpool.Pool }

func NewBrandRepo(db *pgxpool.Pool) *BrandRepo { return &BrandRepo{db: db} }

func (r *BrandRepo) List(ctx context.Context) ([]models.Brand, error) {
	rows, err := r.db.Query(ctx, `SELECT id, name, slug, created_at FROM brands ORDER BY name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var brands []models.Brand
	for rows.Next() {
		var b models.Brand
		rows.Scan(&b.ID, &b.Name, &b.Slug, &b.CreatedAt)
		brands = append(brands, b)
	}
	return brands, nil
}
