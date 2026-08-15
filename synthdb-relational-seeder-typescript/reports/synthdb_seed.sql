-- ====================================================================
-- SynthDB Synthetic Database Export (Dialect: GENERIC)
-- Generated: 2026-08-15T10:18:17.096Z
-- ====================================================================

BEGIN;

-- -------------------------------------------------------------------
-- DDL Schema Definitions
-- -------------------------------------------------------------------
-- ====================================================================
-- SynthDB Sample: E-Commerce Storefront DDL (PostgreSQL Dialect)
-- ====================================================================

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) DEFAULT 'customer',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE user_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    phone_number VARCHAR(50),
    street_address VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    postal_code VARCHAR(20),
    country VARCHAR(50) DEFAULT 'USA',
    avatar_url VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(120) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    category_id INTEGER NOT NULL REFERENCES categories(id),
    sku VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    discount_percentage DECIMAL(5, 2) DEFAULT 0.00,
    stock_quantity INTEGER NOT NULL DEFAULT 10,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    order_status VARCHAR(50) DEFAULT 'pending',
    total_amount DECIMAL(10, 2) NOT NULL,
    shipping_address TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    shipped_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE product_reviews (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(200),
    review_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL UNIQUE REFERENCES orders(id),
    payment_method VARCHAR(50) DEFAULT 'credit_card',
    card_number VARCHAR(30) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'settled',
    transaction_reference VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
);

-- -------------------------------------------------------------------
-- Synthetic Data Inserts (Pass 1)
-- -------------------------------------------------------------------

-- Table: categories (25 rows)
INSERT INTO categories (id, name, slug, description, created_at)
VALUES
  (1, 'name_1_833', 'name-1-833-859', 'Detailed synthetic description for categories record 1. Features high-performance architecture and reliability.', NULL),
  (2, 'name_2_985', 'name-2-985-726', 'Detailed synthetic description for categories record 2. Features high-performance architecture and reliability.', '2024-11-29 01:35:37'),
  (3, 'name_3_904', 'name-3-904-574', 'Detailed synthetic description for categories record 3. Features high-performance architecture and reliability.', NULL),
  (4, 'name_4_587', 'name-4-587-530', 'Detailed synthetic description for categories record 4. Features high-performance architecture and reliability.', NULL),
  (5, 'name_5_847', 'name-5-847-700', 'Detailed synthetic description for categories record 5. Features high-performance architecture and reliability.', NULL),
  (6, 'name_6_900', 'name-6-900-689', 'Detailed synthetic description for categories record 6. Features high-performance architecture and reliability.', '2024-08-13 07:11:15'),
  (7, 'name_7_699', 'name-7-699-721', 'Detailed synthetic description for categories record 7. Features high-performance architecture and reliability.', NULL),
  (8, 'name_8_134', 'name-8-134-946', 'Detailed synthetic description for categories record 8. Features high-performance architecture and reliability.', NULL),
  (9, 'name_9_816', 'name-9-816-873', 'Detailed synthetic description for categories record 9. Features high-performance architecture and reliability.', NULL),
  (10, 'name_10_372', 'name-10-372-636', 'Detailed synthetic description for categories record 10. Features high-performance architecture and reliability.', '2024-10-01 18:16:02'),
  (11, 'name_11_717', 'name-11-717-795', 'Detailed synthetic description for categories record 11. Features high-performance architecture and reliability.', NULL),
  (12, 'name_12_749', 'name-12-749-402', 'Detailed synthetic description for categories record 12. Features high-performance architecture and reliability.', NULL),
  (13, 'name_13_793', 'name-13-793-200', 'Detailed synthetic description for categories record 13. Features high-performance architecture and reliability.', NULL),
  (14, 'name_14_270', 'name-14-270-138', 'Detailed synthetic description for categories record 14. Features high-performance architecture and reliability.', NULL),
  (15, 'name_15_815', 'name-15-815-273', 'Detailed synthetic description for categories record 15. Features high-performance architecture and reliability.', '2024-08-29 13:50:27'),
  (16, 'name_16_401', 'name-16-401-803', 'Detailed synthetic description for categories record 16. Features high-performance architecture and reliability.', NULL),
  (17, 'name_17_349', 'name-17-349-326', 'Detailed synthetic description for categories record 17. Features high-performance architecture and reliability.', '2023-01-30 03:40:58'),
  (18, 'name_18_788', 'name-18-788-558', 'Detailed synthetic description for categories record 18. Features high-performance architecture and reliability.', NULL),
  (19, 'name_19_133', 'name-19-133-728', NULL, '2024-12-09 19:08:43'),
  (20, 'name_20_814', 'name-20-814-354', 'Detailed synthetic description for categories record 20. Features high-performance architecture and reliability.', NULL),
  (21, 'name_21_197', 'name-21-197-688', 'Detailed synthetic description for categories record 21. Features high-performance architecture and reliability.', '2022-07-19 21:06:52'),
  (22, 'name_22_415', 'name-22-415-411', 'Detailed synthetic description for categories record 22. Features high-performance architecture and reliability.', '2024-10-19 05:37:27'),
  (23, 'name_23_645', 'name-23-645-384', 'Detailed synthetic description for categories record 23. Features high-performance architecture and reliability.', '2022-06-22 00:19:25'),
  (24, 'name_24_564', 'name-24-564-472', 'Detailed synthetic description for categories record 24. Features high-performance architecture and reliability.', '2022-04-29 04:52:01'),
  (25, 'name_25_329', 'name-25-329-585', 'Detailed synthetic description for categories record 25. Features high-performance architecture and reliability.', '2023-01-07 20:09:54');

