import asyncpg
from typing import Optional

async def get_all_books(pool: asyncpg.Pool) -> list[dict]:
    rows = await pool.fetch("SELECT * FROM v_books_with_category ORDER BY id")
    return [dict(r) for r in rows]


async def get_book(pool: asyncpg.Pool, book_id: int) -> Optional[dict]:
    row = await pool.fetchrow("SELECT * FROM v_books_with_category WHERE id=$1", book_id)
    return dict(row) if row else None


async def create_book(pool: asyncpg.Pool, data: dict) -> dict:
    row = await pool.fetchrow(
        """INSERT INTO books (title, author, price, stock, category_id, description, cover_url)
           VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *""",
        data["title"], data["author"], data["price"],
        data.get("stock", 0), data.get("category_id"),
        data.get("description"), data.get("cover_url")
    )
    return dict(row)


async def update_book(pool: asyncpg.Pool, book_id: int, data: dict) -> Optional[dict]:
    existing = await pool.fetchrow("SELECT * FROM books WHERE id=$1", book_id)
    if not existing:
        return None
    row = await pool.fetchrow(
        """UPDATE books SET
             title=COALESCE($1, title),
             author=COALESCE($2, author),
             price=COALESCE($3, price),
             stock=COALESCE($4, stock),
             category_id=COALESCE($5, category_id),
             description=COALESCE($6, description),
             cover_url=COALESCE($7, cover_url)
           WHERE id=$8 RETURNING *""",
        data.get("title"), data.get("author"), data.get("price"),
        data.get("stock"), data.get("category_id"),
        data.get("description"), data.get("cover_url"), book_id
    )
    return dict(row)


async def delete_book(pool: asyncpg.Pool, book_id: int) -> bool:
    result = await pool.execute("DELETE FROM books WHERE id=$1", book_id)
    return result == "DELETE 1"


async def get_all_users(pool: asyncpg.Pool) -> list[dict]:
    rows = await pool.fetch("SELECT * FROM v_user_list ORDER BY id")
    return [dict(r) for r in rows]


async def get_user(pool: asyncpg.Pool, user_id: int) -> Optional[dict]:
    row = await pool.fetchrow("SELECT * FROM v_user_list WHERE id=$1", user_id)
    return dict(row) if row else None


async def get_user_by_email(pool: asyncpg.Pool, email: str) -> Optional[dict]:
    row = await pool.fetchrow("SELECT * FROM users WHERE email=$1", email)
    return dict(row) if row else None


async def create_user(pool: asyncpg.Pool, name: str, email: str, age: Optional[int], password_hash: str) -> dict:
    row = await pool.fetchrow(
        """INSERT INTO users (name, email, age, password_hash, role_id)
           VALUES ($1,$2,$3,$4,2) RETURNING id, name, email, age""",
        name, email, age, password_hash
    )
    return dict(row)


async def update_user(pool: asyncpg.Pool, user_id: int, data: dict) -> Optional[dict]:
    row = await pool.fetchrow(
        """UPDATE users SET
             name=COALESCE($1, name),
             email=COALESCE($2, email),
             age=COALESCE($3, age)
           WHERE id=$4 RETURNING id, name, email, age""",
        data.get("name"), data.get("email"), data.get("age"), user_id
    )
    return dict(row) if row else None


async def delete_user(pool: asyncpg.Pool, user_id: int) -> bool:
    result = await pool.execute("DELETE FROM users WHERE id=$1", user_id)
    return result == "DELETE 1"


async def get_all_categories(pool: asyncpg.Pool) -> list[dict]:
    rows = await pool.fetch("SELECT * FROM categories ORDER BY id")
    return [dict(r) for r in rows]


async def create_category(pool: asyncpg.Pool, name: str, description: str = None) -> dict:
    row = await pool.fetchrow(
        "INSERT INTO categories (name, description) VALUES ($1,$2) RETURNING *",
        name, description
    )
    return dict(row)


async def delete_category(pool: asyncpg.Pool, cat_id: int) -> bool:
    result = await pool.execute("DELETE FROM categories WHERE id=$1", cat_id)
    return result == "DELETE 1"


async def get_orders(pool: asyncpg.Pool, user_id: Optional[int] = None) -> list[dict]:
    if user_id:
        rows = await pool.fetch(
            "SELECT * FROM v_orders_summary WHERE user_email=(SELECT email FROM users WHERE id=$1) ORDER BY id DESC",
            user_id
        )
    else:
        rows = await pool.fetch("SELECT * FROM v_orders_summary ORDER BY id DESC")
    return [dict(r) for r in rows]


async def get_order(pool: asyncpg.Pool, order_id: int) -> Optional[dict]:
    row = await pool.fetchrow("SELECT * FROM v_orders_summary WHERE id=$1", order_id)
    if not row:
        return None
    order = dict(row)
    items = await pool.fetch(
        """SELECT oi.*, b.title, b.author FROM order_items oi
           JOIN books b ON b.id = oi.book_id
           WHERE oi.order_id=$1""", order_id
    )
    order["items"] = [dict(i) for i in items]
    return order


async def create_order(pool: asyncpg.Pool, user_id: int, items: list[dict]) -> dict:
    """items: [{book_id, quantity}, ...]"""
    async with pool.acquire() as conn:
        async with conn.transaction():
            order = await conn.fetchrow(
                "INSERT INTO orders (user_id, status) VALUES ($1,'pending') RETURNING *",
                user_id
            )
            order_id = order["id"]
            for item in items:
                book = await conn.fetchrow("SELECT price, stock FROM books WHERE id=$1", item["book_id"])
                if not book or book["stock"] < item["quantity"]:
                    raise ValueError(f"Insufficient stock for book {item['book_id']}")
                await conn.execute(
                    "INSERT INTO order_items (order_id, book_id, quantity, price) VALUES ($1,$2,$3,$4)",
                    order_id, item["book_id"], item["quantity"], book["price"]
                )
                await conn.execute(
                    "UPDATE books SET stock=stock-$1 WHERE id=$2",
                    item["quantity"], item["book_id"]
                )
            total = await conn.fetchval("SELECT calculate_order_total($1)", order_id)
            await conn.execute("UPDATE orders SET total=$1 WHERE id=$2", total, order_id)
    return await get_order(pool, order_id)


async def update_order_status(pool: asyncpg.Pool, order_id: int, status: str) -> Optional[dict]:
    row = await pool.fetchrow(
        "UPDATE orders SET status=$1 WHERE id=$2 RETURNING *", status, order_id
    )
    return dict(row) if row else None
