import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getBook } from '../services/api'

export default function BookDetailPage({ onAddToCart }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [book, setBook] = useState(null)
  const [added, setAdded] = useState(false)

  useEffect(() => {
    getBook(id).then(setBook).catch(() => navigate('/'))
  }, [id])

  if (!book) return <div className="empty">Загрузка...</div>

  function handleAdd() {
    onAddToCart(book)
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <button className="btn btn-secondary" onClick={() => navigate(-1)} style={{ marginBottom: '1.5rem' }}>← Назад</button>
      <div style={{ background: '#fff', borderRadius: 12, padding: '2rem', boxShadow: '0 2px 12px rgba(0,0,0,.08)' }}>
        <div style={{ fontSize: '4rem', textAlign: 'center', marginBottom: '1rem' }}>📖</div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '.5rem' }}>{book.title}</h1>
        <p style={{ color: '#666', marginBottom: '1rem' }}>Автор: {book.author}</p>
        <p style={{ marginBottom: '.5rem' }}>Категория: <strong>{book.category_name}</strong></p>
        {book.description && <p style={{ color: '#444', lineHeight: 1.6, marginBottom: '1rem' }}>{book.description}</p>}
        <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#e94560', marginBottom: '.5rem' }}>
          {Number(book.price).toLocaleString('ru')} ₽
        </p>
        <p style={{ color: '#888', marginBottom: '1.5rem' }}>
          {book.stock > 0 ? `В наличии: ${book.stock} шт.` : 'Нет в наличии'}
        </p>
        <button
          className="btn btn-primary"
          onClick={handleAdd}
          disabled={book.stock === 0}
          style={{ width: '100%', padding: '.8rem' }}
        >
          {added ? '✓ Добавлено в корзину' : '+ В корзину'}
        </button>
      </div>
    </div>
  )
}
