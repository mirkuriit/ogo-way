from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from main import get_pool, get_current_user, require_admin
import asyncpg
import repository as repo

class BookCreate(BaseModel):
    title: str
    author: str
    price: float
    stock: int = 0
    category_id: Optional[int] = None
    description: Optional[str] = None
    cover_url: Optional[str] = None

class BookUpdate(BaseModel):
    title: Optional[str] = None
    author: Optional[str] = None
    price: Optional[float] = None
    stock: Optional[int] = None
    category_id: Optional[int] = None
    description: Optional[str] = None
    cover_url: Optional[str] = None

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    age: Optional[int] = None

    @field_validator("age")
    @classmethod
    def age_must_be_positive(cls, v):
        if v is not None and v <= 0:
            raise ValueError("age must be positive")
        return v

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    age: Optional[int] = None

class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None

class OrderCreate(BaseModel):
    items: list[dict]  # [{book_id, quantity}]

class OrderStatusUpdate(BaseModel):
    status: str

books_router = APIRouter(prefix="/books", tags=["books"])
users_router = APIRouter(prefix="/users", tags=["users"])
categories_router = APIRouter(prefix="/categories", tags=["categories"])
orders_router = APIRouter(prefix="/orders", tags=["orders"])

@books_router.get("/")
async def list_books(pool: asyncpg.Pool = Depends(get_pool)):
    return await repo.get_all_books(pool)

@books_router.get("/{book_id}")
async def get_book(book_id: int, pool: asyncpg.Pool = Depends(get_pool)):
    book = await repo.get_book(pool, book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    return book

@books_router.post("/", status_code=201, dependencies=[Depends(require_admin)])
async def create_book(data: BookCreate, pool: asyncpg.Pool = Depends(get_pool)):
    return await repo.create_book(pool, data.model_dump())

@books_router.patch("/{book_id}", dependencies=[Depends(require_admin)])
async def update_book(book_id: int, data: BookUpdate, pool: asyncpg.Pool = Depends(get_pool)):
    book = await repo.update_book(pool, book_id, data.model_dump(exclude_none=True))
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    return book

@books_router.delete("/{book_id}", status_code=204, dependencies=[Depends(require_admin)])
async def delete_book(book_id: int, pool: asyncpg.Pool = Depends(get_pool)):
    if not await repo.delete_book(pool, book_id):
        raise HTTPException(status_code=404, detail="Book not found")

@users_router.get("/")
async def list_users(pool: asyncpg.Pool = Depends(get_pool), _=Depends(require_admin)):
    return await repo.get_all_users(pool)

@users_router.get("/{user_id}")
async def get_user(user_id: int, pool: asyncpg.Pool = Depends(get_pool), _=Depends(require_admin)):
    user = await repo.get_user(pool, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@users_router.post("/", status_code=201, dependencies=[Depends(require_admin)])
async def create_user(data: UserCreate, pool: asyncpg.Pool = Depends(get_pool)):
    existing = await repo.get_user_by_email(pool, data.email)
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")
    import bcrypt
    pw_hash = bcrypt.hashpw(b"changeme", bcrypt.gensalt()).decode()
    return await repo.create_user(pool, data.name, data.email, data.age, pw_hash)

@users_router.patch("/{user_id}", dependencies=[Depends(require_admin)])
async def update_user(user_id: int, data: UserUpdate, pool: asyncpg.Pool = Depends(get_pool)):
    user = await repo.update_user(pool, user_id, data.model_dump(exclude_none=True))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@users_router.delete("/{user_id}", status_code=204, dependencies=[Depends(require_admin)])
async def delete_user(user_id: int, pool: asyncpg.Pool = Depends(get_pool)):
    if not await repo.delete_user(pool, user_id):
        raise HTTPException(status_code=404, detail="User not found")

@categories_router.get("/")
async def list_categories(pool: asyncpg.Pool = Depends(get_pool)):
    return await repo.get_all_categories(pool)

@categories_router.post("/", status_code=201, dependencies=[Depends(require_admin)])
async def create_category(data: CategoryCreate, pool: asyncpg.Pool = Depends(get_pool)):
    return await repo.create_category(pool, data.name, data.description)

@categories_router.delete("/{cat_id}", status_code=204, dependencies=[Depends(require_admin)])
async def delete_category(cat_id: int, pool: asyncpg.Pool = Depends(get_pool)):
    if not await repo.delete_category(pool, cat_id):
        raise HTTPException(status_code=404, detail="Category not found")

@orders_router.get("/")
async def list_orders(pool: asyncpg.Pool = Depends(get_pool), current_user=Depends(get_current_user)):
    if current_user["role"] == "admin":
        return await repo.get_orders(pool)
    return await repo.get_orders(pool, user_id=current_user["id"])

@orders_router.get("/{order_id}")
async def get_order(order_id: int, pool: asyncpg.Pool = Depends(get_pool), current_user=Depends(get_current_user)):
    order = await repo.get_order(pool, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

@orders_router.post("/", status_code=201)
async def create_order(data: OrderCreate, pool: asyncpg.Pool = Depends(get_pool), current_user=Depends(get_current_user)):
    try:
        return await repo.create_order(pool, current_user["id"], data.items)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@orders_router.patch("/{order_id}/status", dependencies=[Depends(require_admin)])
async def update_status(order_id: int, data: OrderStatusUpdate, pool: asyncpg.Pool = Depends(get_pool)):
    order = await repo.update_order_status(pool, order_id, data.status)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order
