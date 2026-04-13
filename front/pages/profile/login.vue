<template>
  <view class="login-container">
    <view class="logo-area">
      <text class="app-name">AI己</text>
      <text class="tagline">你的AI健身管家</text>
    </view>
    <button
      class="wx-login-btn"
      :loading="loading"
      @tap="handleLogin"
    >
      微信一键登录
    </button>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { wxLogin } from '../../api/auth'
import { useUserStore } from '../../stores/user'

const loading = ref(false)
const userStore = useUserStore()

async function handleLogin() {
  loading.value = true
  try {
    const { code } = await uni.login({ provider: 'weixin' })
    const { token, user } = await wxLogin(code as string)
    userStore.setToken(token)
    userStore.setUser(user)
    uni.switchTab({ url: '/pages/index/index' })
  } catch (e) {
    uni.showToast({ title: '登录失败，请重试', icon: 'none' })
  } finally {
    loading.value = false
  }
}
</script>

<style>
.login-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: #f9f9f9;
}
.app-name { font-size: 80rpx; font-weight: bold; color: #333; }
.tagline { font-size: 28rpx; color: #999; margin-top: 16rpx; }
.wx-login-btn {
  margin-top: 120rpx;
  background: #07c160;
  color: #fff;
  border-radius: 48rpx;
  padding: 24rpx 80rpx;
  font-size: 32rpx;
}
</style>