import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { createOrder } from '../services/api'

export default function CartPage({ cart, updateQty, clearCart, user }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0)

  async function handleCheckout() {
    if (!user) { navigate('/login'); return }
    setLoading(true)
    setError('')
    try {
      await createOrder(cart.map(i => ({ book_id: i.book_id, quantity: i.quantity })))
      clearCart()
      navigate('/orders')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (cart.length === 0) {
    return (
      <div>
        <h1 className="page-title" style={{ marginBottom: '1.5rem' }}>Корзина</h1>
        <div className="empty">
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛒</div>
          <p>Корзина пуста</p>
          <Link to="/" className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-block' }}>В каталог</Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <div className="page-header">
        <h1 className="page-title">Корзина</h1>
        <button className="btn btn-secondary btn-sm" onClick={clearCart}>Очистить</button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div style={{ background: '#fff', borderRadius: 8, padding: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,.06)', marginBottom: '1rem' }}>
        {cart.map(item => (
          <div key={item.book_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '.7rem 0', borderBottom: '1px solid #f0f0f0' }}>
            <div>
              <div style={{ fontWeight: 600 }}>{item.title}</div>
              <div style={{ color: '#e94560' }}>{Number(item.price).toLocaleString('ru')} ₽</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => updateQty(item.book_id, item.quantity - 1)}>−</button>
              <span style={{ minWidth: 24, textAlign: 'center' }}>{item.quantity}</span>
              <button className="btn btn-secondary btn-sm" onClick={() => updateQty(item.book_id, item.quantity + 1)}>+</button>
              <button className="btn btn-danger btn-sm" onClick={() => updateQty(item.book_id, 0)}>✕</button>
            </div>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '.7rem 0 0', fontWeight: 700, fontSize: '1.1rem' }}>
          <span>Итого:</span>
          <span style={{ color: '#e94560' }}>{Number(total).toLocaleString('ru')} ₽</span>
        </div>
      </div>

      <button
        className="btn btn-primary"
        style={{ width: '100%', padding: '.9rem', fontSize: '1rem' }}
        onClick={handleCheckout}
        disabled={loading}
      >
        {loading ? 'Оформляем...' : user ? 'Оформить заказ' : 'Войдите для оформления'}
      </button>
    </div>
  )
}