-- Table: products (25 rows)
INSERT INTO products (id, category_id, sku, name, slug, description, price, discount_percentage, stock_quantity, is_active, created_at, updated_at)
VALUES
  (1, 1, 'MOD-9361', 'Ergonomic Router', 'ergonomic-router-664', NULL, 229.44, 27.21, 2, TRUE, NULL, '2023-06-24 22:39:19'),
  (2, 16, 'SKU-5868', 'Wireless Mechanical Switch', 'wireless-mechanical-switch-387', 'Detailed synthetic description for products record 2. Features high-performance architecture and reliability.', 2.32, 14.03, 8, TRUE, NULL, '2022-06-24 17:37:02'),
  (3, 18, 'MOD-9083', 'Precision Webcam', 'precision-webcam-137', 'Detailed synthetic description for products record 3. Features high-performance architecture and reliability.', 131.25, 20.17, 5, TRUE, NULL, '2024-03-17 00:33:56'),
  (4, 1, 'PROD-6722', 'Pro Sensor Hub', 'pro-sensor-hub-374', 'Detailed synthetic description for products record 4. Features high-performance architecture and reliability.', 81.07, 7.85, 8, FALSE, '2022-06-07 06:50:35', '2022-06-12 11:52:50'),
  (5, 15, 'SKU-9136', 'Elite Keyboard', 'elite-keyboard-865', 'Detailed synthetic description for products record 5. Features high-performance architecture and reliability.', 45.25, 0.04, 5, FALSE, NULL, '2022-02-27 20:18:18'),
  (6, 4, 'SKU-3739', 'Rugged Webcam', 'rugged-webcam-515', 'Detailed synthetic description for products record 6. Features high-performance architecture and reliability.', 4.02, 8.79, 1, TRUE, NULL, '2022-09-08 07:13:23'),
  (7, 2, 'SKU-7747', 'Adaptive Mechanical Switch', 'adaptive-mechanical-switch-485', 'Detailed synthetic description for products record 7. Features high-performance architecture and reliability.', 126.64, 11.36, 2, TRUE, NULL, '2023-07-14 20:32:26'),
  (8, 2, 'MOD-6583', 'Adaptive Smartwatch', 'adaptive-smartwatch-752', 'Detailed synthetic description for products record 8. Features high-performance architecture and reliability.', 60.59, 23.03, 2, TRUE, NULL, '2022-03-14 22:09:57'),
  (9, 1, 'ITM-3522', 'Ergonomic Storage Array', 'ergonomic-storage-array-217', 'Detailed synthetic description for products record 9. Features high-performance architecture and reliability.', 112.31, 20.04, 1, FALSE, '2024-02-19 18:09:49', '2024-02-22 13:24:31'),
  (10, 12, 'PROD-2095', 'Precision Mechanical Switch', 'precision-mechanical-switch-369', 'Detailed synthetic description for products record 10. Features high-performance architecture and reliability.', 80.72, 4.52, 1, TRUE, NULL, '2024-03-30 09:43:00'),
  (11, 1, 'PROD-2697', 'Rugged Keyboard', 'rugged-keyboard-306', 'Detailed synthetic description for products record 11. Features high-performance architecture and reliability.', 33.25, 16.94, 7, TRUE, NULL, '2024-12-05 20:21:47'),
  (12, 2, 'ITM-2109', 'Turbo Mechanical Switch', 'turbo-mechanical-switch-350', 'Detailed synthetic description for products record 12. Features high-performance architecture and reliability.', 93.93, 28.22, 3, TRUE, '2023-07-27 07:44:57', '2023-08-18 10:02:35'),
  (13, 3, 'MOD-3351', 'Smart Mechanical Switch', 'smart-mechanical-switch-257', 'Detailed synthetic description for products record 13. Features high-performance architecture and reliability.', 141.43, 11.56, 1, TRUE, '2024-03-30 09:15:12', '2024-03-30 20:51:15'),
  (14, 4, 'MOD-5747', 'Compact Keyboard', 'compact-keyboard-923', 'Detailed synthetic description for products record 14. Features high-performance architecture and reliability.', 148.42, 26.96, 7, FALSE, '2023-11-24 05:43:31', '2023-12-04 08:53:50'),
  (15, 1, 'ITM-5094', 'Quantum Trackpad', 'quantum-trackpad-848', 'Detailed synthetic description for products record 15. Features high-performance architecture and reliability.', 1, 5.67, 8, TRUE, NULL, '2022-10-06 19:04:14'),
  (16, 1, 'MOD-4751', 'Eco-Friendly Trackpad', 'eco-friendly-trackpad-975', NULL, 50.67, 26.83, 8, TRUE, NULL, '2023-02-27 04:27:17'),
  (17, 2, 'MOD-8863', 'Eco-Friendly Thermal Pad', 'eco-friendly-thermal-pad-610', 'Detailed synthetic description for products record 17. Features high-performance architecture and reliability.', 176.82, 27.86, 4, NULL, '2024-01-12 16:28:41', NULL),
  (18, 4, 'SYS-7078', 'Elite Storage Array', 'elite-storage-array-268', 'Detailed synthetic description for products record 18. Features high-performance architecture and reliability.', 48.04, 23.1, 4, FALSE, '2024-08-09 02:27:16', '2024-08-20 07:16:23'),
  (19, 12, 'SYS-2324', 'Compact Display Monitor', 'compact-display-monitor-960', 'Detailed synthetic description for products record 19. Features high-performance architecture and reliability.', 126.55, 1.81, 10, TRUE, NULL, '2023-07-05 21:22:42'),
  (20, 10, 'ITM-4177', 'Rugged Trackpad', 'rugged-trackpad-145', 'Detailed synthetic description for products record 20. Features high-performance architecture and reliability.', 50.8, 11.05, 2, FALSE, '2024-01-11 16:08:03', '2024-01-24 13:24:51'),
  (21, 1, 'PROD-6669', 'Turbo Docking Station', 'turbo-docking-station-670', 'Detailed synthetic description for products record 21. Features high-performance architecture and reliability.', 73.18, 25.04, 6, FALSE, NULL, '2024-07-26 15:22:38'),
  (22, 1, 'SYS-5949', 'Turbo Display Monitor', 'turbo-display-monitor-762', 'Detailed synthetic description for products record 22. Features high-performance architecture and reliability.', 156.48, 26.16, 4, TRUE, NULL, '2024-01-09 11:33:45'),
  (23, 9, 'MOD-9463', 'Ultra Docking Station', 'ultra-docking-station-591', 'Detailed synthetic description for products record 23. Features high-performance architecture and reliability.', 110, 21.63, 3, TRUE, '2024-03-25 10:41:17', '2024-04-14 12:44:13'),
  (24, 1, 'MOD-9139', 'Rugged Storage Array', 'rugged-storage-array-423', NULL, 127.54, 12.25, 9, TRUE, '2024-02-23 14:49:23', '2024-02-29 00:47:24'),
  (25, 3, 'SYS-4115', 'Ultra Mechanical Switch', 'ultra-mechanical-switch-967', 'Detailed synthetic description for products record 25. Features high-performance architecture and reliability.', 160.04, 14.33, 5, TRUE, NULL, '2025-01-02 19:16:24');

