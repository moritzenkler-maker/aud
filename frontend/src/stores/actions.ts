import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/api/client'
import type { ActionItem } from '@/types'

export const useActionsStore = defineStore('actions', () => {
  const actions = ref<ActionItem[]>([])
  const loading = ref(false)

  async function fetchActions(params?: { status?: string; priority?: string; audit_id?: string }) {
    loading.value = true
    try {
      const { data } = await api.get('/actions/', { params })
      actions.value = data
    } finally {
      loading.value = false
    }
  }

  async function createAction(payload: object) {
    const { data } = await api.post('/actions/', payload)
    actions.value.unshift(data)
    return data as ActionItem
  }

  async function updateAction(id: string, payload: object) {
    const { data } = await api.patch(`/actions/${id}`, payload)
    const idx = actions.value.findIndex((a) => a.id === id)
    if (idx !== -1) actions.value[idx] = data
    return data as ActionItem
  }

  async function deleteAction(id: string) {
    await api.delete(`/actions/${id}`)
    actions.value = actions.value.filter((a) => a.id !== id)
  }

  return { actions, loading, fetchActions, createAction, updateAction, deleteAction }
})
