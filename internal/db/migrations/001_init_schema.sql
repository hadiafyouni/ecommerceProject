-- Baseline schema for the ecommerce API.
-- Requires PostgreSQL 13+ (gen_random_uuid is built in).

CREATE TABLE address_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE addresses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    address_type_id uuid,
    line1 text NOT NULL,
    line2 text,
    city text NOT NULL,
    state text,
    postal_code text,
    country text DEFAULT 'LY'::text NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE admin_credentials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    user_id uuid NOT NULL,
    role text DEFAULT 'admin'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE api_keys (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    key_hash text NOT NULL,
    scopes text[] DEFAULT '{}'::text[] NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_used_at timestamp with time zone
);

CREATE TABLE audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_user_id uuid,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE banners (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    image_url text NOT NULL,
    link_url text,
    title text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    description text NOT NULL,
    tag text NOT NULL
);

CREATE TABLE brands (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE carriers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE cart_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cart_id uuid NOT NULL,
    product_id uuid NOT NULL,
    quantity integer NOT NULL,
    price_cents_snapshot integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cart_items_price_cents_snapshot_check CHECK ((price_cents_snapshot >= 0)),
    CONSTRAINT cart_items_quantity_check CHECK ((quantity > 0))
);

CREATE TABLE carts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT carts_status_check CHECK ((status = ANY (ARRAY['active'::text, 'converted'::text, 'abandoned'::text])))
);

CREATE TABLE categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    image_url text
);

CREATE TABLE coupon_redemptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    coupon_id uuid NOT NULL,
    order_id uuid,
    user_id uuid,
    redeemed_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE coupons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    promotion_id uuid,
    code text NOT NULL,
    discount_type text NOT NULL,
    discount_value integer NOT NULL,
    min_order_total_cents integer DEFAULT 0 NOT NULL,
    max_redemptions integer,
    per_user_limit integer,
    starts_at timestamp with time zone,
    ends_at timestamp with time zone,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT coupons_discount_type_check CHECK ((discount_type = ANY (ARRAY['PERCENT'::text, 'FIXED'::text]))),
    CONSTRAINT coupons_discount_value_check CHECK ((discount_value >= 0)),
    CONSTRAINT coupons_min_order_total_cents_check CHECK ((min_order_total_cents >= 0))
);

CREATE TABLE customer_credentials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    user_id uuid NOT NULL,
    role text DEFAULT 'customer'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE customer_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    first_name text,
    last_name text,
    phone text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE inventory (
    product_id uuid NOT NULL,
    stock integer DEFAULT 0 NOT NULL,
    reserved integer DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT inventory_reserved_check CHECK ((reserved >= 0)),
    CONSTRAINT inventory_stock_check CHECK ((stock >= 0))
);

CREATE TABLE inventory_adjustments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    delta integer NOT NULL,
    reason text NOT NULL,
    adjusted_by_user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE inventory_movements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    movement_type text NOT NULL,
    quantity integer NOT NULL,
    reference_type text,
    reference_id uuid,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT inventory_movements_movement_type_check CHECK ((movement_type = ANY (ARRAY['IN'::text, 'OUT'::text, 'RESERVE'::text, 'RELEASE'::text]))),
    CONSTRAINT inventory_movements_quantity_check CHECK ((quantity > 0))
);

CREATE TABLE notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    channel text NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    status text DEFAULT 'queued'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    sent_at timestamp with time zone,
    CONSTRAINT notifications_channel_check CHECK ((channel = ANY (ARRAY['email'::text, 'sms'::text, 'in_app'::text]))),
    CONSTRAINT notifications_status_check CHECK ((status = ANY (ARRAY['queued'::text, 'sent'::text, 'failed'::text, 'read'::text])))
);

CREATE TABLE order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    product_id uuid,
    product_name_snapshot text NOT NULL,
    unit_price_cents_snapshot integer NOT NULL,
    quantity integer NOT NULL,
    line_total_cents integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT order_items_line_total_cents_check CHECK ((line_total_cents >= 0)),
    CONSTRAINT order_items_quantity_check CHECK ((quantity > 0)),
    CONSTRAINT order_items_unit_price_cents_snapshot_check CHECK ((unit_price_cents_snapshot >= 0))
);

