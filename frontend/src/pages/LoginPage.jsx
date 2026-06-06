// LoginPage.jsx
import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login } from '../services/api'

export function LoginPage({ setUser }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      const user = await login(email, password)
      setUser(user)
      navigate('/')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="auth-container">
      <h2 className="auth-title">Вход</h2>
      {error && <div className="alert alert-error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Пароль</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Войти</button>
      </form>
      <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '.9rem' }}>
        Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
      </p>
      <p style={{ textAlign: 'center', marginTop: '.5rem', fontSize: '.8rem', color: '#888' }}>
        Демо: admin@bookshop.com / admin123
      </p>
    </div>
  )
}

export default LoginPage
