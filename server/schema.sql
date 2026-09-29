-- ============================================================
-- ReUse Connect Database Schema
-- PostgreSQL
-- Database: reuseconnect_db
--
-- IMPORTANT:
-- This file creates STRUCTURE ONLY.
-- No sample users, listings, orders, or other records are inserted.
-- All tables will be empty after successful execution.
--
-- REVISION:
-- reviews table now uses reviewer_id / reviewee_id
-- for dual-direction reviews (buyer→seller and seller→buyer).
-- ============================================================

-- ============================================================
-- 1. USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    user_id BIGSERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'BUYER'
        CHECK (role IN ('ADMIN', 'SELLER', 'BUYER')),
    phone VARCHAR(30),
    profile_image TEXT,
    address TEXT,
    city VARCHAR(100),
    province VARCHAR(100),
    postal_code VARCHAR(20),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 2. CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
    category_id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    image_url TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 3. LISTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS listings (
    listing_id BIGSERIAL PRIMARY KEY,
    seller_id BIGINT NOT NULL,
    category_id BIGINT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
    condition VARCHAR(30) NOT NULL DEFAULT 'GOOD'
        CHECK (condition IN ('NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'POOR')),
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    location VARCHAR(255),
    size VARCHAR(100),
    listing_type VARCHAR(20) NOT NULL DEFAULT 'SALE'
        CHECK (listing_type IN ('SALE', 'DONATION', 'TRADE')),
    status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE'
        CHECK (status IN ('AVAILABLE', 'RESERVED', 'SOLD', 'HIDDEN', 'REJECTED', 'PENDING')),
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_listings_seller
        FOREIGN KEY (seller_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_listings_category
        FOREIGN KEY (category_id)
        REFERENCES categories(category_id)
        ON DELETE RESTRICT
);

-- ============================================================
-- 4. LISTING IMAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS listing_images (
    image_id BIGSERIAL PRIMARY KEY,
    listing_id BIGINT NOT NULL,
    image_url TEXT NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_listing_images_listing
        FOREIGN KEY (listing_id)
        REFERENCES listings(listing_id)
        ON DELETE CASCADE
);

-- ============================================================
-- 5. FAVORITES
-- ============================================================
CREATE TABLE IF NOT EXISTS favorites (
    favorite_id BIGSERIAL PRIMARY KEY,
    buyer_id BIGINT NOT NULL,
    listing_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_favorites_buyer
        FOREIGN KEY (buyer_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_favorites_listing
        FOREIGN KEY (listing_id)
        REFERENCES listings(listing_id)
        ON DELETE CASCADE,

    CONSTRAINT uq_favorites_buyer_listing
        UNIQUE (buyer_id, listing_id)
);

-- ============================================================
-- 6. ORDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
    order_id BIGSERIAL PRIMARY KEY,
    order_number VARCHAR(50) NOT NULL UNIQUE,
    buyer_id BIGINT NOT NULL,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN (
            'PENDING',
            'CONFIRMED',
            'PROCESSING',
            'SHIPPED',
            'DELIVERED',
            'COMPLETED',
            'CANCELLED',
            'REJECTED'
        )),
    shipping_address TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_orders_buyer
        FOREIGN KEY (buyer_id)
        REFERENCES users(user_id)
        ON DELETE RESTRICT
);

-- ============================================================
-- 7. ORDER ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS order_items (
    order_item_id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL,
    listing_id BIGINT NOT NULL,
    seller_id BIGINT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
    subtotal NUMERIC(12,2) NOT NULL CHECK (subtotal >= 0),

    CONSTRAINT fk_order_items_order
        FOREIGN KEY (order_id)
        REFERENCES orders(order_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_order_items_listing
        FOREIGN KEY (listing_id)
        REFERENCES listings(listing_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_order_items_seller
        FOREIGN KEY (seller_id)
        REFERENCES users(user_id)
        ON DELETE RESTRICT
);

-- ============================================================
-- 8. PAYMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
    payment_id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL UNIQUE,
    payment_method VARCHAR(30) NOT NULL
        CHECK (payment_method IN ('CASH_ON_DELIVERY', 'GCASH', 'BANK_TRANSFER', 'OTHER')),
    amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED')),
    reference_number VARCHAR(100),
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_payments_order
        FOREIGN KEY (order_id)
        REFERENCES orders(order_id)
        ON DELETE CASCADE
);

-- ============================================================
-- 9. MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
    message_id BIGSERIAL PRIMARY KEY,
    sender_id BIGINT NOT NULL,
    receiver_id BIGINT NOT NULL,
    listing_id BIGINT,
    order_id BIGINT,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_messages_sender
        FOREIGN KEY (sender_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_messages_receiver
        FOREIGN KEY (receiver_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_messages_listing
        FOREIGN KEY (listing_id)
        REFERENCES listings(listing_id)
        ON DELETE SET NULL,

    CONSTRAINT fk_messages_order
        FOREIGN KEY (order_id)
        REFERENCES orders(order_id)
        ON DELETE SET NULL,

    CONSTRAINT chk_messages_different_users
        CHECK (sender_id <> receiver_id)
);

-- ============================================================
-- 10. REVIEWS AND RATINGS
-- ------------------------------------------------------------
-- DUAL-DIRECTION REVIEWS:
--
--   reviewer_id = WHO WROTE the review
--   reviewee_id = WHO RECEIVED the review
--
--   Buyer → Seller:
--     reviewer_id = buyer_id
--     reviewee_id = seller_id
--
--   Seller → Buyer:
--     reviewer_id = seller_id
--     reviewee_id = buyer_id
-- ============================================================
CREATE TABLE IF NOT EXISTS reviews (
    review_id BIGSERIAL PRIMARY KEY,
    reviewer_id BIGINT NOT NULL,
    reviewee_id BIGINT NOT NULL,
    listing_id BIGINT,
    order_id BIGINT,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'PUBLISHED'
        CHECK (status IN ('PUBLISHED', 'HIDDEN', 'REMOVED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_reviews_reviewer
        FOREIGN KEY (reviewer_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_reviews_reviewee
        FOREIGN KEY (reviewee_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_reviews_listing
        FOREIGN KEY (listing_id)
        REFERENCES listings(listing_id)
        ON DELETE SET NULL,

    CONSTRAINT fk_reviews_order
        FOREIGN KEY (order_id)
        REFERENCES orders(order_id)
        ON DELETE SET NULL,

    CONSTRAINT chk_reviews_different_users
        CHECK (reviewer_id <> reviewee_id),

    CONSTRAINT uq_reviews_order_reviewer
        UNIQUE (order_id, reviewer_id)
);

-- ============================================================
-- 11. REPORTS
-- Used for user/listing/content reports.
-- ============================================================
CREATE TABLE IF NOT EXISTS reports (
    report_id BIGSERIAL PRIMARY KEY,
    reporter_id BIGINT NOT NULL,
    reported_user_id BIGINT,
    listing_id BIGINT,
    report_type VARCHAR(50) NOT NULL,
    reason VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED')),
    admin_notes TEXT,
    reviewed_by BIGINT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_reports_reporter
        FOREIGN KEY (reporter_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_reports_reported_user
        FOREIGN KEY (reported_user_id)
        REFERENCES users(user_id)
        ON DELETE SET NULL,

    CONSTRAINT fk_reports_listing
        FOREIGN KEY (listing_id)
        REFERENCES listings(listing_id)
        ON DELETE SET NULL,

    CONSTRAINT fk_reports_reviewer
        FOREIGN KEY (reviewed_by)
        REFERENCES users(user_id)
        ON DELETE SET NULL
);

-- ============================================================
-- 12. DISPUTES
-- ============================================================
CREATE TABLE IF NOT EXISTS disputes (
    dispute_id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL,
    opened_by BIGINT NOT NULL,
    against_user_id BIGINT,
    reason VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN'
        CHECK (status IN ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED')),
    resolution TEXT,
    resolved_by BIGINT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_disputes_order
        FOREIGN KEY (order_id)
        REFERENCES orders(order_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_disputes_opened_by
        FOREIGN KEY (opened_by)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_disputes_against_user
        FOREIGN KEY (against_user_id)
        REFERENCES users(user_id)
        ON DELETE SET NULL,

    CONSTRAINT fk_disputes_resolved_by
        FOREIGN KEY (resolved_by)
        REFERENCES users(user_id)
        ON DELETE SET NULL
);

-- ============================================================
-- 13. NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
    notification_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'GENERAL',
    reference_type VARCHAR(50),
    reference_id BIGINT,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_notifications_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);

-- ============================================================
-- 14. CONTENTS
-- Used by Admin Content Management.
-- ============================================================
CREATE TABLE IF NOT EXISTS contents (
    content_id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    content_type VARCHAR(50) NOT NULL DEFAULT 'PAGE'
        CHECK (content_type IN (
            'PAGE',
            'ANNOUNCEMENT',
            'BANNER',
            'FAQ',
            'POLICY',
            'NEWS'
        )),
    content TEXT,
    image_url TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
    created_by BIGINT,
    updated_by BIGINT,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_contents_created_by
        FOREIGN KEY (created_by)
        REFERENCES users(user_id)
        ON DELETE SET NULL,

    CONSTRAINT fk_contents_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES users(user_id)
        ON DELETE SET NULL
);

-- ============================================================
-- 15. CART ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS cart_items (
    cart_item_id BIGSERIAL PRIMARY KEY,
    buyer_id BIGINT NOT NULL,
    listing_id BIGINT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1
        CHECK (quantity > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_cart_items_buyer
        FOREIGN KEY (buyer_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_cart_items_listing
        FOREIGN KEY (listing_id)
        REFERENCES listings(listing_id)
        ON DELETE CASCADE,

    CONSTRAINT uq_cart_items_buyer_listing
        UNIQUE (buyer_id, listing_id)
);

-- ============================================================
-- 16. INDEXES
-- These improve lookup speed. They do not insert any records.
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_users_role
    ON users(role);

CREATE INDEX IF NOT EXISTS idx_users_status
    ON users(status);

CREATE INDEX IF NOT EXISTS idx_listings_seller
    ON listings(seller_id);

CREATE INDEX IF NOT EXISTS idx_listings_category
    ON listings(category_id);

CREATE INDEX IF NOT EXISTS idx_listings_status
    ON listings(status);

CREATE INDEX IF NOT EXISTS idx_listings_created_at
    ON listings(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_listings_listing_type
    ON listings(listing_type);

CREATE INDEX IF NOT EXISTS idx_listing_images_listing
    ON listing_images(listing_id);

CREATE INDEX IF NOT EXISTS idx_favorites_buyer
    ON favorites(buyer_id);

CREATE INDEX IF NOT EXISTS idx_favorites_listing
    ON favorites(listing_id);

CREATE INDEX IF NOT EXISTS idx_orders_buyer
    ON orders(buyer_id);

CREATE INDEX IF NOT EXISTS idx_orders_status
    ON orders(status);

CREATE INDEX IF NOT EXISTS idx_orders_created_at
    ON orders(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_items_order
    ON order_items(order_id);

CREATE INDEX IF NOT EXISTS idx_order_items_listing
    ON order_items(listing_id);

CREATE INDEX IF NOT EXISTS idx_order_items_seller
    ON order_items(seller_id);

CREATE INDEX IF NOT EXISTS idx_messages_sender
    ON messages(sender_id);

CREATE INDEX IF NOT EXISTS idx_messages_receiver
    ON messages(receiver_id);

CREATE INDEX IF NOT EXISTS idx_messages_created_at
    ON messages(created_at DESC);

-- Reviews indexes (dual-direction)
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee
    ON reviews(reviewee_id);

CREATE INDEX IF NOT EXISTS idx_reviews_reviewer
    ON reviews(reviewer_id);

CREATE INDEX IF NOT EXISTS idx_reviews_order
    ON reviews(order_id);

CREATE INDEX IF NOT EXISTS idx_reviews_listing
    ON reviews(listing_id);

CREATE INDEX IF NOT EXISTS idx_reports_status
    ON reports(status);

CREATE INDEX IF NOT EXISTS idx_reports_created_at
    ON reports(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_disputes_status
    ON disputes(status);

CREATE INDEX IF NOT EXISTS idx_disputes_order
    ON disputes(order_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user
    ON notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_unread
    ON notifications(user_id, is_read);

CREATE INDEX IF NOT EXISTS idx_contents_status
    ON contents(status);

CREATE INDEX IF NOT EXISTS idx_cart_items_buyer
    ON cart_items(buyer_id);

CREATE INDEX IF NOT EXISTS idx_cart_items_listing
    ON cart_items(listing_id);

CREATE INDEX IF NOT EXISTS idx_cart_items_created_at
    ON cart_items(created_at DESC);

-- ============================================================
-- 17. UPDATED_AT TRIGGER
-- Automatically updates updated_at when a row is modified.
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_categories_updated_at ON categories;
CREATE TRIGGER trg_categories_updated_at
BEFORE UPDATE ON categories
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_listings_updated_at ON listings;
CREATE TRIGGER trg_listings_updated_at
BEFORE UPDATE ON listings
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_orders_updated_at ON orders;
CREATE TRIGGER trg_orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_payments_updated_at ON payments;
CREATE TRIGGER trg_payments_updated_at
BEFORE UPDATE ON payments
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_reviews_updated_at ON reviews;
CREATE TRIGGER trg_reviews_updated_at
BEFORE UPDATE ON reviews
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_reports_updated_at ON reports;
CREATE TRIGGER trg_reports_updated_at
BEFORE UPDATE ON reports
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_disputes_updated_at ON disputes;
CREATE TRIGGER trg_disputes_updated_at
BEFORE UPDATE ON disputes
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_contents_updated_at ON contents;
CREATE TRIGGER trg_contents_updated_at
BEFORE UPDATE ON contents
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_cart_items_updated_at ON cart_items;
CREATE TRIGGER trg_cart_items_updated_at
BEFORE UPDATE ON cart_items
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 18. COMMUNITY POSTS
-- ============================================================

CREATE TABLE IF NOT EXISTS community_posts (
    post_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL
        REFERENCES users(user_id)
        ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    category VARCHAR(80) NOT NULL DEFAULT 'General',
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT community_posts_status_check
        CHECK (
            status IN (
                'ACTIVE',
                'PENDING',
                'UNDER_REVIEW',
                'RESOLVED',
                'HIDDEN'
            )
        )
);

-- ============================================================
-- 19. COMMUNITY POST COMMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS community_post_comments (
    comment_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    post_id BIGINT NOT NULL
        REFERENCES community_posts(post_id)
        ON DELETE CASCADE,
    user_id BIGINT NOT NULL
        REFERENCES users(user_id)
        ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT community_comments_status_check
        CHECK (
            status IN (
                'ACTIVE',
                'HIDDEN'
            )
        )
);

-- ============================================================
-- 20. COMMUNITY POST LIKES
-- ============================================================

CREATE TABLE IF NOT EXISTS community_post_likes (
    like_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    post_id BIGINT NOT NULL
        REFERENCES community_posts(post_id)
        ON DELETE CASCADE,
    user_id BIGINT NOT NULL
        REFERENCES users(user_id)
        ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT community_post_like_unique
        UNIQUE (post_id, user_id)
);

-- ============================================================
-- 21. SUPPORT TICKETS
-- ============================================================

CREATE TABLE IF NOT EXISTS support_tickets (
    ticket_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL
        REFERENCES users(user_id)
        ON DELETE CASCADE,
    subject VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(80) NOT NULL DEFAULT 'General',
    priority VARCHAR(30) NOT NULL DEFAULT 'NORMAL',
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    assigned_to BIGINT
        REFERENCES users(user_id)
        ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT support_ticket_priority_check
        CHECK (
            priority IN (
                'LOW',
                'NORMAL',
                'HIGH',
                'URGENT'
            )
        ),

    CONSTRAINT support_ticket_status_check
        CHECK (
            status IN (
                'PENDING',
                'IN_PROGRESS',
                'RESOLVED',
                'CLOSED'
            )
        )
);

-- ============================================================
-- 22. COMMUNITY REPORTS
-- ============================================================

CREATE TABLE IF NOT EXISTS community_reports (
    report_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    reporter_id BIGINT NOT NULL
        REFERENCES users(user_id)
        ON DELETE CASCADE,
    post_id BIGINT
        REFERENCES community_posts(post_id)
        ON DELETE CASCADE,
    ticket_id BIGINT
        REFERENCES support_tickets(ticket_id)
        ON DELETE CASCADE,
    reason VARCHAR(150) NOT NULL,
    description TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT community_report_status_check
        CHECK (
            status IN (
                'PENDING',
                'UNDER_REVIEW',
                'RESOLVED',
                'DISMISSED'
            )
        ),

    CONSTRAINT community_report_target_check
        CHECK (
            post_id IS NOT NULL
            OR ticket_id IS NOT NULL
        )
);

-- ============================================================
-- 23. SUPPORT SETTINGS
-- ============================================================

CREATE TABLE IF NOT EXISTS support_settings (
    setting_id INTEGER PRIMARY KEY DEFAULT 1,
    support_email VARCHAR(255),
    support_hours VARCHAR(255),
    auto_response_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT support_settings_single_row
        CHECK (setting_id = 1)
);

-- ============================================================
-- 24. COMMUNITY INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_community_posts_user
    ON community_posts(user_id);

CREATE INDEX IF NOT EXISTS idx_community_posts_status
    ON community_posts(status);

CREATE INDEX IF NOT EXISTS idx_community_posts_category
    ON community_posts(category);

CREATE INDEX IF NOT EXISTS idx_community_posts_created
    ON community_posts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_comments_post
    ON community_post_comments(post_id);

CREATE INDEX IF NOT EXISTS idx_community_likes_post
    ON community_post_likes(post_id);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user
    ON support_tickets(user_id);

CREATE INDEX IF NOT EXISTS idx_support_tickets_status
    ON support_tickets(status);

CREATE INDEX IF NOT EXISTS idx_support_tickets_created
    ON support_tickets(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_reports_status
    ON community_reports(status);

CREATE INDEX IF NOT EXISTS idx_community_reports_created
    ON community_reports(created_at DESC);

-- ============================================================
-- 25. SYSTEM LOGS
-- ============================================================

CREATE TABLE IF NOT EXISTS system_logs (
    log_id BIGSERIAL PRIMARY KEY,
    level VARCHAR(20) NOT NULL DEFAULT 'INFO'
        CHECK (
            level IN (
                'INFO',
                'WARNING',
                'ERROR',
                'SUCCESS'
            )
        ),
    message TEXT NOT NULL,
    module VARCHAR(100),
    user_id BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE SET NULL
);

-- ============================================================
-- 26. SYSTEM ALERTS
-- ============================================================

CREATE TABLE IF NOT EXISTS system_alerts (
    alert_id BIGSERIAL PRIMARY KEY,
    alert_type VARCHAR(20) NOT NULL DEFAULT 'INFO'
        CHECK (
            alert_type IN (
                'INFO',
                'SUCCESS',
                'WARNING',
                'ERROR'
            )
        ),
    title VARCHAR(255) NOT NULL,
    message TEXT,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 27. SYSTEM SETTINGS
-- ============================================================

CREATE TABLE IF NOT EXISTS system_settings (
    setting_id BIGSERIAL PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT,
    description TEXT,
    updated_by BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (updated_by)
        REFERENCES users(user_id)
        ON DELETE SET NULL
);

-- ============================================================
-- 28. SYSTEM INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_system_logs_created_at
    ON system_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_logs_level
    ON system_logs(level);

CREATE INDEX IF NOT EXISTS idx_system_logs_module
    ON system_logs(module);

CREATE INDEX IF NOT EXISTS idx_system_alerts_created_at
    ON system_alerts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_alerts_read
    ON system_alerts(is_read);

CREATE INDEX IF NOT EXISTS idx_system_settings_key
    ON system_settings(setting_key);

-- ============================================================
-- 29. SYSTEM SETTINGS TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_system_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_system_settings_updated_at
    ON system_settings;

CREATE TRIGGER trg_system_settings_updated_at
BEFORE UPDATE ON system_settings
FOR EACH ROW
EXECUTE FUNCTION update_system_settings_updated_at();

-- ============================================================
-- 30. VERIFICATION
-- This only displays table names. It does NOT insert data.
-- ============================================================

SELECT
    table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

ALTER TABLE community_posts
ADD COLUMN IF NOT EXISTS image_url TEXT;

CREATE INDEX IF NOT EXISTS idx_community_posts_image
    ON community_posts(image_url);

    -- ============================================================
    -- ReUse Connect
    -- Community Trade -> Seller My Listings / Marketplace
    -- Migration
    -- ============================================================
    --
    -- PURPOSE:
    -- Links one Community Trade & Exchange post to exactly one
    -- Marketplace/Seller listing.
    --
    -- AFTER RUNNING THIS:
    -- Community post
    --      -> listings.community_post_id
    --      -> listing_type = 'TRADE'
    --      -> status = 'AVAILABLE'
    --      -> Seller My Listings -> For Trade
    --      -> Marketplace -> For Trade
    --
    -- IMPORTANT:
    -- Run this SQL ONCE against the existing reuseconnect_db database.
    -- ============================================================

    ALTER TABLE listings
    ADD COLUMN IF NOT EXISTS community_post_id BIGINT;

    -- Link each Marketplace listing to at most one Community post.
    -- Multiple NULL values are allowed, so existing normal SALE/DONATION
    -- listings remain unaffected.
    CREATE UNIQUE INDEX IF NOT EXISTS uq_listings_community_post_id
    ON listings(community_post_id)
    WHERE community_post_id IS NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_listings_community_post_id
    ON listings(community_post_id);

    -- Add the foreign key only if it does not already exist.
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'fk_listings_community_post'
        ) THEN
            ALTER TABLE listings
            ADD CONSTRAINT fk_listings_community_post
            FOREIGN KEY (community_post_id)
            REFERENCES community_posts(post_id)
            ON DELETE SET NULL;
        END IF;
    END $$;

    -- ============================================================
    -- OPTIONAL CHECK
    -- Run this after creating a Trade & Exchange post.
    -- Replace 1 with the actual Community post ID.
    --
    -- SELECT
    --     l.listing_id,
    --     l.community_post_id,
    --     l.seller_id,
    --     l.title,
    --     l.listing_type,
    --     l.status
    -- FROM listings l
    -- WHERE l.community_post_id = 1;
    -- ============================================================
 -- ============================================================
-- ReUse Connect
-- Trade & Exchange Comment Item Attachment
-- ============================================================

ALTER TABLE community_post_comments
ADD COLUMN IF NOT EXISTS listing_id BIGINT;

CREATE INDEX IF NOT EXISTS
idx_community_post_comments_listing_id
ON community_post_comments(listing_id);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname =
          'fk_community_post_comments_listing'
    ) THEN

        ALTER TABLE community_post_comments
        ADD CONSTRAINT
          fk_community_post_comments_listing
        FOREIGN KEY (listing_id)
        REFERENCES listings(listing_id)
        ON DELETE SET NULL;

    END IF;
END $$;

-- ============================================================
-- ReUse Connect
-- Buyer Seller + Item Reviews Migration
-- ============================================================
--
-- PURPOSE:
-- Allows a buyer to submit TWO review types for the same order:
--   1. SELLER - rates the seller
--   2. ITEM   - rates the purchased item/listing
--
-- Existing reviews are preserved and are treated as SELLER reviews.
-- This migration is safe to run more than once.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. ADD REVIEW TYPE
-- ============================================================

ALTER TABLE reviews
ADD COLUMN IF NOT EXISTS review_type VARCHAR(20);

-- ============================================================
-- 2. PRESERVE EXISTING REVIEWS
--    Existing reviews were buyer -> seller reviews.
-- ============================================================

UPDATE reviews
SET review_type = 'SELLER'
WHERE review_type IS NULL;

-- ============================================================
-- 3. ADD VALIDATION FOR REVIEW TYPE
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_reviews_review_type'
    ) THEN
        ALTER TABLE reviews
        ADD CONSTRAINT chk_reviews_review_type
        CHECK (review_type IN ('SELLER', 'ITEM'));
    END IF;
END $$;

-- ============================================================
-- 4. MAKE REVIEW TYPE REQUIRED
-- ============================================================

ALTER TABLE reviews
ALTER COLUMN review_type SET DEFAULT 'SELLER';

ALTER TABLE reviews
ALTER COLUMN review_type SET NOT NULL;

-- ============================================================
-- 5. REMOVE OLD UNIQUE CONSTRAINT
--
-- OLD:
--   UNIQUE (order_id, reviewer_id)
--
-- This allowed only one review per buyer/order.
-- We now need one SELLER review and one ITEM review.
-- ============================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'uq_reviews_order_reviewer'
    ) THEN
        ALTER TABLE reviews
        DROP CONSTRAINT uq_reviews_order_reviewer;
    END IF;
END $$;

-- ============================================================
-- 6. NEW UNIQUE CONSTRAINT
--
-- A reviewer can have:
--   one SELLER review per order
--   one ITEM review per listing/order
--
-- The partial indexes below are used instead of one broad
-- UNIQUE constraint because ITEM reviews are tied to listings.
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS
uq_reviews_seller_order_reviewer
ON reviews(order_id, reviewer_id)
WHERE review_type = 'SELLER'
  AND order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS
uq_reviews_item_order_reviewer_listing
ON reviews(order_id, reviewer_id, listing_id)
WHERE review_type = 'ITEM'
  AND order_id IS NOT NULL
  AND listing_id IS NOT NULL;

-- ============================================================
-- 7. INDEX REVIEW TYPE
-- ============================================================

CREATE INDEX IF NOT EXISTS
idx_reviews_review_type
ON reviews(review_type);

-- ============================================================
-- 8. VERIFICATION
-- ============================================================

SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'reviews'
ORDER BY ordinal_position;

SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'reviews'
ORDER BY indexname;

COMMIT;

CREATE TABLE listing_size_inventory (
    inventory_id BIGSERIAL PRIMARY KEY,
    listing_id BIGINT NOT NULL
        REFERENCES listings(listing_id)
        ON DELETE CASCADE,

    size VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(listing_id, size),

    CHECK(quantity >= 0)
);

-- ============================================================
-- EXPECTED RESULT
-- ============================================================
--
-- reviews now supports:
--
-- review_type = SELLER
--     Buyer -> Seller
--
-- review_type = ITEM
--     Buyer -> Item/Listing
--
-- Existing review rows remain intact.
-- ============================================================


-- ============================================================
-- END OF ReUse Connect SCHEMA
-- ============================================================