CREATE TABLE order_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    user_id uuid,
    note text NOT NULL,
    is_internal boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE order_status_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    old_status text,
    new_status text NOT NULL,
    changed_by_user_id uuid,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE order_taxes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    tax_rate_id uuid,
    tax_cents integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT order_taxes_tax_cents_check CHECK ((tax_cents >= 0))
);

CREATE TABLE orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    cart_id uuid,
    status text DEFAULT 'pending'::text NOT NULL,
    subtotal_cents integer DEFAULT 0 NOT NULL,
    shipping_cents integer DEFAULT 0 NOT NULL,
    total_cents integer DEFAULT 0 NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    customer_name text NOT NULL,
    customer_phone text,
    shipping_address text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT orders_shipping_cents_check CHECK ((shipping_cents >= 0)),
    CONSTRAINT orders_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'paid'::text, 'processing'::text, 'shipped'::text, 'delivered'::text, 'cancelled'::text, 'refunded'::text]))),
    CONSTRAINT orders_subtotal_cents_check CHECK ((subtotal_cents >= 0)),
    CONSTRAINT orders_total_cents_check CHECK ((total_cents >= 0))
);

CREATE TABLE outbox_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_type text NOT NULL,
    aggregate_type text NOT NULL,
    aggregate_id uuid NOT NULL,
    payload jsonb NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    processed_at timestamp with time zone,
    CONSTRAINT outbox_events_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'processed'::text, 'failed'::text])))
);

CREATE TABLE page_views (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    product_id uuid,
    path text NOT NULL,
    user_agent text,
    ip inet,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE payment_methods (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE payment_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    payment_id uuid NOT NULL,
    provider text,
    provider_reference text,
    status text NOT NULL,
    raw_payload jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    payment_method_id uuid,
    amount_cents integer NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT payments_amount_cents_check CHECK ((amount_cents >= 0)),
    CONSTRAINT payments_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'authorized'::text, 'captured'::text, 'failed'::text, 'refunded'::text, 'cancelled'::text])))
);

CREATE TABLE product_attribute_values (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    attribute_id uuid NOT NULL,
    value text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE product_attributes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE product_images (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    path text NOT NULL,
    alt_text text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE product_tags (
    product_id uuid NOT NULL,
    tag_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE product_variants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    sku text NOT NULL,
    name text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category_id uuid,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    price_cents integer NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT products_price_cents_check CHECK ((price_cents >= 0))
);

CREATE TABLE promotions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    starts_at timestamp with time zone,
    ends_at timestamp with time zone,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE refunds (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    payment_id uuid,
    return_id uuid,
    amount_cents integer NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT refunds_amount_cents_check CHECK ((amount_cents >= 0)),
    CONSTRAINT refunds_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'succeeded'::text, 'failed'::text, 'cancelled'::text])))
);

CREATE TABLE return_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    return_id uuid NOT NULL,
    order_item_id uuid NOT NULL,
    quantity integer NOT NULL,
    reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT return_items_quantity_check CHECK ((quantity > 0))
);

CREATE TABLE returns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    user_id uuid,
    status text DEFAULT 'requested'::text NOT NULL,
    reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT returns_status_check CHECK ((status = ANY (ARRAY['requested'::text, 'approved'::text, 'rejected'::text, 'received'::text, 'refunded'::text, 'closed'::text])))
);

CREATE TABLE reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    user_id uuid,
    rating integer NOT NULL,
    title text,
    body text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);

CREATE TABLE saved_admin_queries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    prompt text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE settings (
    key text NOT NULL,
    value text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE shipment_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shipment_id uuid NOT NULL,
    order_item_id uuid NOT NULL,
    quantity integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT shipment_items_quantity_check CHECK ((quantity > 0))
);

CREATE TABLE shipments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    shipping_method_id uuid,
    carrier_id uuid,
    tracking_number text,
    status text DEFAULT 'pending'::text NOT NULL,
    shipped_at timestamp with time zone,
    delivered_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT shipments_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'packed'::text, 'shipped'::text, 'delivered'::text, 'returned'::text, 'cancelled'::text])))
);

CREATE TABLE shipping_methods (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    base_cost_cents integer DEFAULT 0 NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT shipping_methods_base_cost_cents_check CHECK ((base_cost_cents >= 0))
);

CREATE TABLE tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE tax_rates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    country text NOT NULL,
    state text,
    rate_percent integer NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT tax_rates_rate_percent_check CHECK (((rate_percent >= 0) AND (rate_percent <= 100)))
);

