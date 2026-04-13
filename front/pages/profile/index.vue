<template>
  <view class="container">
    <view class="profile-card">
      <view class="avatar-area">
        <text class="avatar">{{ userInitial }}</text>
      </view>
      <text class="nickname">{{ user?.nickname ?? '健身者' }}</text>
    </view>

    <view class="info-card">
      <view class="info-row">
        <text class="info-label">身高</text>
        <text class="info-value">{{ user?.height ?? '--' }} cm</text>
      </view>
      <view class="info-row">
        <text class="info-label">目标体重</text>
        <text class="info-value">{{ user?.targetWeight ?? '--' }} kg</text>
      </view>
      <view class="info-row">
        <text class="info-label">健身目标</text>
        <text class="info-value">{{ goalLabel }}</text>
      </view>
      <view class="info-row">
        <text class="info-label">训练水平</text>
        <text class="info-value">{{ levelLabel }}</text>
      </view>
    </view>

    <button class="edit-btn" @tap="goEdit">编辑档案</button>
    <button class="logout-btn" @tap="userStore.logout()">退出登录</button>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useUserStore } from '../../stores/user'

const userStore = useUserStore()
const user = computed(() => userStore.user)
const userInitial = computed(() => user.value?.nickname?.[0] ?? '我')

const goalMap: Record<string, string> = {
  LOSE_FAT: '减脂',
  GAIN_MUSCLE: '增肌',
  BODY_SHAPE: '塑形',
  IMPROVE_FITNESS: '提升体能',
}
const levelMap: Record<string, string> = {
  BEGINNER: '入门',
  INTERMEDIATE: '中级',
  ADVANCED: '进阶',
}
const goalLabel = computed(() => user.value?.goal ? goalMap[user.value.goal] : '--')
const levelLabel = computed(() => levelMap[user.value?.level ?? 'BEGINNER'])

function goEdit() {
  uni.navigateTo({ url: '/pages/profile/edit' })
}

onMounted(() => userStore.fetchProfile())
</script>

<style>
.container { padding: 24rpx; background: #f5f5f5; min-height: 100vh; }
.profile-card { background: #333; color: #fff; border-radius: 24rpx; padding: 48rpx 32rpx; text-align: center; margin-bottom: 24rpx; }
.avatar { width: 120rpx; height: 120rpx; background: rgba(255,255,255,0.2); border-radius: 50%; font-size: 48rpx; display: flex; align-items: center; justify-content: center; margin: 0 auto; }
.nickname { font-size: 36rpx; font-weight: bold; display: block; margin-top: 16rpx; }
.info-card { background: #fff; border-radius: 24rpx; padding: 8rpx 32rpx; margin-bottom: 24rpx; }
.info-row { display: flex; justify-content: space-between; padding: 28rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.info-label { font-size: 28rpx; color: #666; }
.info-value { font-size: 28rpx; color: #333; }
.edit-btn { background: #333; color: #fff; border-radius: 48rpx; margin-bottom: 24rpx; }
.logout-btn { background: #fff; color: #999; border: 1rpx solid #eee; border-radius: 48rpx; }
</style>