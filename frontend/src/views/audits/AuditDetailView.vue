<template>
  <div v-if="audit" class="space-y-6">
    <!-- Header -->
    <div class="flex items-start justify-between gap-4">
      <div>
        <div class="flex items-center gap-2 text-sm text-gray-500 mb-1">
          <RouterLink to="/audits" class="hover:text-brand-700">Audits</RouterLink>
          <span>/</span>
          <span class="text-gray-900 font-medium">{{ audit.title }}</span>
        </div>
        <div class="flex items-center gap-3 flex-wrap">
          <h1 class="text-2xl font-bold text-gray-900">{{ audit.title }}</h1>
          <StatusBadge :status="audit.status" type="audit" />
          <CategoryBadge :category="audit.category" />
        </div>
        <div class="flex items-center gap-4 mt-2 text-sm text-gray-500">
          <span v-if="audit.location">📍 {{ audit.location }}</span>
          <span>👤 {{ audit.created_by.full_name }}</span>
          <span v-if="audit.assigned_to">🎯 {{ audit.assigned_to.full_name }}</span>
          <span>📅 {{ formatDate(audit.created_at) }}</span>
        </div>
      </div>
      <div class="flex gap-2 flex-shrink-0">
        <a :href="`/api/v1/reports/audits/${audit.id}/pdf`" target="_blank" class="btn-secondary text-xs">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          PDF
        </a>
        <select
          :value="audit.status"
          @change="updateStatus(($event.target as HTMLSelectElement).value)"
          class="input text-xs py-1.5 w-40"
        >
          <option value="draft">Entwurf</option>
          <option value="in_progress">In Bearbeitung</option>
          <option value="completed">Abgeschlossen</option>
          <option value="archived">Archiviert</option>
        </select>
      </div>
    </div>

    <!-- Progress -->
    <div class="card p-4">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm font-medium text-gray-700">Fortschritt</span>
        <span class="text-sm text-gray-500">{{ doneCount }} / {{ audit.checklist_items.length }} geprüft</span>
      </div>
      <div class="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          class="h-full bg-brand-600 rounded-full transition-all"
          :style="{ width: `${progressPercent}%` }"
        />
      </div>
      <div class="flex gap-4 mt-3 text-xs">
        <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-green-500 inline-block" /> OK: {{ counts.ok }}</span>
        <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-red-500 inline-block" /> NOK: {{ counts.nok }}</span>
        <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-gray-400 inline-block" /> N/A: {{ counts.na }}</span>
        <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Offen: {{ counts.open }}</span>
      </div>
    </div>

    <div class="grid lg:grid-cols-3 gap-6">
      <!-- Checklist -->
      <div class="lg:col-span-2 space-y-3">
        <div class="flex items-center justify-between">
          <h2 class="font-semibold text-gray-900">Checkliste</h2>
          <span class="text-sm text-gray-400">{{ audit.checklist_items.length }} Punkte</span>
        </div>

        <div v-if="audit.checklist_items.length === 0" class="card p-8 text-center text-gray-400 text-sm">
          Noch keine Prüfpunkte vorhanden.
        </div>

        <div
          v-for="item in audit.checklist_items"
          :key="item.id"
          class="card p-4"
        >
          <div class="flex items-start gap-3">
            <div class="flex-1 min-w-0">
              <p class="text-sm text-gray-900 font-medium">{{ item.text }}</p>
              <p v-if="item.category" class="text-xs text-gray-400 mt-0.5">{{ item.category }}</p>
            </div>
            <!-- Status buttons -->
            <div class="flex gap-1 flex-shrink-0">
              <button
                v-for="s in statusOptions"
                :key="s.value"
                @click="setItemStatus(item.id, s.value)"
                :class="[
                  'px-2 py-1 rounded text-xs font-medium transition-colors border',
                  item.status === s.value ? s.active : s.inactive,
                ]"
              >
                {{ s.label }}
              </button>
            </div>
          </div>
          <div v-if="item.status === 'nok' || item.comment" class="mt-3 flex gap-2">
            <textarea
              :value="item.comment || ''"
              @blur="setItemComment(item.id, ($event.target as HTMLTextAreaElement).value)"
              placeholder="Kommentar hinzufügen..."
              rows="2"
              class="input flex-1 text-xs"
            />
            <button
              v-if="item.status === 'nok'"
              @click="openActionModal(item.id)"
              class="btn-secondary text-xs whitespace-nowrap self-start"
            >
              + Maßnahme
            </button>
          </div>
        </div>
      </div>

      <!-- Sidebar: AI Summary + Actions -->
      <div class="space-y-4">
        <!-- AI Summary -->
        <div class="card p-4">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-semibold text-gray-900 text-sm">KI-Zusammenfassung</h3>
            <button
              @click="generateSummary"
              :disabled="aiLoading"
              class="btn-secondary text-xs py-1 px-2"
            >
              <span v-if="aiLoading" class="animate-spin h-3 w-3 border-2 border-gray-500 border-t-transparent rounded-full" />
              {{ aiLoading ? '...' : '✨ Analysieren' }}
            </button>
          </div>
          <div v-if="audit.ai_summary" class="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">
            {{ audit.ai_summary }}
          </div>
          <p v-else class="text-xs text-gray-400 italic">
            KI-Analyse noch nicht durchgeführt. Klicken Sie auf „Analysieren".
          </p>
        </div>

        <!-- Open action items -->
        <div class="card p-4">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-semibold text-gray-900 text-sm">Maßnahmen</h3>
            <button @click="openActionModal(null)" class="btn-secondary text-xs py-1 px-2">+ Neu</button>
          </div>
          <div v-if="auditActions.length === 0" class="text-xs text-gray-400 italic">Keine Maßnahmen.</div>
          <div v-else class="space-y-2">
            <div
              v-for="action in auditActions"
              :key="action.id"
              class="flex items-start gap-2 p-2 rounded-lg bg-gray-50"
            >
              <div class="flex-1 min-w-0">
                <p class="text-xs font-medium text-gray-900 truncate">{{ action.title }}</p>
                <div class="flex gap-1 mt-1">
                  <StatusBadge :status="action.priority" />
                  <StatusBadge :status="action.status" type="action" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Action item modal -->
    <div v-if="showActionModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="card p-6 w-full max-w-md">
        <h3 class="font-semibold text-gray-900 mb-4">Maßnahme erstellen</h3>
        <div class="space-y-3">
          <div>
            <label class="label">Titel *</label>
            <input v-model="actionForm.title" type="text" class="input" placeholder="Kurzbeschreibung der Maßnahme" required />
          </div>
          <div>
            <label class="label">Beschreibung</label>
            <textarea v-model="actionForm.description" class="input" rows="2" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="label">Priorität</label>
              <select v-model="actionForm.priority" class="input">
                <option value="low">Niedrig</option>
                <option value="medium">Mittel</option>
                <option value="high">Hoch</option>
                <option value="critical">Kritisch</option>
              </select>
            </div>
            <div>
              <label class="label">Fällig am</label>
              <input v-model="actionForm.due_date" type="date" class="input" />
            </div>
          </div>
        </div>
        <div class="flex gap-2 justify-end mt-4">
          <button @click="showActionModal = false" class="btn-secondary">Abbrechen</button>
          <button @click="createAction" class="btn-primary" :disabled="!actionForm.title">Erstellen</button>
        </div>
      </div>
    </div>
  </div>

  <div v-else class="flex items-center justify-center h-64">
    <div class="animate-spin h-8 w-8 border-4 border-brand-600 border-t-transparent rounded-full" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuditsStore } from '@/stores/audits'
