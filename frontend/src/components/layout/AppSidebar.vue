<template>
  <aside
    :class="[
      'flex flex-col bg-brand-900 text-white transition-all duration-300 ease-in-out flex-shrink-0',
      collapsed ? 'w-16' : 'w-60',
    ]"
  >
    <!-- Logo -->
    <div class="flex items-center gap-3 px-4 h-16 border-b border-brand-800">
      <div class="flex-shrink-0">
        <svg class="w-8 h-8" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="40" height="40" rx="8" fill="white" fill-opacity="0.15"/>
          <path d="M12 20l6 6 10-12" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <span v-if="!collapsed" class="text-lg font-bold tracking-tight whitespace-nowrap">AuditFlow</span>
    </div>

    <!-- Nav -->
    <nav class="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
      <RouterLink
        v-for="item in navItems"
        :key="item.name"
        :to="item.to"
        :class="[
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
          $route.name === item.name || String($route.name).startsWith(item.prefix || item.name)
            ? 'bg-white/15 text-white'
            : 'text-brand-200 hover:bg-white/10 hover:text-white',
        ]"
        :title="collapsed ? item.label : undefined"
      >
        <component :is="item.icon" class="w-5 h-5 flex-shrink-0" />
        <span v-if="!collapsed" class="truncate">{{ item.label }}</span>
      </RouterLink>
    </nav>

    <!-- User -->
    <div class="border-t border-brand-800 p-3">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
          {{ initials }}
        </div>
        <div v-if="!collapsed" class="flex-1 min-w-0">
          <p class="text-sm font-medium text-white truncate">{{ auth.user?.full_name }}</p>
          <p class="text-xs text-brand-300 truncate">{{ auth.user?.company || auth.user?.email }}</p>
        </div>
        <button v-if="!collapsed" @click="handleLogout" class="text-brand-400 hover:text-white" title="Abmelden">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, h } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

defineProps<{ collapsed: boolean }>()
defineEmits<{ toggle: [] }>()

const auth = useAuthStore()
const router = useRouter()

const initials = computed(() => {
  const name = auth.user?.full_name || ''
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
})

function handleLogout() {
  auth.logout()
  router.push('/login')
}

// Inline SVG icons as render functions
const HomeIcon = () =>
  h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
    h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' }),
  ])

const ClipboardIcon = () =>
  h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
    h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' }),
  ])

const TaskIcon = () =>
  h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
    h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M15 11H9m6 4H9' }),
  ])

const navItems = [
  { name: 'dashboard', label: 'Dashboard', to: '/', icon: HomeIcon },
  { name: 'audits', label: 'Audits', to: '/audits', icon: ClipboardIcon, prefix: 'audit' },
  { name: 'actions', label: 'Maßnahmen', to: '/actions', icon: TaskIcon },
]
</script>
