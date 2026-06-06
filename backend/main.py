"""
main.py — точка входа FastAPI приложения
Интернет-магазин книг (BookShop)
"""
import os
import asyncpg
import bcrypt
import jwt
from datetime import datetime, timedelta, timezone
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr, field_validator

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://bookshop:bookshop@db:5432/bookshop")
SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey_change_in_prod")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 1 day

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

_pool: asyncpg.Pool = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global _pool
    _pool = await asyncpg.create_pool(DATABASE_URL, min_size=2, max_size=10)
    yield
    await _pool.close()

def get_pool() -> asyncpg.Pool:
    return _pool

def create_access_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception

    row = await _pool.fetchrow("SELECT * FROM v_user_list WHERE id=$1", user_id)
    if not row:
        raise credentials_exception
    return dict(row)


async def require_admin(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

app = FastAPI(title="BookShop API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    age: Optional[int] = None
    password: str

    @field_validator("age")
    @classmethod
    def age_positive(cls, v):
        if v is not None and v <= 0:
            raise ValueError("age must be positive")
        return v


@app.post("/auth/register", status_code=201, tags=["auth"])
async def register(data: RegisterRequest):
    existing = await _pool.fetchrow("SELECT id FROM users WHERE email=$1", data.email)
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")
    pw_hash = bcrypt.hashpw(data.password.encode(), bcrypt.gensalt()).decode()
    user = await _pool.fetchrow(
        "INSERT INTO users (name, email, age, password_hash, role_id) VALUES ($1,$2,$3,$4,2) RETURNING id, name, email, age",
        data.name, data.email, data.age, pw_hash
    )
    return dict(user)


@app.post("/auth/login", tags=["auth"])
async def login(form: OAuth2PasswordRequestForm = Depends()):
    user = await _pool.fetchrow("SELECT * FROM users WHERE email=$1", form.username)
    if not user or not bcrypt.checkpw(form.password.encode(), user["password_hash"].encode()):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    role = await _pool.fetchval("SELECT name FROM roles WHERE id=$1", user["role_id"])
    token = create_access_token({"sub": user["id"], "role": role})
    return {"access_token": token, "token_type": "bearer", "role": role, "name": user["name"]}


@app.get("/auth/me", tags=["auth"])
async def me(current_user: dict = Depends(get_current_user)):
    return current_user


from api import books_router, users_router, categories_router, orders_router

app.include_router(books_router)
app.include_router(users_router)
app.include_router(categories_router)
app.include_router(orders_router)


@app.get("/", tags=["health"])
async def root():
    return {"status": "ok", "app": "BookShop API"}
