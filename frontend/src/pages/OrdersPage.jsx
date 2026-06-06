import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getOrders } from '../services/api'

const STATUS_LABELS = { pending: 'Ожидает', paid: 'Оплачен', cancelled: 'Отменён' }

export default function OrdersPage({ user }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    getOrders().then(setOrders).finally(() => setLoading(false))
  }, [user])

  if (loading) return <div className="empty">Загрузка...</div>

  return (
    <div>
      <h1 className="page-title" style={{ marginBottom: '1.5rem' }}>Мои заказы</h1>
      {orders.length === 0 && <div className="empty">Заказов пока нет</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {orders.map(order => (
          <div key={order.id} style={{ background: '#fff', borderRadius: 8, padding: '1.2rem', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.5rem' }}>
              <span style={{ fontWeight: 600 }}>Заказ #{order.id}</span>
              <span className={`badge badge-${order.status}`}>{STATUS_LABELS[order.status] || order.status}</span>
            </div>
            <div style={{ color: '#666', fontSize: '.9rem', marginBottom: '.3rem' }}>
              {new Date(order.created_at).toLocaleDateString('ru')} · {order.items_count} позиций
            </div>
            <div style={{ fontWeight: 700, color: '#e94560' }}>{Number(order.total).toLocaleString('ru')} ₽</div>
          </div>
        ))}
      </div>
    </div>
  )
}
