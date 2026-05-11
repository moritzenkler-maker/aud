<template>
  <header class="h-16 bg-white border-b border-gray-200 flex items-center px-6 gap-4 flex-shrink-0">
    <button @click="$emit('toggle-sidebar')" class="text-gray-500 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>

    <div class="flex-1">
      <h2 class="text-sm font-semibold text-gray-800">{{ pageTitle }}</h2>
    </div>

    <RouterLink to="/audits/new" class="btn-primary text-xs px-3 py-1.5">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
      </svg>
      Neues Audit
    </RouterLink>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

defineEmits<{ 'toggle-sidebar': [] }>()

const route = useRoute()

const pageTitle = computed(() => {
  const titles: Record<string, string> = {
    dashboard: 'Dashboard',
    audits: 'Audits',
    'audit-new': 'Neues Audit erstellen',
    'audit-detail': 'Audit Details',
    actions: 'Maßnahmen',
  }
  return titles[String(route.name)] || 'AuditFlow'
})
</script>
