<template>
  <div class="min-h-screen bg-gradient-to-br from-brand-700 to-brand-900 flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <div class="inline-flex items-center gap-2 text-white mb-2">
          <svg class="w-9 h-9" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="40" height="40" rx="10" fill="white" fill-opacity="0.15"/>
            <path d="M12 20l6 6 10-12" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="text-3xl font-bold tracking-tight">AuditFlow</span>
        </div>
        <p class="text-brand-200 text-sm">Intelligente Audit & Compliance Plattform</p>
      </div>

      <div class="card p-8">
        <h1 class="text-xl font-semibold text-gray-900 mb-6">Anmelden</h1>
        <form @submit.prevent="handleLogin" class="space-y-4">
          <div>
            <label class="label">E-Mail</label>
            <input v-model="form.email" type="email" class="input" placeholder="max@firma.de" required />
          </div>
          <div>
            <label class="label">Passwort</label>
            <input v-model="form.password" type="password" class="input" placeholder="••••••••" required />
          </div>
          <div v-if="error" class="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {{ error }}
          </div>
          <button type="submit" class="btn-primary w-full justify-center" :disabled="loading">
            <span v-if="loading" class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
            {{ loading ? 'Anmelden...' : 'Anmelden' }}
          </button>
        </form>
        <p class="mt-4 text-center text-sm text-gray-500">
          Noch kein Konto?
          <RouterLink to="/register" class="text-brand-700 font-medium hover:underline">Registrieren</RouterLink>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

const form = ref({ email: '', password: '' })
const loading = ref(false)
const error = ref('')

async function handleLogin() {
  loading.value = true
  error.value = ''
  try {
    await auth.login(form.value.email, form.value.password)
    router.push('/')
  } catch (e: any) {
    error.value = e.response?.data?.detail || 'Anmeldung fehlgeschlagen'
  } finally {
    loading.value = false
  }
}
</script>
