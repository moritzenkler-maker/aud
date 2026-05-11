import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/api/client'
import type { Audit, AuditListItem, AuditTemplate, ChecklistItem } from '@/types'

export const useAuditsStore = defineStore('audits', () => {
  const audits = ref<AuditListItem[]>([])
  const currentAudit = ref<Audit | null>(null)
  const templates = ref<AuditTemplate[]>([])
  const loading = ref(false)

  async function fetchAudits(params?: { status?: string; category?: string }) {
    loading.value = true
    try {
      const { data } = await api.get('/audits/', { params })
      audits.value = data
    } finally {
      loading.value = false
    }
  }

  async function fetchAudit(id: string) {
    loading.value = true
    try {
      const { data } = await api.get(`/audits/${id}`)
      currentAudit.value = data
      return data as Audit
    } finally {
      loading.value = false
    }
  }

  async function createAudit(payload: object) {
    const { data } = await api.post('/audits/', payload)
    audits.value.unshift(data)
    return data as Audit
  }

  async function updateAudit(id: string, payload: object) {
    const { data } = await api.patch(`/audits/${id}`, payload)
    currentAudit.value = data
    const idx = audits.value.findIndex((a) => a.id === id)
    if (idx !== -1) audits.value[idx] = { ...audits.value[idx], ...data }
    return data as Audit
  }

  async function deleteAudit(id: string) {
    await api.delete(`/audits/${id}`)
    audits.value = audits.value.filter((a) => a.id !== id)
  }

  async function updateChecklistItem(auditId: string, itemId: string, payload: Partial<ChecklistItem>) {
    const { data } = await api.patch(`/audits/${auditId}/items/${itemId}`, payload)
    if (currentAudit.value) {
      const idx = currentAudit.value.checklist_items.findIndex((i) => i.id === itemId)
      if (idx !== -1) currentAudit.value.checklist_items[idx] = data
    }
    return data as ChecklistItem
  }

  async function fetchTemplates() {
    const { data } = await api.get('/audits/templates')
    templates.value = data
  }

  async function summarizeAudit(id: string) {
    const { data } = await api.post(`/ai/audits/${id}/summarize`)
    if (currentAudit.value) currentAudit.value.ai_summary = data.summary
    return data.summary as string
  }

  return {
    audits, currentAudit, templates, loading,
    fetchAudits, fetchAudit, createAudit, updateAudit, deleteAudit,
    updateChecklistItem, fetchTemplates, summarizeAudit,
  }
})
