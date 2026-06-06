import asyncio
import asyncpg
import bcrypt
import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://bookshop:bookshop@localhost:5432/bookshop")

USERS = [
    ("Admin", "admin@bookshop.com", 30, "admin123", 1),
    ("Иван Иванов", "ivan@example.com", 25, "password123", 2),
    ("Мария Петрова", "maria@example.com", 22, "password123", 2),
]

async def seed():
    conn = await asyncpg.connect(DATABASE_URL)
    for name, email, age, password, role_id in USERS:
        existing = await conn.fetchrow("SELECT id FROM users WHERE email=$1", email)
        if existing:
            pw_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
            await conn.execute("UPDATE users SET password_hash=$1 WHERE email=$2", pw_hash, email)
            print(f"Updated password for {email}")
        else:
            pw_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
            await conn.execute(
                "INSERT INTO users (name, email, age, password_hash, role_id) VALUES ($1,$2,$3,$4,$5)",
                name, email, age, pw_hash, role_id
            )
            print(f"Created user {email}")
    await conn.close()
    print("Seed complete!")

if __name__ == "__main__":
    asyncio.run(seed())
