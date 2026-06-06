const BASE = '/api'

function getToken() {
  return localStorage.getItem('token')
}

function setToken(token) {
  localStorage.setItem('token', token)
}

function clearToken() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}

async function request(method, path, body = null) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (res.status === 204) return null
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Request failed')
  return data
}

// Auth
export async function login(email, password) {
  const form = new URLSearchParams({ username: email, password })
  const res = await fetch(BASE + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Login failed')
  setToken(data.access_token)
  const user = { name: data.name, role: data.role }
  localStorage.setItem('user', JSON.stringify(user))
  return user
}

export async function register(name, email, age, password) {
  return request('POST', '/auth/register', { name, email, age: age || null, password })
}

export function logout() {
  clearToken()
}

export function getCurrentUser() {
  const raw = localStorage.getItem('user')
  return raw ? JSON.parse(raw) : null
}

// Books
export const getBooks = () => request('GET', '/books/')
export const getBook = (id) => request('GET', `/books/${id}`)
export const createBook = (data) => request('POST', '/books/', data)
export const updateBook = (id, data) => request('PATCH', `/books/${id}`, data)
export const deleteBook = (id) => request('DELETE', `/books/${id}`)

// Categories
export const getCategories = () => request('GET', '/categories/')
export const createCategory = (data) => request('POST', '/categories/', data)
export const deleteCategory = (id) => request('DELETE', `/categories/${id}`)

// Users (admin)
export const getUsers = () => request('GET', '/users/')
export const getUser = (id) => request('GET', `/users/${id}`)
export const createUser = (data) => request('POST', '/users/', data)
export const updateUser = (id, data) => request('PATCH', `/users/${id}`, data)
export const deleteUser = (id) => request('DELETE', `/users/${id}`)

// Orders
export const getOrders = () => request('GET', '/orders/')
export const getOrder = (id) => request('GET', `/orders/${id}`)
export const createOrder = (items) => request('POST', '/orders/', { items })
export const updateOrderStatus = (id, status) => request('PATCH', `/orders/${id}/status`, { status })
