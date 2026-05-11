<template>
  <div class="space-y-6">
    <!-- Greeting -->
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Guten Tag, {{ auth.user?.full_name?.split(' ')[0] }} 👋</h1>
      <p class="text-gray-500 text-sm mt-1">Hier ist Ihre Übersicht für heute, {{ today }}</p>
    </div>

    <!-- Stats grid -->
    <div v-if="stats" class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="card p-5">
        <p class="text-xs text-gray-500 font-medium uppercase tracking-wide">Audits gesamt</p>
        <p class="text-3xl font-bold text-gray-900 mt-1">{{ stats.total_audits }}</p>
        <div class="mt-3 flex gap-2 flex-wrap">
          <span class="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">{{ stats.audits_by_status.in_progress }} aktiv</span>
          <span class="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">{{ stats.audits_by_status.completed }} abgeschl.</span>
        </div>
      </div>
      <div class="card p-5">
        <p class="text-xs text-gray-500 font-medium uppercase tracking-wide">Offene Maßnahmen</p>
        <p class="text-3xl font-bold text-gray-900 mt-1">{{ stats.actions_by_status.open }}</p>
        <div class="mt-3">
          <span class="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{{ stats.actions_by_status.in_progress }} in Bearbeitung</span>
        </div>
      </div>
      <div class="card p-5">
        <p class="text-xs text-gray-500 font-medium uppercase tracking-wide">Kritische Maßnahmen</p>
        <p :class="['text-3xl font-bold mt-1', stats.critical_actions > 0 ? 'text-red-600' : 'text-gray-900']">
          {{ stats.critical_actions }}
        </p>
        <div class="mt-3">
          <span :class="['text-xs px-2 py-0.5 rounded-full', stats.critical_actions > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700']">
            {{ stats.critical_actions > 0 ? 'Handlungsbedarf' : 'Alles OK' }}
          </span>
        </div>
      </div>
      <div class="card p-5">
        <p class="text-xs text-gray-500 font-medium uppercase tracking-wide">Abgeschlossen</p>
        <p class="text-3xl font-bold text-gray-900 mt-1">{{ stats.actions_by_status.done }}</p>
        <div class="mt-3">
          <span class="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Maßnahmen erledigt</span>
        </div>
      </div>
    </div>

    <!-- Loading skeleton -->
    <div v-else class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div v-for="i in 4" :key="i" class="card p-5 animate-pulse">
        <div class="h-3 bg-gray-200 rounded w-24 mb-3"></div>
        <div class="h-8 bg-gray-200 rounded w-16"></div>
      </div>
    </div>

    <!-- Two-col layout -->
    <div class="grid lg:grid-cols-3 gap-6">
      <!-- Recent audits -->
      <div class="lg:col-span-2 card">
        <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 class="font-semibold text-gray-900">Letzte Audits</h3>
          <RouterLink to="/audits" class="text-sm text-brand-700 hover:underline font-medium">Alle anzeigen</RouterLink>
        </div>
        <div v-if="stats && stats.recent_audits.length" class="divide-y divide-gray-50">
          <div
            v-for="audit in stats.recent_audits"
            :key="audit.id"
            class="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 cursor-pointer"
            @click="$router.push(`/audits/${audit.id}`)"
          >
            <div :class="['w-2 h-2 rounded-full flex-shrink-0', statusDot(audit.status)]" />
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900 truncate">{{ audit.title }}</p>
              <p class="text-xs text-gray-400">{{ formatDate(audit.created_at) }}</p>
            </div>
            <StatusBadge :status="audit.status" type="audit" />
          </div>
        </div>
        <div v-else class="px-5 py-8 text-center text-gray-400 text-sm">
          Noch keine Audits vorhanden.
          <RouterLink to="/audits/new" class="text-brand-700 hover:underline ml-1">Jetzt erstellen</RouterLink>
        </div>
      </div>

      <!-- Audit status chart -->
      <div class="card">
        <div class="px-5 py-4 border-b border-gray-100">
          <h3 class="font-semibold text-gray-900">Audit-Status</h3>
        </div>
        <div v-if="stats" class="p-5 space-y-3">
          <div v-for="[key, label, color] in statusItems" :key="key">
            <div class="flex justify-between text-sm mb-1">
              <span class="text-gray-600">{{ label }}</span>
              <span class="font-medium text-gray-900">{{ stats.audits_by_status[key] }}</span>
            </div>
            <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                :class="['h-full rounded-full transition-all', color]"
                :style="{ width: barWidth(stats.audits_by_status[key]) }"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/api/client'
import type { DashboardStats } from '@/types'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

const auth = useAuthStore()
const stats = ref<DashboardStats | null>(null)

const today = format(new Date(), 'EEEE, d. MMMM yyyy', { locale: de })

const statusItems: [string, string, string][] = [
  ['draft', 'Entwurf', 'bg-gray-400'],
  ['in_progress', 'In Bearbeitung', 'bg-yellow-400'],
  ['completed', 'Abgeschlossen', 'bg-green-500'],
  ['archived', 'Archiviert', 'bg-gray-300'],
]

function formatDate(iso: string) {
  return format(new Date(iso), 'd. MMM yyyy', { locale: de })
}

function statusDot(status: string) {
  const map: Record<string, string> = {
    draft: 'bg-gray-400',
    in_progress: 'bg-yellow-400',
    completed: 'bg-green-500',
    archived: 'bg-gray-300',
  }
  return map[status] || 'bg-gray-400'
}

function barWidth(value: number) {
  if (!stats.value) return '0%'
  const total = stats.value.total_audits || 1
  return `${Math.round((value / total) * 100)}%`
}

onMounted(async () => {
  const { data } = await api.get('/dashboard/stats')
  stats.value = data
})
</script>
