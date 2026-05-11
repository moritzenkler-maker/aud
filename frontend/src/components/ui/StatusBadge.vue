<template>
  <span :class="['inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', classes]">
    {{ label }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  status: string
  type?: 'audit' | 'action'
}>()

const auditMap: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Entwurf', cls: 'bg-gray-100 text-gray-700' },
  in_progress: { label: 'In Bearbeitung', cls: 'bg-yellow-100 text-yellow-800' },
  completed: { label: 'Abgeschlossen', cls: 'bg-green-100 text-green-800' },
  archived: { label: 'Archiviert', cls: 'bg-gray-100 text-gray-500' },
}

const actionMap: Record<string, { label: string; cls: string }> = {
  open: { label: 'Offen', cls: 'bg-blue-100 text-blue-800' },
  in_progress: { label: 'In Bearbeitung', cls: 'bg-yellow-100 text-yellow-800' },
  done: { label: 'Erledigt', cls: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Abgebrochen', cls: 'bg-gray-100 text-gray-500' },
}

const priorityMap: Record<string, { label: string; cls: string }> = {
  low: { label: 'Niedrig', cls: 'bg-green-100 text-green-800' },
  medium: { label: 'Mittel', cls: 'bg-yellow-100 text-yellow-800' },
  high: { label: 'Hoch', cls: 'bg-orange-100 text-orange-800' },
  critical: { label: 'Kritisch', cls: 'bg-red-100 text-red-800' },
}

const resolved = computed(() => {
  const map = props.type === 'action' ? actionMap : props.type === 'audit' ? auditMap : priorityMap
  return map[props.status] || { label: props.status, cls: 'bg-gray-100 text-gray-700' }
})

const label = computed(() => resolved.value.label)
const classes = computed(() => resolved.value.cls)
</script>
