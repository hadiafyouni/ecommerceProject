package db

import (
	"context"
	"embed"
	"fmt"
	"io/fs"
	"path"
	"sort"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog/log"
)

//go:embed migrations/*.sql
var migrationFS embed.FS

// Migrate applies every migration in migrations/ that has not run yet, in
// filename order. Each file runs in its own transaction and is recorded in
// schema_migrations so it is never applied twice.
//
// A database created before migrations were tracked (it already has a
// products table but no schema_migrations rows) is marked as up to date
// instead of having the baseline schema re-applied on top of it.
func Migrate(ctx context.Context, pool *pgxpool.Pool) error {
	if _, err := pool.Exec(ctx, `CREATE TABLE IF NOT EXISTS schema_migrations (
		version    TEXT PRIMARY KEY,
		applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
	)`); err != nil {
		return fmt.Errorf("create schema_migrations: %w", err)
	}

	files, err := fs.Glob(migrationFS, "migrations/*.sql")
	if err != nil {
		return err
	}
	sort.Strings(files)

	applied := map[string]bool{}
	rows, err := pool.Query(ctx, `SELECT version FROM schema_migrations`)
	if err != nil {
		return fmt.Errorf("read schema_migrations: %w", err)
	}
	versions, err := pgx.CollectRows(rows, pgx.RowTo[string])
	if err != nil {
		return fmt.Errorf("read schema_migrations: %w", err)
	}
	for _, v := range versions {
		applied[v] = true
	}

	if len(applied) == 0 {
		var legacy bool
		if err := pool.QueryRow(ctx, `SELECT to_regclass('public.products') IS NOT NULL`).Scan(&legacy); err != nil {
			return err
		}
		if legacy {
			log.Warn().Msg("existing untracked schema found; marking all migrations as applied")
			for _, f := range files {
				if _, err := pool.Exec(ctx, `INSERT INTO schema_migrations (version) VALUES ($1)`, path.Base(f)); err != nil {
					return err
				}
			}
			return nil
		}
	}

	for _, f := range files {
		version := path.Base(f)
		if applied[version] {
			continue
		}
		sql, err := migrationFS.ReadFile(f)
		if err != nil {
			return err
		}
		err = pgx.BeginFunc(ctx, pool, func(tx pgx.Tx) error {
			if _, err := tx.Exec(ctx, string(sql)); err != nil {
				return err
			}
			_, err := tx.Exec(ctx, `INSERT INTO schema_migrations (version) VALUES ($1)`, version)
			return err
		})
		if err != nil {
			return fmt.Errorf("apply %s: %w", version, err)
		}
		log.Info().Str("version", version).Msg("migration applied")
	}
	return nil
}
