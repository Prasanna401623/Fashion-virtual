import { createApp } from 'vue'
import './style.css'
import RootApp from './RootApp.vue'
import router from './router'

createApp(RootApp).use(router).mount('#app')
