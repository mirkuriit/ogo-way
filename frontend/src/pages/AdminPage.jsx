import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getBooks, createBook, updateBook, deleteBook,
  getCategories, createCategory, deleteCategory,
  getUsers, deleteUser,
  getOrders, updateOrderStatus
} from '../services/api'

const TABS = ['Книги', 'Категории', 'Пользователи', 'Заказы']

export default function AdminPage({ user }) {
  const navigate = useNavigate()
  const [tab, setTab] = useState(0)

  useEffect(() => {
    if (!user || user.role !== 'admin') navigate('/')
  }, [user])

  if (!user || user.role !== 'admin') return null

  return (
    <div>
      <h1 className="page-title" style={{ marginBottom: '1.5rem' }}>Панель администратора</h1>
      <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1.5rem', borderBottom: '2px solid #eee', paddingBottom: '.5rem' }}>
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => setTab(i)}
            className={`btn ${tab === i ? 'btn-primary' : 'btn-secondary'}`}
          >{t}</button>
        ))}
      </div>
      {tab === 0 && <AdminBooks />}
      {tab === 1 && <AdminCategories />}
      {tab === 2 && <AdminUsers />}
      {tab === 3 && <AdminOrders />}
    </div>
  )
}

function AdminBooks() {
  const [books, setBooks] = useState([])
  const [categories, setCategories] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editBook, setEditBook] = useState(null)
  const [form, setForm] = useState({ title: '', author: '', price: '', stock: '', category_id: '', description: '' })
  const [error, setError] = useState('')

  useEffect(() => {
    getBooks().then(setBooks)
    getCategories().then(setCategories)
  }, [])

  function openCreate() { setForm({ title: '', author: '', price: '', stock: '', category_id: '', description: '' }); setEditBook(null); setShowForm(true) }
  function openEdit(b) { setForm({ title: b.title, author: b.author, price: b.price, stock: b.stock, category_id: b.category_id || '', description: b.description || '' }); setEditBook(b); setShowForm(true) }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const data = { ...form, price: Number(form.price), stock: Number(form.stock), category_id: form.category_id || null }
    try {
      if (editBook) { const b = await updateBook(editBook.id, data); setBooks(bs => bs.map(x => x.id === b.id ? { ...x, ...b } : x)) }
      else { const b = await createBook(data); setBooks(bs => [...bs, b]) }
      setShowForm(false)
    } catch (err) { setError(err.message) }
  }

  async function handleDelete(id) {
    if (!confirm('Удалить книгу?')) return
    try { await deleteBook(id); setBooks(bs => bs.filter(b => b.id !== id)) } catch (err) { alert(err.message) }
  }

  return (
    <div>
      <div className="page-header">
        <span>{books.length} книг</span>
        <button className="btn btn-primary" onClick={openCreate}>+ Добавить</button>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{editBook ? 'Редактировать книгу' : 'Новая книга'}</span>
              <button className="modal-close" onClick={() => setShowForm(false)}>×</button>
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group"><label>Название</label><input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required /></div>
                <div className="form-group"><label>Автор</label><input value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} required /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Цена (₽)</label><input type="number" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} required /></div>
                <div className="form-group"><label>Остаток</label><input type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} required /></div>
              </div>
              <div className="form-group">
                <label>Категория</label>
                <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}>
                  <option value="">— без категории —</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group"><label>Описание</label><textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} /></div>
              <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Отмена</button>
                <button type="submit" className="btn btn-primary">Сохранить</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <table>
        <thead><tr><th>ID</th><th>Название</th><th>Автор</th><th>Цена</th><th>Остаток</th><th>Действия</th></tr></thead>
        <tbody>
          {books.map(b => (
            <tr key={b.id}>
              <td>{b.id}</td>
              <td>{b.title}</td>
              <td>{b.author}</td>
              <td>{Number(b.price).toLocaleString('ru')} ₽</td>
              <td>{b.stock}</td>
              <td>
                <button className="btn btn-secondary btn-sm" onClick={() => openEdit(b)}>✏️</button>{' '}
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(b.id)}>🗑️</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AdminCategories() {
  const [cats, setCats] = useState([])
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')

  useEffect(() => { getCategories().then(setCats) }, [])

  async function handleCreate(e) {
    e.preventDefault()
    const c = await createCategory({ name, description: desc })
    setCats(cs => [...cs, c])
    setName(''); setDesc('')
  }

  async function handleDelete(id) {
    await deleteCategory(id)
    setCats(cs => cs.filter(c => c.id !== id))
  }

  return (
    <div>
      <form onSubmit={handleCreate} style={{ display: 'flex', gap: '.5rem', marginBottom: '1.5rem', alignItems: 'flex-end' }}>
        <div className="form-group" style={{ margin: 0 }}><label>Название</label><input value={name} onChange={e => setName(e.target.value)} required /></div>
        <div className="form-group" style={{ margin: 0 }}><label>Описание</label><input value={desc} onChange={e => setDesc(e.target.value)} /></div>
        <button className="btn btn-primary">+ Добавить</button>
      </form>
      <table>
        <thead><tr><th>ID</th><th>Название</th><th>Описание</th><th></th></tr></thead>
        <tbody>
          {cats.map(c => (
            <tr key={c.id}>
              <td>{c.id}</td>
              <td>{c.name}</td>
              <td>{c.description || '—'}</td>
              <td><button className="btn btn-danger btn-sm" onClick={() => handleDelete(c.id)}>🗑️</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AdminUsers() {
  const [users, setUsers] = useState([])
  useEffect(() => { getUsers().then(setUsers) }, [])

  async function handleDelete(id) {
    if (!confirm('Удалить пользователя?')) return
    await deleteUser(id)
    setUsers(us => us.filter(u => u.id !== id))
  }

  return (
    <table>
      <thead><tr><th>ID</th><th>Имя</th><th>Email</th><th>Возраст</th><th>Роль</th><th></th></tr></thead>
      <tbody>
        {users.map(u => (
          <tr key={u.id}>
            <td>{u.id}</td>
            <td>{u.name}</td>
            <td>{u.email}</td>
            <td>{u.age ?? '—'}</td>
            <td><span className={`badge ${u.role === 'admin' ? 'badge-paid' : 'badge-pending'}`}>{u.role}</span></td>
            <td>{u.role !== 'admin' && <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u.id)}>🗑️</button>}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function AdminOrders() {
  const [orders, setOrders] = useState([])
  useEffect(() => { getOrders().then(setOrders) }, [])

  async function changeStatus(id, status) {
    await updateOrderStatus(id, status)
    setOrders(os => os.map(o => o.id === id ? { ...o, status } : o))
  }

  const STATUS_LABELS = { pending: 'Ожидает', paid: 'Оплачен', cancelled: 'Отменён' }

  return (
    <table>
      <thead><tr><th>ID</th><th>Клиент</th><th>Email</th><th>Сумма</th><th>Статус</th><th>Дата</th><th>Действия</th></tr></thead>
      <tbody>
        {orders.map(o => (
          <tr key={o.id}>
            <td>#{o.id}</td>
            <td>{o.user_name}</td>
            <td>{o.user_email}</td>
            <td>{Number(o.total).toLocaleString('ru')} ₽</td>
            <td><span className={`badge badge-${o.status}`}>{STATUS_LABELS[o.status]}</span></td>
            <td>{new Date(o.created_at).toLocaleDateString('ru')}</td>
            <td style={{ display: 'flex', gap: '.3rem' }}>
              {o.status === 'pending' && <>
                <button className="btn btn-primary btn-sm" onClick={() => changeStatus(o.id, 'paid')}>Оплачен</button>
                <button className="btn btn-danger btn-sm" onClick={() => changeStatus(o.id, 'cancelled')}>Отмена</button>
              </>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