-- Table: users (25 rows)
INSERT INTO users (id, email, password_hash, first_name, last_name, role, is_active, created_at, updated_at)
VALUES
  (1, 'camila.roberts8259@example.net', '$2a$12$qQN6z/ZrXkAxhb6wyZRrTBKj77Rf6F4nxJBogmin.p.l729T8XLCm', 'Emily', 'Miller', 'editor', FALSE, NULL, '2024-06-03 18:50:55'),
  (2, 'lincoln.williams9541@example.org', '$2a$12$It2fBnQf4V5sf51F/53TahFLoP0Ii5WB1yUuIgXPHvp2GOSSrYuIb', 'Abigail', 'Campbell', 'editor', FALSE, '2022-07-18 11:43:49', '2022-07-30 19:38:51'),
  (3, 'victoria.williams5332@example.org', '$2a$12$wCy2gmv5LiIIZK/sX3QwdNCZf8ikyFbeo6xqAYaqX2Hyzf4NusfV8', 'Layla', 'Adams', 'developer', FALSE, NULL, '2022-08-26 12:40:10'),
  (4, 'gabriel.taylor2013@example.com', '$2a$12$u/Pr95L2vU8HF.bi93.0mEdXxKvwvhzxeNeSX6VcsB0ZZzlBVehjX', 'Joseph', 'Cruz', 'admin', FALSE, '2024-07-27 18:25:23', '2024-08-11 05:34:55'),
  (5, 'anthony.cruz1856@example.net', '$2a$12$25IfElwAGMaIqyjJFm8PzdsWVcK/K0CujI.k/7oiMJYGxA4OCDoCd', 'James', 'Morris', 'developer', FALSE, '2023-07-19 07:51:06', '2023-08-09 23:36:44'),
  (6, 'john.jones5544@example.net', '$2a$12$VUtwbICd7yvScc/TVHn5oOhESzFDj2FGDu63qJRD0glxUvqD/CNLR', 'Lincoln', 'Hernandez', 'viewer', TRUE, NULL, '2024-06-18 02:24:38'),
  (7, 'benjamin.diaz8510@example.com', '$2a$12$dgyl5eABhQH15wuqEmiNVN5WIYii1kiOPAXFs5ZacZPXZpt8O5UuK', 'Oliver', 'Williams', 'developer', TRUE, NULL, '2022-01-30 21:33:22'),
  (8, 'olivia.cruz5277@example.org', '$2a$12$Jx7PL3Al3HbvIiNprjiu15qjLmlQ5ORgSpiEvuu98jYoESIEjHepX', 'David', 'Evans', 'billing_manager', TRUE, NULL, '2024-08-21 08:30:28'),
  (9, 'emily.garcia2250@example.org', '$2a$12$Hmpv5Q/sB0tCczGDYtHBjJLqHTLgwWMIUU/OZTh0tPDr058lDEHRT', 'Mateo', 'Ramirez', 'editor', TRUE, '2024-12-19 14:33:29', '2024-12-27 22:16:44'),
  (10, 'anthony.hernandez5435@example.net', '$2a$12$5m5Q6jZiOu41loWosGirupPWJAZagMvUw.Awn8DL7M0beYacGPk8h', 'Owen', 'Robinson', 'support_agent', TRUE, '2023-07-30 17:32:23', '2023-08-04 00:23:52'),
  (11, 'lincoln.lee5062@example.net', '$2a$12$h0HVcduZwMwVPUaNbLI9w9NE9f2.KIyJuxD9xkqM30DlZHtVqii6k', 'Mateo', 'Parker', 'user', TRUE, '2023-10-22 20:16:08', '2023-11-07 12:23:09'),
  (12, 'ella.robinson466@example.org', '$2a$12$66gmPbYDlTU4nvhJRcLjoZkWsAL4CdMYud9WmiZh47dj4KQ.OjOU4', 'Mia', 'Murphy', 'user', TRUE, NULL, '2023-02-03 08:17:09'),
  (13, 'harper.thompson7246@example.net', '$2a$12$VsgC7O.mI1gf82890I./4TMCAa5FK.eXaNRZo2ydtOQZmdKrse/eE', 'Ella', 'Martinez', 'moderator', TRUE, '2022-10-04 18:35:02', '2022-10-13 18:07:15'),
  (14, 'avery.thomas8130@example.org', '$2a$12$yBgkxTlG87h.oGFlhiz6d8KB4Q2CnT0N6P.BT5UPPeGCeHu78EL05', 'Joseph', 'Martinez', 'editor', FALSE, NULL, '2022-08-09 02:06:27'),
  (15, 'benjamin.taylor1038@example.org', '$2a$12$RYnP3e0exyqv3l6vI8V83gpn5EMV/vdgMrN1/dXjFVmT/7LXbjGQM', 'Luke', 'White', 'admin', FALSE, '2024-02-04 09:36:48', '2024-02-09 02:25:45'),
  (16, 'mia.jones5154@example.com', '$2a$12$6i8o9UYKNdG2bgzzJYdQ9RQCfynxctVYV5.F1GEHNR84pBzVFI3LE', 'Luna', 'Martinez', 'billing_manager', TRUE, NULL, '2024-09-11 02:53:15'),
  (17, 'sophia.hall4304@example.org', '$2a$12$nGdsc9ge5Mv2g7ks3Q9DjkGY6A3mr8xSqo/QJCj4CBKd1eai3SPc3', 'Samuel', 'Torres', 'developer', TRUE, '2023-09-26 09:59:32', NULL),
  (18, 'penelope.diaz7145@example.net', '$2a$12$WHCqDEOhd32Ql6CvECezUREqsclF.JXtHIVJaC8nm8QMcyzvZ/9GD', 'Camila', 'Miller', 'moderator', FALSE, NULL, '2024-07-20 19:39:40'),
  (19, 'elijah.smith8670@example.net', '$2a$12$nXeAha4WdcI/CnUoi61dDk0fXnJMuvOE15e4fVXmPOt36zmaP1cSr', 'Luna', 'Gonzalez', 'billing_manager', TRUE, NULL, '2024-10-19 10:37:34'),
  (20, 'benjamin.jones1883@example.net', '$2a$12$PuBxgFNYMekLYSbmovc3y/pQ5MHma.cWk0y2PJfddj06ODU5KG6Do', 'David', 'Campbell', 'developer', TRUE, NULL, '2025-01-01 13:53:43'),
  (21, 'william.williams3598@example.org', '$2a$12$zKtCMhg7n0oTvrITkq1CE1VXn0wAXwY28olM0a1JaG89Be0OAwNWt', 'James', 'Green', NULL, FALSE, NULL, NULL),
  (22, 'ethan.allen9130@example.com', '$2a$12$yMdq3Sadpe7d.X0rkNz./Gl.PiztX.qUO145CXMVARj.75Updo8W.', 'John', 'Green', 'billing_manager', FALSE, '2024-05-16 06:00:42', '2024-05-27 18:04:51'),
  (23, 'oliver.brown5157@example.com', '$2a$12$DD36.F3KxxBAFQKk54CeMewkQ/O1PePVxwk9TY3Bqst2yG63jjUmH', 'Lincoln', 'Torres', 'admin', TRUE, NULL, '2022-09-27 05:18:37'),
  (24, 'emily.allen9021@example.com', '$2a$12$lOiLf6oDCjo2XFw4zAEZ.aGQbZMfpHZlFqCIvwndcv5BMlUDzPri5', 'Elijah', 'Diaz', 'developer', NULL, NULL, '2023-06-28 07:00:21'),
  (25, 'elijah.young7435@example.net', '$2a$12$TmFueD6bAWfMa1R84sQprYTUSFQZ3vYR7csw7Qp4MHjBm4xeq7A4H', 'Mia', 'Thomas', 'user', TRUE, NULL, '2024-07-01 02:33:10');

