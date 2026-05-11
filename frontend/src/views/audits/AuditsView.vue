<template>
  <div class="space-y-5">
    <!-- Toolbar -->
    <div class="flex items-center gap-3 flex-wrap">
      <div class="flex-1 min-w-0">
        <input
          v-model="search"
          type="search"
          class="input max-w-xs"
          placeholder="Audits durchsuchen..."
        />
      </div>
      <div class="flex gap-2">
        <select v-model="filterStatus" class="input py-2 text-sm w-40">
          <option value="">Alle Status</option>
          <option value="draft">Entwurf</option>
          <option value="in_progress">In Bearbeitung</option>
          <option value="completed">Abgeschlossen</option>
          <option value="archived">Archiviert</option>
        </select>
        <select v-model="filterCategory" class="input py-2 text-sm w-44">
          <option value="">Alle Kategorien</option>
          <option value="safety">Arbeitssicherheit</option>
          <option value="fire">Brandschutz</option>
          <option value="quality">Qualität</option>
          <option value="environment">Umwelt</option>
          <option value="general">Allgemein</option>
        </select>
      </div>
      <RouterLink to="/audits/new" class="btn-primary whitespace-nowrap">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Neues Audit
      </RouterLink>
    </div>

    <!-- Table -->
    <div class="card overflow-hidden">
      <div v-if="store.loading" class="p-8 text-center">
        <div class="inline-block animate-spin h-8 w-8 border-4 border-brand-600 border-t-transparent rounded-full" />
      </div>
      <div v-else-if="filtered.length === 0" class="p-12 text-center text-gray-400">
        <svg class="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p class="text-sm">Keine Audits gefunden.</p>
        <RouterLink to="/audits/new" class="text-brand-700 hover:underline text-sm mt-1 inline-block">Jetzt erstellen</RouterLink>
      </div>
      <table v-else class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-100 bg-gray-50 text-left">
            <th class="px-4 py-3 font-medium text-gray-500">Titel</th>
            <th class="px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Kategorie</th>
            <th class="px-4 py-3 font-medium text-gray-500">Status</th>
            <th class="px-4 py-3 font-medium text-gray-500 hidden lg:table-cell">Prüfpunkte</th>
            <th class="px-4 py-3 font-medium text-gray-500 hidden lg:table-cell">Offene Maßnahmen</th>
            <th class="px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Erstellt</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr
            v-for="audit in filtered"
            :key="audit.id"
            class="hover:bg-gray-50 cursor-pointer"
            @click="$router.push(`/audits/${audit.id}`)"
          >
            <td class="px-4 py-3">
              <div class="font-medium text-gray-900">{{ audit.title }}</div>
              <div v-if="audit.location" class="text-xs text-gray-400 mt-0.5">📍 {{ audit.location }}</div>
            </td>
            <td class="px-4 py-3 hidden md:table-cell">
              <CategoryBadge :category="audit.category" />
            </td>
            <td class="px-4 py-3">
              <StatusBadge :status="audit.status" type="audit" />
            </td>
            <td class="px-4 py-3 hidden lg:table-cell text-gray-600">
              {{ audit.checklist_items_count }}
            </td>
            <td class="px-4 py-3 hidden lg:table-cell">
              <span v-if="audit.open_actions_count > 0" class="text-orange-600 font-medium">
                {{ audit.open_actions_count }}
              </span>
              <span v-else class="text-gray-400">—</span>
            </td>
            <td class="px-4 py-3 hidden md:table-cell text-gray-400 text-xs">
              {{ formatDate(audit.created_at) }}
            </td>
            <td class="px-4 py-3 text-right">
              <button
                @click.stop="handleDelete(audit.id)"
                class="text-gray-400 hover:text-red-500 p-1 rounded"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useAuditsStore } from '@/stores/audits'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import CategoryBadge from '@/components/ui/CategoryBadge.vue'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

const store = useAuditsStore()
const search = ref('')
const filterStatus = ref('')
const filterCategory = ref('')

function formatDate(iso: string) {
  return format(new Date(iso), 'd. MMM yyyy', { locale: de })
}

const filtered = computed(() => {
  let list = store.audits
  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter((a) => a.title.toLowerCase().includes(q) || a.location?.toLowerCase().includes(q))
  }
  return list
})

async function handleDelete(id: string) {
  if (!confirm('Audit wirklich löschen?')) return
  await store.deleteAudit(id)
}

watch([filterStatus, filterCategory], () => {
  store.fetchAudits({ status: filterStatus.value || undefined, category: filterCategory.value || undefined })
})

onMounted(() => store.fetchAudits())
</script>
