<template>
  <div class="flex h-screen bg-gray-50">
    <AppSidebar :collapsed="sidebarCollapsed" @toggle="sidebarCollapsed = !sidebarCollapsed" />
    <div class="flex flex-col flex-1 min-w-0 overflow-hidden">
      <AppHeader @toggle-sidebar="sidebarCollapsed = !sidebarCollapsed" />
      <main class="flex-1 overflow-y-auto p-6">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AppSidebar from './AppSidebar.vue'
import AppHeader from './AppHeader.vue'

const sidebarCollapsed = ref(false)
</script>