CREATE VIEW v_failed_payments_last_7d AS
 SELECT id,
    order_id,
    amount_cents,
    currency,
    status,
    created_at
   FROM payments pay
  WHERE ((created_at >= (now() - '7 days'::interval)) AND (status = ANY (ARRAY['failed'::text, 'cancelled'::text])))
  ORDER BY created_at DESC;

CREATE VIEW v_low_stock_products AS
 SELECT p.id,
    p.name,
    i.stock AS quantity,
    5 AS low_stock_threshold
   FROM (products p
     JOIN inventory i ON ((p.id = i.product_id)))
  WHERE (i.stock <= 5);

CREATE VIEW v_orders_by_status_last_7d AS
 SELECT status,
    count(*) AS order_count,
    sum(total_cents) AS total_cents
   FROM orders o
  WHERE (created_at >= (now() - '7 days'::interval))
  GROUP BY status
  ORDER BY (count(*)) DESC;

CREATE VIEW v_top_products_last_7d AS
 SELECT p.id,
    p.name,
    p.slug,
    count(*) AS views
   FROM (page_views pv
     JOIN products p ON ((p.id = pv.product_id)))
  WHERE ((pv.created_at >= (now() - '7 days'::interval)) AND (pv.product_id IS NOT NULL))
  GROUP BY p.id, p.name, p.slug
  ORDER BY (count(*)) DESC, p.name;

CREATE TABLE variant_attribute_values (
    variant_id uuid NOT NULL,
    attribute_value_id uuid NOT NULL
);

CREATE TABLE wishlist_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    wishlist_id uuid NOT NULL,
    product_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE wishlists (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text DEFAULT 'My Wishlist'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY address_types
    ADD CONSTRAINT address_types_name_key UNIQUE (name);

ALTER TABLE ONLY address_types
    ADD CONSTRAINT address_types_pkey PRIMARY KEY (id);

ALTER TABLE ONLY addresses
    ADD CONSTRAINT addresses_pkey PRIMARY KEY (id);

ALTER TABLE ONLY admin_credentials
    ADD CONSTRAINT admin_credentials_email_key UNIQUE (email);

ALTER TABLE ONLY admin_credentials
    ADD CONSTRAINT admin_credentials_pkey PRIMARY KEY (id);

ALTER TABLE ONLY api_keys
    ADD CONSTRAINT api_keys_key_hash_key UNIQUE (key_hash);

ALTER TABLE ONLY api_keys
    ADD CONSTRAINT api_keys_pkey PRIMARY KEY (id);

ALTER TABLE ONLY audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY banners
    ADD CONSTRAINT banners_pkey PRIMARY KEY (id);

ALTER TABLE ONLY brands
    ADD CONSTRAINT brands_name_key UNIQUE (name);

ALTER TABLE ONLY brands
    ADD CONSTRAINT brands_pkey PRIMARY KEY (id);

ALTER TABLE ONLY brands
    ADD CONSTRAINT brands_slug_key UNIQUE (slug);

ALTER TABLE ONLY carriers
    ADD CONSTRAINT carriers_name_key UNIQUE (name);

ALTER TABLE ONLY carriers
    ADD CONSTRAINT carriers_pkey PRIMARY KEY (id);

ALTER TABLE ONLY cart_items
    ADD CONSTRAINT cart_items_cart_id_product_id_key UNIQUE (cart_id, product_id);

ALTER TABLE ONLY cart_items
    ADD CONSTRAINT cart_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY carts
    ADD CONSTRAINT carts_pkey PRIMARY KEY (id);

ALTER TABLE ONLY categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);

ALTER TABLE ONLY categories
    ADD CONSTRAINT categories_slug_key UNIQUE (slug);

ALTER TABLE ONLY coupon_redemptions
    ADD CONSTRAINT coupon_redemptions_coupon_id_order_id_key UNIQUE (coupon_id, order_id);

ALTER TABLE ONLY coupon_redemptions
    ADD CONSTRAINT coupon_redemptions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY coupons
    ADD CONSTRAINT coupons_code_key UNIQUE (code);

ALTER TABLE ONLY coupons
    ADD CONSTRAINT coupons_pkey PRIMARY KEY (id);

