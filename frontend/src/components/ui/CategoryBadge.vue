<template>
  <span :class="['inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium', cls]">
    <span>{{ icon }}</span>{{ label }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ category: string }>()

const map: Record<string, { label: string; icon: string; cls: string }> = {
  safety: { label: 'Arbeitssicherheit', icon: '🦺', cls: 'bg-orange-100 text-orange-800' },
  fire: { label: 'Brandschutz', icon: '🔥', cls: 'bg-red-100 text-red-800' },
  quality: { label: 'Qualität', icon: '✅', cls: 'bg-blue-100 text-blue-800' },
  environment: { label: 'Umwelt', icon: '🌿', cls: 'bg-green-100 text-green-800' },
  general: { label: 'Allgemein', icon: '📋', cls: 'bg-gray-100 text-gray-700' },
}

const resolved = computed(() => map[props.category] || { label: props.category, icon: '📋', cls: 'bg-gray-100 text-gray-700' })
const label = computed(() => resolved.value.label)
const icon = computed(() => resolved.value.icon)
const cls = computed(() => resolved.value.cls)
</script>