-- Table: orders (25 rows)
INSERT INTO orders (id, user_id, order_status, total_amount, shipping_address, created_at, updated_at, shipped_at, delivered_at)
VALUES
  (1, 7, 'delivered', 288.58, 'shipping_1_504', '2024-03-16 23:36:21', '2024-04-08 23:52:54', '2024-03-21 07:24:10', '2024-03-27 20:09:58'),
  (2, 1, NULL, 228.32, 'shipping_2_533', '2022-01-10 03:50:56', '2022-01-31 00:18:47', '2022-01-14 20:25:00', '2022-01-19 06:30:37'),
  (3, 2, 'cancelled', 229.98, 'shipping_3_227', NULL, '2023-12-19 09:48:50', NULL, '2023-11-25 18:47:12'),
  (4, 17, 'processing', 1, 'shipping_4_877', '2022-01-10 06:33:15', '2022-02-05 11:47:43', NULL, '2022-01-13 05:56:48'),
  (5, 18, 'processing', 210.36, 'shipping_5_447', NULL, '2022-05-03 02:44:37', '2022-04-29 12:39:03', '2022-04-30 16:02:30'),
  (6, 4, 'cancelled', 60.94, 'shipping_6_402', '2024-04-25 15:34:30', '2024-06-02 12:05:34', NULL, '2024-05-04 08:43:25'),
  (7, 5, 'cancelled', 62.93, 'shipping_7_995', NULL, '2022-10-30 00:49:27', '2022-10-29 18:54:09', NULL),
  (8, 1, 'pending', 227.91, 'shipping_8_656', '2024-02-19 06:13:36', '2024-03-14 08:22:33', '2024-02-23 00:25:00', '2024-02-24 22:06:47'),
  (9, 5, 'shipped', 357.74, 'shipping_9_490', NULL, '2024-04-24 18:55:50', '2024-04-07 22:41:19', '2024-04-09 16:04:44'),
  (10, 13, 'shipped', 205.08, 'shipping_10_297', '2023-06-19 05:29:17', '2023-07-04 16:18:44', '2023-06-23 01:49:34', '2023-06-24 03:17:01'),
  (11, 22, NULL, 49.82, 'shipping_11_243', NULL, '2022-07-18 19:55:04', '2022-06-12 00:26:17', '2022-06-21 00:18:16'),
  (12, 7, 'delivered', 298.28, 'shipping_12_310', '2022-05-03 03:37:33', '2022-05-28 08:38:14', '2022-05-07 06:58:06', '2022-05-14 02:02:54'),
  (13, 12, 'shipped', 165.83, 'shipping_13_378', NULL, '2022-11-28 08:42:42', '2022-11-19 07:52:29', '2022-11-27 08:42:07'),
  (14, 10, 'processing', 382.47, 'shipping_14_911', NULL, '2022-02-18 23:46:58', '2022-01-24 04:40:13', '2022-01-30 10:14:03'),
  (15, 1, 'processing', 139.46, 'shipping_15_216', '2023-10-31 21:25:00', '2023-12-05 07:20:07', '2023-11-04 20:00:09', '2023-11-06 11:40:50'),
  (16, 1, 'cancelled', 230.44, 'shipping_16_922', NULL, '2022-02-27 04:16:36', '2022-01-29 02:13:57', '2022-01-30 16:29:10'),
  (17, 2, 'pending', 145.26, 'shipping_17_754', NULL, '2022-10-26 07:31:59', '2022-10-18 07:20:06', '2022-10-24 21:14:07'),
  (18, 6, 'shipped', 186.8, 'shipping_18_149', NULL, '2022-05-13 20:41:30', NULL, '2022-04-20 10:53:58'),
  (19, 1, 'shipped', 196.66, 'shipping_19_474', '2023-07-10 23:51:22', '2023-07-25 11:24:01', '2023-07-12 21:32:04', NULL),
  (20, 3, 'processing', 183.27, 'shipping_20_900', NULL, '2024-07-21 22:35:26', '2024-07-07 16:21:30', '2024-07-13 14:08:05'),
  (21, 8, 'shipped', 201.38, 'shipping_21_363', '2024-03-12 03:26:29', '2024-03-24 01:47:07', NULL, '2024-03-20 11:38:35'),
  (22, 3, 'delivered', 179.41, 'shipping_22_733', NULL, '2023-06-06 14:03:47', '2023-05-17 04:38:23', '2023-05-18 07:01:37'),
  (23, 17, 'shipped', 153.56, 'shipping_23_611', NULL, '2022-04-03 12:58:10', '2022-03-09 23:40:03', '2022-03-13 17:48:17'),
  (24, 8, 'shipped', 123.25, 'shipping_24_278', '2024-07-24 07:58:24', '2024-08-31 13:39:45', '2024-07-25 04:09:49', '2024-08-03 08:38:51'),
  (25, 18, 'delivered', 39.84, 'shipping_25_901', NULL, '2022-03-11 03:16:31', '2022-02-22 18:16:32', '2022-02-24 02:19:35');

