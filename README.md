# BookShop — интернет-магазин книг

## Запуск

```bash
docker compose up --build
```

- Frontend: http://localhost:3000  
- Backend API: http://localhost:8000  
- Swagger UI: http://localhost:8000/docs

## Первый запуск: создание пользователей

```bash
# После запуска контейнеров:
docker compose exec backend python seed.py
```

## Тестовые аккаунты

| Email | Пароль | Роль |
|-------|--------|------|
| admin@bookshop.com | admin123 | Администратор |
| ivan@example.com | password123 | Пользователь |

## Структура проекта

```
bookshop/
├── backend/
│   ├── main.py        # FastAPI app, auth, lifespan
│   ├── api.py         # Роутеры (books, users, categories, orders)
│   ├── repository.py  # Слой работы с БД (asyncpg)
│   ├── seed.py        # Заполнение тестовыми данными
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── App.jsx            # Роутинг, корзина (LocalStorage)
│       ├── pages/             # BooksPage, CartPage, AdminPage ...
│       └── services/api.js    # fetch-обёртка, JWT в LocalStorage
├── DB/
│   └── init.sql       # Таблицы, представления, функции, процедуры, триггеры
└── docker-compose.yml
```

## API endpoints

### Auth
| Метод | URL | Описание |
|-------|-----|----------|
| POST | /auth/register | Регистрация |
| POST | /auth/login | Вход (JWT) |
| GET | /auth/me | Текущий пользователь |

### Books
| Метод | URL | Описание |
|-------|-----|----------|
| GET | /books/ | Список всех книг |
| GET | /books/{id} | Книга по ID |
| POST | /books/ | Создать (admin) |
| PATCH | /books/{id} | Обновить (admin) |
| DELETE | /books/{id} | Удалить (admin) |

### Users
| Метод | URL | Описание |
|-------|-----|----------|
| GET | /users/ | Список пользователей (admin) |
| GET | /users/{id} | Пользователь по ID (admin) |
| POST | /users/ | Создать пользователя (admin) |
| PATCH | /users/{id} | Обновить (admin) |
| DELETE | /users/{id} | Удалить (admin) |

### Orders
| Метод | URL | Описание |
|-------|-----|----------|
| GET | /orders/ | Заказы (свои / все для admin) |
| GET | /orders/{id} | Заказ по ID |
| POST | /orders/ | Создать заказ |
| PATCH | /orders/{id}/status | Обновить статус (admin) |
