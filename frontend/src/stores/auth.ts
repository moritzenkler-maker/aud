import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/api/client'
import type { User } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('token'))

  const isAuthenticated = computed(() => !!token.value && !!user.value)

  async function login(email: string, password: string) {
    const { data } = await api.post('/auth/login', { email, password })
    token.value = data.access_token
    user.value = data.user
    localStorage.setItem('token', data.access_token)
  }

  async function register(payload: { email: string; full_name: string; company?: string; password: string }) {
    const { data } = await api.post('/auth/register', payload)
    token.value = data.access_token
    user.value = data.user
    localStorage.setItem('token', data.access_token)
  }

  async function fetchMe() {
    if (!token.value) return
    try {
      const { data } = await api.get('/users/me')
      user.value = data
    } catch {
      logout()
    }
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('token')
  }

  return { user, token, isAuthenticated, login, register, fetchMe, logout }
})
