-- ================================================
-- Database Schema for DeDilute Landing Web App
-- ================================================

-- Enable CITEXT (case-insensitive text)
CREATE EXTENSION IF NOT EXISTS citext;

-- ================
-- Users
-- ================
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  email CITEXT UNIQUE NOT NULL,              -- login ใช้ email
  password_hash TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ================
-- Products
-- ================
CREATE TABLE IF NOT EXISTS products (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);

-- ===================================================
-- Media (Generic)  👉 แทนที่ product_media ด้วย media_assets
-- ใช้ได้กับหลาย entity: product, post, user, ฯลฯ
-- ===================================================
CREATE TABLE IF NOT EXISTS media_assets (
  id BIGSERIAL PRIMARY KEY,

  -- ระบุ owner ของไฟล์อยู่ที่ entity ไหน
  entity_type TEXT NOT NULL,                       -- e.g. 'product', 'post', 'user'
  entity_id   BIGINT NOT NULL,                     -- id ของ entity นั้น ๆ

  -- หน้าที่ของไฟล์ (ควรใช้ชุดคำที่ควบคุม)
  purpose     TEXT NOT NULL CHECK (purpose IN ('thumbnail','gallery','video')),

  -- ตำแหน่งไฟล์ (ควรเป็น URL สาธารณะ เช่น R2/CDN)
  url         TEXT NOT NULL,                       -- public URL
  s3_key      TEXT,                                -- object key บน S3/R2 (ถ้ามี)

  -- ประเภทไฟล์
  type        TEXT NOT NULL CHECK (type IN ('image','video')),
  mime_type   TEXT,

  -- การจัดลำดับภายในกลุ่ม
  sort_order  INT DEFAULT 0,

  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Suggested constraints (soft constraints)
-- หมายเหตุ: media_assets เป็น generic table จึงไม่ได้ทำ FK โดยตรงไปยังทุก entity
-- ถ้าต้องการบังคับกับ product เท่านั้น สามารถทำ VIEW/Trigger/Rule เพิ่มเติมทีหลังได้

-- Indexes
CREATE INDEX IF NOT EXISTS idx_media_assets_entity
  ON media_assets(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_purpose
  ON media_assets(purpose);
CREATE INDEX IF NOT EXISTS idx_media_assets_type
  ON media_assets(type);
CREATE INDEX IF NOT EXISTS idx_media_assets_sort
  ON media_assets(entity_type, entity_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_media_assets_s3key
  ON media_assets(s3_key);

-- (ถ้าต้องการกัน duplicate ภายในกลุ่มเดียวกันต่อไฟล์/URL)
-- CREATE UNIQUE INDEX IF NOT EXISTS uq_media_assets_entity_purpose_url
--   ON media_assets(entity_type, entity_id, purpose, url);

-- ================
-- Settings
-- ================
CREATE TABLE IF NOT EXISTS settings (
  id BIGSERIAL PRIMARY KEY,
  key TEXT NOT NULL,
  value TEXT,
  type TEXT CHECK (type IN ('text','image','video','json')) DEFAULT 'text',
  lang TEXT CHECK (lang IN ('th','en')) DEFAULT 'en',
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (key, lang)
);

CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
CREATE INDEX IF NOT EXISTS idx_settings_lang ON settings(lang);

-- ================
-- Permissions
-- ================
CREATE TABLE IF NOT EXISTS permissions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT
);

CREATE INDEX IF NOT EXISTS idx_permissions_user_id ON permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_permissions_name ON permissions(name);

DO $$
BEGIN
  -- ป้องกัน error หากคอนสเตรนต์เคยถูกสร้างไว้แล้ว
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_constraint
    WHERE  conname = 'uq_permissions_user'
  ) THEN
    ALTER TABLE permissions
      ADD CONSTRAINT uq_permissions_user UNIQUE (user_id, name);
  END IF;
END$$;

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

-- Demo media (generic): ผูกกับ products ผ่าน entity_type='product'
-- หมายเหตุ: ปรับโดเมน CDN ให้ตรงกับค่า PUBLIC_MEDIA_BASE_URL ของจริง
INSERT INTO media_assets(entity_type, entity_id, purpose, url, s3_key, type, mime_type, sort_order) VALUES
  ('product', 1, 'gallery',   'https://cdn.example.com/products/1/gallery/lemon1.jpg',     'products/1/gallery/lemon1.jpg',     'image', 'image/jpeg', 1),
  ('product', 1, 'video',     'https://cdn.example.com/products/1/video/lemon2.mp4',       'products/1/video/lemon2.mp4',       'video', 'video/mp4',  2),
  ('product', 2, 'gallery',   'https://cdn.example.com/products/2/gallery/orange1.jpg',    'products/2/gallery/orange1.jpg',    'image', 'image/jpeg', 1),
  ('product', 3, 'gallery',   'https://cdn.example.com/products/3/gallery/cola1.jpg',      'products/3/gallery/cola1.jpg',      'image', 'image/jpeg', 1),
  ('product', 3, 'video',     'https://cdn.example.com/products/3/video/cola_ad.mp4',      'products/3/video/cola_ad.mp4',      'video', 'video/mp4',  2),
  ('product', 5, 'gallery',   'https://cdn.example.com/products/5/gallery/grape1.jpg',     'products/5/gallery/grape1.jpg',     'image', 'image/jpeg', 1),
  ('product', 7, 'gallery',   'https://cdn.example.com/products/7/gallery/rootbeer.jpg',   'products/7/gallery/rootbeer.jpg',   'image', 'image/jpeg', 1),
  ('product', 8, 'gallery',   'https://cdn.example.com/products/8/gallery/strawberry1.jpg','products/8/gallery/strawberry1.jpg','image','image/jpeg', 1)
ON CONFLICT DO NOTHING;