ALTER TABLE ONLY customer_profiles
    ADD CONSTRAINT customer_profiles_pkey PRIMARY KEY (id);

ALTER TABLE ONLY customer_profiles
    ADD CONSTRAINT customer_profiles_user_id_key UNIQUE (user_id);

ALTER TABLE ONLY inventory_adjustments
    ADD CONSTRAINT inventory_adjustments_pkey PRIMARY KEY (id);

ALTER TABLE ONLY inventory_movements
    ADD CONSTRAINT inventory_movements_pkey PRIMARY KEY (id);

ALTER TABLE ONLY inventory
    ADD CONSTRAINT inventory_pkey PRIMARY KEY (product_id);

ALTER TABLE ONLY notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);

ALTER TABLE ONLY order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY order_notes
    ADD CONSTRAINT order_notes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY order_status_history
    ADD CONSTRAINT order_status_history_pkey PRIMARY KEY (id);

ALTER TABLE ONLY order_taxes
    ADD CONSTRAINT order_taxes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);

ALTER TABLE ONLY outbox_events
    ADD CONSTRAINT outbox_events_pkey PRIMARY KEY (id);

ALTER TABLE ONLY page_views
    ADD CONSTRAINT page_views_pkey PRIMARY KEY (id);

ALTER TABLE ONLY payment_methods
    ADD CONSTRAINT payment_methods_name_key UNIQUE (name);

ALTER TABLE ONLY payment_methods
    ADD CONSTRAINT payment_methods_pkey PRIMARY KEY (id);

ALTER TABLE ONLY payment_transactions
    ADD CONSTRAINT payment_transactions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);

ALTER TABLE ONLY product_attribute_values
    ADD CONSTRAINT product_attribute_values_attribute_id_value_key UNIQUE (attribute_id, value);

ALTER TABLE ONLY product_attribute_values
    ADD CONSTRAINT product_attribute_values_pkey PRIMARY KEY (id);

ALTER TABLE ONLY product_attributes
    ADD CONSTRAINT product_attributes_name_key UNIQUE (name);

ALTER TABLE ONLY product_attributes
    ADD CONSTRAINT product_attributes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY product_images
    ADD CONSTRAINT product_images_pkey PRIMARY KEY (id);

ALTER TABLE ONLY product_tags
    ADD CONSTRAINT product_tags_pkey PRIMARY KEY (product_id, tag_id);

ALTER TABLE ONLY product_variants
    ADD CONSTRAINT product_variants_pkey PRIMARY KEY (id);

ALTER TABLE ONLY product_variants
    ADD CONSTRAINT product_variants_sku_key UNIQUE (sku);

ALTER TABLE ONLY products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);

ALTER TABLE ONLY products
    ADD CONSTRAINT products_slug_key UNIQUE (slug);

ALTER TABLE ONLY promotions
    ADD CONSTRAINT promotions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY refunds
    ADD CONSTRAINT refunds_pkey PRIMARY KEY (id);

ALTER TABLE ONLY return_items
    ADD CONSTRAINT return_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY return_items
    ADD CONSTRAINT return_items_return_id_order_item_id_key UNIQUE (return_id, order_item_id);

ALTER TABLE ONLY returns
    ADD CONSTRAINT returns_pkey PRIMARY KEY (id);

ALTER TABLE ONLY reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);

ALTER TABLE ONLY saved_admin_queries
    ADD CONSTRAINT saved_admin_queries_pkey PRIMARY KEY (id);

ALTER TABLE ONLY settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (key);

ALTER TABLE ONLY shipment_items
    ADD CONSTRAINT shipment_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY shipment_items
    ADD CONSTRAINT shipment_items_shipment_id_order_item_id_key UNIQUE (shipment_id, order_item_id);

ALTER TABLE ONLY shipments
    ADD CONSTRAINT shipments_pkey PRIMARY KEY (id);

ALTER TABLE ONLY shipping_methods
    ADD CONSTRAINT shipping_methods_name_key UNIQUE (name);

ALTER TABLE ONLY shipping_methods
    ADD CONSTRAINT shipping_methods_pkey PRIMARY KEY (id);

ALTER TABLE ONLY tags
    ADD CONSTRAINT tags_name_key UNIQUE (name);

ALTER TABLE ONLY tags
    ADD CONSTRAINT tags_pkey PRIMARY KEY (id);

