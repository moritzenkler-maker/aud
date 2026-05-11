import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/auth/LoginView.vue'),
      meta: { public: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/auth/RegisterView.vue'),
      meta: { public: true },
    },
    {
      path: '/',
      component: () => import('@/components/layout/AppLayout.vue'),
      children: [
        {
          path: '',
          name: 'dashboard',
          component: () => import('@/views/DashboardView.vue'),
        },
        {
          path: 'audits',
          name: 'audits',
          component: () => import('@/views/audits/AuditsView.vue'),
        },
        {
          path: 'audits/new',
          name: 'audit-new',
          component: () => import('@/views/audits/NewAuditView.vue'),
        },
        {
          path: 'audits/:id',
          name: 'audit-detail',
          component: () => import('@/views/audits/AuditDetailView.vue'),
        },
        {
          path: 'actions',
          name: 'actions',
          component: () => import('@/views/actions/ActionItemsView.vue'),
        },
      ],
    },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (!to.meta.public) {
    if (!auth.token) return { name: 'login' }
    if (!auth.user) await auth.fetchMe()
    if (!auth.user) return { name: 'login' }
  } else if (auth.token && auth.user) {
    return { name: 'dashboard' }
  }
})

export default router