-- Table: order_items (25 rows)
INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, subtotal, created_at)
VALUES
  (1, 25, 2, 5, 204.99, 105.24, '2022-09-09 16:29:12'),
  (2, 8, 1, 3, 135.92, 78.07, '2022-11-27 19:35:32'),
  (3, 6, 1, 6, 182.78, 86.55, NULL),
  (4, 11, 6, 10, 109.85, 94.57, '2024-09-28 01:04:11'),
  (5, 6, 1, 3, 1, 121.69, '2022-07-30 05:30:01'),
  (6, 8, 11, 2, 95.86, 165.79, NULL),
  (7, 13, 19, 2, 136.74, 102.03, '2024-08-01 03:15:13'),
  (8, 10, 1, 6, 52.01, 15.6, '2023-12-05 14:14:10'),
  (9, 25, 2, 8, 105.28, 37.94, '2022-02-01 21:35:16'),
  (10, 12, 14, 10, 6.38, 222.47, '2023-11-19 21:41:29'),
  (11, 5, 11, 6, 228.14, 1, NULL),
  (12, 9, 1, 2, 1, 16.64, NULL),
  (13, 6, 5, 10, 65.19, 84.76, NULL),
  (14, 20, 4, 10, 193.79, 93.43, '2023-06-04 20:55:12'),
  (15, 12, 13, 2, 202.56, 114.73, NULL),
  (16, 14, 15, 10, 135.86, 181.54, '2022-06-18 11:39:04'),
  (17, 3, 17, 4, 44.2, 65.98, '2024-10-01 00:13:30'),
  (18, 24, 3, 7, 50.31, 165.2, '2022-02-17 00:56:18'),
  (19, 17, 1, 2, 158.57, 199.6, NULL),
  (20, 22, 1, 5, 174.33, 78.67, '2022-10-21 03:01:33'),
  (21, 4, 2, 10, 68.07, 112.79, NULL),
  (22, 15, 1, 8, 334.37, 79.98, NULL),
  (23, 10, 1, 1, 42.63, 96.15, '2023-12-21 04:34:32'),
  (24, 17, 1, 5, 274.38, 97.16, NULL),
  (25, 22, 4, 2, 70.56, 151, NULL);

