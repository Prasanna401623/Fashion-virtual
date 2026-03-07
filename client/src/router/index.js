import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Game',
    component: () => import('../App.vue')
  },
  {
    path: '/debug',
    name: 'HandDebug',
    component: () => import('../components/HandDebug.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