import { useActionsStore } from '@/stores/actions'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import CategoryBadge from '@/components/ui/CategoryBadge.vue'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

const route = useRoute()
const auditStore = useAuditsStore()
const actionStore = useActionsStore()

const audit = computed(() => auditStore.currentAudit)
const aiLoading = ref(false)
const showActionModal = ref(false)
const selectedChecklistItemId = ref<string | null>(null)
const actionForm = ref({ title: '', description: '', priority: 'medium', due_date: '' })

const auditActions = computed(() =>
  actionStore.actions.filter((a) => a.audit_id === route.params.id)
)

const statusOptions = [
  { value: 'ok', label: 'OK', active: 'bg-green-600 text-white border-green-600', inactive: 'bg-white text-green-700 border-green-200 hover:bg-green-50' },
  { value: 'nok', label: 'NOK', active: 'bg-red-600 text-white border-red-600', inactive: 'bg-white text-red-700 border-red-200 hover:bg-red-50' },
  { value: 'na', label: 'N/A', active: 'bg-gray-500 text-white border-gray-500', inactive: 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50' },
  { value: 'open', label: 'Offen', active: 'bg-amber-500 text-white border-amber-500', inactive: 'bg-white text-amber-600 border-amber-200 hover:bg-amber-50' },
]

const counts = computed(() => {
  const items = audit.value?.checklist_items || []
  return {
    ok: items.filter((i) => i.status === 'ok').length,
    nok: items.filter((i) => i.status === 'nok').length,
    na: items.filter((i) => i.status === 'na').length,
    open: items.filter((i) => i.status === 'open').length,
  }
})

const doneCount = computed(() => counts.value.ok + counts.value.nok + counts.value.na)

const progressPercent = computed(() => {
  const total = audit.value?.checklist_items.length || 0
  return total === 0 ? 0 : Math.round((doneCount.value / total) * 100)
})

function formatDate(iso: string) {
  return format(new Date(iso), 'd. MMMM yyyy', { locale: de })
}

async function setItemStatus(itemId: string, status: string) {
  await auditStore.updateChecklistItem(String(route.params.id), itemId, { status } as any)
}

async function setItemComment(itemId: string, comment: string) {
  if (comment !== (audit.value?.checklist_items.find((i) => i.id === itemId)?.comment || '')) {
    await auditStore.updateChecklistItem(String(route.params.id), itemId, { comment } as any)
  }
}

async function updateStatus(status: string) {
  await auditStore.updateAudit(String(route.params.id), { status })
}

async function generateSummary() {
  aiLoading.value = true
  try {
    await auditStore.summarizeAudit(String(route.params.id))
  } finally {
    aiLoading.value = false
  }
}

function openActionModal(checklistItemId: string | null) {
  selectedChecklistItemId.value = checklistItemId
  actionForm.value = { title: '', description: '', priority: 'medium', due_date: '' }
  showActionModal.value = true
}

async function createAction() {
  if (!actionForm.value.title) return
  await actionStore.createAction({
    audit_id: route.params.id,
    checklist_item_id: selectedChecklistItemId.value,
    ...actionForm.value,
    due_date: actionForm.value.due_date ? new Date(actionForm.value.due_date).toISOString() : null,
  })
  showActionModal.value = false
}

onMounted(async () => {
  await auditStore.fetchAudit(String(route.params.id))
  await actionStore.fetchActions({ audit_id: String(route.params.id) })
})
</script>
