-- ================================================
-- Database Schema for DeDilute Landing Web App
-- ================================================

-- Enable CITEXT (case-insensitive text)
CREATE EXTENSION IF NOT EXISTS citext;

-- ================
-- Users
-- ================
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  email CITEXT UNIQUE NOT NULL,              -- login ใช้ email
  password_hash TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);

-- ================
-- Products
-- ================
CREATE TABLE products (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,                 
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_is_active ON products(is_active);

-- ================
-- Product Media
-- ================
CREATE TABLE product_media (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('image','video')),
  sort_order INT DEFAULT 0
);

-- Indexes
CREATE INDEX idx_product_media_product_id ON product_media(product_id);
CREATE INDEX idx_product_media_type ON product_media(type);

-- ================
-- Settings
-- ================
CREATE TABLE settings (
  id BIGSERIAL PRIMARY KEY,
  key TEXT NOT NULL,
  value TEXT,
  type TEXT CHECK (type IN ('text','image','video','json')) DEFAULT 'text',
  lang TEXT CHECK (lang IN ('th','en')) DEFAULT 'en',
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (key, lang)
);

CREATE INDEX idx_settings_key ON settings(key);
CREATE INDEX idx_settings_lang ON settings(lang);

-- ================
-- Permissions
-- ================
CREATE TABLE permissions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT
);

CREATE INDEX idx_permissions_user_id ON permissions(user_id);
CREATE INDEX idx_permissions_name ON permissions(name);

ALTER TABLE permissions
  ADD CONSTRAINT uq_permissions_user UNIQUE (user_id, name);

-- ================
-- Security
-- ================
ALTER TABLE product_media
  ADD CONSTRAINT fk_product_media_product FOREIGN KEY (product_id)
  REFERENCES products(id) ON DELETE CASCADE;

ALTER TABLE products
  ADD CONSTRAINT chk_product_price_nonnegative CHECK (price >= 0);

-- ================
-- Seed Data
-- ================
INSERT INTO users(email, password_hash, display_name)
VALUES (
  'admin@dedilute.com',
  '$2b$12$abcd1234hashdemo',
  'Admin'
)
ON CONFLICT (email) DO NOTHING;

-- Demo products
INSERT INTO products(slug, name, description, price, is_active) VALUES
  ('dedilute-lemon-soda', 'DeDilute Lemon Soda', 'Refreshing lemon soda with a fizzy kick.', 2.99, true),
  ('dedilute-orange-soda', 'DeDilute Orange Soda', 'Tangy orange soda with vibrant flavor.', 3.19, true),
  ('dedilute-cola', 'DeDilute Cola', 'Classic cola with a modern twist.', 2.79, true),
  ('dedilute-ginger-ale', 'DeDilute Ginger Ale', 'Spicy and refreshing ginger ale.', 3.49, true),
  ('dedilute-grape-soda', 'DeDilute Grape Soda', 'Sweet grape soda bursting with fruity taste.', 2.89, true),
  ('dedilute-lime-soda', 'DeDilute Lime Soda', 'Zesty lime soda with a crisp finish.', 2.99, true),
  ('dedilute-root-beer', 'DeDilute Root Beer', 'Smooth root beer with vanilla undertones.', 3.29, true),
  ('dedilute-strawberry-soda', 'DeDilute Strawberry Soda', 'Fruity strawberry soda with natural sweetness.', 3.09, true),
  ('dedilute-pineapple-soda', 'DeDilute Pineapple Soda', 'Tropical pineapple soda with a juicy punch.', 3.39, true),
  ('dedilute-mango-soda', 'DeDilute Mango Soda', 'Exotic mango soda with a rich, smooth flavor.', 3.59, true)
ON CONFLICT (slug) DO NOTHING;

-- Demo product_media (1 product → many media, บาง product ไม่มี media)
INSERT INTO product_media(product_id, url, type, sort_order) VALUES
  (1, '/media/lemon1.jpg', 'image', 1),
  (1, '/media/lemon2.mp4', 'video', 2),
  (2, '/media/orange1.jpg', 'image', 1),
  (3, '/media/cola1.jpg', 'image', 1),
  (3, '/media/cola_ad.mp4', 'video', 2),
  (5, '/media/grape1.jpg', 'image', 1),
  (7, '/media/rootbeer.mp4', 'video', 1),
  (8, '/media/strawberry1.jpg', 'image', 1)
ON CONFLICT DO NOTHING;

-- Demo settings
INSERT INTO settings (key, value, type, lang)
VALUES
  ('homepage_title', 'De Dilute - สดชื่นทุกวัน', 'text', 'th'),
  ('homepage_title', 'De Dilute - Refreshing Everyday', 'text', 'en')
ON CONFLICT (key, lang) DO NOTHING;
