# ShopX Frontend

Next.js (App Router) storefront and admin panel for the ShopX API.
See the [root README](../README.md) for the full project overview.

## Setup

```bash
cp .env.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:8080
npm install
npm run dev                  # http://localhost:3000
```

The API must be running and must list this origin in `CORS_ORIGINS`.

## Structure

- `app/`: routes (storefront pages, `admin/` panel)
- `components/`: shared UI (navbar, product cards, carousels)
- `context/`: auth, cart, wishlist, theme and toast providers
- `lib/api.ts`: typed API client (cookie auth with silent token refresh)

## Scripts

| Command         | Description |
|-----------------|-------------|
| `npm run dev`   | Dev server |
| `npm run build` | Production build |
| `npm run lint`  | ESLint |
