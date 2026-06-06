import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register } from '../services/api'

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', age: '', password: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const navigate = useNavigate()

  function set(field) { return e => setForm(f => ({ ...f, [field]: e.target.value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      await register(form.name, form.email, form.age ? Number(form.age) : null, form.password)
      setSuccess(true)
      setTimeout(() => navigate('/login'), 1500)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="auth-container">
      <h2 className="auth-title">Регистрация</h2>
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">Аккаунт создан! Перенаправление...</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Имя</label>
          <input value={form.name} onChange={set('name')} required />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input type="email" value={form.email} onChange={set('email')} required />
        </div>
        <div className="form-group">
          <label>Возраст (необязательно)</label>
          <input type="number" value={form.age} onChange={set('age')} min="1" max="120" />
        </div>
        <div className="form-group">
          <label>Пароль</label>
          <input type="password" value={form.password} onChange={set('password')} required minLength={6} />
        </div>
        <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Зарегистрироваться</button>
      </form>
      <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '.9rem' }}>
        Уже есть аккаунт? <Link to="/login">Войти</Link>
      </p>
    </div>
  )
}
