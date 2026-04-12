import { createSSRApp } from 'vue'
import { createPinia } from 'pinia'
import { createPersistedState } from 'pinia-plugin-persistedstate'
import App from './App.vue'

export function createApp() {
  const app = createSSRApp(App)
  const pinia = createPinia()
  pinia.use(
    createPersistedState({
      storage: {
        getItem: (key: string) => uni.getStorageSync(key),
        setItem: (key: string, value: string) => uni.setStorageSync(key, value),
      },
    })
  )
  app.use(pinia)
  return { app }
}