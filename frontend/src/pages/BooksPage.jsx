import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getBooks, getCategories } from '../services/api'

export default function BooksPage({ onAddToCart }) {
  const [books, setBooks] = useState([])
  const [categories, setCategories] = useState([])
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [addedId, setAddedId] = useState(null)

  useEffect(() => {
    Promise.all([getBooks(), getCategories()])
      .then(([b, c]) => { setBooks(b); setCategories(c) })
      .finally(() => setLoading(false))
  }, [])

  const filtered = books.filter(b => {
    const matchSearch = b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.author.toLowerCase().includes(search.toLowerCase())
    const matchCat = !catFilter || b.category_name === catFilter
    return matchSearch && matchCat
  })

  function handleAdd(book) {
    onAddToCart(book)
    setAddedId(book.id)
    setTimeout(() => setAddedId(null), 1200)
  }

  if (loading) return <div className="empty">Загрузка...</div>

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Каталог книг</h1>
      </div>
      <div className="filters">
        <input
          placeholder="Поиск по названию или автору..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          <option value="">Все категории</option>
          {categories.map(c => <option key={c.id}>{c.name}</option>)}
        </select>
      </div>

      {filtered.length === 0 && <div className="empty">Ничего не найдено</div>}

      <div className="card-grid">
        {filtered.map(book => (
          <div className="card" key={book.id}>
            <div className="card-img">📖</div>
            <div className="card-body">
              <div className="card-title">{book.title}</div>
              <div className="card-author">{book.author}</div>
              <div className="card-stock">
                {book.stock > 0 ? `В наличии: ${book.stock}` : <span style={{ color: '#e94560' }}>Нет в наличии</span>}
              </div>
              <div className="card-price">{Number(book.price).toLocaleString('ru')} ₽</div>
            </div>
            <div className="card-actions">
              <Link to={`/books/${book.id}`} className="btn btn-secondary btn-sm">Подробнее</Link>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => handleAdd(book)}
                disabled={book.stock === 0}
              >
                {addedId === book.id ? '✓' : '+ В корзину'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