ALTER TABLE ONLY tags
    ADD CONSTRAINT tags_slug_key UNIQUE (slug);

ALTER TABLE ONLY tax_rates
    ADD CONSTRAINT tax_rates_country_state_key UNIQUE (country, state);

ALTER TABLE ONLY tax_rates
    ADD CONSTRAINT tax_rates_pkey PRIMARY KEY (id);

ALTER TABLE ONLY customer_credentials
    ADD CONSTRAINT customer_credentials_email_key UNIQUE (email);

ALTER TABLE ONLY customer_credentials
    ADD CONSTRAINT customer_credentials_pkey PRIMARY KEY (id);

ALTER TABLE ONLY variant_attribute_values
    ADD CONSTRAINT variant_attribute_values_pkey PRIMARY KEY (variant_id, attribute_value_id);

ALTER TABLE ONLY wishlist_items
    ADD CONSTRAINT wishlist_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY wishlist_items
    ADD CONSTRAINT wishlist_items_wishlist_id_product_id_key UNIQUE (wishlist_id, product_id);

ALTER TABLE ONLY wishlists
    ADD CONSTRAINT wishlists_pkey PRIMARY KEY (id);

ALTER TABLE ONLY wishlists
    ADD CONSTRAINT wishlists_user_id_name_key UNIQUE (user_id, name);

CREATE INDEX idx_admin_credentials_email ON admin_credentials USING btree (email);

CREATE INDEX idx_admin_credentials_user_id ON admin_credentials USING btree (user_id);

CREATE INDEX idx_audit_logs_entity ON audit_logs USING btree (entity_type, entity_id);

CREATE INDEX idx_cart_items_cart ON cart_items USING btree (cart_id);

CREATE INDEX idx_carts_user ON carts USING btree (user_id);

CREATE INDEX idx_coupon_redemptions_coupon ON coupon_redemptions USING btree (coupon_id);

CREATE INDEX idx_customer_credentials_email ON customer_credentials USING btree (email);

CREATE INDEX idx_customer_credentials_user_id ON customer_credentials USING btree (user_id);

CREATE INDEX idx_inventory_adjustments_product ON inventory_adjustments USING btree (product_id);

CREATE INDEX idx_inventory_movements_product ON inventory_movements USING btree (product_id);

CREATE INDEX idx_notifications_user ON notifications USING btree (user_id);

CREATE INDEX idx_order_notes_order ON order_notes USING btree (order_id);

CREATE INDEX idx_order_status_history_order ON order_status_history USING btree (order_id);

CREATE INDEX idx_order_taxes_order ON order_taxes USING btree (order_id);

CREATE INDEX idx_orders_status ON orders USING btree (status);

CREATE INDEX idx_outbox_status ON outbox_events USING btree (status, created_at);

CREATE INDEX idx_page_views_created_at ON page_views USING btree (created_at);

CREATE INDEX idx_payment_tx_payment ON payment_transactions USING btree (payment_id);

CREATE INDEX idx_payments_order ON payments USING btree (order_id);

CREATE INDEX idx_product_images_product ON product_images USING btree (product_id);

CREATE INDEX idx_refunds_payment ON refunds USING btree (payment_id);

CREATE INDEX idx_returns_order ON returns USING btree (order_id);

CREATE INDEX idx_reviews_product ON reviews USING btree (product_id);

CREATE INDEX idx_saved_admin_queries_user ON saved_admin_queries USING btree (user_id);

CREATE INDEX idx_shipment_items_shipment ON shipment_items USING btree (shipment_id);

CREATE INDEX idx_shipments_order ON shipments USING btree (order_id);

ALTER TABLE ONLY addresses
    ADD CONSTRAINT addresses_address_type_id_fkey FOREIGN KEY (address_type_id) REFERENCES address_types(id) ON DELETE SET NULL;

ALTER TABLE ONLY cart_items
    ADD CONSTRAINT cart_items_cart_id_fkey FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE;

ALTER TABLE ONLY cart_items
    ADD CONSTRAINT cart_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT;

ALTER TABLE ONLY coupon_redemptions
    ADD CONSTRAINT coupon_redemptions_coupon_id_fkey FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE;

ALTER TABLE ONLY coupon_redemptions
    ADD CONSTRAINT coupon_redemptions_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL;

ALTER TABLE ONLY coupons
    ADD CONSTRAINT coupons_promotion_id_fkey FOREIGN KEY (promotion_id) REFERENCES promotions(id) ON DELETE SET NULL;

