export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

/**
 * Central fetch wrapper.
 * - Credentials: 'include' ensures httpOnly cookies are sent automatically.
 * - No manual Authorization header — the server reads from the cookie.
 * - On 401, attempts one silent token refresh before failing.
 */
async function request<T>(
    path: string,
    options: RequestInit = {},
    retry = true,
): Promise<T> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
    };

    try {
        const res = await fetch(`${API_URL}${path}`, {
            ...options,
            headers,
            credentials: 'include',   // ← sends httpOnly cookies automatically
        });

        // Session expired → try a silent refresh once
        if (res.status === 401 && retry && path !== '/auth/refresh') {
            const refreshed = await fetch(`${API_URL}/auth/refresh`, {
                method: 'POST',
                credentials: 'include',
            });
            if (refreshed.ok) {
                return request<T>(path, options, false);
            }
            throw new Error('SESSION_EXPIRED');
        }

        if (!res.ok) {
            const contentType = res.headers.get('content-type');
            let errorMessage = 'Request failed';

            try {
                if (contentType && contentType.includes('application/json')) {
                    const errorData = await res.json();
                    errorMessage = errorData.message || errorData.error || errorMessage;
                } else {
                    const text = await res.text();
                    errorMessage = text || errorMessage;
                }
            } catch (e) {
                console.error('Failed to parse error response:', e);
            }

            console.error(`API Error: ${options.method || 'GET'} ${path} - Status: ${res.status} - Message: ${errorMessage}`);
            throw new Error(errorMessage);
        }

        if (res.status === 204) return undefined as T;
        return res.json();
    } catch (err) {
        if (err instanceof Error && err.message === 'SESSION_EXPIRED') {
            throw err;
        }
        // Log network errors or other unexpected issues
        console.error(`Fetch error for ${path}:`, err);
        throw err;
    }
}

