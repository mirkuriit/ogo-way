import React, { useState, useEffect } from 'react'
import { Routes, Route, Link, NavLink, useNavigate } from 'react-router-dom'
import { getCurrentUser, logout } from './services/api'
import BooksPage from './pages/BooksPage'
import BookDetailPage from './pages/BookDetailPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import CartPage from './pages/CartPage'
import OrdersPage from './pages/OrdersPage'
import AdminPage from './pages/AdminPage'

// ---- Cart stored in localStorage ----
function loadCart() {
  try { return JSON.parse(localStorage.getItem('cart') || '[]') } catch { return [] }
}
function saveCart(cart) {
  localStorage.setItem('cart', JSON.stringify(cart))
}

export default function App() {
  const [user, setUser] = useState(getCurrentUser)
  const [cart, setCart] = useState(loadCart)
  const navigate = useNavigate()

  useEffect(() => { saveCart(cart) }, [cart])

  function addToCart(book) {
    setCart(prev => {
      const existing = prev.find(i => i.book_id === book.id)
      if (existing) return prev.map(i => i.book_id === book.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { book_id: book.id, title: book.title, price: book.price, quantity: 1 }]
    })
  }

  function updateQty(book_id, qty) {
    if (qty <= 0) setCart(prev => prev.filter(i => i.book_id !== book_id))
    else setCart(prev => prev.map(i => i.book_id === book_id ? { ...i, quantity: qty } : i))
  }

  function clearCart() { setCart([]) }

  function handleLogout() {
    logout()
    setUser(null)
    navigate('/')
  }

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0)

  return (
    <div className="layout">
      <header>
        <Link to="/" className="logo">📚 BookShop</Link>
        <nav>
          <NavLink to="/" end>Каталог</NavLink>
          {user ? (
            <>
              <NavLink to="/orders">Заказы</NavLink>
              {user.role === 'admin' && <NavLink to="/admin">Админ</NavLink>}
              <NavLink to="/cart">
                Корзина {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
              </NavLink>
              <span style={{ color: '#aaa', fontSize: '.85rem' }}>{user.name}</span>
              <button onClick={handleLogout} className="btn btn-secondary btn-sm">Выйти</button>
            </>
          ) : (
            <>
              <NavLink to="/cart">
                Корзина {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
              </NavLink>
              <NavLink to="/login" className="nav-btn">Войти</NavLink>
            </>
          )}
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<BooksPage onAddToCart={addToCart} />} />
          <Route path="/books/:id" element={<BookDetailPage onAddToCart={addToCart} />} />
          <Route path="/cart" element={<CartPage cart={cart} updateQty={updateQty} clearCart={clearCart} user={user} />} />
          <Route path="/login" element={<LoginPage setUser={setUser} />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/orders" element={<OrdersPage user={user} />} />
          <Route path="/admin" element={<AdminPage user={user} />} />
        </Routes>
      </main>
    </div>
  )
}
