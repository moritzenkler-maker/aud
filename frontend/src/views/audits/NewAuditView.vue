<template>
  <div class="max-w-2xl mx-auto space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Neues Audit erstellen</h1>
      <p class="text-gray-500 text-sm mt-1">Wählen Sie eine Vorlage oder erstellen Sie ein leeres Audit</p>
    </div>

    <form @submit.prevent="handleCreate" class="space-y-5">
      <!-- Basic info -->
      <div class="card p-6 space-y-4">
        <h2 class="font-semibold text-gray-900">Allgemeine Informationen</h2>

        <div>
          <label class="label">Titel *</label>
          <input v-model="form.title" type="text" class="input" placeholder="z.B. Jahres-Arbeitssicherheits-Audit 2025" required />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="label">Kategorie</label>
            <select v-model="form.category" class="input">
              <option value="general">Allgemein</option>
              <option value="safety">Arbeitssicherheit</option>
              <option value="fire">Brandschutz</option>
              <option value="quality">Qualität (ISO 9001)</option>
              <option value="environment">Umwelt</option>
            </select>
          </div>
          <div>
            <label class="label">Standort</label>
            <input v-model="form.location" type="text" class="input" placeholder="z.B. Werk Nord, Halle 3" />
          </div>
        </div>

        <div>
          <label class="label">Beschreibung</label>
          <textarea v-model="form.description" class="input" rows="3" placeholder="Optionale Beschreibung..." />
        </div>

        <div>
          <label class="label">Geplantes Datum</label>
          <input v-model="form.scheduled_date" type="date" class="input w-48" />
        </div>
      </div>

      <!-- Template selection -->
      <div class="card p-6 space-y-4">
        <h2 class="font-semibold text-gray-900">Vorlage auswählen</h2>
        <p class="text-sm text-gray-500">Eine Vorlage befüllt die Checkliste automatisch mit vorgefertigten Prüfpunkten.</p>

        <div class="grid gap-3">
          <label
            class="flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors"
            :class="form.template_id === null ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300'"
          >
            <input type="radio" :value="null" v-model="form.template_id" class="mt-0.5" />
            <div>
              <p class="font-medium text-gray-900">Leeres Audit</p>
              <p class="text-xs text-gray-500">Keine Vorlage – Prüfpunkte manuell hinzufügen</p>
            </div>
          </label>
          <label
            v-for="tmpl in store.templates"
            :key="tmpl.id"
            class="flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors"
            :class="form.template_id === tmpl.id ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300'"
          >
            <input type="radio" :value="tmpl.id" v-model="form.template_id" class="mt-0.5" />
            <div>
              <p class="font-medium text-gray-900">{{ tmpl.name }}</p>
              <p class="text-xs text-gray-500">{{ tmpl.description }} · {{ tmpl.items.length }} Prüfpunkte</p>
            </div>
          </label>
        </div>

        <!-- Custom items (only shown if no template selected) -->
        <div v-if="form.template_id === null" class="mt-4 space-y-2">
          <div class="flex items-center justify-between">
            <label class="label mb-0">Prüfpunkte</label>
            <button type="button" @click="addItem" class="btn-secondary text-xs py-1 px-2">+ Hinzufügen</button>
          </div>
          <div v-for="(item, i) in form.checklist_items" :key="i" class="flex gap-2">
            <input v-model="item.text" type="text" class="input flex-1" :placeholder="`Prüfpunkt ${i + 1}`" />
            <button type="button" @click="removeItem(i)" class="text-gray-400 hover:text-red-500 px-2">×</button>
          </div>
          <p v-if="form.checklist_items.length === 0" class="text-sm text-gray-400 italic">
            Keine Prüfpunkte – Sie können diese später hinzufügen.
          </p>
        </div>
      </div>

      <div v-if="error" class="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
        {{ error }}
      </div>

      <div class="flex gap-3 justify-end">
        <RouterLink to="/audits" class="btn-secondary">Abbrechen</RouterLink>
        <button type="submit" class="btn-primary" :disabled="loading">
          <span v-if="loading" class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
          {{ loading ? 'Erstellen...' : 'Audit erstellen' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuditsStore } from '@/stores/audits'

const router = useRouter()
const store = useAuditsStore()

const form = ref({
  title: '',
  description: '',
  location: '',
  category: 'general',
  template_id: null as string | null,
  scheduled_date: '',
  checklist_items: [] as { text: string; order: number }[],
})
const loading = ref(false)
const error = ref('')

function addItem() {
  form.value.checklist_items.push({ text: '', order: form.value.checklist_items.length })
}

function removeItem(i: number) {
  form.value.checklist_items.splice(i, 1)
}

async function handleCreate() {
  loading.value = true
  error.value = ''
  try {
    const payload = {
      ...form.value,
      scheduled_date: form.value.scheduled_date ? new Date(form.value.scheduled_date).toISOString() : null,
      checklist_items: form.value.checklist_items.filter((i) => i.text.trim()),
    }
    const audit = await store.createAudit(payload)
    router.push(`/audits/${audit.id}`)
  } catch (e: any) {
    error.value = e.response?.data?.detail || 'Fehler beim Erstellen'
  } finally {
    loading.value = false
  }
}

onMounted(() => store.fetchTemplates())
</script>