// ─── Auth ───────────────────────────────────────────────────
export const api = {
    auth: {
        register: (email: string, password: string) =>
            request<{ user: User }>('/auth/register', {
                method: 'POST', body: JSON.stringify({ email, password }),
            }),
        login: (email: string, password: string) =>
            request<{ user: User }>('/auth/login', {
                method: 'POST', body: JSON.stringify({ email, password }),
            }),
        adminLogin: (email: string, password: string) =>
            request<{ user: User }>('/auth/admin/login', {
                method: 'POST', body: JSON.stringify({ email, password }),
            }),
        logout: () =>
            request<void>('/auth/logout', { method: 'POST' }),
        refresh: () =>
            request<{ user: User }>('/auth/refresh', { method: 'POST' }),
        me: () =>
            request<User>(`/me?_t=${Date.now()}`),
    },

    // ─── Products ──────────────────────────────────────────────
    products: {
        list: (params?: { category_id?: string; category_slug?: string; q?: string; limit?: number; offset?: number; sort?: string; is_active?: boolean | 'all' }) => {
            const qs = new URLSearchParams();
            if (params?.category_id) qs.set('category_id', params.category_id);
            if (params?.category_slug) qs.set('category_slug', params.category_slug);
            if (params?.q) qs.set('q', params.q);
            if (params?.limit) qs.set('limit', String(params.limit));
            if (params?.offset) qs.set('offset', String(params.offset));
            if (params?.sort) qs.set('sort', params.sort);
            if (params?.is_active !== undefined) qs.set('is_active', String(params.is_active));
            return request<{ data: Product[]; total: number; limit: number; offset: number }>(
                `/products?${qs}`
            );
        },
        get: (id: string) => request<Product>(`/products/${id}`),
        reviews: (id: string) => request<{ reviews: Review[] }>(`/products/${id}/reviews`),
    },

    // ─── Categories / Brands ───────────────────────────────────
    categories: {
        list: (params?: { sort?: string }) => {
            const qs = new URLSearchParams();
            if (params?.sort) qs.set('sort', params.sort);
            return request<Category[]>(`/categories?${qs}`);
        },
    },
    brands: {
        list: () => request<Brand[]>('/brands'),
    },

    // ─── Cart ──────────────────────────────────────────────────
    cart: {
        get: () => request<{ cart: Cart; subtotal_cents: number }>('/cart'),
        addItem: (product_id: string, quantity: number) =>
            request<CartItem>('/cart/items', { method: 'POST', body: JSON.stringify({ product_id, quantity }) }),
        updateItem: (id: string, quantity: number) =>
            request<CartItem>(`/cart/items/${id}`, { method: 'PUT', body: JSON.stringify({ quantity }) }),
        removeItem: (id: string) => request<void>(`/cart/items/${id}`, { method: 'DELETE' }),
    },

    // ─── Wishlist ──────────────────────────────────────────────
    wishlist: {
        get: () => request<Wishlist>('/wishlist'),
        addItem: (product_id: string) =>
            request<WishlistItem>('/wishlist/items', { method: 'POST', body: JSON.stringify({ product_id }) }),
        removeItem: (id: string) => request<void>(`/wishlist/items/${id}`, { method: 'DELETE' }),
    },

    // ─── Orders ────────────────────────────────────────────────
    orders: {
        checkout: (body: { customer_name: string; shipping_address: string; customer_phone?: string; payment_method_id?: string }) =>
            request<Order>('/orders/checkout', { method: 'POST', body: JSON.stringify(body) }),
        list: () => request<Order[]>('/orders'),
        get: (id: string) => request<Order>(`/orders/${id}`),
    },

    // ─── Payment methods ───────────────────────────────────────
    paymentMethods: {
        list: () => request<PaymentMethod[]>('/payment-methods'),
    },

    // ─── Banners ──────────────────────────────────────────────
    banners: {
        list: async () => {
            const res = await request<Banner[] | { value?: Banner[]; data?: Banner[] } | null>('/banners');
            // Backend might return the array directly, or wrap it in an object like { value: [...] } or { data: [...] }
            if (Array.isArray(res)) return res;
            if (res && Array.isArray(res.value)) return res.value;
            if (res && Array.isArray(res.data)) return res.data;
            return [] as Banner[];
        },
    },

    // ─── Admin ─────────────────────────────────────────────────
    admin: {
        dashboard: () => request<DashboardStats>('/admin/dashboard'),
        orders: (limit = 50, offset = 0) =>
            request<Order[]>(`/admin/orders?limit=${limit}&offset=${offset}`),
        updateOrderStatus: (id: string, status: string, note?: string) =>
            request<Order>(`/admin/orders/${id}/status`, { method: 'PUT', body: JSON.stringify({ status, note }) }),

        // Products
        createProduct: (body: Partial<Product> & { stock?: number }) =>
            request<Product>('/admin/products', { method: 'POST', body: JSON.stringify(body) }),
        updateProduct: (id: string, body: Partial<Product> & { stock?: number }) =>
            request<Product>(`/admin/products/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
        deleteProduct: (id: string, force?: boolean) => request<void>(`/admin/products/${id}${force ? '?force=true' : ''}`, { method: 'DELETE' }),
        setProductImages: (id: string, images: { path: string; alt_text: string; sort_order: number }[]) =>
            request<ProductImage[]>(`/admin/products/${id}/images`, { method: 'PUT', body: JSON.stringify({ images }) }),

        // Categories
        createCategory: (name: string, slug: string, image_url?: string) =>
            request<Category>('/admin/categories', { method: 'POST', body: JSON.stringify({ name, slug, image_url }) }),
        updateCategory: (id: string, name: string, slug: string, image_url?: string) =>
            request<Category>(`/admin/categories/${id}`, { method: 'PUT', body: JSON.stringify({ name, slug, image_url }) }),
        deleteCategory: (id: string) => request<void>(`/admin/categories/${id}`, { method: 'DELETE' }),

        adjustInventory: (product_id: string, delta: number, reason: string) =>
            request('/admin/inventory/adjust', { method: 'POST', body: JSON.stringify({ product_id, delta, reason }) }),
        auditLogs: () => request<AuditLog[]>('/admin/audit-logs'),

        // Banners
        banners: {
            list: () => request<Banner[]>('/admin/banners'),
            create: (body: Partial<Banner>) =>
                request<Banner>('/admin/banners', { method: 'POST', body: JSON.stringify(body) }),
            toggle: (id: string, is_active: boolean) =>
                request<void>(`/admin/banners/${id}/toggle`, { method: 'PUT', body: JSON.stringify({ is_active }) }),
            delete: (id: string) => request<void>(`/admin/banners/${id}`, { method: 'DELETE' }),
        },

        // Settings
        settings: {
            list: () => request<Setting[]>('/admin/settings'),
            update: (key: string, value: string) =>
                request<void>('/admin/settings', { method: 'PUT', body: JSON.stringify({ key, value }) }),
        },
    },

    // ─── Public Settings ───────────────────────────────────────
    settings: {
        get: (key: string) => request<{ key: string; value: string }>(`/settings/${key}`),
    },
};

// ─── Types ─────────────────────────────────────────────────
export interface User {
    id: string; email: string; user_id: string; role: string; created_at: string;
}
export interface Product {
    id: string; category_id?: string; name: string; slug: string;
    description?: string; price_cents: number; currency: string;
    is_active: boolean; created_at: string; updated_at: string;
    stock?: number;
    images?: ProductImage[]; variants?: ProductVariant[]; category?: Category;
}
export interface ProductImage { id: string; path: string; alt_text?: string; sort_order: number; }
export interface ProductVariant { id: string; sku: string; name?: string; is_active: boolean; }
export interface Category { id: string; name: string; slug: string; image_url?: string; }
export interface Brand { id: string; name: string; slug: string; }
export interface Review { id: string; product_id: string; user_id?: string; rating: number; title?: string; body?: string; created_at: string; }
export interface Cart { id: string; user_id?: string; status: string; items: CartItem[]; }
export interface CartItem { id: string; cart_id: string; product_id: string; quantity: number; price_cents_snapshot: number; product?: Product; }
export interface Wishlist { id: string; user_id?: string; name: string; items: WishlistItem[]; }
export interface WishlistItem { id: string; wishlist_id: string; product_id: string; product?: Product; created_at: string; }
export interface Order {
    id: string; user_id?: string; status: string; subtotal_cents: number;
    shipping_cents: number; total_cents: number; currency: string;
    customer_name: string; customer_phone?: string; shipping_address: string;
    created_at: string; items?: OrderItem[];
}
export interface OrderItem { id: string; product_id: string; product_name_snapshot: string; unit_price_cents_snapshot: number; quantity: number; line_total_cents: number; }
export interface PaymentMethod { id: string; name: string; }
export interface DashboardStats { total_orders: number; pending_orders: number; total_revenue_cents: number; low_stock_count: number; total_customers: number; }
export interface AuditLog { id: string; action: string; entity_type: string; actor_user_id?: string; created_at: string; }
export interface Setting { key: string; value: string; updated_at: string; }
export interface Banner {
    id: string;
    image_url: string;
    link_url?: string;
    title?: string;
    description?: string;
    tag?: string;
    is_active: boolean;
    created_at: string;
}
