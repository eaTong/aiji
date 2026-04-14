<template>
  <view class="container">
    <view v-if="loading" class="loading">加载中...</view>
    <view v-else-if="!favorites.length" class="empty">
      <text class="empty-icon">⭐</text>
      <text class="empty-text">还没有收藏的动作</text>
      <text class="empty-hint">在动作库中点击心形图标添加收藏</text>
    </view>
    <view v-else class="exercise-list">
      <view
        v-for="item in favorites"
        :key="item.id"
        class="exercise-card"
        @tap="goDetail(item.id)"
      >
        <view class="exercise-main">
          <text class="exercise-name">{{ item.name }}</text>
          <text class="exercise-category">{{ getCategoryLabel(item.category) }}</text>
        </view>
        <view class="exercise-meta">
          <text class="exercise-equipment">{{ getEquipmentLabel(item.equipment) }}</text>
          <text class="exercise-muscles">{{ formatMuscles(item.primaryMuscles) }}</text>
        </view>
        <view class="exercise-actions">
          <button
            class="unfavorite-btn"
            :class="{ favorited: item.isFavorite }"
            @tap.stop="toggleFavorite(item.id)"
          >
            {{ item.isFavorite ? '❤️' : '🤍' }}
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getFavoriteExercises, toggleFavorite as apiToggleFavorite, type Exercise } from '../../api/exercise'

const favorites = ref<Exercise[]>([])
const loading = ref(true)

const categoryMap: Record<string, string> = {
  CHEST: '胸部',
  BACK: '背部',
  LEGS: '腿部',
  SHOULDERS: '肩部',
  ARMS: '手臂',
  CORE: '核心',
  CARDIO: '有氧',
}

const equipmentMap: Record<string, string> = {
  GYM: '健身房',
  DUMBBELL: '哑铃',
  BODYWEIGHT: '自重',
}

const muscleLabels: Record<string, string> = {
  chest: '胸肌',
  front_deltoid: '前三角肌',
  lateral_deltoid: '侧三角肌',
  rear_deltoid: '后三角肌',
  biceps: '肱二头肌',
  triceps: '肱三头肌',
  forearm: '前臂',
  traps: '斜方肌',
  lats: '背阔肌',
  rhomboid: '菱形肌',
  erector: '竖脊肌',
  gluteus: '臀肌',
  quadriceps: '股四头肌',
  hamstrings: '腘绳肌',
  calves: '小腿',
  abs: '腹肌',
  obliques: '腹斜肌',
}

function getCategoryLabel(category: string): string {
  return categoryMap[category] || category
}

function getEquipmentLabel(equipment: string): string {
  return equipmentMap[equipment] || equipment
}

function formatMuscles(muscles: string[]): string {
  if (!muscles || !muscles.length) return ''
  return muscles
    .slice(0, 2)
    .map(m => muscleLabels[m] || m)
    .join('、')
}

async function loadFavorites() {
  loading.value = true
  try {
    favorites.value = await getFavoriteExercises()
  } catch (e) {
    console.error('加载收藏失败', e)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function toggleFavorite(id: string) {
  try {
    const updated = await apiToggleFavorite(id)
    const index = favorites.value.findIndex(f => f.id === id)
    if (index !== -1) {
      if (updated.isFavorite) {
        favorites.value[index] = updated
      } else {
        favorites.value.splice(index, 1)
      }
    }
    if (!updated.isFavorite) {
      uni.showToast({ title: '已取消收藏', icon: 'none' })
    }
  } catch (e) {
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

function goDetail(id: string) {
  uni.navigateTo({ url: `/pages/training/exercise-detail?id=${id}` })
}

onMounted(loadFavorites)
</script>

<style scoped>
.container {
  padding: 24rpx;
  background: #f5f5f5;
  min-height: 100vh;
}

.loading {
  text-align: center;
  padding: 100rpx;
  color: #999;
  font-size: 28rpx;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 40rpx;
}

.empty-icon {
  font-size: 100rpx;
  margin-bottom: 32rpx;
}

.empty-text {
  font-size: 32rpx;
  color: #333;
  font-weight: bold;
  margin-bottom: 16rpx;
}

.empty-hint {
  font-size: 26rpx;
  color: #999;
}

.exercise-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.exercise-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 28rpx;
}

.exercise-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}

.exercise-name {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.exercise-category {
  font-size: 24rpx;
  color: #07c160;
  background: #f0fff4;
  padding: 4rpx 16rpx;
  border-radius: 20rpx;
}

.exercise-meta {
  display: flex;
  gap: 24rpx;
  margin-bottom: 16rpx;
}

.exercise-equipment,
.exercise-muscles {
  font-size: 24rpx;
  color: #666;
}

.exercise-actions {
  display: flex;
  justify-content: flex-end;
}

.unfavorite-btn {
  font-size: 36rpx;
  padding: 8rpx 16rpx;
  background: transparent;
  border: none;
}
</style>