-- Table: payments (25 rows)
INSERT INTO payments (id, order_id, payment_method, card_number, amount, status, transaction_reference, created_at, updated_at)
VALUES
  (1, 13, 'payment__1_665', '5100001934793403', 141.47, 'settled', 'transact_1_465', '2024-11-10 22:51:29', '2024-11-24 15:04:45'),
  (2, 1, 'payment__2_684', '370000401464302', 1, 'failed', 'transact_2_326', NULL, '2022-02-22 22:52:48'),
  (3, 7, 'payment__3_154', '4000005325833862', 102.31, 'settled', 'transact_3_465', '2022-05-26 03:31:48', '2022-06-20 15:13:27'),
  (4, 17, 'payment__4_997', '4000004032963492', 270.51, 'captured', 'transact_4_216', '2023-08-24 07:20:06', '2023-09-13 02:46:58'),
  (5, 2, 'payment__5_747', '5100009724743801', 128.21, 'authorized', 'transact_5_198', '2023-01-10 10:39:31', '2023-01-12 01:15:35'),
  (6, 22, 'payment__6_610', '370000298100035', 100.11, 'failed', 'transact_6_821', NULL, '2023-04-19 09:24:52'),
  (7, 4, 'payment__7_378', '370000304111695', 162.01, 'refunded', 'transact_7_487', NULL, '2022-07-18 21:46:03'),
  (8, 6, 'payment__8_367', '4000001537696668', 137.63, 'captured', 'transact_8_650', '2023-04-13 17:44:38', '2023-04-29 03:06:37'),
  (9, 25, 'payment__9_496', '370000261580544', 77.52, 'refunded', 'transact_9_294', '2023-03-12 12:14:53', '2023-03-27 13:02:35'),
  (10, 12, 'payment__10_347', '4000000247943915', 256.39, 'refunded', 'transact_10_755', '2023-09-22 08:03:58', '2023-09-29 09:09:38'),
  (11, 8, 'payment__11_376', '370000200369025', 145.37, 'refunded', 'transact_11_639', NULL, '2023-11-10 18:19:55'),
  (12, 19, 'payment__12_291', '370000134041120', 114.05, 'captured', 'transact_12_559', NULL, '2024-09-21 07:15:49'),
  (13, 12, 'payment__13_371', '4000005473430099', 212.44, 'settled', 'transact_13_560', '2024-03-31 06:45:47', '2024-04-08 03:15:46'),
  (14, 24, 'payment__14_562', '370000879761288', 77.22, 'refunded', 'transact_14_737', '2024-07-23 18:33:14', '2024-08-05 05:25:05'),
  (15, 24, 'payment__15_269', '4000005063350897', 67.54, 'settled', 'transact_15_184', NULL, '2023-02-23 18:20:17'),
  (16, 12, 'payment__16_701', '5100002156715314', 160.91, 'authorized', 'transact_16_783', '2024-07-12 20:59:06', '2024-07-22 00:27:53'),
  (17, 5, NULL, '5100009160263561', 147.43, 'settled', 'transact_17_703', '2024-10-19 10:28:28', '2024-11-11 22:55:33'),
  (18, 1, 'payment__18_749', '370000824345534', 156.07, 'failed', 'transact_18_968', NULL, '2023-05-18 23:08:05'),
  (19, 13, 'payment__19_922', '370000991863665', 31.46, 'failed', 'transact_19_618', '2024-07-14 08:24:10', '2024-07-22 21:24:10'),
  (20, 3, 'payment__20_798', '4000000614208231', 95.37, 'refunded', 'transact_20_392', NULL, NULL),
  (21, 12, 'payment__21_933', '5100008311295779', 121.62, 'failed', 'transact_21_649', '2023-03-20 04:14:13', '2023-04-09 05:28:48'),
  (22, 3, 'payment__22_822', '4000009906533867', 178.15, NULL, 'transact_22_452', NULL, '2024-11-16 22:38:34'),
  (23, 16, 'payment__23_388', '4000005894407338', 1, 'authorized', 'transact_23_298', '2022-01-14 10:05:51', '2022-02-13 08:25:37'),
  (24, 5, 'payment__24_253', '370000271736342', 161.11, 'refunded', 'transact_24_312', '2023-01-20 20:19:51', '2023-02-13 09:18:07'),
  (25, 20, 'payment__25_989', '4000002313539874', 86.79, 'authorized', 'transact_25_917', '2022-07-07 00:22:43', '2022-07-26 21:57:05');

