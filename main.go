package main

import (
	"context"
	"errors"
	"fmt"
	stdlog "log"
	"net/http"
	"os/signal"
	"syscall"
	"time"

	"github.com/hadiafyouni/ecommerce/internal/config"
	"github.com/hadiafyouni/ecommerce/internal/db"
	"github.com/hadiafyouni/ecommerce/internal/handler"
	applogger "github.com/hadiafyouni/ecommerce/internal/logger"
	"github.com/hadiafyouni/ecommerce/internal/repository"
	"github.com/hadiafyouni/ecommerce/internal/router"
	"github.com/hadiafyouni/ecommerce/internal/service"
	"github.com/rs/zerolog/log"
)

func main() {
	// Config
	cfg, err := config.Load()
	if err != nil {
		stdlog.Fatalf("config: %v", err)
	}

	// Logger
	applogger.Init(cfg.Env)

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	// Database
	pool, err := db.NewPool(cfg)
	if err != nil {
		log.Fatal().Err(err).Msg("failed to connect to database")
	}
	defer pool.Close()
	log.Info().Str("env", cfg.Env).Msg("database connected")

	// Migrations
	if err := db.Migrate(ctx, pool); err != nil {
		log.Fatal().Err(err).Msg("migration failed")
	}

	// Repositories
	userRepo := repository.NewUserRepo(pool)
	productRepo := repository.NewProductRepo(pool)
	categoryRepo := repository.NewCategoryRepo(pool)
	brandRepo := repository.NewBrandRepo(pool)
	cartRepo := repository.NewCartRepo(pool)
	orderRepo := repository.NewOrderRepo(pool)
	payRepo := repository.NewPaymentRepo(pool)
	invRepo := repository.NewInventoryRepo(pool)
	reviewRepo := repository.NewReviewRepo(pool)
	wishRepo := repository.NewWishlistRepo(pool)
	addrRepo := repository.NewAddressRepo(pool)
	notifRepo := repository.NewNotificationRepo(pool)
	adminRepo := repository.NewAdminRepo(pool)
	bannerRepo := repository.NewBannerRepo(pool)
	settingsRepo := repository.NewSettingsRepo(pool)

	// Services
	authSvc := service.NewAuthService(userRepo, cfg.JWTSecret, cfg.JWTRefreshSecret)
	orderSvc := service.NewOrderService(pool, orderRepo, cartRepo, productRepo, invRepo, payRepo)

	// Handlers
	authH := handler.NewAuthHandler(authSvc, cfg.IsProduction())
	productH := handler.NewProductHandler(productRepo, categoryRepo, brandRepo, invRepo, reviewRepo)
	cartH := handler.NewCartHandler(cartRepo, productRepo)
	orderH := handler.NewOrderHandler(orderSvc, orderRepo, cartRepo)
	adminH := handler.NewAdminHandler(adminRepo, userRepo, invRepo, reviewRepo, wishRepo, addrRepo, notifRepo, payRepo, productRepo, bannerRepo, settingsRepo)

	// Router
	r := router.New(authH, productH, cartH, orderH, adminH, authSvc, cfg)

	srv := &http.Server{
		Addr:              fmt.Sprintf(":%s", cfg.Port),
		Handler:           r,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	go func() {
		log.Info().Str("addr", srv.Addr).Msg("server starting")
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatal().Err(err).Msg("server error")
		}
	}()

	<-ctx.Done()
	log.Info().Msg("shutting down")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Error().Err(err).Msg("graceful shutdown failed")
	}
}
