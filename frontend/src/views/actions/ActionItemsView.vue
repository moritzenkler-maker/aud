<template>
  <div class="space-y-5">
    <!-- Toolbar -->
    <div class="flex items-center gap-3 flex-wrap">
      <div class="flex-1 min-w-0">
        <input v-model="search" type="search" class="input max-w-xs" placeholder="Maßnahmen durchsuchen..." />
      </div>
      <div class="flex gap-2">
        <select v-model="filterStatus" class="input py-2 text-sm w-40">
          <option value="">Alle Status</option>
          <option value="open">Offen</option>
          <option value="in_progress">In Bearbeitung</option>
          <option value="done">Erledigt</option>
          <option value="cancelled">Abgebrochen</option>
        </select>
        <select v-model="filterPriority" class="input py-2 text-sm w-36">
          <option value="">Alle Prioritäten</option>
          <option value="critical">Kritisch</option>
          <option value="high">Hoch</option>
          <option value="medium">Mittel</option>
          <option value="low">Niedrig</option>
        </select>
      </div>
    </div>

    <!-- Kanban-style columns -->
    <div class="grid md:grid-cols-3 gap-4">
      <div v-for="col in columns" :key="col.status" class="space-y-3">
        <div class="flex items-center gap-2">
          <div :class="['w-2.5 h-2.5 rounded-full', col.dot]" />
          <h3 class="font-semibold text-gray-700 text-sm">{{ col.label }}</h3>
          <span class="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
            {{ byStatus(col.status).length }}
          </span>
        </div>
        <div class="space-y-2 min-h-[80px]">
          <div
            v-for="action in byStatus(col.status)"
            :key="action.id"
            class="card p-4 cursor-pointer hover:shadow-md transition-shadow"
            @click="editAction(action)"
          >
            <div class="flex items-start justify-between gap-2">
              <p class="text-sm font-medium text-gray-900 leading-snug">{{ action.title }}</p>
              <StatusBadge :status="action.priority" class="flex-shrink-0" />
            </div>
            <p v-if="action.description" class="text-xs text-gray-500 mt-1.5 line-clamp-2">{{ action.description }}</p>
            <div class="flex items-center gap-3 mt-2.5 text-xs text-gray-400">
              <span v-if="action.assigned_to">👤 {{ action.assigned_to.full_name }}</span>
              <span v-if="action.due_date" :class="isOverdue(action.due_date) && action.status !== 'done' ? 'text-red-500 font-medium' : ''">
                📅 {{ formatDate(action.due_date) }}
              </span>
            </div>
            <!-- Quick status change -->
            <div class="flex gap-1 mt-3 border-t border-gray-100 pt-2">
              <button
                v-for="s in quickStatuses.filter(qs => qs.value !== action.status)"
                :key="s.value"
                @click.stop="updateStatus(action.id, s.value)"
                :class="['text-xs px-2 py-0.5 rounded border transition-colors', s.cls]"
              >
                {{ s.label }}
              </button>
              <button
                @click.stop="handleDelete(action.id)"
                class="ml-auto text-gray-300 hover:text-red-400 text-xs"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="store.loading" class="flex justify-center py-8">
      <div class="animate-spin h-8 w-8 border-4 border-brand-600 border-t-transparent rounded-full" />
    </div>

    <!-- Edit modal -->
    <div v-if="editingAction" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="card p-6 w-full max-w-md">
        <h3 class="font-semibold text-gray-900 mb-4">Maßnahme bearbeiten</h3>
        <div class="space-y-3">
          <div>
            <label class="label">Titel</label>
            <input v-model="editForm.title" type="text" class="input" />
          </div>
          <div>
            <label class="label">Beschreibung</label>
            <textarea v-model="editForm.description" class="input" rows="3" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="label">Status</label>
              <select v-model="editForm.status" class="input">
                <option value="open">Offen</option>
                <option value="in_progress">In Bearbeitung</option>
                <option value="done">Erledigt</option>
                <option value="cancelled">Abgebrochen</option>
              </select>
            </div>
            <div>
              <label class="label">Priorität</label>
              <select v-model="editForm.priority" class="input">
                <option value="low">Niedrig</option>
                <option value="medium">Mittel</option>
                <option value="high">Hoch</option>
                <option value="critical">Kritisch</option>
              </select>
            </div>
          </div>
          <div>
            <label class="label">Fällig am</label>
            <input v-model="editForm.due_date" type="date" class="input w-48" />
          </div>
        </div>
        <div class="flex gap-2 justify-end mt-4">
          <button @click="editingAction = null" class="btn-secondary">Abbrechen</button>
          <button @click="saveEdit" class="btn-primary">Speichern</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useActionsStore } from '@/stores/actions'
import type { ActionItem } from '@/types'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import { format, isPast } from 'date-fns'
import { de } from 'date-fns/locale'

const store = useActionsStore()
const search = ref('')
const filterStatus = ref('')
const filterPriority = ref('')
const editingAction = ref<ActionItem | null>(null)
const editForm = ref({ title: '', description: '', status: '', priority: '', due_date: '' })

const columns = [
  { status: 'open', label: 'Offen', dot: 'bg-blue-500' },
  { status: 'in_progress', label: 'In Bearbeitung', dot: 'bg-yellow-500' },
  { status: 'done', label: 'Erledigt', dot: 'bg-green-500' },
]

const quickStatuses = [
  { value: 'open', label: 'Offen', cls: 'text-blue-600 border-blue-200 hover:bg-blue-50' },
  { value: 'in_progress', label: 'Starten', cls: 'text-yellow-600 border-yellow-200 hover:bg-yellow-50' },
  { value: 'done', label: 'Erledigt', cls: 'text-green-600 border-green-200 hover:bg-green-50' },
]

const filtered = computed(() => {
  let list = store.actions
  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter((a) => a.title.toLowerCase().includes(q))
  }
  return list
})

function byStatus(status: string) {
  return filtered.value.filter((a) => a.status === status)
}

function formatDate(iso: string) {
  return format(new Date(iso), 'd. MMM', { locale: de })
}

function isOverdue(iso: string) {
  return isPast(new Date(iso))
}

async function updateStatus(id: string, status: string) {
  await store.updateAction(id, { status })
}

async function handleDelete(id: string) {
  if (!confirm('Maßnahme wirklich löschen?')) return
  await store.deleteAction(id)
}

function editAction(action: ActionItem) {
  editingAction.value = action
  editForm.value = {
    title: action.title,
    description: action.description || '',
    status: action.status,
    priority: action.priority,
    due_date: action.due_date ? action.due_date.substring(0, 10) : '',
  }
}

async function saveEdit() {
  if (!editingAction.value) return
  await store.updateAction(editingAction.value.id, {
    ...editForm.value,
    due_date: editForm.value.due_date ? new Date(editForm.value.due_date).toISOString() : null,
  })
  editingAction.value = null
}

watch([filterStatus, filterPriority], () => {
  store.fetchActions({
    status: filterStatus.value || undefined,
    priority: filterPriority.value || undefined,
  })
})

onMounted(() => store.fetchActions())
</script>
