import { defineStore } from 'pinia'
import { ref } from 'vue'
import { User } from '../types'
import { getProfile } from '../api/user'

export const useUserStore = defineStore(
  'user',
  () => {
    const token = ref<string>(uni.getStorageSync('token') ?? '')
    const user = ref<User | null>(null)

    function setToken(newToken: string) {
      token.value = newToken
      uni.setStorageSync('token', newToken)
    }

    function setUser(newUser: User) {
      user.value = newUser
    }

    async function fetchProfile() {
      user.value = await getProfile()
    }

    function logout() {
      token.value = ''
      user.value = null
      uni.removeStorageSync('token')
      uni.reLaunch({ url: '/pages/profile/login' })
    }

    return { token, user, setToken, setUser, fetchProfile, logout }
  },
  {
    persist: {
      storage: {
        getItem: (key: string) => uni.getStorageSync(key),
        setItem: (key: string, value: string) => uni.setStorageSync(key, value),
      },
    },
  }
)