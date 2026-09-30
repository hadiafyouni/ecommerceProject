package repository

import (
	"context"

	"github.com/hadiafyouni/ecommerce/internal/models"
	"github.com/jackc/pgx/v5/pgxpool"
)

type BannerRepo struct {
	db *pgxpool.Pool
}

func NewBannerRepo(db *pgxpool.Pool) *BannerRepo {
	return &BannerRepo{db: db}
}

func (r *BannerRepo) ListActive(ctx context.Context) ([]models.Banner, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, image_url, link_url, title, description, tag, is_active, created_at
		FROM banners
		WHERE is_active = true
		ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var banners []models.Banner
	for rows.Next() {
		var b models.Banner
		if err := rows.Scan(&b.ID, &b.ImageURL, &b.LinkURL, &b.Title, &b.Description, &b.Tag, &b.IsActive, &b.CreatedAt); err != nil {
			return nil, err
		}
		banners = append(banners, b)
	}
	return banners, nil
}

func (r *BannerRepo) ListAll(ctx context.Context) ([]models.Banner, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, image_url, link_url, title, description, tag, is_active, created_at
		FROM banners
		ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var banners []models.Banner
	for rows.Next() {
		var b models.Banner
		if err := rows.Scan(&b.ID, &b.ImageURL, &b.LinkURL, &b.Title, &b.Description, &b.Tag, &b.IsActive, &b.CreatedAt); err != nil {
			return nil, err
		}
		banners = append(banners, b)
	}
	return banners, nil
}

func (r *BannerRepo) Create(ctx context.Context, b models.Banner) (*models.Banner, error) {
	err := r.db.QueryRow(ctx, `
		INSERT INTO banners (image_url, link_url, title, description, tag, is_active)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at
	`, b.ImageURL, b.LinkURL, b.Title, b.Description, b.Tag, b.IsActive).Scan(&b.ID, &b.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &b, nil
}

func (r *BannerRepo) Delete(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx, "DELETE FROM banners WHERE id = $1", id)
	return err
}

func (r *BannerRepo) ToggleActive(ctx context.Context, id string, isActive bool) error {
	_, err := r.db.Exec(ctx, "UPDATE banners SET is_active = $1 WHERE id = $2", isActive, id)
	return err
}