-- Table: product_reviews (25 rows)
INSERT INTO product_reviews (id, product_id, user_id, rating, title, review_text, created_at)
VALUES
  (1, 3, 1, 5, 'Operational Task #1: Sync database', 'review_t_1_995', '2022-08-12 14:56:58'),
  (2, 19, 3, 4, 'Operational Task #2: Sync database', 'review_t_2_715', NULL),
  (3, 1, 2, 1, 'Operational Task #3: Configure integration', 'review_t_3_141', NULL),
  (4, 7, 4, 3, 'Operational Task #4: Optimize workflow', 'review_t_4_515', '2022-09-23 03:31:14'),
  (5, 5, 9, 4, 'Operational Task #5: Review metrics', 'review_t_5_485', '2023-06-01 23:15:19'),
  (6, 6, 6, 4, 'Operational Task #6: Optimize workflow', 'review_t_6_686', '2024-04-15 22:09:55'),
  (7, 6, 2, 3, 'Operational Task #7: Review metrics', 'review_t_7_469', '2024-08-31 05:37:14'),
  (8, 7, 3, 3, 'Operational Task #8: Review metrics', 'review_t_8_107', '2024-08-01 19:01:50'),
  (9, 4, 5, 3, 'Operational Task #9: Configure integration', 'review_t_9_851', '2022-04-10 19:26:46'),
  (10, 6, 1, 3, 'Operational Task #10: Review metrics', 'review_t_10_139', '2022-10-19 19:41:28'),
  (11, 1, 21, 5, 'Operational Task #11: Sync database', 'review_t_11_661', NULL),
  (12, 1, 1, 4, 'Operational Task #12: Sync database', 'review_t_12_464', NULL),
  (13, 1, 1, 2, 'Operational Task #13: Configure integration', 'review_t_13_124', NULL),
  (14, 1, 2, 2, 'Operational Task #14: Sync database', 'review_t_14_493', '2024-08-06 03:54:04'),
  (15, 3, 1, 3, 'Operational Task #15: Optimize workflow', 'review_t_15_427', '2024-12-12 11:37:41'),
  (16, 2, 5, 4, 'Operational Task #16: Configure integration', 'review_t_16_509', NULL),
  (17, 1, 1, 1, 'Operational Task #17: Sync database', 'review_t_17_283', NULL),
  (18, 15, 18, 2, 'Operational Task #18: Review metrics', 'review_t_18_207', '2023-11-06 16:53:34'),
  (19, 5, 1, 5, 'Operational Task #19: Review metrics', 'review_t_19_675', NULL),
  (20, 11, 1, 5, 'Operational Task #20: Optimize workflow', 'review_t_20_940', '2023-06-09 20:17:17'),
  (21, 1, 7, 4, 'Operational Task #21: Configure integration', 'review_t_21_895', '2024-03-29 11:59:38'),
  (22, 1, 3, 1, 'Operational Task #22: Sync database', 'review_t_22_196', '2022-02-20 20:45:47'),
  (23, 1, 2, 5, 'Operational Task #23: Configure integration', 'review_t_23_554', NULL),
  (24, 1, 1, 4, 'Operational Task #24: Configure integration', 'review_t_24_192', NULL),
  (25, 1, 2, 2, 'Operational Task #25: Sync database', 'review_t_25_990', '2024-08-15 20:44:27');