ALTER TABLE ONLY inventory_adjustments
    ADD CONSTRAINT inventory_adjustments_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

ALTER TABLE ONLY inventory_movements
    ADD CONSTRAINT inventory_movements_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

ALTER TABLE ONLY inventory
    ADD CONSTRAINT inventory_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

ALTER TABLE ONLY order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

ALTER TABLE ONLY order_items
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT;

ALTER TABLE ONLY order_notes
    ADD CONSTRAINT order_notes_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

ALTER TABLE ONLY order_status_history
    ADD CONSTRAINT order_status_history_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

ALTER TABLE ONLY order_taxes
    ADD CONSTRAINT order_taxes_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

ALTER TABLE ONLY order_taxes
    ADD CONSTRAINT order_taxes_tax_rate_id_fkey FOREIGN KEY (tax_rate_id) REFERENCES tax_rates(id) ON DELETE SET NULL;

ALTER TABLE ONLY orders
    ADD CONSTRAINT orders_cart_id_fkey FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE SET NULL;

ALTER TABLE ONLY page_views
    ADD CONSTRAINT page_views_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;

ALTER TABLE ONLY payment_transactions
    ADD CONSTRAINT payment_transactions_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE;

ALTER TABLE ONLY payments
    ADD CONSTRAINT payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

ALTER TABLE ONLY payments
    ADD CONSTRAINT payments_payment_method_id_fkey FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE SET NULL;

ALTER TABLE ONLY product_attribute_values
    ADD CONSTRAINT product_attribute_values_attribute_id_fkey FOREIGN KEY (attribute_id) REFERENCES product_attributes(id) ON DELETE CASCADE;

ALTER TABLE ONLY product_images
    ADD CONSTRAINT product_images_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

ALTER TABLE ONLY product_tags
    ADD CONSTRAINT product_tags_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

ALTER TABLE ONLY product_tags
    ADD CONSTRAINT product_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE;

ALTER TABLE ONLY product_variants
    ADD CONSTRAINT product_variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

ALTER TABLE ONLY products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;

ALTER TABLE ONLY refunds
    ADD CONSTRAINT refunds_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL;

ALTER TABLE ONLY refunds
    ADD CONSTRAINT refunds_return_id_fkey FOREIGN KEY (return_id) REFERENCES returns(id) ON DELETE SET NULL;

ALTER TABLE ONLY return_items
    ADD CONSTRAINT return_items_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE RESTRICT;

ALTER TABLE ONLY return_items
    ADD CONSTRAINT return_items_return_id_fkey FOREIGN KEY (return_id) REFERENCES returns(id) ON DELETE CASCADE;

ALTER TABLE ONLY returns
    ADD CONSTRAINT returns_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

ALTER TABLE ONLY reviews
    ADD CONSTRAINT reviews_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

ALTER TABLE ONLY shipment_items
    ADD CONSTRAINT shipment_items_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE RESTRICT;

ALTER TABLE ONLY shipment_items
    ADD CONSTRAINT shipment_items_shipment_id_fkey FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE;

ALTER TABLE ONLY shipments
    ADD CONSTRAINT shipments_carrier_id_fkey FOREIGN KEY (carrier_id) REFERENCES carriers(id) ON DELETE SET NULL;

ALTER TABLE ONLY shipments
    ADD CONSTRAINT shipments_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

ALTER TABLE ONLY shipments
    ADD CONSTRAINT shipments_shipping_method_id_fkey FOREIGN KEY (shipping_method_id) REFERENCES shipping_methods(id) ON DELETE SET NULL;

ALTER TABLE ONLY variant_attribute_values
    ADD CONSTRAINT variant_attribute_values_attribute_value_id_fkey FOREIGN KEY (attribute_value_id) REFERENCES product_attribute_values(id) ON DELETE CASCADE;

ALTER TABLE ONLY variant_attribute_values
    ADD CONSTRAINT variant_attribute_values_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE;

ALTER TABLE ONLY wishlist_items
    ADD CONSTRAINT wishlist_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

ALTER TABLE ONLY wishlist_items
    ADD CONSTRAINT wishlist_items_wishlist_id_fkey FOREIGN KEY (wishlist_id) REFERENCES wishlists(id) ON DELETE CASCADE;
