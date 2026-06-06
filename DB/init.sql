-- ============================================================
-- Bookshop DB init script
-- ============================================================

CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,  -- 'admin', 'user'
    description TEXT
);

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    age INTEGER,
    password_hash VARCHAR(255) NOT NULL,
    role_id INTEGER NOT NULL REFERENCES roles(id) DEFAULT 2,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS books (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    description TEXT,
    cover_url TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',  -- pending, paid, cancelled
    total NUMERIC(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    book_id INTEGER NOT NULL REFERENCES books(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price NUMERIC(10,2) NOT NULL
);

-- ============================================================
-- VIEWS (минимум 3)
-- ============================================================

CREATE OR REPLACE VIEW v_books_with_category AS
SELECT b.id, b.title, b.author, b.price, b.stock, b.description, b.cover_url,
       b.created_at,
       COALESCE(c.name, 'Без категории') AS category_name
FROM books b
LEFT JOIN categories c ON b.category_id = c.id;

CREATE OR REPLACE VIEW v_orders_summary AS
SELECT o.id, o.status, o.total, o.created_at,
       u.name AS user_name, u.email AS user_email,
       COUNT(oi.id) AS items_count
FROM orders o
JOIN users u ON o.user_id = u.id
LEFT JOIN order_items oi ON oi.order_id = o.id
GROUP BY o.id, u.name, u.email;

CREATE OR REPLACE VIEW v_user_list AS
SELECT u.id, u.name, u.email, u.age, u.created_at, r.name AS role
FROM users u
JOIN roles r ON u.role_id = r.id;

-- ============================================================
-- FUNCTIONS (минимум 3)
-- ============================================================

CREATE OR REPLACE FUNCTION get_books_by_category(cat_id INTEGER)
RETURNS TABLE (id INT, title VARCHAR, author VARCHAR, price NUMERIC, stock INT) AS $$
BEGIN
    RETURN QUERY
    SELECT b.id, b.title, b.author, b.price, b.stock
    FROM books b
    WHERE b.category_id = cat_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_order_total(ord_id INTEGER)
RETURNS NUMERIC AS $$
DECLARE
    total NUMERIC;
BEGIN
    SELECT COALESCE(SUM(quantity * price), 0) INTO total
    FROM order_items
    WHERE order_id = ord_id;
    RETURN total;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_user_orders_count(usr_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
    cnt INTEGER;
BEGIN
    SELECT COUNT(*) INTO cnt FROM orders WHERE user_id = usr_id;
    RETURN cnt;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- STORED PROCEDURES (минимум 3)
-- ============================================================

CREATE OR REPLACE PROCEDURE create_order(
    p_user_id INTEGER,
    p_book_ids INTEGER[],
    p_quantities INTEGER[]
)
LANGUAGE plpgsql AS $$
DECLARE
    v_order_id INTEGER;
    v_price NUMERIC;
    i INTEGER;
BEGIN
    INSERT INTO orders (user_id, status) VALUES (p_user_id, 'pending')
    RETURNING id INTO v_order_id;

    FOR i IN 1..array_length(p_book_ids, 1) LOOP
        SELECT price INTO v_price FROM books WHERE id = p_book_ids[i];
        INSERT INTO order_items (order_id, book_id, quantity, price)
        VALUES (v_order_id, p_book_ids[i], p_quantities[i], v_price);
        UPDATE books SET stock = stock - p_quantities[i] WHERE id = p_book_ids[i];
    END LOOP;

    UPDATE orders SET total = calculate_order_total(v_order_id) WHERE id = v_order_id;
END;
$$;

CREATE OR REPLACE PROCEDURE cancel_order(p_order_id INTEGER)
LANGUAGE plpgsql AS $$
BEGIN
    -- Вернуть stock
    UPDATE books b
    SET stock = stock + oi.quantity
    FROM order_items oi
    WHERE oi.order_id = p_order_id AND oi.book_id = b.id;

    UPDATE orders SET status = 'cancelled' WHERE id = p_order_id;
END;
$$;

CREATE OR REPLACE PROCEDURE update_book_stock(p_book_id INTEGER, p_delta INTEGER)
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE books SET stock = stock + p_delta WHERE id = p_book_id;
END;
$$;

-- ============================================================
-- TRIGGERS (минимум 3)
-- ============================================================

-- 1. Обновлять total заказа при добавлении позиции
CREATE OR REPLACE FUNCTION trg_update_order_total()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE orders SET total = calculate_order_total(NEW.order_id) WHERE id = NEW.order_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_order_item_insert
AFTER INSERT OR UPDATE ON order_items
FOR EACH ROW EXECUTE FUNCTION trg_update_order_total();

-- 2. Запретить отрицательный остаток
CREATE OR REPLACE FUNCTION trg_check_stock()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.stock < 0 THEN
        RAISE EXCEPTION 'Stock cannot be negative for book %', NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_book_stock_check
BEFORE UPDATE ON books
FOR EACH ROW EXECUTE FUNCTION trg_check_stock();

-- 3. Логировать изменения статуса заказа
CREATE TABLE IF NOT EXISTS order_status_log (
    id SERIAL PRIMARY KEY,
    order_id INTEGER,
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    changed_at TIMESTAMP DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION trg_log_order_status()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO order_status_log (order_id, old_status, new_status)
        VALUES (NEW.id, OLD.status, NEW.status);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_order_status_change
AFTER UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION trg_log_order_status();

-- ============================================================
-- SEED DATA
-- ============================================================

INSERT INTO roles (name, description) VALUES
('admin', 'Администратор магазина'),
('user', 'Обычный покупатель')
ON CONFLICT (name) DO NOTHING;

-- password: admin123 (bcrypt placeholder — заменяется в runtime)
INSERT INTO users (name, email, age, password_hash, role_id) VALUES
('Admin', 'admin@bookshop.com', 30, '$2b$12$placeholder_admin_hash', 1),
('Иван Иванов', 'ivan@example.com', 25, '$2b$12$placeholder_user_hash', 2),
('Мария Петрова', 'maria@example.com', 22, '$2b$12$placeholder_user_hash2', 2)
ON CONFLICT (email) DO NOTHING;

INSERT INTO categories (name, description) VALUES
('Программирование', 'Книги по разработке ПО'),
('Художественная литература', 'Романы, повести, рассказы'),
('Наука', 'Научно-популярные книги'),
('История', 'Исторические книги и монографии')
ON CONFLICT (name) DO NOTHING;

INSERT INTO books (title, author, price, stock, category_id, description) VALUES
('Чистый код', 'Роберт Мартин', 1290.00, 15, 1, 'Классика разработки ПО'),
('Python. К вершинам мастерства', 'Лусиану Рамальо', 1490.00, 10, 1, 'Идиоматический Python'),
('Мастер и Маргарита', 'Михаил Булгаков', 590.00, 30, 2, 'Великий роман'),
('Война и мир', 'Лев Толстой', 750.00, 20, 2, 'Эпический роман'),
('Краткая история времени', 'Стивен Хокинг', 890.00, 12, 3, 'Физика для всех'),
('Сапиенс', 'Юваль Ной Харари', 990.00, 18, 3, 'История человечества'),
('История России', 'Николай Карамзин', 650.00, 8, 4, 'Классическая история'),
('Архипелаг ГУЛАГ', 'Александр Солженицын', 850.00, 7, 4, 'Документальный роман');