-- Table: user_profiles (25 rows)
INSERT INTO user_profiles (id, user_id, phone_number, street_address, city, state, postal_code, country, avatar_url, created_at, updated_at)
VALUES
  (1, 1, '+1-313-555-084', '5871 Meadowbrook Path', 'Portland', 'TX', '10115', 'USA', 'avatar_u_1_761', '2023-04-28 07:07:39', '2023-05-23 18:36:48'),
  (2, 2, '+1-830-555-062', NULL, 'Toronto', 'WA', '02108', 'USA', 'avatar_u_2_905', NULL, '2024-06-08 11:06:16'),
  (3, 1, '+1-548-555-027', NULL, 'San Jose', 'IL', '33101', 'USA', 'avatar_u_3_189', '2023-11-25 12:26:58', '2023-11-26 02:16:43'),
  (4, 1, '+1-911-555-091', NULL, 'New York', 'WA', '10115', 'USA', 'avatar_u_4_682', NULL, '2023-02-11 07:23:49'),
  (5, 5, '+1-484-555-005', '5999 Highland Way', 'Chicago', 'CA', 'M5H 2N2', 'USA', 'avatar_u_5_888', NULL, '2022-01-31 17:44:55'),
  (6, 19, '+1-707-555-095', '6721 Park Circle', 'Boston', 'WA', '60601', 'USA', 'avatar_u_6_840', NULL, '2024-01-27 07:10:19'),
  (7, 10, '+1-286-555-012', '5596 Cedar Boulevard', 'Austin', 'CO', '97201', 'USA', 'avatar_u_7_283', '2024-09-13 08:54:29', NULL),
  (8, 1, '+1-833-555-014', '1551 Pine Road', 'Portland', 'CO', 'M5H 2N2', 'USA', 'avatar_u_8_589', NULL, '2023-02-09 06:51:13'),
  (9, 2, '+1-680-555-037', '458 Riverfront Terrace', 'Boston', 'NY', 'V6B 1A1', 'DEU', 'avatar_u_9_858', '2023-02-16 07:50:22', '2023-03-16 14:24:55'),
  (10, 1, '+1-734-555-018', '3259 Broadway', 'San Jose', 'IL', '78701', 'USA', 'avatar_u_10_765', '2023-03-29 03:54:52', '2023-04-27 22:28:14'),
  (11, 4, '+1-785-555-062', '6131 Maple Avenue', NULL, 'GA', '10115', NULL, 'avatar_u_11_681', '2024-07-16 19:35:50', '2024-08-04 06:08:23'),
  (12, 21, '+1-273-555-073', '6027 Meadowbrook Path', 'Austin', 'CO', '33101', 'USA', 'avatar_u_12_712', NULL, '2025-01-06 21:29:08'),
  (13, 1, '+1-237-555-039', '865 Pine Road', 'Toronto', 'BC', '80202', 'USA', 'avatar_u_13_937', '2024-01-09 16:52:18', '2024-01-29 17:07:05'),
  (14, 1, '+1-556-555-059', '2167 Market Street', 'Miami', 'FL', '78701', 'USA', 'avatar_u_14_980', NULL, '2022-08-29 05:39:27'),
  (15, 18, '+1-782-555-034', '5044 Meadowbrook Path', NULL, 'BE', '30303', 'USA', 'avatar_u_15_545', '2023-04-02 15:07:02', '2023-04-28 01:37:19'),
  (16, 7, '+1-808-555-064', '9841 Highland Way', 'New York', 'FL', '97201', 'DEU', 'avatar_u_16_964', '2022-12-13 08:11:52', '2022-12-25 09:59:16'),
  (17, 1, '+1-691-555-035', '7626 Meadowbrook Path', 'Springfield', 'NY', 'V6B 1A1', 'CAN', 'avatar_u_17_710', '2024-06-29 06:36:56', '2024-07-25 13:18:47'),
  (18, 9, '+1-329-555-059', '4884 Pine Road', 'San Jose', 'TX', '62701', 'USA', 'avatar_u_18_865', NULL, '2023-02-23 17:28:29'),
  (19, 1, '+1-228-555-020', '3254 Meadowbrook Path', 'Seattle', 'WA', '10115', 'USA', 'avatar_u_19_173', NULL, '2024-03-05 00:01:17'),
  (20, 5, '+1-283-555-072', '1620 Meadowbrook Path', 'Denver', 'BC', '33101', 'USA', 'avatar_u_20_162', '2024-03-21 08:50:08', '2024-04-18 22:44:59'),
  (21, 1, '+1-574-555-059', '2031 Oak Street', 'New York', NULL, '78701', 'USA', 'avatar_u_21_313', '2023-06-16 02:52:15', '2023-07-05 11:44:12'),
  (22, 24, NULL, '7080 Cedar Boulevard', 'Austin', 'CA', '80202', 'USA', 'avatar_u_22_538', NULL, '2023-04-03 18:05:59'),
  (23, 2, '+1-899-555-032', NULL, 'San Jose', 'OR', '78701', 'USA', 'avatar_u_23_890', NULL, '2024-02-29 22:16:13'),
  (24, 8, '+1-661-555-051', '9321 Meadowbrook Path', 'Vancouver', 'IL', '98101', 'USA', 'avatar_u_24_550', '2022-01-26 18:07:26', '2022-02-25 08:04:15'),
  (25, 2, '+1-892-555-058', '9320 Broadway', 'Seattle', 'ON', '30303', NULL, 'avatar_u_25_641', NULL, '2024-08-15 07:13:54');

COMMIT;