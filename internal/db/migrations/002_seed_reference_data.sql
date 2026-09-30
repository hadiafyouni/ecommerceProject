-- Reference data the app needs to work.

INSERT INTO payment_methods (name) VALUES
    ('Cash on Delivery'),
    ('Whish Money')
ON CONFLICT (name) DO NOTHING;

INSERT INTO settings (key, value) VALUES
    ('login_page_image_url', 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db')
ON CONFLICT (key) DO NOTHING;
